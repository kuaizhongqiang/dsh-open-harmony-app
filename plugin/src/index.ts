/** dsh-harmony plugin entrypoint. */

import { startGateway } from './server.js';
import type { CordisContext, HarmonyConfig, HarmonyPlugin, PluginContext } from './types.js';

/** Cordis function-plugin identity. The dsh loader calls apply() with its own ctx. */
export const name = 'dsh-harmony';
export const inject = ['webServer'];

export function apply(ctx: PluginContext, config: HarmonyConfig): unknown {
  return ctx.effect(async () => {
    const dispose = await startGateway(ctx, config);
    return dispose;
  }, 'dsh-harmony: HTTPS gateway');
}

const plugin: HarmonyPlugin = { name, inject, apply };

/** Register explicitly from an existing Cordis context via ctx.plugin(). */
export function registerPlugin(ctx: CordisContext, config: HarmonyConfig): unknown {
  return ctx.plugin(plugin, config);
}

export default plugin;

export * from './constants.js';
export * from './types.js';
export * from './config.js';
export * from './events.js';
export { MobileGateway } from './gateway.js';
export type { GatewayDeps } from './gateway.js';
export { GatewayState, defaultClock } from './state.js';
export type { StateClock } from './state.js';
export { startGateway } from './server.js';
export {
  mobileAccessDir,
  resolveDshHome,
  defaultServerCertPaths,
  defaultAnchorCertPath,
  CERT_SUBDIRS,
  SENSITIVE_KEY_PATHS,
  RESERVED_STORE_FILES,
} from './workspace.js';
