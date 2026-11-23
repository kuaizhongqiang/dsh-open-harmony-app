// @ohos.net.http wrapper (via @kit.NetworkKit). HTTPS only, no plaintext fallback.
// Endpoints and fields follow docs/design/03-contracts.md v0.5 §1/§3.1/§3.2/§5.
import { http } from '@kit.NetworkKit';
import { HealthResult, PairRequest, PairResult, PairingPayload, VersionResponse, DshError, ErrorFrameBody, describeError } from '../common/DshTypes';
import { PlatformAdapter } from '../adapter/PlatformAdapter';

const HEALTH_PATH: string = '/mobile/health';
const VERSION_PATH: string = '/mobile/version';
const PAIR_PATH: string = '/mobile/pair';
const REFRESH_PATH: string = '/mobile/token/refresh';
const ORIGIN_RE: RegExp = /^https:\/\/[^\/:?#]+:\d{1,5}$/;

export class HttpClient {
  private readonly origin: string;
  private readonly platform: PlatformAdapter;
  private readonly caPath: string;

  constructor(origin: string, platform: PlatformAdapter, caPath?: string) {
    if (!origin.startsWith('https://')) {
      throw new Error('HTTPS only: origin must start with https://');
    }
    // Contract §2: origin is an explicit https://host:port with no path or query.
    if (!ORIGIN_RE.test(origin)) {
      throw new Error('Invalid origin: expected https://host:port with no path or query');
    }
    this.origin = origin;
    this.platform = platform;
    this.caPath = caPath !== undefined ? caPath : '';
  }

  async health(): Promise<HealthResult> {
    this.assertTlsSupported();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const request: http.HttpRequest = http.createHttp();
    try {
      const response: http.HttpResponse = await request.request(
        this.origin + HEALTH_PATH,
        {
          method: http.RequestMethod.GET,
          header: headers,
          expectDataType: http.HttpDataType.STRING,
          usingCache: false,
          connectTimeout: 10000,
          readTimeout: 10000,
          caPath: this.caPath
        }
      );
      if (response.responseCode !== 200) {
        throw new DshError(response.responseCode, 'HTTP_ERROR', 'health returned HTTP ' + response.responseCode.toString());
      }
      return JSON.parse(response.result as string) as HealthResult;
    } catch (e) {
      if (e instanceof DshError) {
        throw e;
      }
      throw new DshError(-1, 'TRANSPORT_ERROR', 'health request failed: ' + describeError(e as Object));
    } finally {
      request.destroy();
    }
  }

  async version(): Promise<VersionResponse> {
    this.assertTlsSupported();
    const request: http.HttpRequest = http.createHttp();
    try {
      const response: http.HttpResponse = await request.request(
        this.origin + VERSION_PATH,
        {
          method: http.RequestMethod.GET,
          header: { 'Content-Type': 'application/json' },
          expectDataType: http.HttpDataType.STRING,
          usingCache: false,
          connectTimeout: 10000,
          readTimeout: 10000,
          caPath: this.caPath
        }
      );
      if (response.responseCode !== 200) {
        throw new DshError(response.responseCode, 'HTTP_ERROR', 'version returned HTTP ' + response.responseCode.toString());
      }
      return JSON.parse(response.result as string) as VersionResponse;
    } catch (e) {
      if (e instanceof DshError) {
        throw e;
      }
      throw new DshError(-1, 'TRANSPORT_ERROR', 'version request failed: ' + describeError(e as Object));
    } finally {
      request.destroy();
    }
  }

  async refreshToken(deviceId: string, token: string): Promise<PairResult> {
    this.assertTlsSupported();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + token,
      'X-Device-Id': deviceId
    };
    const request: http.HttpRequest = http.createHttp();
    try {
      const response: http.HttpResponse = await request.request(
        this.origin + REFRESH_PATH,
        {
          method: http.RequestMethod.POST,
          header: headers,
          expectDataType: http.HttpDataType.STRING,
          usingCache: false,
          connectTimeout: 10000,
          readTimeout: 10000,
          caPath: this.caPath
        }
      );
      if (response.responseCode !== 200) {
        throw new DshError(response.responseCode, 'HTTP_ERROR', 'token refresh returned HTTP ' + response.responseCode.toString());
      }
      return JSON.parse(response.result as string) as PairResult;
    } catch (e) {
      if (e instanceof DshError) {
        throw e;
      }
      throw new DshError(-1, 'TRANSPORT_ERROR', 'token refresh failed: ' + describeError(e as Object));
    } finally {
      request.destroy();
    }
  }

  async pair(payload: PairingPayload, deviceName: string): Promise<PairResult> {
    this.assertTlsSupported();
    // STUB pin hook: real transport must verify the peer anchor against
    // payload.caFingerprint before sending pairingKey (ADR-0008 §3.2 step 3).
    this.platform.tls().setPins(this.origin, payload.caFingerprint);

    const body: PairRequest = {
      pairingKey: payload.pairingKey,
      deviceName: deviceName,
      platform: 'harmony'
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const request: http.HttpRequest = http.createHttp();
    try {
      const response: http.HttpResponse = await request.request(
        this.origin + PAIR_PATH,
        {
          method: http.RequestMethod.POST,
          header: headers,
          extraData: JSON.stringify(body),
          expectDataType: http.HttpDataType.STRING,
          usingCache: false,
          connectTimeout: 10000,
          readTimeout: 10000,
          caPath: this.caPath
        }
      );
      if (response.responseCode !== 201) {
        throw HttpClient.mapPairError(response);
      }
      return JSON.parse(response.result as string) as PairResult;
    } catch (e) {
      if (e instanceof DshError) {
        throw e;
      }
      throw new DshError(-1, 'TRANSPORT_ERROR', 'pair request failed: ' + describeError(e as Object));
    } finally {
      request.destroy();
    }
  }

  private static mapPairError(response: http.HttpResponse): DshError {
    let machine: string = 'HTTP_ERROR';
    const text: string = typeof response.result === 'string' ? response.result as string : '';
    if (text.length > 0) {
      try {
        const body: ErrorFrameBody = JSON.parse(text) as ErrorFrameBody;
        if (body.error !== undefined && body.error !== null && body.error.code.length > 0) {
          machine = body.error.code;
        }
      } catch (_e) {
        // Non-JSON error body: keep the HTTP default subcode.
      }
    }
    switch (response.responseCode) {
      case 409:
        return new DshError(409, machine === 'HTTP_ERROR' ? 'PAIRING_CONSUMED' : machine, 'Pairing key already used or expired');
      case 403:
        return new DshError(403, machine === 'HTTP_ERROR' ? 'WHITELIST_DENIED' : machine, 'Pairing rejected by gateway');
      case 429:
        return new DshError(429, machine === 'HTTP_ERROR' ? 'RATE_LIMITED' : machine, 'Pairing rate limited');
      default:
        return new DshError(response.responseCode, machine, 'Pairing failed with HTTP ' + response.responseCode.toString());
    }
  }

  private assertTlsSupported(): void {
    // ADR-0008 §6: 'none' means refuse; never fall back to system trust only.
    if (this.platform.tls().capability() === 'none') {
      throw new DshError(-1, 'PLATFORM_TLS_PIN_UNSUPPORTED', 'Current platform does not support certificate pinning; connection refused');
    }
  }
}
