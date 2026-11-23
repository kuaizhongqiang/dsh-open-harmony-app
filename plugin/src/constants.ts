/** Transport constants from docs/design/03-contracts.md v0.4 section 1. */

export const CONTRACT_VERSION = 'v0.1';
export const DEFAULT_GATEWAY_PORT = 3443;
export const DEFAULT_HOST_PORT = 3080;
export const GATEWAY_WS_PATH = '/mobile/ws';

/** 1 MiB request ceiling, 8 MiB WS binary ceiling, 12 MiB reply ceiling. */
export const MAX_REQUEST_BYTES = 1024 * 1024;
export const WS_MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_REPLY_BYTES = 12 * 1024 * 1024;

/** ADR-0008 section 2.2: one-shot pairing key, five minute TTL. */
export const PAIRING_TTL_MS = 5 * 60 * 1000;

/** M3 implementation choice; the contract only requires issuedAt/expiresAt. */
export const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;

/** Machine subcodes from docs/design/03-contracts.md v0.4 section 5. */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  WHITELIST_DENIED: 'WHITELIST_DENIED',
  NOT_LOOPBACK: 'NOT_LOOPBACK',
  DEVICE_UNAUTHORIZED: 'DEVICE_UNAUTHORIZED',
  CA_FINGERPRINT_MISMATCH: 'CA_FINGERPRINT_MISMATCH',
  NOT_FOUND: 'NOT_FOUND',
  PAIRING_CONSUMED: 'PAIRING_CONSUMED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_UNREACHABLE: 'UPSTREAM_UNREACHABLE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** HTTP status codes mapped from section 5. There is no 400 in the contract. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  WHITELIST_DENIED: 403,
  NOT_LOOPBACK: 403,
  DEVICE_UNAUTHORIZED: 403,
  CA_FINGERPRINT_MISMATCH: 403,
  NOT_FOUND: 404,
  PAIRING_CONSUMED: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UPSTREAM_UNREACHABLE: 502,
  UPSTREAM_TIMEOUT: 504,
};

/** Synthetic contract event names, see section 4 and the review event table. */
export const CONTRACT_EVENT_TYPES = [
  'session.updated',
  'message.delta',
  'tool.call',
  'agent.status',
  'ping',
  'pong',
] as const;

export type ContractEventType = (typeof CONTRACT_EVENT_TYPES)[number];
