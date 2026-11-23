/** Config validation and CA anchor fingerprint resolution. */

import { createHash, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  CONTRACT_VERSION,
  DEFAULT_GATEWAY_PORT,
  DEFAULT_TOKEN_TTL_MS,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
  MAX_REPLY_BYTES,
  MAX_REQUEST_BYTES,
  PAIRING_TTL_MS,
  WS_MAX_PAYLOAD_BYTES,
} from './constants.js';
import { DEFAULT_WHITELIST } from './types.js';
import type { HarmonyConfig, ResolvedConfig, VersionInfo } from './types.js';
import { defaultAnchorCertPath, defaultServerCertPaths, resolveDshHome } from './workspace.js';

const FINGERPRINT_RE = /^[0-9a-f]{64}$/;

/** anchor DER SHA-256, 64 lowercase hex, per ADR-0008 and contract section 2. */
export function validateFingerprint(value: string): string {
  if (!FINGERPRINT_RE.test(value)) {
    throw new Error('caFingerprint must be 64 lowercase hex characters (DER SHA-256)');
  }
  return value;
}

function validateOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('origin must be an absolute https://host:port URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/'
    || url.search || url.hash || url.port === '') {
    throw new Error('origin must be https://host:port with an explicit port and no path/query/fragment');
  }
  return url.origin;
}

function versionInfo(current: string, patch: Partial<VersionInfo> | undefined): VersionInfo {
  return {
    current,
    latest: patch?.latest ?? current,
    url: patch?.url ?? '',
    sha256: patch?.sha256 ?? '',
    required: patch?.required ?? false,
  };
}

function readAnchor(input: HarmonyConfig): { fingerprint: string; notBefore: string; notAfter: string } {
  const certFile = input.ca?.anchorCertFile ?? defaultAnchorCertPath(input.dshHome);
  let cert: X509Certificate | undefined;
  try {
    cert = new X509Certificate(readFileSync(certFile));
  } catch {
    // A fingerprint supplied by loopback configuration is sufficient for M3;
    // real certificate operations remain a later slice (ADR-0008 TODO).
  }

  if (cert) {
    return {
      fingerprint: validateFingerprint(createHash('sha256').update(cert.raw).digest('hex')),
      notBefore: new Date(cert.validFrom).toISOString(),
      notAfter: new Date(cert.validTo).toISOString(),
    };
  }

  const fingerprint = input.ca?.fingerprint;
  if (!fingerprint) {
    throw new Error(
      `CA anchor is required: provide ca.fingerprint or a readable ca.anchorCertFile (${certFile})`,
    );
  }
  return {
    fingerprint: validateFingerprint(fingerprint),
    // TODO(real-cert): metadata is unavailable in fingerprint-only mode.
    notBefore: new Date(0).toISOString(),
    notAfter: new Date(0).toISOString(),
  };
}

export function resolveConfig(input: HarmonyConfig): ResolvedConfig {
  const port = input.port ?? DEFAULT_GATEWAY_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('port must be an integer between 1 and 65535');
  }

  const dshHome = resolveDshHome(input.dshHome);
  const defaultTls = defaultServerCertPaths(dshHome);
  const tls = {
    certFile: input.tls?.certFile ?? defaultTls.certFile,
    keyFile: input.tls?.keyFile ?? defaultTls.keyFile,
  };
  if (!tls.certFile || !tls.keyFile) {
    throw new Error('tls.certFile and tls.keyFile are required (the plugin never generates private keys)');
  }

  const origin = validateOrigin(input.origin ?? `https://127.0.0.1:${port}`);
  const anchor = readAnchor({ ...input, dshHome });
  const pluginVersion = input.pluginVersion ?? '0.1.0';

  return {
    host: input.host ?? '0.0.0.0',
    port,
    origin,
    tls,
    ca: { ...input.ca, fingerprint: anchor.fingerprint },
    pluginVersion,
    dshVersion: input.dshVersion ?? '0.2.3-alpha.2',
    pluginUpdate: versionInfo(pluginVersion, input.pluginUpdate),
    appUpdate: versionInfo('0.1.0', input.appUpdate),
    maxRequestBytes: input.maxRequestBytes ?? MAX_REQUEST_BYTES,
    maxReplyBytes: input.maxReplyBytes ?? MAX_REPLY_BYTES,
    wsMaxPayloadBytes: input.wsMaxPayloadBytes ?? WS_MAX_PAYLOAD_BYTES,
    upstreamTimeoutMs: input.upstreamTimeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS,
    pairingTtlMs: input.pairingTtlMs ?? PAIRING_TTL_MS,
    tokenTtlMs: input.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS,
    whitelist: { ...DEFAULT_WHITELIST, ...input.whitelist },
    dshHome,
    caValidity: { notBefore: anchor.notBefore, notAfter: anchor.notAfter },
  };
}

/** Contract header applied to every gateway response. */
export const contractHeaders = (): Record<string, string> => ({
  'content-type': 'application/json',
  'x-contract-version': CONTRACT_VERSION,
  'cache-control': 'no-store',
});
