/** Peer address helpers for loopback-only management and whitelist checks. */

export function normalizeIp(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (raw.startsWith('::ffff:')) return raw.slice(7).split('%')[0] ?? '';
  return raw.split('%')[0] ?? '';
}

export function isLoopbackIp(value: string | undefined): boolean {
  const ip = normalizeIp(value);
  return ip === '::1' || /^127\./.test(ip);
}
