/** Persistent gateway state: devices, tokens, one-shot pairing keys, whitelist. */

import { randomBytes, randomUUID } from 'node:crypto';
import { ERROR_CODES } from './constants.js';
import { GatewayError, unauthorized } from './errors.js';
import { isLoopbackIp, normalizeIp } from './network.js';
import { MemoryStateStore, secretHash } from './store.js';
import type { PersistedState, StateStore, StoredDevice, StoredPairing, StoredToken } from './store.js';
import type {
  Device,
  PairingKeyPayload,
  RequestLike,
  ResolvedConfig,
  TokenInfo,
  WhitelistConfig,
} from './types.js';

interface TokenRecord {
  tokenHash: string;
  deviceId: string;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
}

interface DeviceRecord {
  deviceId: string;
  name: string;
  platform: string;
  origin: string;
  reachable: boolean;
  lastSeenAt: string;
  status: 'active' | 'revoked';
  tokenHash: string;
  caFingerprint: string;
}

interface PairingRecord {
  payload: PairingKeyPayload;
  consumed: boolean;
  createdAtMs: number;
}

export interface StateClock {
  now(): Date;
  uuid(): string;
  opaque(): string;
}

export const defaultClock: StateClock = {
  now: () => new Date(),
  uuid: () => randomUUID(),
  opaque: () => randomBytes(32).toString('base64url'),
};

const PAIR_RATE_LIMIT = 10;
const PAIR_RATE_WINDOW_MS = 60_000;

