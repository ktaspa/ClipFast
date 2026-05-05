import { clsx } from "clsx";
import type { JobStatus } from "@/lib/api";

const CONFIG: Record<
  JobStatus,
  { label: string; dot: string; bg: string; text: string; pulse?: boolean }
> = {
  pending:      { label: "Pending",     dot: "bg-slate-400",  bg: "bg-slate-400/10",  text: "text-slate-400" },
  waiting_youtube: { label: "Retrying", dot: "bg-amber-400", bg: "bg-amber-400/10", text: "text-amber-400", pulse: true },
  downloading:  { label: "Downloading", dot: "bg-blue-400",   bg: "bg-blue-400/10",   text: "text-blue-400",   pulse: true },
  transcribing: { label: "Transcribing",dot: "bg-cyan-400",   bg: "bg-cyan-400/10",   text: "text-cyan-400",   pulse: true },
  analyzing:    { label: "Analyzing",   dot: "bg-violet-400", bg: "bg-violet-400/10", text: "text-violet-400", pulse: true },
  clipping:     { label: "Clipping",    dot: "bg-amber-400",  bg: "bg-amber-400/10",  text: "text-amber-400",  pulse: true },
  completed:    { label: "Completed",   dot: "bg-emerald-400",bg: "bg-emerald-400/10",text: "text-emerald-400" },
  failed:       { label: "Failed",      dot: "bg-red-400",    bg: "bg-red-400/10",    text: "text-red-400" },
};

export default function StatusBadge({ status }: { status: JobStatus }) {
  const c = CONFIG[status] ?? CONFIG.pending;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.bg,
        c.text
      )}
    >
      <span
        className={clsx("inline-block w-1.5 h-1.5 rounded-full", c.dot, c.pulse && "animate-pulse")}
      />
      {c.label}
    </span>
  );
}
