/** In-memory M3 state: devices, tokens, one-shot pairing keys, whitelist, rate limit. */

import { randomBytes, randomUUID } from 'node:crypto';
import { ERROR_CODES } from './constants.js';
import { GatewayError, unauthorized } from './errors.js';
import { isLoopbackIp, normalizeIp } from './network.js';
import type {
  Device,
  PairingKeyPayload,
  RequestLike,
  ResolvedConfig,
  TokenInfo,
  WhitelistConfig,
} from './types.js';

interface TokenRecord extends TokenInfo {
  revoked: boolean;
}

interface DeviceRecord extends Device {
  status: 'active' | 'revoked';
  token: string;
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
  private readonly pairingAttempts = new Map<string, number[]>();
  private whitelist: WhitelistConfig;

  constructor(
    private readonly config: ResolvedConfig,
    private readonly clock: StateClock = defaultClock,
  ) {
    this.whitelist = { ...config.whitelist };
  }

  get caFingerprint(): string {
    return this.config.ca.fingerprint;
  }

  get currentWhitelist(): WhitelistConfig {
    return { ...this.whitelist, trustedProxies: [...this.whitelist.trustedProxies], allowUsers: [...this.whitelist.allowUsers] };
  }

  /** PC side generates the one-shot key; M3 does not expose a management endpoint for it. */
  createPairingKey(): PairingKeyPayload {
    const payload: PairingKeyPayload = {
      v: 1,
      pairingKey: this.clock.opaque(),
      origin: this.config.origin,
      expiresAt: new Date(this.clock.now().getTime() + this.config.pairingTtlMs).toISOString(),
      caFingerprint: this.config.ca.fingerprint,
    };
    this.pairing.set(payload.pairingKey, {
      payload,
      consumed: false,
      createdAtMs: this.clock.now().getTime(),
    });
    return payload;
  }

  getPairingRecord(key: string): PairingRecord | undefined {
    const record = this.pairing.get(key);
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
      token: '',
      caFingerprint,
    };
    this.devices.set(deviceId, device);
    return { device: this.publicDevice(device), token: this.issueToken(deviceId) };
  }

  private publicDevice(record: DeviceRecord): Device {
    return {
      deviceId: record.deviceId,
      name: record.name,
      platform: record.platform,
      origin: record.origin,
      reachable: record.status === 'active' && !this.isTokenExpired(record.token),
      lastSeenAt: record.lastSeenAt,
    };
  }

  private isTokenExpired(token: string): boolean {
    const record = this.tokens.get(token);
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
    this.tokens.set(token.token, { ...token, revoked: false });
    const device = this.devices.get(deviceId);
    if (device) {
      device.token = token.token;
      device.lastSeenAt = token.issuedAt;
    }
    return token;
  }

  consume(key: string): void {
    const record = this.pairing.get(key);
    if (record) record.consumed = true;
  }

  validateToken(token: string | undefined, deviceId: string | undefined): TokenRecord {
    if (!token || !deviceId) throw unauthorized('Authorization and X-Device-Id are required');
    const record = this.tokens.get(token);
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
    return record;
  }

  rotateToken(token: string, deviceId: string): TokenInfo {
    this.validateToken(token, deviceId);
    const old = this.tokens.get(token);
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
    const token = this.tokens.get(device.token);
    if (token) token.revoked = true;
    return true;
  }

  /** CA rotation stub: revoke every token so the contract's re-pair behavior holds. */
  rotateCaStub(newFingerprint: string, newOrigin: string): void {
    this.config.ca.fingerprint = newFingerprint;
    this.config.origin = newOrigin;
    for (const device of this.devices.values()) {
      device.status = 'revoked';
      const token = this.tokens.get(device.token);
      if (token) token.revoked = true;
    }
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
      return false;
    }
    previous.push(now);
    this.pairingAttempts.set(ip, previous);
    return true;
  }

  setWhitelist(next: WhitelistConfig): void {
    this.whitelist = {
      trustedProxies: [...next.trustedProxies],
      allowUsers: [...next.allowUsers],
      userHeader: next.userHeader,
    };
  }
}
