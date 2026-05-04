"use client";

import { Tv, Trash2, Clock, Loader2, ExternalLink } from "lucide-react";
import type { Channel, VideoUpload } from "@/lib/api";

function extractHandle(channel: Channel): string {
  if (channel.channel_name) {
    return channel.channel_name.replace(/^@/, "");
  }
  const match = channel.channel_url.match(/@([^/?&#]+)/);
  return match ? match[1] : channel.channel_url;
}

interface Props {
  channel: Channel;
  uploads: VideoUpload[];
  onDelete: (id: string) => void;
}

export default function ChannelCard({ channel, uploads, onDelete }: Props) {
  const processingUploads = uploads.filter(
    (u) => u.channel_id === channel.id && u.status === "processing"
  );

  const statusConfig = {
    active:  { label: "Active",  dot: "bg-emerald-400", text: "text-emerald-400" },
    paused:  { label: "Paused",  dot: "bg-amber-400",   text: "text-amber-400" },
    error:   { label: "Error",   dot: "bg-red-400",     text: "text-red-400" },
  };
  const sc = statusConfig[channel.status] ?? statusConfig.active;

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="glass-card-dash overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center gap-4 p-6">
        {channel.channel_thumbnail ? (
          <img
            src={channel.channel_thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="h-12 w-12 flex-shrink-0 rounded-[20px] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.4)] ring-1 ring-white/10 bg-surface-800"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_8px_20px_rgba(124,58,237,0.35)] ring-1 ring-white/15">
            <Tv className="w-5 h-5 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-semibold text-sm truncate">@{extractHandle(channel)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className={`flex items-center gap-1 ${sc.text}`}>
              <span className={`status-dot ${sc.dot}`} />
              {sc.label}
            </span>
            {channel.last_checked_at && (
              <span className="flex items-center gap-1" title="Last time the server polled this channel for new uploads">
                <Clock className="w-3 h-3" />
                Last checked {timeAgo(channel.last_checked_at)}
              </span>
            )}
            <span>{channel.upload_count} tracked</span>
            <a
              href={channel.channel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              View Channel
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onDelete(channel.id)}
            className="rounded-[16px] p-2.5 text-slate-600 transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-red-400/10 hover:text-red-400"
            type="button"
            title="Remove channel"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Auto-clipping in progress (new uploads after subscribe) */}
      {processingUploads.length > 0 && (
        <div className="border-t border-white/5">
          {processingUploads.map((upload) => (
            <div
              key={upload.id}
              className="dash-nested-lift mx-4 mb-4 mt-2 flex items-center gap-3 border border-amber-500/20 bg-amber-500/[0.07] px-4 py-4 first:mt-4"
            >
              {upload.thumbnail_url && (
                <img src={upload.thumbnail_url} alt="" className="h-9 w-16 flex-shrink-0 rounded-[12px] object-cover ring-1 ring-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="status-dot bg-amber-400 animate-pulse" />
                  <span className="text-xs text-amber-400 font-medium">New upload detected</span>
                </div>
                <p className="text-sm text-slate-300 truncate font-medium">
                  {upload.title || upload.youtube_video_id}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Clipping automatically — clips will appear in Review when ready.</p>
              </div>
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
