"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Play, Star, Clock, X } from "lucide-react";
import { api, type Clip } from "@/lib/api";
import { clsx } from "clsx";

interface Props {
  clip: Clip;
  index: number;
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? "from-emerald-500 to-green-400" :
    score >= 6 ? "from-violet-500 to-cyan-500" :
    "from-amber-500 to-orange-400";

  return (
    <div className="flex items-center gap-2">
      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-white w-6 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export default function ClipCard({ clip, index }: Props) {
  const [videoOpen, setVideoOpen] = useState(false);
  const thumbUrl = api.mediaUrl(clip.thumbnail_path);
  const videoUrl = api.mediaUrl(clip.file_path);
  const downloadUrl = api.downloadClip(clip.id);

  return (
    <>
      <div className="group rounded-xl border border-white/10 bg-[#0d0d0d] overflow-hidden transition hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5">
        {/* Thumbnail */}
        <div className="relative aspect-[9/16] bg-[#111111] overflow-hidden cursor-pointer" onClick={() => setVideoOpen(true)}>
          {thumbUrl ? (
            <Image
              src={thumbUrl}
              alt={clip.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 300px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-900/40 to-surface-700">
              <Play className="w-10 h-10 text-slate-400" />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
          </div>

          {/* Index badge */}
          <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-xs font-bold text-white shadow">
            {index + 1}
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-xs text-white">
            <Clock className="w-3 h-3" />
            {formatDuration(clip.duration)}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {clip.title}
          </h3>

          {clip.description && (
            <p className="text-xs text-slate-400 line-clamp-2">{clip.description}</p>
          )}

          {clip.viral_score != null && (
            <ScoreBar score={clip.viral_score} />
          )}

          {/* Timestamps */}
          <div className="text-xs text-slate-500">
            {formatTimestamp(clip.start_time)} – {formatTimestamp(clip.end_time)}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setVideoOpen(true)}
              disabled={!videoUrl}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222222] py-2 text-xs font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5" />
              Preview
            </button>
            <a
              href={downloadUrl}
              download
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
                clip.file_path
                  ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400"
                  : "bg-[#1a1a1a] text-slate-500 pointer-events-none"
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        </div>
      </div>

      {/* Video modal */}
      {videoOpen && videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoOpen(false)}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full aspect-[9/16] object-contain"
            />
            <div className="p-4">
              <h3 className="font-semibold text-white text-sm">{clip.title}</h3>
              <a
                href={downloadUrl}
                download
                className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 py-2.5 text-sm font-medium text-white hover:from-violet-500 hover:to-violet-400 transition"
              >
                <Download className="w-4 h-4" />
                Download Clip
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
