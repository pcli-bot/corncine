import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};
  // Check yt-dlp
  try {
    const { spawnSync } = await import("node:child_process");
    const yt = spawnSync("yt-dlp", ["--version"], { stdio: "ignore" });
    checks["yt-dlp"] = yt.error ? "missing" : "ok";
    const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    checks["ffmpeg"] = ff.error ? "missing" : "ok";
    const aria = spawnSync("aria2c", ["--version"], { stdio: "ignore" });
    checks["aria2c"] = aria.error ? "missing (optional)" : "ok";
  } catch {
    checks["binaries"] = "check failed";
  }

  // Disk
  try {
    const fs = await import("node:fs");
    const stat = fs.statSync(process.cwd());
    checks["disk"] = stat ? "ok" : "unknown";
  } catch {
    checks["disk"] = "unknown";
  }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "missing (optional)");
  return NextResponse.json(
    {
      ok: allOk,
      uptime: process.uptime(),
      checks,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.2.1",
    },
    { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
