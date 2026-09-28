/**
 * A random unique id. crypto.randomUUID only exists in secure contexts (HTTPS, localhost);
 * the fallback keeps the app usable when it is served over plain HTTP on a local network.
 */
export function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
