// Server-only egress for the leak source sites.
//
// This module imports the managed proxy pool + per-source cookie jar, both of
// which pull in node: built-ins. It MUST NOT be imported by any client
// component — only by API route handlers (Node runtime). The leak data layer
// (lib/leak) stays client-safe and receives this implementation by injection.
//
// NOTE: undici is imported STATICALLY (not via dynamic import()) because
// Next's runtime cannot reliably resolve a dynamic `import("undici")` at
// request time. This file is server-only, so the import never reaches the
// client bundle.
import { proxyPool, cookieJars } from "./proxy-pool";
import { siteHeaders, type SourceEgress } from "./leak";
import { ProxyAgent, fetch as undiciFetch } from "undici";

export const proxySourceFetch: SourceEgress = async (url, base) => {
  const host = new URL(base).host;
  const proxy = await proxyPool.next(host);
  const headers: Record<string, string> = { ...siteHeaders(base) };
  const cookie = cookieJars.header(host);
  if (cookie) headers["Cookie"] = cookie;
  const init: Record<string, unknown> = { headers };
  let resp: Response;
  try {
    // Use undici's OWN fetch (not Next's patched global fetch, which silently
    // drops the `dispatcher` option). undici.fetch honors the ProxyAgent.
    if (proxy && proxyPool.enabled) {
      const dispatcher = new ProxyAgent(proxy);
      resp = (await undiciFetch(url, { ...init, dispatcher })) as unknown as Response;
    } else {
      resp = await fetch(url, init as RequestInit);
    }
  } catch {
    if (proxy) proxyPool.markFailure(proxy);
    return null;
  }
  if (resp.ok) {
    const sc = (resp.headers as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    if (sc.length) cookieJars.saveFromResponse(host, sc);
    if (proxy) proxyPool.markSuccess(proxy);
  } else if (proxy) {
    proxyPool.markFailure(proxy);
  }
  return resp;
};
