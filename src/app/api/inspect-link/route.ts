import { NextRequest, NextResponse } from "next/server";
import { detectLink } from "@/lib/anicine-data";

export const dynamic = "force-dynamic";

// Real-time link inspection for the universal downloader. Purely heuristic
// and client-safe — no network calls, just pattern matching.
export async function POST(req: NextRequest) {
  let body: { url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const url = (body.url || "").trim();
  const detection = detectLink(url);
  const ready = detection.kind !== "unknown" && !!url;
  return NextResponse.json({ ok: true, url, detection, ready });
}
