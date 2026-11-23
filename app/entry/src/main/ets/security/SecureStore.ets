// Security boundary for tokens and CA pins (ADR-0008 §3.3).
// The real implementation MUST use @ohos.security.huks with envelope encryption.
// Secrets must never reach AppStorage/PersistentStorage, logs, clipboard or files.

export interface SecureStore {
  put(alias: string, value: string): Promise<void>;
  get(alias: string): Promise<string | null>;
  remove(alias: string): Promise<void>;
  has(alias: string): Promise<boolean>;
}

// Development-only store. Values live in process memory and are lost on exit.
// This is intentional for the M3 vertical slice; swap via SecureStoreFactory.
export class InMemorySecureStore implements SecureStore {
  private readonly values: Map<string, string> = new Map<string, string>();

  async put(alias: string, value: string): Promise<void> {
    this.values.set(alias, value);
  }

  async get(alias: string): Promise<string | null> {
    const found: string | undefined = this.values.get(alias);
    return found === undefined ? null : found;
  }

  async remove(alias: string): Promise<void> {
    this.values.delete(alias);
  }

  async has(alias: string): Promise<boolean> {
    return this.values.has(alias);
  }
}

// STUB: HUKS-backed implementation. Method signatures are identical so the swap
// is a one-line factory change once @ohos.security.huks is wired in.
export class HuksSecureStore implements SecureStore {
  async put(_alias: string, _value: string): Promise<void> {
    throw new Error('HUKS secure store is a stub; not safe for production');
  }

  async get(_alias: string): Promise<string | null> {
    throw new Error('HUKS secure store is a stub; not safe for production');
  }

  async remove(_alias: string): Promise<void> {
    throw new Error('HUKS secure store is a stub; not safe for production');
  }

  async has(_alias: string): Promise<boolean> {
    throw new Error('HUKS secure store is a stub; not safe for production');
  }
}

export class SecureStoreFactory {
  private static instance: SecureStore | null = null;

  static current(): SecureStore {
    if (SecureStoreFactory.instance === null) {
      // STUB: replace with `new HuksSecureStore()` when HUKS integration lands.
      SecureStoreFactory.instance = new InMemorySecureStore();
    }
    return SecureStoreFactory.instance as SecureStore;
  }
}

export function pinAlias(origin: string): string {
  // ADR-0008 §3.3 recommends `dsh.pin.<sha256(origin)>`.
  // STUB: deterministic sanitized origin until cryptoFramework SHA-256 is wired.
  let suffix: string = '';
  for (let i: number = 0; i < origin.length; i++) {
    const ch: string = origin.charAt(i);
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
      suffix += ch;
    } else {
      suffix += '_';
    }
  }
  return 'dsh.pin.' + suffix;
}
