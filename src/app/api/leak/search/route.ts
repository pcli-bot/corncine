import { NextRequest, NextResponse } from "next/server";
import { searchLeak } from "@/lib/leak";
import { proxySourceFetch } from "@/lib/leak-egress";
import { scrapeLeakSites } from "@/lib/leak-scrape";
import { LeakSearchSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RL_PRESETS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`leak:${ip}`, RL_PRESETS.leak)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }
  const parsed = LeakSearchSchema.safeParse({ q: req.nextUrl.searchParams.get("q") || "" });
  const q = (parsed.success ? parsed.data.q : "").trim().slice(0, 200);
  const [leak, web] = await Promise.all([
    searchLeak(q, proxySourceFetch),
    q.trim() ? scrapeLeakSites(q) : Promise.resolve({ degraded: false, results: [] }),
  ]);
  return NextResponse.json({ ...leak, web: web.results, webDegraded: web.degraded });
}
