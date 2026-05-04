"use client";

import { useState } from "react";
import { Check, Loader2, Clock } from "lucide-react";
import { api, type SocialAccount } from "@/lib/api";

interface Props {
  account: SocialAccount;
  onUpdate: (updated: SocialAccount) => void;
}

const PLATFORM_CONFIG = {
  youtube: {
    name: "YouTube Shorts",
    gradient: "from-[#ff0000] to-[#cc0000]",
    comingSoon: true,
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  instagram: {
    name: "Instagram",
    gradient: "from-[#833ab4] via-[#fd1d1d] to-[#fcb045]",
    comingSoon: true,
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  tiktok: {
    name: "TikTok",
    gradient: "from-[#010101] via-[#1a1a1a] to-[#010101]",
    comingSoon: true,
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.15a8.16 8.16 0 0 0 4.77 1.52V7.22a4.85 4.85 0 0 1-1-.53z" />
      </svg>
    ),
  },
};

export default function SocialCard({ account, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  const config = PLATFORM_CONFIG[account.platform as keyof typeof PLATFORM_CONFIG];
  if (!config) return null;

  const isConnected = account.status === "connected";

  // ── Coming soon card ────────────────────────────────────────────────
  if (config.comingSoon) {
    return (
      <div className="dash-platform-raised flex flex-col overflow-hidden rounded-[28px] bg-[#0a0a0a]/75">
        <div
          className={`relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-br ${config.gradient} p-6 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_32px_rgba(0,0,0,0.35)]`}
        >
          <div className="flex-shrink-0 drop-shadow-md opacity-60">
            <config.icon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight text-white/80">{config.name}</p>
            <p className="text-xs text-white/50">Coming soon</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 rounded-[14px] border border-white/20 bg-white/10 px-2.5 py-1">
            <Clock className="h-3 w-3 text-white/60" />
            <span className="text-[10px] font-bold text-white/60">Soon</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-xs leading-relaxed text-slate-600">
            OAuth coming soon.
            <br />Direct publishing coming soon.
          </p>
        </div>
      </div>
    );
  }

  // ── Connected / YouTube card ────────────────────────────────────────
  async function handleConnect() {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/youtube/callback`;
      const { auth_url } = await api.youtubeAuthUrl(redirectUri);
      window.location.href = auth_url;
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      const updated = await api.disconnectPlatform(account.platform);
      onUpdate(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dash-platform-raised flex flex-col overflow-hidden rounded-[28px] bg-[#0a0a0a]/75">
      <div
        className={`relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-br ${config.gradient} p-6 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_32px_rgba(0,0,0,0.35)]`}
      >
        <div className="flex-shrink-0 drop-shadow-md">
          <config.icon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight text-white">{config.name}</p>
          <p className="truncate text-xs text-white/75">
            {isConnected ? (account.display_name || "Connected") : "Not connected"}
          </p>
        </div>
        {isConnected && (
          <div className="flex flex-shrink-0 items-center gap-1 rounded-[14px] border border-white/25 bg-white/20 px-2.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            <Check className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white">Live</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {isConnected ? (
          <div className="flex items-start gap-2 rounded-[20px] border border-emerald-500/20 bg-emerald-500/[0.08] p-3.5">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            <p className="text-xs text-emerald-300/80">
              Connected as <strong className="text-white">{account.display_name}</strong>.
              Approved clips will be queued for upload.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-[20px] border border-slate-700/50 bg-white/[0.03] p-3.5">
            <p className="text-xs text-slate-500">
              Sign in with Google to connect your YouTube channel and post approved clips directly.
            </p>
          </div>
        )}

        <div className="mt-auto pt-1">
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="btn-3d flex w-full items-center justify-center gap-2 rounded-[22px] border border-red-500/25 bg-red-500/10 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className={`btn-3d flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all disabled:opacity-40 ${config.gradient}`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect YouTube"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
