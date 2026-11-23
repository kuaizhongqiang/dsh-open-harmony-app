/** Node HTTPS + WebSocket adapter. Route logic lives in gateway.ts. */

import { readFileSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { WebSocket, WebSocketServer } from 'ws';
import { ERROR_CODES, GATEWAY_WS_PATH } from './constants.js';
import { resolveConfig } from './config.js';
import { authErrorFrame, eventFrame, pongFrame, stubSessionUpdated } from './events.js';
import { GatewayError, errorResponse } from './errors.js';
import { MobileGateway } from './gateway.js';
import { GatewayState } from './state.js';
import type { HarmonyConfig, PluginContext, RequestLike } from './types.js';

const WS_AUTH_TIMEOUT_MS = 10_000;
const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_TOO_LARGE = 1009;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Start the HTTPS gateway. Returns an async disposer for Cordis ctx.effect(). */
export async function startGateway(ctx: PluginContext, input: HarmonyConfig): Promise<() => Promise<void>> {
  const config = resolveConfig(input);
  // Read-only: ADR-0008 forbids this plugin from generating or writing key material.
  const cert = readFileSync(config.tls.certFile);
  const key = readFileSync(config.tls.keyFile);

  const state = new GatewayState(config);
  const gateway = new MobileGateway({
    config,
    state,
    upstreamOrigin: ctx.webServer.getOrigin(),
  });

  const server = createHttpsServer({ cert, key }, async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const request: RequestLike = {
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: req.headers as RequestLike['headers'],
        body: Buffer.concat(chunks),
        peerIp: req.socket.remoteAddress ?? undefined,
      };
      const response = await gateway.handle(request);
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    } catch {
      // The contract has no 500 code; use the gateway-generated 502 shape.
      const response = errorResponse(new GatewayError(ERROR_CODES.UPSTREAM_UNREACHABLE, 'internal gateway error'));
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: config.wsMaxPayloadBytes });

  server.on('upgrade', (req, socket, head) => {
    // Exact path only: no query string, no prefix, no third-party sockets.
    if (req.url !== GATEWAY_WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    let authenticated = false;
    const timer = setTimeout(() => rejectAuth(ws), WS_AUTH_TIMEOUT_MS);
    const clear = () => clearTimeout(timer);

    function rejectAuth(socket: WebSocket): void {
      clear();
      socket.send(authErrorFrame());
      socket.close(CLOSE_UNAUTHORIZED);
    }

    ws.on('message', (raw, isBinary) => {
      const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
      if (isBinary && data.length > config.wsMaxPayloadBytes) {
        ws.close(CLOSE_TOO_LARGE);
        return;
      }

      let frame: unknown;
      try {
        frame = JSON.parse(data.toString('utf8')) as unknown;
      } catch {
        if (!authenticated) rejectAuth(ws);
        return;
      }
      if (!isRecord(frame)) {
        if (!authenticated) rejectAuth(ws);
        return;
      }

      if (!authenticated) {
        if (frame.type === 'auth' && typeof frame.token === 'string' && typeof frame.deviceId === 'string') {
          try {
            state.validateToken(frame.token, frame.deviceId);
            authenticated = true;
            clear();
          } catch {
            rejectAuth(ws);
          }
        } else {
          rejectAuth(ws);
        }
        return;
      }

      if (frame.type === 'ping') {
        ws.send(pongFrame());
        return;
      }
      if (frame.type === 'subscribe') {
        // TODO(real-events): subscribe to the mapped DSH stream instead of one stub event.
        const sessionId = typeof frame.sessionId === 'string' ? frame.sessionId : 'm3-stub-session';
        const event = stubSessionUpdated(sessionId, new Date().toISOString());
        if (event) ws.send(eventFrame(event));
      }
    });

    ws.on('close', clear);
    ws.on('error', clear);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once('error', onError);
    server.listen(config.port, config.host, () => {
      server.off('error', onError);
      resolve();
    });
  });

  let disposed = false;
  return async () => {
    if (disposed) return;
    disposed = true;
    for (const client of wss.clients) client.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
