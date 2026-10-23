/** Route hints only. API ownership/access checks still decide what can be opened. */
export type LinkTarget = { kind: 'checkout' | 'course'; id: string };
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ID = new RegExp(`^${UUID}$`, 'i');
const WEB_HOSTS = new Set(['admin.ai4impact.in', 'www.ai4impact.in', 'ai4impact.in', 'main.d26ztc5gxt79re.amplifyapp.com']);

export function parseDeepLink(raw: string | null): LinkTarget | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const native = url.protocol === 'ai4impact:' || url.protocol === 'com.piresearchlabs.mobile:';
    if (!native && (url.protocol !== 'https:' || !WEB_HOSTS.has(url.host))) return null;
    if (url.username || url.password) return null;
    const path = (native ? '/' + url.hostname + url.pathname : url.pathname).replace(/\/$/, '');
    const match = path.match(new RegExp(`^/(checkout|courses?)/(${UUID})$`, 'i'));
    if (match) return { kind: match[1].toLowerCase() === 'checkout' ? 'checkout' : 'course', id: match[2] };
    const order = url.searchParams.get('order');
    if (path === '/checkout' && order && ID.test(order)) return { kind: 'checkout', id: order };
  } catch { /* Malformed URLs are ignored, never used as external navigation. */ }
  return null;
}
