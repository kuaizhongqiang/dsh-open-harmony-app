/** Framework-agnostic route core for the mobile HTTPS gateway. */

import { createHash } from 'node:crypto';
import { CONTRACT_VERSION, ERROR_CODES } from './constants.js';
import { contractHeaders } from './config.js';
import { GatewayError, errorResponse, unauthorized } from './errors.js';
import { isLoopbackIp } from './network.js';
import type { GatewayState } from './state.js';
import type { GatewayResponse, RequestLike, ResolvedConfig } from './types.js';

export interface GatewayDeps {
  config: ResolvedConfig;
  state: GatewayState;
  /** ctx.webServer.getOrigin() from the DSH Host webserver. */
  upstreamOrigin: string;
  fetchImpl?: typeof fetch;
}

const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'upgrade',
  'accept-encoding',
  'proxy-authorization',
  'proxy-authenticate',
  'te',
  'trailer',
]);

function headerValue(headers: RequestLike['headers'], name: string): string | undefined {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value !== '' ? value : fallback;
}

export class MobileGateway {
  private readonly fetchImpl: typeof fetch;
  private readonly upstreamOrigin: string;

  constructor(private readonly deps: GatewayDeps) {
    this.fetchImpl = deps.fetchImpl ?? globalThis.fetch.bind(globalThis);
    // Fail fast on a malformed Host origin before any request is routed.
    this.upstreamOrigin = new URL('/', deps.upstreamOrigin).origin;
  }

  async handle(req: RequestLike): Promise<GatewayResponse> {
    try {
      return await this.route(req);
    } catch (error) {
      if (error instanceof GatewayError) return errorResponse(error);
      throw error;
    }
  }

  private json(status: number, payload: unknown): GatewayResponse {
    return { status, headers: contractHeaders(), body: JSON.stringify(payload) };
  }

  private empty(status: number): GatewayResponse {
    return { status, headers: { 'x-contract-version': CONTRACT_VERSION }, body: '' };
  }

  private requireLoopback(req: RequestLike): void {
    if (!isLoopbackIp(req.peerIp)) {
      throw new GatewayError(ERROR_CODES.NOT_LOOPBACK, 'management endpoint accepts loopback peers only');
    }
  }

  private checkWhitelist(req: RequestLike): void {
    this.deps.state.checkWhitelist(req.peerIp, req.headers);
  }

  private requireAuth(req: RequestLike) {
    return this.deps.state.validateToken(
      headerValue(req.headers, 'authorization')?.replace(/^Bearer\s+/i, ''),
      headerValue(req.headers, 'x-device-id'),
    );
  }