function headerValue(headers: RequestLike['headers'], name: string): string | undefined {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export class GatewayState {
  private readonly tokens = new Map<string, TokenRecord>();
  private readonly devices = new Map<string, DeviceRecord>();
  private readonly pairing = new Map<string, PairingRecord>();
  private pairingAttempts = new Map<string, number[]>();
  private whitelist: WhitelistConfig;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly clock: StateClock = defaultClock,
    private readonly store: StateStore = new MemoryStateStore(),
  ) {
    this.whitelist = { ...config.whitelist };
    const stored = this.store.load();
    if (stored) this.hydrate(stored);
  }

  private hydrate(stored: PersistedState): void {
    for (const token of stored.tokens) {
      this.tokens.set(token.tokenHash, { ...token });
    }
    for (const device of stored.devices) {
      this.devices.set(device.deviceId, { ...device });
    }
    for (const item of stored.pairing) {
      this.pairing.set(item.keyHash, {
        payload: { ...item.payload, pairingKey: '' },
        consumed: item.consumed,
        createdAtMs: item.createdAtMs,
      });
    }
    this.pairingAttempts = new Map(Object.entries(stored.pairingAttempts));
    this.whitelist = {
      trustedProxies: [...stored.whitelist.trustedProxies],
      allowUsers: [...stored.whitelist.allowUsers],
      userHeader: stored.whitelist.userHeader,
    };
  }

  private snapshot(): PersistedState {
    const devices: StoredDevice[] = [...this.devices.values()].map((device) => ({ ...device }));
    const tokens: StoredToken[] = [...this.tokens.values()].map((token) => ({ ...token }));
    const pairing: StoredPairing[] = [...this.pairing.entries()].map(([keyHash, record]) => ({
      keyHash,
      payload: { ...record.payload, pairingKey: '' },
      consumed: record.consumed,
      createdAtMs: record.createdAtMs,
    }));
    const pairingAttempts: Record<string, number[]> = {};
    for (const [ip, times] of this.pairingAttempts) pairingAttempts[ip] = [...times];
    return {
      schemaVersion: 1,
      devices,
      tokens,
      pairing,
      pairingAttempts,
      whitelist: {
        trustedProxies: [...this.whitelist.trustedProxies],
        allowUsers: [...this.whitelist.allowUsers],
        userHeader: this.whitelist.userHeader,
      },
    };
  }

  private persist(): void {
    this.store.save(this.snapshot());
  }

  get caFingerprint(): string {
    return this.config.ca.fingerprint;
  }

  get currentWhitelist(): WhitelistConfig {
    return { ...this.whitelist, trustedProxies: [...this.whitelist.trustedProxies], allowUsers: [...this.whitelist.allowUsers] };
  }

  /** PC side generates the one-shot key; only its hash is persisted. */
  createPairingKey(): PairingKeyPayload {
    const payload: PairingKeyPayload = {
      v: 1,
      pairingKey: this.clock.opaque(),
      origin: this.config.origin,
      expiresAt: new Date(this.clock.now().getTime() + this.config.pairingTtlMs).toISOString(),
      caFingerprint: this.config.ca.fingerprint,
    };
    this.pairing.set(secretHash(payload.pairingKey), {
      payload,
      consumed: false,
      createdAtMs: this.clock.now().getTime(),
    });
    this.persist();
    return payload;
  }

  getPairingRecord(key: string): PairingRecord | undefined {
    const record = this.pairing.get(secretHash(key));
    if (!record) return undefined;
    if (record.consumed || this.clock.now().getTime() >= Date.parse(record.payload.expiresAt)) {
      throw new GatewayError(ERROR_CODES.PAIRING_CONSUMED, 'pairing key is used or expired');
    }
    return record;
  }

  registerDevice(name: string, platform: string, caFingerprint: string): { device: Device; token: TokenInfo } {
    const deviceId = this.clock.uuid();
    const device: DeviceRecord = {
      deviceId,
      name,
      platform,
      origin: this.config.origin,
      reachable: true,
      lastSeenAt: this.clock.now().toISOString(),
      status: 'active',
      tokenHash: '',
      caFingerprint,
    };
    this.devices.set(deviceId, device);
    const token = this.issueToken(deviceId);
    this.persist();
    return { device: this.publicDevice(device), token };
  }

  private publicDevice(record: DeviceRecord): Device {
    return {
      deviceId: record.deviceId,
      name: record.name,
      platform: record.platform,
      origin: record.origin,
      reachable: record.status === 'active' && !this.isTokenExpired(record.tokenHash),
      lastSeenAt: record.lastSeenAt,
    };
  }

  private isTokenExpired(tokenHash: string): boolean {
    const record = this.tokens.get(tokenHash);
    return !record || record.revoked || this.clock.now().getTime() >= Date.parse(record.expiresAt);
  }

  private issueToken(deviceId: string): TokenInfo {
    const issuedAt = this.clock.now();
    const token: TokenInfo = {
      token: this.clock.opaque(),
      deviceId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + this.config.tokenTtlMs).toISOString(),
    };
    const tokenHash = secretHash(token.token);
    this.tokens.set(tokenHash, {
      tokenHash,
      deviceId,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      revoked: false,
    });
    const device = this.devices.get(deviceId);
    if (device) {
      device.tokenHash = tokenHash;
      device.lastSeenAt = token.issuedAt;
    }
    this.persist();
    return token;
  }

  consume(key: string): void {
    const record = this.pairing.get(secretHash(key));
    if (record) {
      record.consumed = true;
      this.persist();
    }
  }

  validateToken(token: string | undefined, deviceId: string | undefined): TokenRecord {
    if (!token || !deviceId) throw unauthorized('Authorization and X-Device-Id are required');
    const tokenHash = secretHash(token);
    const record = this.tokens.get(tokenHash);
    if (!record || record.revoked || this.clock.now().getTime() >= Date.parse(record.expiresAt)) {
      throw unauthorized('token is expired, revoked or unknown');
    }
    if (record.deviceId !== deviceId) {
      throw new GatewayError(ERROR_CODES.DEVICE_UNAUTHORIZED, 'X-Device-Id does not match token');
    }
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'active') {
      throw new GatewayError(ERROR_CODES.DEVICE_UNAUTHORIZED, 'device is not authorized');
    }
    device.lastSeenAt = this.clock.now().toISOString();
    this.persist();
    return record;
  }

  rotateToken(token: string, deviceId: string): TokenInfo {
    this.validateToken(token, deviceId);
    const old = this.tokens.get(secretHash(token));
    if (old) old.revoked = true;
    return this.issueToken(deviceId);
  }

  listDevices(): Device[] {
    return [...this.devices.values()].map((device) => this.publicDevice(device));
  }

  revokeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.status = 'revoked';
    const token = this.tokens.get(device.tokenHash);
    if (token) token.revoked = true;
    this.persist();
    return true;
  }

  /** CA rotation stub: revoke every token so the contract's re-pair behavior holds. */
  rotateCaStub(newFingerprint: string, newOrigin: string): void {
    this.config.ca.fingerprint = newFingerprint;
    this.config.origin = newOrigin;
    for (const device of this.devices.values()) {
      device.status = 'revoked';
      const token = this.tokens.get(device.tokenHash);
      if (token) token.revoked = true;
    }
    this.persist();
  }

  checkWhitelist(peerIp: string | undefined, headers: RequestLike['headers']): void {
    const ip = normalizeIp(peerIp);
    if (this.whitelist.trustedProxies.length > 0) {
      const trusted = this.whitelist.trustedProxies.some((entry) => normalizeIp(entry) === ip);
      if (!trusted && !isLoopbackIp(ip)) {
        throw new GatewayError(ERROR_CODES.WHITELIST_DENIED, 'peer is not a trusted proxy');
      }
    }
    if (this.whitelist.allowUsers.length > 0) {
      const user = headerValue(headers, this.whitelist.userHeader);
      if (!user || !this.whitelist.allowUsers.includes(user)) {
        throw new GatewayError(ERROR_CODES.WHITELIST_DENIED, 'user is not in allowUsers');
      }
    }
  }

  allowPairingAttempt(peerIp: string | undefined): boolean {
    const now = this.clock.now().getTime();
    const ip = normalizeIp(peerIp);
    const previous = (this.pairingAttempts.get(ip) ?? []).filter((time) => now - time < PAIR_RATE_WINDOW_MS);
    if (previous.length >= PAIR_RATE_LIMIT) {
      this.pairingAttempts.set(ip, previous);
      this.persist();
      return false;
    }
    previous.push(now);
    this.pairingAttempts.set(ip, previous);
    this.persist();
    return true;
  }

  setWhitelist(next: WhitelistConfig): void {
    this.whitelist = {
      trustedProxies: [...next.trustedProxies],
      allowUsers: [...next.allowUsers],
      userHeader: next.userHeader,
    };
    this.persist();
  }
}
