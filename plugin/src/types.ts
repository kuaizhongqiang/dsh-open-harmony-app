/** Local structural types. No import from DSH packages at runtime: vendor/ is read-only. */

import type { ContractEventType } from './constants.js';

/** Docs/design/03-contracts.md v0.5 section 2. */
export interface Device {
  deviceId: string;
  name: string;
  platform: string;
  origin: string;
  reachable: boolean;
  lastSeenAt: string;
}

export interface TokenInfo {
  token: string;
  deviceId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface PairingKeyPayload {
  v: 1;
  pairingKey: string;
  origin: string;
  expiresAt: string;
  caFingerprint: string;
}

export interface VersionInfo {
  current: string;
  latest: string;
  url: string;
  sha256: string;
  required: boolean;
}

export interface WhitelistConfig {
  trustedProxies: string[];
  allowUsers: string[];
  userHeader: string;
}

/** OpenClaw-style whitelist defaults. Empty allowUsers disables the user gate. */
export const DEFAULT_WHITELIST: WhitelistConfig = {
  trustedProxies: [],
  allowUsers: [],
  userHeader: 'x-forwarded-user',
};

export interface TlsConfig {
  /** PEM certificate chain, leaf first. Never written by this plugin. */
  certFile: string;
  /** Unencrypted PEM private key. Never written by this plugin. */
  keyFile: string;
}

export interface CaConfig {
  /** Anchor certificate (PEM); used to derive the SHA-256 DER fingerprint. */
  anchorCertFile?: string;
  /** Explicit 64-char lowercase hex fingerprint; required when no cert file is given. */
  fingerprint?: string;
}

export interface HarmonyConfig {
  /** Gateway bind address. Default: 0.0.0.0. */
  host?: string;
  /** Gateway HTTPS port. Default: 3443. */
  port?: number;
  /** Exact https://host:port origin carried in pairing payloads. */
  origin?: string;
  tls: TlsConfig;
  ca: CaConfig;
  pluginVersion?: string;
  dshVersion?: string;
  pluginUpdate?: Partial<VersionInfo>;
  appUpdate?: Partial<VersionInfo>;
  maxRequestBytes?: number;
  maxReplyBytes?: number;
  wsMaxPayloadBytes?: number;
  upstreamTimeoutMs?: number;
  pairingTtlMs?: number;
  tokenTtlMs?: number;
  whitelist?: Partial<WhitelistConfig>;
  /** Override $DSH_HOME for workspace path resolution. */
  dshHome?: string;
}

export interface ResolvedConfig {
  host: string;
  port: number;
  origin: string;
  tls: TlsConfig;
  ca: Required<Pick<CaConfig, 'fingerprint'>> & CaConfig;
  pluginVersion: string;
  dshVersion: string;
  pluginUpdate: VersionInfo;
  appUpdate: VersionInfo;
  maxRequestBytes: number;
  maxReplyBytes: number;
  wsMaxPayloadBytes: number;
  upstreamTimeoutMs: number;
  pairingTtlMs: number;
  tokenTtlMs: number;
  whitelist: WhitelistConfig;
  dshHome: string;
  caValidity: { notBefore: string; notAfter: string };
}

/** Minimal view of @deepseek-ai/dsh-host-webserver used by this plugin. */
export interface WebServerLike {
  /** Loopback origin of the DSH Host listener, e.g. http://127.0.0.1:3080. */
  getOrigin(): string;
}

export type EffectDisposer = () => void | Promise<void>;

/** Minimal view of a Cordis Context. Mirrors ctx.effect() and ctx.plugin(). */
export interface PluginContext {
  webServer: WebServerLike;
  effect(execute: () => void | EffectDisposer | Promise<EffectDisposer>, label?: string): unknown;
}

export interface HarmonyPlugin {
  name: string;
  inject: string[];
  apply(ctx: PluginContext, config: HarmonyConfig): unknown;
}

export interface CordisContext extends PluginContext {
  plugin(plugin: HarmonyPlugin, config?: HarmonyConfig): unknown;
}

/** Framework-agnostic request shape used by the router and its unit tests. */
export interface RequestLike {
  method: string;
  /** Path plus optional query string. */
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: Buffer;
  /** TCP peer address; normalized before routing. */
  peerIp?: string;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: string | Buffer;
}

export interface ContractEvent {
  type: ContractEventType;
  payload: Record<string, unknown>;
}
