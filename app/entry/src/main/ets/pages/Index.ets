// Minimal M3 network slice harness. This is NOT product UI (no session/chat screens).
// Health result, last WS event and pairing status are plain text on purpose.
import { HttpClient } from '../net/HttpClient';
import { WsClient } from '../net/WsClient';
import { WsEvent, describeError, DshError } from '../common/DshTypes';
import { PairingPayloadDecoder } from '../pairing/PairingPayload';
import { DefaultPlatformAdapter } from '../adapter/PlatformAdapter';
import { SecureStoreFactory, pinAlias } from '../security/SecureStore';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { common } from '@kit.AbilityKit';
import { ensureDevCaFile } from '../security/DevCaPath';

@Entry
@Component
struct Index {
  @State originInput: string = 'https://127.0.0.1:3443';
  @State healthText: string = 'Health: not checked';
  @State checkingHealth: boolean = false;
  @State healthRtt: string = '';
  @State healthError: string = '';
  @State versionText: string = 'Version: not checked';
  @State pairPayload: string = '';
  @State pairText: string = 'Pair: not attempted';
  @State eventText: string = 'Last WS event: none';
  @State deviceName: string = 'My Harmony Phone';

  private readonly platform: DefaultPlatformAdapter = new DefaultPlatformAdapter();
  private caPath: string = '';
  private token: string = '';
  private deviceId: string = '';
  private wsClient: WsClient | null = null;

  aboutToAppear(): void {
    this.init();
  }

  private async init(): Promise<void> {
    const context: common.UIAbilityContext = getContext(this) as common.UIAbilityContext;
    this.caPath = ensureDevCaFile(context);
    await this.runHealth();
  }

  aboutToDisappear(): void {
    if (this.wsClient !== null) {
      (this.wsClient as WsClient).close();
      this.wsClient = null;
    }
  }

  build() {
    Column() {
      Text('DSH Harmony - M3 network slice')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 12 })

      TextInput({ text: this.originInput, placeholder: 'https://host:port' })
        .onChange((value: string) => {
          this.originInput = value;
        })
        .margin({ bottom: 8 })

      Button(this.checkingHealth ? 'Checking...' : 'Check health')
        .enabled(!this.checkingHealth)
        .onClick(() => {
          this.runHealth();
        })
        .margin({ bottom: 8 })

      Text(this.healthText)
        .fontSize(14)
        .margin({ bottom: 4 })
      Text(this.healthRtt)
        .fontSize(12)
        .margin({ bottom: 4 })
      Text(this.healthError)
        .fontSize(12)
        .fontColor(Color.Red)
        .margin({ bottom: 4 })

      Button('Check version')
        .onClick(() => {
          this.runVersion();
        })
        .margin({ bottom: 4 })
      Text(this.versionText)
        .fontSize(12)
        .margin({ bottom: 16 })

      // STUB: camera QR entry is replaced by a paste field so no real device is needed.
      // On device: NEXT uses @hms.core.scan (Scan Kit); pure OpenHarmony uses
      // @ohos.multimedia.camera + XComponent with a decoder. Route both through
      // PlatformAdapter (docs/design/06 §7) and feed the decoded string to runPair().
      TextInput({ text: this.pairPayload, placeholder: 'Paste dshpair://v1/<base64url>' })
        .onChange((value: string) => {
          this.pairPayload = value;
        })
        .margin({ bottom: 8 })

      TextInput({ text: this.deviceName, placeholder: 'Device name' })
        .onChange((value: string) => {
          this.deviceName = value;
        })
        .margin({ bottom: 8 })

      Button('Pair')
        .onClick(() => {
          this.runPair();
        })
        .margin({ bottom: 8 })

      Text(this.pairText)
        .fontSize(14)
        .margin({ bottom: 16 })

      Text(this.eventText)
        .fontSize(14)
    }
    .width('100%')
    .height('100%')
    .padding(16)
    .alignItems(HorizontalAlign.Start)
  }

  private async runHealth(): Promise<void> {
    if (this.checkingHealth) {
      return;
    }
    this.checkingHealth = true;
    this.healthText = 'Health: checking...';
    this.healthRtt = '';
    this.healthError = '';
    const started: number = Date.now();
    try {
      const client: HttpClient = new HttpClient(this.originInput, this.platform, this.caPath);
      const result = await client.health();
      this.healthText = 'Health: ' + result.status + ' (plugin ' + result.pluginVersion + ', dsh ' + result.dshVersion + ')';
      this.healthRtt = 'RTT: ' + (Date.now() - started).toString() + ' ms';
      hilog.info(0x0000, 'DshHarmony', 'health OK: %{public}s rtt=%{public}dms', result.status, Date.now() - started);
    } catch (e) {
      this.healthText = 'Health: FAILED';
      if (e instanceof DshError) {
        const err: DshError = e as DshError;
        this.healthError = 'Error: HTTP ' + err.httpStatus.toString() + ' ' + err.machineCode + ' - ' + err.message;
      } else {
        this.healthError = 'Error: ' + describeError(e as Object);
      }
      hilog.error(0x0000, 'DshHarmony', 'health FAILED: %{public}s', this.healthError);
    } finally {
      this.checkingHealth = false;
    }
  }

  private async runVersion(): Promise<void> {
    try {
      const client: HttpClient = new HttpClient(this.originInput, this.platform, this.caPath);
      const result = await client.version();
      this.versionText = 'Version: plugin ' + result.plugin.current + ' -> ' + result.plugin.latest
        + '; app ' + result.app.current + ' -> ' + result.app.latest;
    } catch (e) {
      this.versionText = 'Version FAILED: ' + describeError(e as Object);
    }
  }

  private async runPair(): Promise<void> {
    try {
      const payload = PairingPayloadDecoder.decode(this.pairPayload);
      const client: HttpClient = new HttpClient(payload.origin, this.platform, this.caPath);
      const result = await client.pair(payload, this.deviceName);

      // Contract §3.2 second check: the 201 response fingerprint must equal the
      // scanned payload fingerprint. Mismatch discards the token and any local pin.
      if (result.caFingerprint !== payload.caFingerprint) {
        await SecureStoreFactory.current().remove(pinAlias(payload.origin));
        throw new DshError(403, 'CA_FINGERPRINT_MISMATCH', 'Pair response fingerprint does not match scanned payload');
      }
      await SecureStoreFactory.current().put(pinAlias(payload.origin), payload.caFingerprint);

      this.token = result.token;
      this.deviceId = result.deviceId;
      this.pairText = 'Pair OK: device ' + result.deviceId;
      this.connectWs(payload.origin);
    } catch (e) {
      this.pairText = 'Pair FAILED: ' + describeError(e as Object);
    }
  }

  private connectWs(origin: string): void {
    if (this.wsClient !== null) {
      (this.wsClient as WsClient).close();
    }
    const client: WsClient = new WsClient(origin, this.token, this.deviceId, this.platform,
      (event: WsEvent) => {
        this.eventText = 'Last WS event: ' + event.type + (event.title !== undefined ? ' - ' + event.title : '');
      },
      (state: string) => {
        this.eventText = 'WS state: ' + state;
      }
    );
    this.wsClient = client;
    client.connect();
  }
}
