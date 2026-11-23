// Field-level models mirror docs/design/03-contracts.md v0.4 (the single source of truth).
// Keep names camelCase; timestamps are ISO8601 UTC. Do not add fields here without
// changing the contract first and shipping the plugin side in the same change.

export interface HealthResult {
  status: string;
  pluginVersion: string;
  dshVersion: string;
  time: string;
}

export interface PairRequest {
  pairingKey: string;
  deviceName: string;
  platform: string;
}

export interface PairResult {
  deviceId: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
  caFingerprint: string;
}

export interface PairingPayload {
  v: number;
  pairingKey: string;
  origin: string;
  expiresAt: string;
  caFingerprint: string;
}

// Contract §4: these are synthesized names, not raw DSH event names.
export interface WsEvent {
  type: string;
  sessionId?: string;
  title?: string;
  updatedAt?: string;
  messageId?: string;
  delta?: string;
  toolName?: string;
  status?: string;
  raw: string;
}

export interface AuthFrame {
  type: string;
  token: string;
  deviceId: string;
}

export interface SubscribeFrame {
  type: string;
  sessionId?: string;
}

export interface ErrorBody {
  code: string;
}

export interface ErrorFrameBody {
  error?: ErrorBody;
}

// Typed exception carrying both the HTTP status and the contract machine subcode (§5).
export class DshError extends Error {
  readonly httpStatus: number;
  readonly machineCode: string;

  constructor(httpStatus: number, machineCode: string, message: string) {
    super(message);
    this.name = 'DshError';
    this.httpStatus = httpStatus;
    this.machineCode = machineCode;
  }
}

export function describeError(e: Object): string {
  if (e instanceof Error) {
    return (e as Error).message;
  }
  return JSON.stringify(e);
}
