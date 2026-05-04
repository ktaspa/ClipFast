"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Download, Square } from "lucide-react";
import { api, type Clip } from "@/lib/api";

interface Props {
  clip: Clip;
  jobTitle?: string;
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}` : `${Math.floor(s)}s`;
}

function fmtClipDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function ClipReviewCard({ clip, jobTitle }: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const thumb = api.mediaUrl(clip.thumbnail_path);
  const videoUrl = api.mediaUrl(clip.file_path);

  useEffect(() => {
    if (!playing && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [playing]);

  const captionPreview =
    clip.caption_override != null && clip.caption_override !== ""
      ? clip.caption_override
      : "Auto captions — word-timed lines on the exported video.";

  const hookPreview = clip.hook_text?.trim() || "AI hook in the top letterbox when generated.";

  return (
    <div className="glass-card-dash flex flex-col overflow-hidden transition-[transform,box-shadow] duration-[var(--dash-t)] ease-[var(--ease-saas)] hover:-translate-y-0.5">
      <div className="relative mx-auto w-full max-w-[280px] px-3 pt-3">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[24px] bg-[#0a0a0a] ring-1 ring-violet-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_0_1px_rgba(139,92,246,0.12)_inset,0_1px_0_rgba(255,255,255,0.06)_inset]">
          {playing && videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain bg-black"
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <button
              type="button"
              disabled={!videoUrl}
              onClick={() => videoUrl && setPlaying(true)}
              className="relative flex h-full w-full items-center justify-center bg-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Play clip in place"
            >
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-violet-900/30 to-[#060606]">
                  <Play className="h-8 w-8 text-slate-600" />
                </div>
              )}
              <span className="pointer-events-none absolute flex h-12 w-12 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/25">
                <Play className="h-5 w-5 translate-x-0.5 text-white" fill="currentColor" />
              </span>
            </button>
          )}

          <div className="pointer-events-none absolute bottom-2 right-2 rounded-[12px] bg-black/75 px-2 py-0.5 text-[11px] font-medium text-white">
            {fmtDuration(clip.duration)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="dash-nested-lift space-y-2 rounded-[22px] border border-white/[0.07] bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-400/90">AI hook</p>
          <p className="text-center text-[11px] font-semibold leading-snug tracking-wide text-white">{hookPreview}</p>
        </div>

        <div className="dash-nested-lift space-y-2 rounded-[22px] border border-white/[0.07] bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Captions</p>
          <p className="text-center text-[11px] leading-snug text-slate-300 line-clamp-3">{captionPreview}</p>
        </div>

        <p className="text-sm font-semibold leading-snug text-white line-clamp-2">{clip.title}</p>
        {jobTitle && <p className="truncate text-xs text-slate-500">{jobTitle}</p>}
        {clip.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{clip.description}</p>
        )}

        <p className="text-[11px] text-slate-500">{fmtClipDateTime(clip.created_at)}</p>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          {videoUrl && (
            <div className="flex gap-2">
              {playing ? (
                <button
                  type="button"
                  onClick={() => setPlaying(false)}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.06] py-2.5 text-xs font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.09]"
                >
                  <Square className="h-3 w-3 fill-current" /> Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="btn-3d flex flex-1 items-center justify-center gap-1.5 rounded-[18px] border border-violet-500/30 bg-violet-600/20 py-2.5 text-xs font-semibold text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-violet-600/30"
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" /> Play
                </button>
              )}
            </div>
          )}
          <a
            href={api.downloadClip(clip.id)}
            className="btn-3d flex items-center justify-center gap-1.5 rounded-[18px] border border-emerald-500/30 bg-emerald-600/20 py-2.5 text-xs font-semibold text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-emerald-600/32"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>
      </div>
    </div>
  );
}
