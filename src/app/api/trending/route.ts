import { NextRequest, NextResponse } from "next/server";
import { TRENDING_MEDIA } from "@/lib/anicine-data";
import { TrendingQuerySchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RL_PRESETS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Default landing catalog (no query). Returns a curated set per mode.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`trending:${ip}`, RL_PRESETS.trending)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }
  const sp = req.nextUrl.searchParams;
  const parsed = TrendingQuerySchema.safeParse({ mode: sp.get("mode") || "adult" });
  const mode = (parsed.success ? parsed.data.mode : "movies") as import("@/lib/anicine-data").ModeKey;

  const items = [...TRENDING_MEDIA].slice(0, 24);

  return NextResponse.json({ mode, items });
}
