// dshpair://v1/<base64url> decoder + validation (03-contracts.md §2, ADR-0008 §3.2).
// Validation order matters: reject before any network call or credential write.
import { PairingPayload } from '../common/DshTypes';
import { decodeBase64Url } from './Base64Url';

const SCHEME_PREFIX: string = 'dshpair://v1/';
const FINGERPRINT_RE: RegExp = /^[0-9a-f]{64}$/;
const ORIGIN_RE: RegExp = /^https:\/\/[^\/:?#]+:\d{1,5}$/;

export class PairingPayloadDecoder {
  static decode(input: string): PairingPayload {
    const trimmed: string = input.trim();
    if (!trimmed.startsWith(SCHEME_PREFIX)) {
      throw new Error('Invalid pairing link: expected dshpair://v1/ prefix');
    }
    const encoded: string = trimmed.substring(SCHEME_PREFIX.length);
    if (encoded.length === 0) {
      throw new Error('Invalid pairing link: empty payload');
    }
    const json: string = decodeBase64Url(encoded);
    let parsed: PairingPayload;
    try {
      parsed = JSON.parse(json) as PairingPayload;
    } catch (_e) {
      throw new Error('Invalid pairing payload: JSON parse failed');
    }
    PairingPayloadDecoder.validate(parsed);
    return parsed;
  }

  private static validate(payload: PairingPayload): void {
    if (payload.v !== 1) {
      throw new Error('Unsupported pairing payload version');
    }
    if (typeof payload.pairingKey !== 'string' || payload.pairingKey.length === 0) {
      throw new Error('Invalid pairing payload: missing pairingKey');
    }
    if (typeof payload.origin !== 'string' || !ORIGIN_RE.test(payload.origin)) {
      throw new Error('Invalid pairing payload: origin must be https://host:port with no path or query');
    }
    if (typeof payload.expiresAt !== 'string') {
      throw new Error('Invalid pairing payload: missing expiresAt');
    }
    const expires: number = Date.parse(payload.expiresAt);
    if (Number.isNaN(expires) || expires <= Date.now()) {
      throw new Error('Pairing payload is expired');
    }
    if (typeof payload.caFingerprint !== 'string' || !FINGERPRINT_RE.test(payload.caFingerprint)) {
      throw new Error('Invalid pairing payload: caFingerprint must be 64 lowercase hex chars');
    }
  }
}
