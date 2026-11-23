import assert from 'node:assert/strict';
import test from 'node:test';
import { ERROR_CODES } from '../src/constants.js';
import {
  authHeaders,
  decode,
  makeHarness,
  makeRequest,
  pair,
} from './helpers.js';

function fakeFetch(status: number, body: string, headers: Record<string, string> = {}): typeof fetch {
  const nullBody = status === 204 || status === 205 || status === 304;
  return (async () => new Response(nullBody ? null : body, { status, headers })) as typeof fetch;
}

test('GET /mobile/health returns the v0.5 shape without auth', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle(makeRequest('GET', '/mobile/health', undefined, { peerIp: '192.0.2.1' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers['x-contract-version'], 'v0.1');
  const body = decode(response);
  assert.equal(body.status, 'ok');
  assert.equal(body.pluginVersion, '0.1.0');
  assert.equal(body.dshVersion, '0.2.3-alpha.2');
  assert.ok(!Number.isNaN(Date.parse(body.time)));
});

test('GET /mobile/version returns plugin/app VersionInfo', async () => {
  const { gateway } = makeHarness();
  const body = decode(await gateway.handle(makeRequest('GET', '/mobile/version')));
  assert.deepEqual(Object.keys(body.plugin).sort(), ['current', 'latest', 'required', 'sha256', 'url']);
  assert.deepEqual(Object.keys(body.app).sort(), ['current', 'latest', 'required', 'sha256', 'url']);
});

test('unknown endpoint is 404 NOT_FOUND', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle(makeRequest('GET', '/mobile/nope'));
  assert.equal(response.status, 404);
  assert.equal(decode(response).error.code, ERROR_CODES.NOT_FOUND);
});

test('writes require Bearer token and X-Device-Id', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}));
  assert.equal(response.status, 401);
  assert.equal(decode(response).error.code, ERROR_CODES.UNAUTHORIZED);
});

test('malformed JSON body is 400 INVALID_REQUEST', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle({
    method: 'POST',
    path: '/mobile/pair',
    headers: { 'content-type': 'application/json' },
    body: Buffer.from('{not json'),
    peerIp: '127.0.0.1',
  });
  assert.equal(response.status, 400);
  assert.equal(decode(response).error.code, ERROR_CODES.INVALID_REQUEST);
});

test('JSON array body is 400 INVALID_REQUEST', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle({
    method: 'POST',
    path: '/mobile/pair',
    headers: { 'content-type': 'application/json' },
    body: Buffer.from('[]'),
    peerIp: '127.0.0.1',
  });
  assert.equal(response.status, 400);
  assert.equal(decode(response).error.code, ERROR_CODES.INVALID_REQUEST);
});

test('management reads accept loopback only', async () => {
  const { gateway } = makeHarness();
  const response = await gateway.handle(makeRequest('GET', '/mobile/devices', undefined, { peerIp: '192.0.2.5' }));
  assert.equal(response.status, 403);
  assert.equal(decode(response).error.code, ERROR_CODES.NOT_LOOPBACK);
});

test('request body over 1 MiB is 413 PAYLOAD_TOO_LARGE', async () => {
  const { gateway, config } = makeHarness();
  const raw = Buffer.alloc(config.maxRequestBytes + 1, 0x61);
  const response = await gateway.handle({
    method: 'POST',
    path: '/mobile/pair',
    headers: {},
    body: raw,
    peerIp: '127.0.0.1',
  });
  assert.equal(response.status, 413);
  assert.equal(decode(response).error.code, ERROR_CODES.PAYLOAD_TOO_LARGE);
});

