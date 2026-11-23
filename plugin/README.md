# dsh-harmony plugin (M3 vertical slice)

This package is the **plugin-side M3 slice** for issues #8/#9/#10. It is an
in-process DSH plugin that opens a separate HTTPS gateway on port 3443 and
relays `/mobile/api/**` to the DSH Host listener obtained from
`ctx.webServer.getOrigin()` (normally `http://127.0.0.1:3080`).

The field-level truth is `docs/design/03-contracts.md` v0.4. This README does
not redefine contract fields.

## Layout

| File | Role |
|---|---|
| `src/index.ts` | Cordis plugin entry (`name`, `inject`, `apply`, `registerPlugin` via `ctx.plugin()`) |
| `src/server.ts` | Node HTTPS listener on 3443 + exact-path `/mobile/ws` upgrade |
| `src/gateway.ts` | Framework-agnostic HTTP router and loopback proxy |
| `src/state.ts` | In-memory devices, tokens, one-shot pairing keys, whitelist, rate limit |
| `src/events.ts` | Contract event mapper skeleton (four synthetic events + ping/pong) |
| `src/config.ts` | Config validation and CA anchor fingerprint derivation |
| `src/workspace.ts` | `$DSH_HOME/mobile-access/` path constants (no key writes) |

## Prerequisites

The HTTPS carrier does **not** generate or write private keys (ADR-0008 red
line). Provide a server certificate and key before starting the gateway. The
default paths are:

```text
$DSH_HOME/mobile-access/certs/server/server.crt
$DSH_HOME/mobile-access/certs/server/server.key
```

For local development only, an operator may create a throwaway self-signed
pair outside the repository, for example:

```powershell
$dir = Join-Path $env:DSH_HOME "mobile-access/certs/server"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes `
  -keyout (Join-Path $dir "server.key") -out (Join-Path $dir "server.crt") `
  -days 90 -subj "/CN=dsh-harmony gateway"
```

Keep `server.key` at mode `0600` on POSIX and never commit it.

The pairing anchor fingerprint must also be available. Set either
`ca.anchorCertFile` (PEM; DER SHA-256 is computed at startup) or
`ca.fingerprint` (64 lowercase hex). Fingerprint-only mode has no real
certificate metadata; `GET /mobile/ca` then returns epoch timestamps and is a
stub.

## Setup / build / test

```powershell
cd <worktree>/plugin
npm install
npm test          # clean + tsc build + node --test dist/test/*.test.js
npm run typecheck # tsc --noEmit
npm run build     # emit dist/
```

`npm test` uses Node's built-in test runner (no vitest required). All tests are
deterministic and do not need a running DSH Host or real certificates.

If the DSH loader loads the package directly, it calls the named exports
`name`, `inject` and `apply`. From an existing Cordis context you can register
explicitly:

```ts
import { registerPlugin } from 'dsh-harmony';

registerPlugin(ctx, {
  tls: { certFile: './server.crt', keyFile: './server.key' },
  ca: { anchorCertFile: './ca.crt' },
  origin: 'https://192.168.1.5:3443',
});
```

## Implemented endpoints

- `GET /mobile/health` (no auth)
- `GET /mobile/version` (no auth; required by contract section 3.7)
- `POST /mobile/pair` (one-shot key, 5 min TTL, CA fingerprint re-check)
- `POST /mobile/token/refresh` (token rotation; old token is revoked)
- `GET /mobile/devices` (loopback read), `DELETE /mobile/devices/:deviceId` (loopback + auth)
- `GET/PUT /mobile/whitelist` (loopback; PUT also requires auth)
- `GET /mobile/ca`, `POST /mobile/ca/leaf/rotate`, `POST /mobile/ca/rotate` (loopback; stubs, see below)
- `* /mobile/api/**` (auth + whitelist, loopback proxy with 502/504/413)
- `WS /mobile/ws` (exact path only; first-frame auth, then subscribe)

Every gateway response carries `X-Contract-Version: v0.1`. Errors use the
machine subcodes in contract section 5 inside `{ error: { code, message } }`.

## Pairing key generation in M3

`POST /mobile/pair` consumes a key but does not create one; the contract has no
endpoint for key issuance. Use the exported helper from the PC-side management
code or a test:

```ts
import { GatewayState, resolveConfig } from 'dsh-harmony';

const state = new GatewayState(resolveConfig(config));
const payload = state.createPairingKey();
const link = `dshpair://v1/${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
```

This produces the contract section 2 payload with a five minute TTL. The key is
single-use and is burned only after the fingerprint comparison succeeds.

## Deliberate M3 stubs

- **Real certificate operations**: no CA/leaf generation, signing, reload,
  revocation or secure erase. `POST /mobile/ca/leaf/rotate` only returns the
  current fingerprint; `POST /mobile/ca/rotate` returns a placeholder new
  fingerprint and revokes all tokens so the re-pairing behavior still holds.
- **CA metadata**: derived from the configured anchor cert when available;
  fingerprint-only mode returns epoch timestamps.
- **Workspaces**: `$DSH_HOME/mobile-access/` paths are declared only. Devices,
  tokens, keys and whitelist live in memory and are lost on restart.
- **WS events**: the mapper has the correct names and field shapes, but the
  DSH stream is not subscribed. One synthetic `session.updated` is emitted
  after `subscribe` to make the vertical slice observable.
- **Reachability**: `Device.reachable` reflects token state, not a network probe.
- **Proxy reply ceiling**: the 12 MiB reply ceiling from section 1 is not
  enforced in this slice; upstream bodies are passed through verbatim.
- **Error 400**: contract section 5 has no 400 code, so malformed JSON bodies
  are reported as `401 UNAUTHORIZED`.

## Security notes

- Management endpoints require the TCP peer to be loopback (`127.0.0.0/8`,
  `::1`, including IPv4-mapped forms).
- Whitelist (`trustedProxies` / `allowUsers` / `userHeader`) is a second,
  independent gate and is checked even for the unauthenticated pairing route.
- WS upgrades are accepted only for the exact path `/mobile/ws`; query strings
  and prefixes are rejected.
- No private key is generated, written, logged or returned by this plugin.
