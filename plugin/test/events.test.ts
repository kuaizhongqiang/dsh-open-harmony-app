import assert from 'node:assert/strict';
import test from 'node:test';
import { authErrorFrame, mapDshEvent, pongFrame, stubSessionUpdated } from '../src/events.js';
import { mobileAccessDir, defaultServerCertPaths, SENSITIVE_KEY_PATHS } from '../src/workspace.js';

test('DSH events map to the four synthetic contract types', () => {
  assert.deepEqual(mapDshEvent({ type: 'session/title', sessionId: 's1', title: 'T', updatedAt: 'now' }), {
    type: 'session.updated',
    payload: { sessionId: 's1', title: 'T', updatedAt: 'now' },
  });

  assert.deepEqual(mapDshEvent({
    type: 'assistant-stream/chunk',
    sessionId: 's1',
    attemptId: 'a1',
    chunk: 'hi',
  }), {
    type: 'message.delta',
    payload: { sessionId: 's1', messageId: 'a1', delta: 'hi' },
  });

  assert.deepEqual(mapDshEvent({
    type: 'tool/call',
    sessionId: 's1',
    name: 'shell',
    arguments: { cmd: 'ls' },
  }), {
    type: 'tool.call',
    payload: { sessionId: 's1', toolName: 'shell', args: { cmd: 'ls' } },
  });

  assert.deepEqual(mapDshEvent({ type: 'api-session/status', sessionId: 's1', running: true }), {
    type: 'agent.status',
    payload: { sessionId: 's1', status: 'running' },
  });

  assert.equal(mapDshEvent({ type: 'unknown/verb' }), null);
});

test('WS frames keep the contract shape', () => {
  assert.deepEqual(JSON.parse(authErrorFrame()), { type: 'error', code: 401 });
  assert.deepEqual(JSON.parse(pongFrame()), { type: 'pong', payload: {} });
  assert.equal(stubSessionUpdated('s1', 'now')?.type, 'session.updated');
});

test('workspace constants point at mobile-access without creating key material', () => {
  const dir = mobileAccessDir('/tmp/home');
  assert.equal(dir.replaceAll('\\', '/'), '/tmp/home/mobile-access');
  const certs = defaultServerCertPaths('/tmp/home');
  assert.equal(certs.certFile.replaceAll('\\', '/'), '/tmp/home/mobile-access/certs/server/server.crt');
  assert.equal(SENSITIVE_KEY_PATHS.ca, 'certs/ca/ca.key');
});
