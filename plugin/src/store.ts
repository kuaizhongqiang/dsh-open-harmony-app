/** Persistent gateway state. Secrets are stored only as irreversible SHA-256 hashes. */

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Device, PairingKeyPayload, WhitelistConfig } from './types.js';
import { RESERVED_STORE_FILES, mobileAccessDir } from './workspace.js';

export interface StoredToken {
  tokenHash: string;
  deviceId: string;
  issuedAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface StoredDevice extends Device {
  status: 'active' | 'revoked';
  tokenHash: string;
  caFingerprint: string;
}

export interface StoredPairing {
  keyHash: string;
  payload: PairingKeyPayload;
  consumed: boolean;
  createdAtMs: number;
}

export interface PersistedState {
  schemaVersion: 1;
  devices: StoredDevice[];
  tokens: StoredToken[];
  pairing: StoredPairing[];
  pairingAttempts: Record<string, number[]>;
  whitelist: WhitelistConfig;
}

export interface StateStore {
  load(): PersistedState | undefined;
  save(state: PersistedState): void;
}

export function secretHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class MemoryStateStore implements StateStore {
  private current: PersistedState | undefined;
  load(): PersistedState | undefined {
    return this.current;
  }
  save(state: PersistedState): void {
    this.current = structuredClone(state);
  }
}

export class JsonFileStore implements StateStore {
  private readonly file: string;

  constructor(dshHome?: string) {
    this.file = join(mobileAccessDir(dshHome), RESERVED_STORE_FILES.state);
  }

  load(): PersistedState | undefined {
    if (!existsSync(this.file)) return undefined;
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as PersistedState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`LOCAL_STATE_CORRUPT: unsupported schemaVersion ${String(parsed.schemaVersion)}`);
      }
      return parsed;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('LOCAL_STATE_CORRUPT')) throw error;
      throw new Error('LOCAL_STATE_CORRUPT: state.json is not valid JSON');
    }
  }

  save(state: PersistedState): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = `${this.file}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(state), { mode: 0o600 });
    renameSync(temp, this.file);
  }
}
