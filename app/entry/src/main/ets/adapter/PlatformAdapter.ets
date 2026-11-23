// Platform abstraction (02 §2.1.1 / ADR-0008 §6 / ADR-0009).
// Business code must never branch on platform APIs directly; it calls this interface.
// API 9 remains opportunistic: no dedicated downgrade hacks for the mainline build.

export type TlsCapability = 'pin' | 'ca-bundle' | 'none';

export interface TlsAdapter {
  capability(): TlsCapability;
  // STUB signatures follow ADR-0008 §6. Fingerprints are lowercase hex (64 chars).
  setPins(origin: string, anchorFingerprintHex: string): void;
  verify(origin: string, anchorFingerprintHex: string): boolean;
}

export interface PlatformAdapter {
  tls(): TlsAdapter;
}

export class StubTlsAdapter implements TlsAdapter {
  capability(): TlsCapability {
    // STUB: real probe must inspect the platform TLS API surface (ADR-0008 §9.1).
    // Returning 'pin' here only unblocks the M3 development slice; it is NOT a
    // security guarantee. A real implementation must return 'none' when the
    // platform cannot pin, and callers must refuse the connection (never downgrade).
    return 'pin';
  }

  setPins(_origin: string, _anchorFingerprintHex: string): void {
    // STUB: persist the pin for this exact origin through SecureStore (HUKS).
  }

  verify(_origin: string, _anchorFingerprintHex: string): boolean {
    // STUB: compute peer anchor DER SHA-256 and require byte-equal comparison.
    // Never return true as a fallback; mismatch must abort the connection.
    throw new Error('TLS anchor verification is not implemented (stub)');
  }
}

export class DefaultPlatformAdapter implements PlatformAdapter {
  private readonly tlsAdapter: TlsAdapter = new StubTlsAdapter();

  tls(): TlsAdapter {
    return this.tlsAdapter;
  }
}