test('whitelist has an independent user gate', async () => {
  const { gateway, state } = makeHarness();
  state.setWhitelist({ trustedProxies: [], allowUsers: ['u1@x'], userHeader: 'x-forwarded-user' });

  const denied = await gateway.handle(makeRequest('GET', '/mobile/whitelist', undefined, { peerIp: '127.0.0.1' }));
  assert.equal(denied.status, 200); // loopback GET whitelist is a read, no whitelist gate

  const pairDenied = await gateway.handle(makeRequest('POST', '/mobile/pair', { pairingKey: 'x' }));
  assert.equal(pairDenied.status, 403);
  assert.equal(decode(pairDenied).error.code, ERROR_CODES.WHITELIST_DENIED);

  const allowed = await gateway.handle(makeRequest('POST', '/mobile/pair', { pairingKey: 'x' }, {
    headers: { 'x-forwarded-user': 'u1@x' },
  }));
  assert.notEqual(decode(allowed).error?.code, ERROR_CODES.WHITELIST_DENIED);
});

test('proxy passes upstream status, body and contract header through', async () => {
  let seenUrl = '';
  let seenAuth = '';
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    seenUrl = String(input);
    const headers = new Headers(init?.headers);
    seenAuth = headers.get('authorization') ?? '';
    return new Response('{"sessions":[]}', {
      status: 418,
      headers: { 'content-type': 'application/json', 'x-contract-version': 'v0.1-upstream' },
    });
  }) as typeof fetch;

  const harness = makeHarness({}, { fetchImpl });
  const { body } = await pair(harness);
  const response = await harness.gateway.handle(makeRequest('GET', '/mobile/api/sessions?limit=1', undefined, {
    headers: authHeaders(body.token, body.deviceId),
  }));

  assert.equal(response.status, 418);
  assert.equal(response.body.toString(), '{"sessions":[]}');
  assert.equal(response.headers['x-contract-version'], 'v0.1-upstream');
  assert.equal(seenUrl, 'http://127.0.0.1:3080/mobile/api/sessions?limit=1');
  assert.equal(seenAuth, `Bearer ${body.token}`);
});

test('upstream reply over maxReplyBytes is 413 PAYLOAD_TOO_LARGE', async () => {
  const harness = makeHarness({ maxReplyBytes: 16 }, {
    fetchImpl: fakeFetch(200, 'x'.repeat(17)),
  });
  const { body } = await pair(harness);
  const response = await harness.gateway.handle(makeRequest('GET', '/mobile/api/large', undefined, {
    headers: authHeaders(body.token, body.deviceId),
  }));
  assert.equal(response.status, 413);
  assert.equal(decode(response).error.code, ERROR_CODES.PAYLOAD_TOO_LARGE);
});

test('proxy maps unreachable host and timeout to 502/504', async () => {
  const unreachable = makeHarness({}, {
    fetchImpl: (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch,
  });
  const paired = await pair(unreachable);
  const response = await unreachable.gateway.handle(makeRequest('GET', '/mobile/api/ping', undefined, {
    headers: authHeaders(paired.body.token, paired.body.deviceId),
  }));
  assert.equal(response.status, 502);
  assert.equal(decode(response).error.code, ERROR_CODES.UPSTREAM_UNREACHABLE);

  const timeout = makeHarness({}, {
    fetchImpl: (async () => {
      const error = new Error('timeout');
      error.name = 'TimeoutError';
      throw error;
    }) as typeof fetch,
  });
  const timedPair = await pair(timeout);
  const timedResponse = await timeout.gateway.handle(makeRequest('GET', '/mobile/api/ping', undefined, {
    headers: authHeaders(timedPair.body.token, timedPair.body.deviceId),
  }));
  assert.equal(timedResponse.status, 504);
  assert.equal(decode(timedResponse).error.code, ERROR_CODES.UPSTREAM_TIMEOUT);
});

test('proxy uses a gateway Generated error when upstream omits X-Contract-Version', async () => {
  const harness = makeHarness({}, {
    fetchImpl: fakeFetch(204, ''),
  });
  const paired = await pair(harness);
  const response = await harness.gateway.handle(makeRequest('GET', '/mobile/api/no-header', undefined, {
    headers: authHeaders(paired.body.token, paired.body.deviceId),
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers['x-contract-version'], 'v0.1');
});
