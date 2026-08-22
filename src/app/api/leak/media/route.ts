import { NextRequest, NextResponse } from "next/server";
import { isAllowedMediaHost } from "@/lib/leak";
import { proxyPool, cookieJars } from "@/lib/proxy-pool";
// Static undici import: Next cannot resolve a dynamic `import("undici")` at
// request time. This route is server-only, so the import never hits the client
// bundle. undici.fetch (not Next's patched global fetch) honors the ProxyAgent.
import { ProxyAgent, fetch as undiciFetch } from "undici";

export const dynamic = "force-dynamic";

// Server-side media proxy. The leak sites (Kemono/Coomer especially) enforce
// hotlink/header restrictions that block a browser <video>/<img> from fetching
// directly. We fetch server-side with the right headers and stream it back
// same-origin, so video/photo actually plays on our website. Host-allowlisted.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("missing url", { status: 400 });

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return new NextResponse("bad protocol", { status: 400 });
  }
  if (!isAllowedMediaHost(u.hostname)) {
    return new NextResponse("host not allowed", { status: 403 });
  }

  let upstream: Response;
  const host = u.hostname;
  const proxy = await proxyPool.next(host);
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    Referer: u.origin + "/",
    Origin: u.origin,
  };
  const cookie = cookieJars.header(host);
  if (cookie) headers["Cookie"] = cookie;
  const init: Record<string, unknown> = { headers, redirect: "follow" };
  try {
    if (proxy && proxyPool.enabled) {
      const dispatcher = new ProxyAgent(proxy);
      upstream = (await undiciFetch(u.toString(), { ...init, dispatcher })) as unknown as Response;
    } else {
      upstream = await fetch(u.toString(), init as RequestInit);
    }
    if (upstream.ok) {
      const sc = (upstream.headers as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
      if (sc.length) cookieJars.saveFromResponse(host, sc);
      if (proxy) proxyPool.markSuccess(proxy);
    } else if (proxy) {
      proxyPool.markFailure(proxy);
    }
  } catch {
    if (proxy) proxyPool.markFailure(proxy);
    return new NextResponse("upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok) {
    return new NextResponse("upstream " + upstream.status, { status: 502 });
  }
  const body = upstream.body;
  if (!body) return new NextResponse("no body", { status: 502 });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
