import { resolveConfig } from '../src/config.js';
import { MobileGateway } from '../src/gateway.js';
import { GatewayState, defaultClock } from '../src/state.js';
import type { StateClock } from '../src/state.js';
import type { GatewayResponse, HarmonyConfig, RequestLike, ResolvedConfig } from '../src/types.js';

export const TEST_FINGERPRINT = 'a'.repeat(64);

export interface TestClock extends StateClock {
  advance(ms: number): void;
  set(ms: number): void;
}

export function fixedClock(startMs = 1_700_000_000_000): TestClock {
  let now = startMs;
  let seq = 0;
  return {
    now: () => new Date(now),
    uuid: () => `device-${++seq}`,
    opaque: () => `opaque-${++seq}`,
    advance: (ms) => { now += ms; },
    set: (ms) => { now = ms; },
  };
}

export function makeConfig(overrides: Partial<HarmonyConfig> = {}): HarmonyConfig {
  return {
    host: '127.0.0.1',
    port: 3443,
    origin: 'https://127.0.0.1:3443',
    tls: { certFile: 'unused-cert.pem', keyFile: 'unused-key.pem' },
    ca: { fingerprint: TEST_FINGERPRINT },
    pluginVersion: '0.1.0',
    dshVersion: '0.2.3-alpha.2',
    maxRequestBytes: 1024,
    wsMaxPayloadBytes: 2048,
    upstreamTimeoutMs: 50,
    pairingTtlMs: 5_000,
    tokenTtlMs: 60_000,
    whitelist: { trustedProxies: [], allowUsers: [], userHeader: 'x-forwarded-user' },
    dshHome: '/tmp/dsh-harmony-test',
    ...overrides,
  };
}

export function makeResolved(overrides: Partial<HarmonyConfig> = {}): ResolvedConfig {
  return resolveConfig(makeConfig(overrides));
}

export function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  options: { peerIp?: string; headers?: Record<string, string> } = {},
): RequestLike {
  return {
    method,
    path,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
    peerIp: options.peerIp ?? '127.0.0.1',
  };
}

export interface Harness {
  config: ResolvedConfig;
  clock: TestClock;
  state: GatewayState;
  gateway: MobileGateway;
}

export function makeHarness(
  overrides: Partial<HarmonyConfig> = {},
  options: { clock?: TestClock; fetchImpl?: typeof fetch } = {},
): Harness {
  const config = makeResolved(overrides);
  const clock = options.clock ?? fixedClock();
  const state = new GatewayState(config, clock);
  const gateway = new MobileGateway({
    config,
    state,
    upstreamOrigin: 'http://127.0.0.1:3080',
    fetchImpl: options.fetchImpl,
  });
  return { config, clock, state, gateway };
}

export function decode(response: GatewayResponse): any {
  return typeof response.body === 'string' ? JSON.parse(response.body) : JSON.parse(response.body.toString('utf8'));
}

export async function pair(harness: Harness, options: { peerIp?: string } = {}): Promise<any> {
  const key = harness.state.createPairingKey();
  const response = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', {
    pairingKey: key.pairingKey,
    deviceName: 'test phone',
    platform: 'harmony',
  }, { peerIp: options.peerIp ?? '127.0.0.1' }));
  return { key, response, body: decode(response) };
}

export function authHeaders(token: string, deviceId: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'x-device-id': deviceId };
}

export { defaultClock };
