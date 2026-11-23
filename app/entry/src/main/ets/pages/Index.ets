// Minimal M3 network slice harness. This is NOT product UI (no session/chat screens).
// Health result, last WS event and pairing status are plain text on purpose.
import { HttpClient } from '../net/HttpClient';
import { WsClient } from '../net/WsClient';
import { WsEvent, describeError, DshError } from '../common/DshTypes';
import { PairingPayloadDecoder } from '../pairing/PairingPayload';
import { DefaultPlatformAdapter } from '../adapter/PlatformAdapter';
import { SecureStoreFactory, pinAlias } from '../security/SecureStore';

@Entry
@Component
struct Index {
  @State originInput: string = 'https://192.168.1.5:3443';
  @State healthText: string = 'Health: not checked';
  @State pairPayload: string = '';
  @State pairText: string = 'Pair: not attempted';
  @State eventText: string = 'Last WS event: none';
  @State deviceName: string = 'My Harmony Phone';

  private readonly platform: DefaultPlatformAdapter = new DefaultPlatformAdapter();
  private token: string = '';
  private deviceId: string = '';
  private wsClient: WsClient | null = null;

  aboutToAppear(): void {
    this.runHealth();
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

      Button('Check health')
        .onClick(() => {
          this.runHealth();
        })
        .margin({ bottom: 8 })

      Text(this.healthText)
        .fontSize(14)
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
    try {
      const client: HttpClient = new HttpClient(this.originInput, this.platform);
      const result = await client.health();
      this.healthText = 'Health: ' + result.status + ' (plugin ' + result.pluginVersion + ', dsh ' + result.dshVersion + ')';
    } catch (e) {
      this.healthText = 'Health FAILED: ' + describeError(e as Object);
    }
  }

  private async runPair(): Promise<void> {
    try {
      const payload = PairingPayloadDecoder.decode(this.pairPayload);
      const client: HttpClient = new HttpClient(payload.origin, this.platform);
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
