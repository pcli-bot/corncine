// Server-only. R2 (S3-compatible) storage adapter for finished downloads.
//
// When R2 credentials are present, completed files are uploaded to the
// `anicine-downloads` bucket and served to users via a short-lived SIGNED URL
// straight from R2's edge — bypassing the Cloudflare orange-cloud proxy and its
// ~100 MB response cap. Without credentials (dev / not configured) every call
// degrades gracefully so the app still runs on local disk.
//
// Only import this from Node-runtime route handlers / the download engine.
import fs from "node:fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
const bucket = process.env.R2_BUCKET || "";
const accessKey = process.env.R2_ACCESS_KEY_ID || "";
const secret = process.env.R2_SECRET_ACCESS_KEY || "";

export const r2Configured = Boolean(endpoint && bucket && accessKey && secret);

const s3 = r2Configured
  ? new S3Client({
      endpoint,
      region: process.env.R2_REGION || "auto",
      credentials: { accessKeyId: accessKey, secretAccessKey: secret },
    })
  : null;

export function isR2Configured(): boolean {
  return r2Configured;
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._/-]/g, "_");
}

/** Upload a local finished file to R2 under `key`. Returns the key on success. */
export async function uploadFile(localPath: string, key: string): Promise<string> {
  if (!s3) throw new Error("R2 not configured");
  const safeKey = sanitizeKey(key);
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: safeKey, Body: fs.createReadStream(localPath) }),
  );
  return safeKey;
}

/** A time-limited signed URL the browser can hit directly (R2 edge, no proxy cap). */
export async function getDownloadUrl(key: string, filename: string, ttlSeconds = 3600): Promise<string> {
  if (!s3) throw new Error("R2 not configured");
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}
