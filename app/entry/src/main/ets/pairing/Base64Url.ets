// Minimal base64url decoder without a platform API dependency.
// ADR-0008 §3.1: payload JSON is ASCII-only (camelCase fields, https URL,
// ISO8601 UTC timestamp, lowercase hex fingerprint), so byte-to-char is safe.
const ALPHABET: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function decodeBase64Url(input: string): string {
  const bytes: number[] = [];
  let acc: number = 0;
  let bits: number = 0;
  for (let i: number = 0; i < input.length; i++) {
    const idx: number = ALPHABET.indexOf(input.charAt(i));
    if (idx < 0) {
      throw new Error('Invalid base64url character in pairing link');
    }
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  let result: string = '';
  for (let j: number = 0; j < bytes.length; j++) {
    result += String.fromCharCode(bytes[j]);
  }
  return result;
}
