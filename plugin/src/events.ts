/**
 * WebSocket event mapping skeleton.
 *
 * Source of truth: docs/design/03-contracts.md v0.5 section 4 and
 * docs/review/02-contracts-review.md "Event vocabulary check". DSH emits
 * namespace/verb names; the contract names are synthetic and MUST be mapped,
 * never passed through verbatim.
 *
 * | contract type  | DSH source                                      | rule                          |
 * |----------------|-------------------------------------------------|-------------------------------|
 * | session.updated| session/title + api-session/added/activity       | merge multiple sources        |
 * | message.delta  | assistant-stream chunk (attemptId/index/chunk)   | chunk->delta, attemptId->id   |
 * | tool.call      | tool/call {turn,step,callId,name,arguments}      | name->toolName, add sessionId |
 * | agent.status   | api-session/status / SessionState                | from API/Cordis, not log      |
 * | ping/pong      | none                                            | contract-only heartbeat       |
 *
 * Path admission (exact /mobile/ws only) follows plugin/AGENT.md section 2.4.
 */

import type { ContractEvent } from './types.js';

export interface DshEventLike {
  type: string;
  [key: string]: unknown;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Map one DSH event to the contract shape; return null when it is not subscribed. */
export function mapDshEvent(event: DshEventLike): ContractEvent | null {
  const sessionId = text(event.sessionId);
  switch (event.type) {
    case 'session/title':
    case 'api-session/added':
    case 'api-session/activity':
      // TODO(real-events): merge title + added/activity into one projection.
      return {
        type: 'session.updated',
        payload: {
          sessionId,
          title: text(event.title),
          updatedAt: text(event.updatedAt, new Date().toISOString()),
        },
      };
    case 'assistant-stream/chunk':
    case 'chunk':
      // TODO(real-events): consume the stream frame, not a synthesized event.
      return {
        type: 'message.delta',
        payload: {
          sessionId,
          messageId: text(event.attemptId),
          delta: text(event.chunk),
        },
      };
    case 'tool/call':
      // TODO(real-events): read turn/step/callId from the real frame.
      return {
        type: 'tool.call',
        payload: {
          sessionId,
          toolName: text(event.name),
          args: event.arguments ?? {},
        },
      };
    case 'api-session/status':
    case 'SessionState':
      // TODO(real-events): map the full SessionState enum.
      return {
        type: 'agent.status',
        payload: {
          sessionId,
          status: event.running === true ? 'running' : 'idle',
        },
      };
    default:
      return null;
  }
}

/** Synthetic first event emitted after subscribe in M3, built through the mapper. */
export function stubSessionUpdated(sessionId: string, now: string): ContractEvent | null {
  return mapDshEvent({
    type: 'session/title',
    sessionId,
    title: 'M3 stub session',
    updatedAt: now,
  });
}

export function authErrorFrame(): string {
  return JSON.stringify({ type: 'error', code: 401 });
}

export function eventFrame(event: ContractEvent): string {
  return JSON.stringify(event);
}

export function pongFrame(): string {
  return JSON.stringify({ type: 'pong', payload: {} });
}
