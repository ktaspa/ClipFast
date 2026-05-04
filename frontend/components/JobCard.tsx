import Link from "next/link";
import { ChevronRight, Video, Clock, Scissors, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Job } from "@/lib/api";

interface Props {
  job: Job;
  onDelete?: (id: string) => void;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STEPS = [
  { key: "downloading",  label: "Download" },
  { key: "transcribing", label: "Transcribe" },
  { key: "analyzing",    label: "Analyze" },
  { key: "clipping",     label: "Clip" },
  { key: "completed",    label: "Done" },
] as const;

const ORDER = ["pending","downloading","transcribing","analyzing","clipping","completed","failed"] as const;

export default function JobCard({ job, onDelete }: Props) {
  const statusIndex = ORDER.indexOf(job.status as typeof ORDER[number]);

  return (
    <div className="glass-card-dash group relative p-6 transition-[transform] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-black/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] ring-1 ring-white/8">
            {job.thumbnail_url ? (
              <img src={job.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Video className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">
              {job.title || "Processing…"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
              {job.youtube_url}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={job.status} />
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); onDelete(job.id); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress steps for active jobs */}
      {job.status !== "completed" && job.status !== "failed" && (
        <div className="mt-4 flex items-center gap-1">
          {STEPS.map((step, i) => {
            const stepIndex = ORDER.indexOf(step.key as typeof ORDER[number]);
            const done = statusIndex > stepIndex;
            const active = statusIndex === stepIndex;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1 last:flex-none">
                <div
                  className={`h-1.5 rounded-full flex-1 transition-all ${
                    done ? "bg-violet-500" : active ? "bg-violet-500/60 animate-pulse" : "bg-[#1a1a1a]"
                  }`}
                />
                {i === STEPS.length - 1 && (
                  <span className={`text-xs whitespace-nowrap ${active || done ? "text-violet-400" : "text-slate-600"}`}>
                    {step.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer row */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(job.created_at)}
          </span>
          {job.clips.length > 0 && (
            <span className="flex items-center gap-1 text-violet-400">
              <Scissors className="w-3 h-3" />
              {job.clips.length} clip{job.clips.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Link
          href={`/jobs/${job.id}`}
          className="flex items-center gap-0.5 text-slate-400 hover:text-white transition-colors"
        >
          View <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {job.status === "failed" && job.error && (
        <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          {job.error.slice(0, 200)}
        </div>
      )}
    </div>
  );
}
