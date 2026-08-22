"use client";

import { toast } from "sonner";

export function showToast(msg: string, kind: "success" | "error" | "info" = "info") {
  if (kind === "success") toast.success(msg);
  else if (kind === "error") toast.error(msg);
  else toast.message(msg);
}
