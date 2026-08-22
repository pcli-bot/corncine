import { NextRequest, NextResponse } from "next/server";
import { getLeakPosts } from "@/lib/leak";
import { proxySourceFetch } from "@/lib/leak-egress";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await getLeakPosts({
    site: sp.get("site") || "kemono",
    service: sp.get("service") || "",
    id: sp.get("id") || "",
    type: (sp.get("type") || "all") as "all" | "video" | "photo",
  }, proxySourceFetch);
  return NextResponse.json(data);
}
