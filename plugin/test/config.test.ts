import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveConfig, validateFingerprint } from '../src/config.js';
import { registerPlugin } from '../src/index.js';
import { makeConfig } from './helpers.js';

test('resolveConfig applies contract defaults', () => {
  const config = resolveConfig({
    tls: { certFile: 'cert.pem', keyFile: 'key.pem' },
    ca: { fingerprint: 'a'.repeat(64) },
    dshHome: '/tmp/dsh-harmony-defaults',
  });
  assert.equal(config.port, 3443);
  assert.equal(config.origin, 'https://127.0.0.1:3443');
  assert.equal(config.maxRequestBytes, 1024 * 1024);
  assert.equal(config.wsMaxPayloadBytes, 8 * 1024 * 1024);
  assert.equal(config.pairingTtlMs, 5 * 60 * 1000);
  assert.equal(config.ca.fingerprint, 'a'.repeat(64));
});

test('fingerprint must be 64 lowercase hex characters', () => {
  assert.equal(validateFingerprint('0'.repeat(64)), '0'.repeat(64));
  assert.throws(() => validateFingerprint('A'.repeat(64)), /64 lowercase hex/);
  assert.throws(() => validateFingerprint('abc'), /64 lowercase hex/);
});

test('origin must be explicit https with no path, query or fragment', () => {
  for (const origin of ['http://127.0.0.1:3443', 'https://127.0.0.1', 'https://127.0.0.1:3443/path', 'https://127.0.0.1:3443?q=1']) {
    assert.throws(() => resolveConfig(makeConfig({ origin })), /https:\/\/host:port/);
  }
});

test('registerPlugin registers through ctx.plugin()', () => {
  const registered: Array<{ plugin: { name: string; inject: string[] }; config: unknown }> = [];
  const ctx = {
    webServer: { getOrigin: () => 'http://127.0.0.1:3080' },
    effect: () => undefined,
    plugin: (plugin: { name: string; inject: string[] }, config: unknown) => {
      registered.push({ plugin, config });
      return 'fiber';
    },
  };
  const config = makeConfig();
  assert.equal(registerPlugin(ctx as any, config), 'fiber');
  assert.equal(registered.length, 1);
  assert.equal(registered[0]?.plugin.name, 'dsh-harmony');
  assert.deepEqual(registered[0]?.plugin.inject, ['webServer']);
});
