/** Workspace path constants from docs/design/02-architecture.md section 3.3 and ADR-0008. */

import os from 'node:os';
import path from 'node:path';

export const MOBILE_ACCESS_DIR_NAME = 'mobile-access';

/** Cert subdirectories. The plugin never creates or writes key material in M3. */
export const CERT_SUBDIRS = {
  ca: 'certs/ca',
  remoteCa: 'certs/remote-ca',
  server: 'certs/server',
} as const;

/** Declared only: ADR-0008 requires 0600 and no repository/artifact copies. */
export const SENSITIVE_KEY_PATHS = {
  ca: 'certs/ca/ca.key',
  remoteCa: 'certs/remote-ca/ca.key',
  server: 'certs/server/server.key',
} as const;

/** M3 keeps these stores in memory; paths are reserved for a later slice. */
export const RESERVED_STORE_FILES = {
  state: 'state.json',
  devices: 'devices.json',
  tokens: 'tokens.json',
  pairingKeys: 'pairing-keys.json',
  whitelist: 'whitelist.json',
} as const;

export function resolveDshHome(explicit?: string): string {
  if (explicit && explicit.trim() !== '') return explicit;
  return process.env.DSH_HOME ?? os.homedir();
}

export function mobileAccessDir(dshHome?: string): string {
  return path.join(resolveDshHome(dshHome), MOBILE_ACCESS_DIR_NAME);
}

export function defaultServerCertPaths(dshHome?: string): { certFile: string; keyFile: string } {
  const dir = path.join(mobileAccessDir(dshHome), CERT_SUBDIRS.server);
  return {
    certFile: path.join(dir, 'server.crt'),
    keyFile: path.join(dir, 'server.key'),
  };
}

export function defaultAnchorCertPath(dshHome?: string): string {
  return path.join(mobileAccessDir(dshHome), CERT_SUBDIRS.ca, 'ca.crt');
}