  private parseBody(req: RequestLike): Record<string, unknown> {
    if (!req.body || req.body.length === 0) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(req.body.toString('utf8')) as unknown;
    } catch {
      throw unauthorized('invalid JSON body');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw unauthorized('JSON body must be an object');
    }
    return parsed as Record<string, unknown>;
  }

  private async route(req: RequestLike): Promise<GatewayResponse> {
    const method = req.method.toUpperCase();
    const path = req.path.split('?')[0] ?? '';

    // Contract section 1: 1 MiB request ceiling. The contract has no 400 code,
    // so malformed bodies are reported as 401 UNAUTHORIZED elsewhere.
    if (!['GET', 'HEAD'].includes(method) && (req.body?.length ?? 0) > this.deps.config.maxRequestBytes) {
      throw new GatewayError(ERROR_CODES.PAYLOAD_TOO_LARGE, 'request body exceeds 1 MiB');
    }

    if (method === 'GET' && path === '/mobile/health') {
      return this.json(200, {
        status: 'ok',
        pluginVersion: this.deps.config.pluginVersion,
        dshVersion: this.deps.config.dshVersion,
        time: new Date().toISOString(),
      });
    }

    if (method === 'GET' && path === '/mobile/version') {
      return this.json(200, {
        plugin: this.deps.config.pluginUpdate,
        app: this.deps.config.appUpdate,
      });
    }

    if (method === 'POST' && path === '/mobile/pair') return this.pair(req);

    if (method === 'POST' && path === '/mobile/token/refresh') {
      this.checkWhitelist(req);
      const token = this.requireAuth(req);
      const next = this.deps.state.rotateToken(token.token, token.deviceId);
      return this.json(200, { token: next.token, issuedAt: next.issuedAt, expiresAt: next.expiresAt });
    }

    if (method === 'GET' && path === '/mobile/devices') {
      this.requireLoopback(req);
      this.checkWhitelist(req);
      return this.json(200, { devices: this.deps.state.listDevices() });
    }

    if (method === 'DELETE' && path.startsWith('/mobile/devices/')) {
      this.requireLoopback(req);
      this.checkWhitelist(req);
      this.requireAuth(req);
      const deviceId = path.slice('/mobile/devices/'.length);
      if (!deviceId || !this.deps.state.revokeDevice(deviceId)) {
        throw new GatewayError(ERROR_CODES.NOT_FOUND, 'unknown deviceId');
      }
      return this.empty(204);
    }

    if (method === 'GET' && path === '/mobile/whitelist') {
      this.requireLoopback(req);
      return this.json(200, this.deps.state.currentWhitelist);
    }

    if (method === 'PUT' && path === '/mobile/whitelist') {
      this.requireLoopback(req);
      this.checkWhitelist(req);
      this.requireAuth(req);
      const body = this.parseBody(req);
      if (!Array.isArray(body.trustedProxies) || !Array.isArray(body.allowUsers)
        || typeof body.userHeader !== 'string') {
        throw unauthorized('whitelist must contain trustedProxies, allowUsers and userHeader');
      }
      this.deps.state.setWhitelist({
        trustedProxies: body.trustedProxies.filter((entry): entry is string => typeof entry === 'string'),
        allowUsers: body.allowUsers.filter((entry): entry is string => typeof entry === 'string'),
        userHeader: body.userHeader,
      });
      return this.json(200, this.deps.state.currentWhitelist);
    }

    if (method === 'GET' && path === '/mobile/ca') {
      this.requireLoopback(req);
      return this.json(200, {
        active: {
          caFingerprint: this.deps.state.caFingerprint,
          notBefore: this.deps.config.caValidity.notBefore,
          notAfter: this.deps.config.caValidity.notAfter,
          status: 'active',
        },
        retired: [],
      });
    }

    if (method === 'POST' && path === '/mobile/ca/leaf/rotate') {
      this.requireLoopback(req);
      this.checkWhitelist(req);
      this.requireAuth(req);
      // TODO(real-cert): reissue the leaf with the same CA and reload TLS.
      return this.json(200, {
        caFingerprint: this.deps.state.caFingerprint,
        rotatedAt: new Date().toISOString(),
      });
    }

    if (method === 'POST' && path === '/mobile/ca/rotate') {
      this.requireLoopback(req);
      this.checkWhitelist(req);
      this.requireAuth(req);
      // TODO(real-cert): generate a new CA, start a dual-Origin overlap window.
      const placeholder = createHash('sha256').update('dsh-harmony ca/rotate stub').digest('hex');
      this.deps.state.rotateCaStub(placeholder, this.deps.config.origin);
      return this.json(200, {
        caFingerprint: placeholder,
        newOrigin: this.deps.config.origin,
        rePairRequired: true,
      });
    }

    if (path.startsWith('/mobile/api/')) {
      this.checkWhitelist(req);
      this.requireAuth(req);
      return this.proxy(req);
    }

    throw new GatewayError(ERROR_CODES.NOT_FOUND, 'unknown endpoint');
  }

  private pair(req: RequestLike): GatewayResponse {
    this.checkWhitelist(req);
    if (!this.deps.state.allowPairingAttempt(req.peerIp)) {
      throw new GatewayError(ERROR_CODES.RATE_LIMITED, 'too many pairing attempts');
    }

    const body = this.parseBody(req);
    const key = asText(body.pairingKey);
    if (!key) throw unauthorized('pairingKey is required');

    const record = this.deps.state.getPairingRecord(key);
    if (!record) throw new GatewayError(ERROR_CODES.PAIRING_CONSUMED, 'unknown pairing key');

    // ADR-0008: the anchor pinned in the scan payload must match the anchor
    // this gateway would return. Refuse before consuming the key or writing state.
    const current = this.deps.state.caFingerprint;
    if (current !== record.payload.caFingerprint) {
      throw new GatewayError(ERROR_CODES.CA_FINGERPRINT_MISMATCH, 'CA anchor changed after pairing key was issued');
    }

    const { device, token } = this.deps.state.registerDevice(
      asText(body.deviceName, 'mobile'),
      asText(body.platform, 'harmony'),
      record.payload.caFingerprint,
    );
    this.deps.state.consume(key);

    return this.json(201, {
      deviceId: device.deviceId,
      token: token.token,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      caFingerprint: record.payload.caFingerprint,
    });
  }

  private async proxy(req: RequestLike): Promise<GatewayResponse> {
    const url = new URL(req.path, this.upstreamOrigin);
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (!value || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
      headers[name] = Array.isArray(value) ? (value[0] ?? '') : value;
    }

    const method = req.method.toUpperCase();
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.deps.config.upstreamTimeoutMs),
    };
    if (!['GET', 'HEAD'].includes(method)) {
      init.body = req.body ? new Uint8Array(req.body) : undefined;
    }

    let upstream: Response;
    try {
      upstream = await this.fetchImpl(url, init);
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new GatewayError(
        timedOut ? ERROR_CODES.UPSTREAM_TIMEOUT : ERROR_CODES.UPSTREAM_UNREACHABLE,
        timedOut ? 'DSH Host did not respond in time' : 'DSH Host is unreachable',
      );
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    const responseHeaders: Record<string, string> = {
      'x-contract-version': upstream.headers.get('x-contract-version') ?? CONTRACT_VERSION,
      'cache-control': 'no-store',
    };
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders['content-type'] = contentType;

    // Section 3.6: pass Host 2xx/4xx/5xx body and X-Contract-Version through.
    return { status: upstream.status, headers: responseHeaders, body: bytes };
  }
}
