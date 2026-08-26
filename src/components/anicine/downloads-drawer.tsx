"use client";

import { useEffect } from "react";
import { useAnicineStore, formatSpeed, type DownloadTask } from "@/lib/anicine-store";
import { showToast } from "@/lib/anicine-toast";
import { X, Trash2, Pause, Play, CheckCircle2, Loader2, AlertCircle, Clock, FolderOpen, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function DownloadsDrawer() {
  const open = useAnicineStore((s) => s.drawerOpen);
  const setOpen = useAnicineStore((s) => s.setDrawer);
  const tasks = useAnicineStore((s) => s.tasks);
  const tickTasks = useAnicineStore((s) => s.tickTasks);
  const pauseTask = useAnicineStore((s) => s.pauseTask);
  const resumeTask = useAnicineStore((s) => s.resumeTask);
  const removeTask = useAnicineStore((s) => s.removeTask);
  const clearTasks = useAnicineStore((s) => s.clearTasks);

  // Poll the server for live progress while the queue has running jobs.
  useEffect(() => {
    const hasActive = tasks.some((t) => t.status === "active" || t.status === "queued");
    if (!hasActive) return;
    const id = setInterval(() => void tickTasks(), 1000);
    return () => clearInterval(id);
  }, [tasks, tickTasks]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const active = tasks.filter((t) => t.status === "active" || t.status === "queued").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const errored = tasks.filter((t) => t.status === "error").length;
  const totalSpeed = tasks.filter((t) => t.status === "active").reduce((a, t) => a + t.speed, 0);

  return (
    <div className={cn("fixed inset-0 z-50", open ? "" : "pointer-events-none")}>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn("absolute inset-0 bg-[#0B0E15]/80 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#202530] border-l border-[#323947] flex flex-col shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#323947] p-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#EC69AE]" />
            <h3 className="text-sm font-semibold text-[#F8FAFC]">Downloads Monitor</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg bg-[#151922] border border-[#323947] text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-4 border-b border-[#323947]">
          <div className="bg-[#0B0E15] border border-[#323947] rounded-lg p-3 flex items-center justify-between font-mono text-xs">
            <div>
              <div className="text-[#949AA5]">Overall speed</div>
              <div className="text-[#6AB27A] font-semibold mt-0.5">{formatSpeed(totalSpeed)}</div>
            </div>
            <div className="text-right">
              <div className="text-[#949AA5]">Active / Done / Failed</div>
              <div className="text-[#F8FAFC] font-semibold mt-0.5">{active} / {done} / {errored}</div>
            </div>
          </div>
        </div>

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-[#949AA5]">
              <Clock className="w-8 h-8" />
              <p className="text-xs">No active downloads.</p>
              <p className="text-[11px] text-[#949AA5]">Start a download from the catalog or Link Downloader.</p>
            </div>
          ) : (
            tasks.map((t) => <TaskRow key={t.id} task={t} onPause={pauseTask} onResume={resumeTask} onRemove={removeTask} />)
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#323947] space-y-3 bg-[#202530]">
          <div className="flex items-center justify-between text-[11px] text-[#949AA5] font-mono">
            <span>Storage:</span>
            <code className="text-[#F8FAFC] bg-[#0B0E15] px-2 py-0.5 rounded border border-[#323947]">server: .downloads/&lt;job&gt;</code>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { clearTasks(); showToast("Queue cleared", "info"); }}
              className="py-2 rounded-lg bg-[#151922] border border-[#323947] hover:bg-[#2A303D] text-xs font-semibold text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <button
              onClick={() => setOpen(false)}
              className="py-2 rounded-lg bg-[#EC69AE] text-[#0B0E15] text-xs font-semibold hover:bg-blue-600 spring-transition"
            >
              Hide
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function TaskRow({ task, onPause, onResume, onRemove }: {
  task: DownloadTask;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const canPause = task.status === "active" || task.status === "queued";
  const canResume = task.status === "paused" || (task.status === "error" && !!task.url);
  return (
    <div className="rounded-lg border border-[#323947] bg-[#151922] p-3 space-y-2 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[#F8FAFC] truncate">{task.title}</div>
          <div className="text-[10px] font-mono text-[#949AA5] flex items-center gap-1.5 mt-0.5">
            <span className="text-[#B3B7C1]">{task.source}</span>
            <span>•</span>
            <span>{task.quality}</span>
            <span>•</span>
            <span>{task.size}</span>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-[#0B0E15] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full spring-transition",
              task.status === "done" ? "bg-[#6AB27A]" : task.status === "error" ? "bg-[#EF4444]" : task.status === "paused" ? "bg-[#949AA5]" : "bg-[#EC69AE]"
            )}
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-[#949AA5]">
          <span>{task.progress.toFixed(1)}%</span>
          <span>{task.status === "active" ? formatSpeed(task.speed) : task.status === "paused" ? "Paused" : task.status === "done" ? "Completed" : task.status === "error" ? "Failed" : "Queued"}</span>
        </div>
      </div>

      {/* Server-side error message */}
      {task.status === "error" && task.error && (
        <p className="text-[10px] leading-relaxed font-mono text-[#FCA5A5] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded px-2 py-1.5 line-clamp-3" title={task.error}>
          {task.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        {task.status === "done" && task.jobId && (
          <button
            onClick={() => {
              // Hit the file endpoint, which 302-redirects to a signed R2 URL or
              // streams the local file — whichever the server is configured for.
              const a = document.createElement("a");
              a.href = `/api/download/${task.jobId}?file=1`;
              a.download = `${task.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.mp4`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            }}
            className="px-2 py-1 rounded bg-[#6AB27A]/15 text-[#6AB27A] border border-[#6AB27A]/30 hover:bg-[#6AB27A]/25 text-[11px] font-semibold spring-transition flex items-center gap-1"
          >
            ⬇️ Save
          </button>
        )}
        {canPause && (
          <button onClick={() => onPause(task.id)} className="p-1.5 rounded bg-[#202530] border border-[#323947] text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition" aria-label="Pause">
            <Pause className="w-3.5 h-3.5" />
          </button>
        )}
        {canResume && (
          <button onClick={() => onResume(task.id)} className="p-1.5 rounded bg-[#202530] border border-[#323947] text-[#6AB27A] hover:text-[#6AB27A] spring-transition flex items-center gap-1" aria-label={task.status === "paused" ? "Resume" : "Retry"}>
            {task.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <RotateCw className="w-3.5 h-3.5" />}
          </button>
        )}
        <button onClick={() => onRemove(task.id)} className="p-1.5 rounded bg-[#202530] border border-[#323947] text-[#B3B7C1] hover:text-[#EF4444] hover:border-[#EF4444]/30 spring-transition" aria-label="Remove">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DownloadTask["status"] }) {
  const map: Record<DownloadTask["status"], { icon: React.ReactNode; cls: string; label: string }> = {
    queued: { icon: <Clock className="w-3 h-3" />, cls: "text-[#949AA5] bg-[#202530] border-[#323947]", label: "Queued" },
    active: { icon: <Loader2 className="w-3 h-3 animate-spin" />, cls: "text-[#EC69AE] bg-[#EC69AE]/10 border-[#EC69AE]/30", label: "Active" },
    paused: { icon: <Pause className="w-3 h-3" />, cls: "text-[#B3B7C1] bg-[#202530] border-[#323947]", label: "Paused" },
    done: { icon: <CheckCircle2 className="w-3 h-3" />, cls: "text-[#6AB27A] bg-[#6AB27A]/10 border-[#6AB27A]/30", label: "Done" },
    error: { icon: <AlertCircle className="w-3 h-3" />, cls: "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30", label: "Error" },
  };
  const s = map[status];
  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold", s.cls)}>
      {s.icon} {s.label}
    </span>
  );
}
