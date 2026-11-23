/** Contract section 5 errors. */

import { ERROR_CODES, ERROR_STATUS } from './constants.js';
import type { ErrorCode } from './constants.js';
import { contractHeaders } from './config.js';
import type { GatewayResponse } from './types.js';

export class GatewayError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'GatewayError';
    this.code = code;
    this.status = ERROR_STATUS[code];
  }
}

export function errorResponse(error: GatewayError): GatewayResponse {
  return {
    status: error.status,
    headers: contractHeaders(),
    body: JSON.stringify({ error: { code: error.code, message: error.message } }),
  };
}

export function unauthorized(message?: string): GatewayError {
  return new GatewayError(ERROR_CODES.UNAUTHORIZED, message);
}

export function invalidRequest(message?: string): GatewayError {
  return new GatewayError(ERROR_CODES.INVALID_REQUEST, message);
}
