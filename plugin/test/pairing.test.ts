import assert from 'node:assert/strict';
import test from 'node:test';
import { ERROR_CODES, PAIRING_TTL_MS } from '../src/constants.js';
import {
  authHeaders,
  decode,
  fixedClock,
  makeHarness,
  makeRequest,
  pair,
} from './helpers.js';

test('pairing key is one-shot and expires after the configured TTL', async () => {
  const clock = fixedClock();
  const harness = makeHarness({ pairingTtlMs: PAIRING_TTL_MS }, { clock });
  const first = await pair(harness);
  assert.equal(first.response.status, 201);
  assert.equal(first.body.caFingerprint, 'a'.repeat(64));
  assert.deepEqual(Object.keys(first.body).sort(), [
    'caFingerprint', 'deviceId', 'expiresAt', 'issuedAt', 'token',
  ]);

  const replay = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', {
    pairingKey: first.key.pairingKey,
    deviceName: 'again',
    platform: 'harmony',
  }));
  assert.equal(replay.status, 409);
  assert.equal(decode(replay).error.code, ERROR_CODES.PAIRING_CONSUMED);

  clock.advance(PAIRING_TTL_MS + 1);
  const expired = harness.state.createPairingKey();
  clock.advance(PAIRING_TTL_MS + 1);
  const response = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', {
    pairingKey: expired.pairingKey,
    deviceName: 'late',
    platform: 'harmony',
  }));
  assert.equal(response.status, 409);
  assert.equal(decode(response).error.code, ERROR_CODES.PAIRING_CONSUMED);
});

test('CA fingerprint mismatch is rejected before the key is consumed', async () => {
  const harness = makeHarness();
  const key = harness.state.createPairingKey();
  harness.config.ca.fingerprint = 'b'.repeat(64);

  const response = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', {
    pairingKey: key.pairingKey,
    deviceName: 'phone',
    platform: 'harmony',
  }));
  assert.equal(response.status, 403);
  assert.equal(decode(response).error.code, ERROR_CODES.CA_FINGERPRINT_MISMATCH);
  assert.equal(harness.state.listDevices().length, 0);

  harness.config.ca.fingerprint = key.caFingerprint;
  const retry = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', {
    pairingKey: key.pairingKey,
    deviceName: 'phone',
    platform: 'harmony',
  }));
  assert.equal(retry.status, 201);
});

test('token refresh rotates the token and revokes the old one', async () => {
  const harness = makeHarness();
  const paired = await pair(harness);
  const headers = authHeaders(paired.body.token, paired.body.deviceId);

  const response = await harness.gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}, { headers }));
  assert.equal(response.status, 200);
  const refreshed = decode(response);
  assert.notEqual(refreshed.token, paired.body.token);
  assert.deepEqual(Object.keys(refreshed).sort(), ['expiresAt', 'issuedAt', 'token']);

  const oldToken = await harness.gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}, {
    headers: authHeaders(paired.body.token, paired.body.deviceId),
  }));
  assert.equal(oldToken.status, 401);
  assert.equal(decode(oldToken).error.code, ERROR_CODES.UNAUTHORIZED);

  const mismatchedDevice = await harness.gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}, {
    headers: authHeaders(refreshed.token, 'other-device'),
  }));
  assert.equal(mismatchedDevice.status, 403);
  assert.equal(decode(mismatchedDevice).error.code, ERROR_CODES.DEVICE_UNAUTHORIZED);
});

test('device deletion revokes its token immediately and returns 204', async () => {
  const harness = makeHarness();
  const first = await pair(harness);
  const second = await pair(harness);

  const response = await harness.gateway.handle(makeRequest(
    'DELETE',
    `/mobile/devices/${first.body.deviceId}`,
    undefined,
    { headers: authHeaders(second.body.token, second.body.deviceId) },
  ));
  assert.equal(response.status, 204);
  assert.equal(response.body, '');

  const revoked = await harness.gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}, {
    headers: authHeaders(first.body.token, first.body.deviceId),
  }));
  // ADR-0008 section 5.1 accepts either 401 UNAUTHORIZED or DEVICE_UNAUTHORIZED.
  assert.equal(revoked.status, 401);
  assert.equal(decode(revoked).error.code, ERROR_CODES.UNAUTHORIZED);

  const devices = decode(await harness.gateway.handle(makeRequest('GET', '/mobile/devices')));
  assert.equal(devices.devices.length, 2);
  assert.equal(devices.devices.filter((d: any) => d.reachable).length, 1);
  for (const device of devices.devices) {
    assert.deepEqual(Object.keys(device).sort(), [
      'deviceId', 'lastSeenAt', 'name', 'origin', 'platform', 'reachable',
    ]);
  }
});

