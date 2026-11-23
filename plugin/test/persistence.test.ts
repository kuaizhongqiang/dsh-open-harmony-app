import assert from 'node:assert/strict';
import test from 'node:test';
import { makeResolved, fixedClock } from './helpers.js';
import { GatewayState } from '../src/state.js';
import { MemoryStateStore, secretHash } from '../src/store.js';

test('state survives restart without storing plaintext tokens or pairing keys', () => {
  const store = new MemoryStateStore();
  const config = makeResolved();
  const clock = fixedClock();

  const first = new GatewayState(config, clock, store);
  const pairing = first.createPairingKey();
  const registered = first.registerDevice('Phone', 'harmony', config.ca.fingerprint);
  first.setWhitelist({ trustedProxies: ['10.0.0.1'], allowUsers: ['u@x'], userHeader: 'x-user' });

  const persisted = JSON.stringify(store.load());
  assert.ok(!persisted.includes(pairing.pairingKey));
  assert.ok(!persisted.includes(registered.token.token));
  assert.ok(persisted.includes(secretHash(pairing.pairingKey)));
  assert.ok(persisted.includes(secretHash(registered.token.token)));

  const restored = new GatewayState(config, clock, store);
  assert.deepEqual(restored.currentWhitelist, {
    trustedProxies: ['10.0.0.1'],
    allowUsers: ['u@x'],
    userHeader: 'x-user',
  });
  assert.ok(restored.getPairingRecord(pairing.pairingKey));
  assert.deepEqual(restored.listDevices()[0]?.deviceId, registered.device.deviceId);
  assert.equal(
    restored.validateToken(registered.token.token, registered.device.deviceId).deviceId,
    registered.device.deviceId,
  );
});

test('consumed pairing keys stay consumed after restart', () => {
  const store = new MemoryStateStore();
  const config = makeResolved();
  const clock = fixedClock();
  const first = new GatewayState(config, clock, store);
  const pairing = first.createPairingKey();
  first.consume(pairing.pairingKey);

  const restored = new GatewayState(config, clock, store);
  assert.throws(() => restored.getPairingRecord(pairing.pairingKey), /pairing key is used or expired/);
});
