// @ohos.net.webSocket wrapper (via @kit.NetworkKit), contract §4.
// First frame is auth with token+deviceId; token NEVER goes into the URL.
import { webSocket } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { AuthFrame, SubscribeFrame, WsEvent, DshError } from '../common/DshTypes';
import { PlatformAdapter } from '../adapter/PlatformAdapter';

const WS_PATH: string = '/mobile/ws';
const INITIAL_BACKOFF_MS: number = 1000;
const MAX_BACKOFF_MS: number = 30000;

export type WsEventCallback = (event: WsEvent) => void;
export type WsStateCallback = (state: string) => void;

export class WsClient {
  private readonly url: string;
  private readonly token: string;
  private readonly deviceId: string;
  private readonly onEvent: WsEventCallback;
  private readonly onState: WsStateCallback;
  private socket: webSocket.WebSocket | null = null;
  private retry: number = 0;
  private timer: number = -1;
  private closedByUser: boolean = false;

  constructor(origin: string, token: string, deviceId: string, platform: PlatformAdapter,
    onEvent: WsEventCallback, onState: WsStateCallback) {
    if (!origin.startsWith('https://')) {
      throw new Error('HTTPS only: WS origin must start with https://');
    }
    if (platform.tls().capability() === 'none') {
      throw new DshError(-1, 'PLATFORM_TLS_PIN_UNSUPPORTED', 'Current platform does not support certificate pinning; connection refused');
    }
    this.url = 'wss://' + origin.substring('https://'.length) + WS_PATH;
    this.token = token;
    this.deviceId = deviceId;
    this.onEvent = onEvent;
    this.onState = onState;
  }

  connect(): void {
    this.closedByUser = false;
    this.openSocket();
  }

  close(): void {
    this.closedByUser = true;
    if (this.timer !== -1) {
      clearTimeout(this.timer);
      this.timer = -1;
    }
    if (this.socket !== null) {
      const current: webSocket.WebSocket = this.socket as webSocket.WebSocket;
      this.socket = null;
      current.close().catch((_e: Object) => {
        // Best effort close; the state callback below is authoritative.
      });
    }
    this.onState('closed');
  }

  private openSocket(): void {
    const socket: webSocket.WebSocket = webSocket.createWebSocket();
    this.socket = socket;

    socket.on('open', (_err: BusinessError, _value: Object) => {
      this.retry = 0;
      this.onState('connected');
      // Contract §4: auth first, then subscribe; omit sessionId to receive all sessions.
      const auth: AuthFrame = { type: 'auth', token: this.token, deviceId: this.deviceId };
      socket.send(JSON.stringify(auth)).catch((_e: Object) => {
        this.onState('auth-send-failed');
      });
      const subscribe: SubscribeFrame = { type: 'subscribe' };
      socket.send(JSON.stringify(subscribe)).catch((_e: Object) => {
        this.onState('subscribe-failed');
      });
    });

    socket.on('message', (_err: BusinessError, value: string | ArrayBuffer) => {
      if (typeof value !== 'string') {
        return;
      }
      const raw: string = value as string;
      try {
        const parsed: WsEvent = JSON.parse(raw) as WsEvent;
        parsed.raw = raw;
        this.onEvent(parsed);
      } catch (_e) {
        // Ignore malformed or non-JSON frames; no business logic lives here.
      }
    });

    socket.on('close', (_err: BusinessError, _result: webSocket.CloseResult) => {
      this.socket = null;
      this.scheduleReconnect();
    });

    socket.on('error', (_err: BusinessError) => {
      this.onState('error');
      // HarmonyOS usually emits 'close' after 'error'; scheduleReconnect is idempotent.
      this.scheduleReconnect();
    });

    socket.connect(this.url).catch((_e: Object) => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || this.timer !== -1) {
      return;
    }
    this.onState('reconnecting');
    const delay: number = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, this.retry), MAX_BACKOFF_MS);
    this.retry++;
    this.timer = setTimeout(() => {
      this.timer = -1;
      this.openSocket();
    }, delay);
  }
}