test('whitelist PUT is loopback + auth and GET reflects the new policy', async () => {
  const harness = makeHarness();
  const paired = await pair(harness);
  const next = { trustedProxies: ['10.0.0.1'], allowUsers: ['u1@x'], userHeader: 'x-forwarded-user' };

  const denied = await harness.gateway.handle(makeRequest('PUT', '/mobile/whitelist', next, {
    peerIp: '192.0.2.7',
    headers: authHeaders(paired.body.token, paired.body.deviceId),
  }));
  assert.equal(denied.status, 403);
  assert.equal(decode(denied).error.code, ERROR_CODES.NOT_LOOPBACK);

  const updated = await harness.gateway.handle(makeRequest('PUT', '/mobile/whitelist', next, {
    headers: authHeaders(paired.body.token, paired.body.deviceId),
  }));
  assert.equal(updated.status, 200);
  assert.deepEqual(decode(updated), next);

  const readBack = decode(await harness.gateway.handle(makeRequest('GET', '/mobile/whitelist')));
  assert.deepEqual(readBack, next);
});

test('CA stubs return contract shapes; leaf rotate keeps tokens, CA rotate invalidates them', async () => {
  const harness = makeHarness();
  const paired = await pair(harness);
  const headers = authHeaders(paired.body.token, paired.body.deviceId);

  const ca = decode(await harness.gateway.handle(makeRequest('GET', '/mobile/ca')));
  assert.deepEqual(Object.keys(ca).sort(), ['active', 'retired']);
  assert.deepEqual(Object.keys(ca.active).sort(), ['caFingerprint', 'notAfter', 'notBefore', 'status']);
  assert.equal(ca.active.status, 'active');
  assert.deepEqual(ca.retired, []);

  const leaf = decode(await harness.gateway.handle(makeRequest('POST', '/mobile/ca/leaf/rotate', {}, { headers })));
  assert.deepEqual(Object.keys(leaf).sort(), ['caFingerprint', 'rotatedAt']);
  assert.equal(leaf.caFingerprint, 'a'.repeat(64));
  const stillValid = await harness.gateway.handle(makeRequest('POST', '/mobile/token/refresh', {}, { headers }));
  assert.equal(stillValid.status, 200);
  const fresh = decode(stillValid);
  const freshHeaders = authHeaders(fresh.token, paired.body.deviceId);

  const rotated = decode(await harness.gateway.handle(makeRequest('POST', '/mobile/ca/rotate', {}, { headers: freshHeaders })));
  assert.deepEqual(Object.keys(rotated).sort(), ['caFingerprint', 'newOrigin', 'rePairRequired']);
  assert.equal(rotated.rePairRequired, true);
  assert.match(rotated.caFingerprint, /^[0-9a-f]{64}$/);

  const invalidated = await harness.gateway.handle(makeRequest('GET', '/mobile/api/ping', undefined, { headers: freshHeaders }));
  assert.equal(invalidated.status, 401);
  assert.equal(decode(invalidated).error.code, ERROR_CODES.UNAUTHORIZED);
});

test('pairing is rate limited by peer IP', async () => {
  const harness = makeHarness();
  let lastStatus = 200;
  for (let index = 0; index < 11; index += 1) {
    const response = await harness.gateway.handle(makeRequest('POST', '/mobile/pair', { pairingKey: 'bad' }));
    lastStatus = response.status;
  }
  assert.equal(lastStatus, 429);
  assert.equal(decode(await harness.gateway.handle(makeRequest('POST', '/mobile/pair', { pairingKey: 'bad' }))).error.code, ERROR_CODES.RATE_LIMITED);
});
