"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type Clip } from "@/lib/api";
import { ArrowLeft, Loader2, Save, Trash2, RotateCcw } from "lucide-react";

export default function ClipEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [clip, setClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hook, setHook] = useState("");
  const [caption, setCaption] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await api.getClip(id);
      setClip(c);
      setHook(c.hook_text ?? "");
      setCaption(c.caption_override ?? "");
      setStart(c.start_time);
      setEnd(c.end_time);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clip");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(opts?: { resetCaption?: boolean; clearCaption?: boolean }) {
    if (!clip) return;
    setSaving(true);
    setError(null);
    try {
      const body: Parameters<typeof api.remixClip>[1] = {
        start_time: start,
        end_time: end,
        hook_text: hook.trim() === "" ? "" : hook.trim(),
      };
      if (opts?.resetCaption) {
        body.reset_caption = true;
      } else if (opts?.clearCaption) {
        body.caption_override = "";
      } else if (caption.trim()) {
        body.caption_override = caption;
      }
      const updated = await api.remixClip(clip.id, body);
      setClip(updated);
      setHook(updated.hook_text ?? "");
      setCaption(updated.caption_override ?? "");
      setStart(updated.start_time);
      setEnd(updated.end_time);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const videoUrl = clip ? api.mediaUrl(clip.file_path) : null;

  return (
    <div className="dash-app-bg min-h-screen text-white tracking-tight">
      <header className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#060606]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Edit clip</p>
            <p className="truncate text-sm font-semibold">{clip?.title ?? "…"}</p>
          </div>
          <Link href="/dashboard" className="text-xs font-medium text-violet-400 hover:text-violet-300">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        )}

        {error && (
          <div className="rounded-[22px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && clip && (
          <>
            <div className="dash-island dash-island-elevated overflow-hidden p-4 sm:p-5">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Preview · 9:16 letterbox
              </p>
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-[24px] bg-black ring-1 ring-violet-500/20 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                {videoUrl ? (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center text-sm text-slate-500">
                    No video file yet
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card-dash space-y-5 p-6">
              <div className="dash-nested-lift rounded-[22px] border border-white/[0.06] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <label className="mb-2 block text-xs font-semibold text-violet-300/90">
                  AI hook (top letterbox, full clip)
                </label>
                <textarea
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  rows={2}
                  placeholder="Short headline — ALL CAPS works best"
                  className="w-full rounded-[18px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-violet-500/40"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Burned in white at the top black bar. Keep it short for readability.
                </p>
              </div>

              <div className="dash-nested-lift rounded-[22px] border border-white/[0.06] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <label className="mb-2 block text-xs font-semibold text-slate-400">On-screen captions</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Edit burned-in caption lines, or use actions below."
                  className="w-full rounded-[18px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-violet-500/40"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Replaces auto word captions for this clip. Apply re-renders the MP4.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-400">Start (sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={start}
                    onChange={(e) => setStart(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-[18px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-violet-500/40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-400">End (sec)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={end}
                    onChange={(e) => setEnd(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-[18px] border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-violet-500/40"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave()}
                  className="btn-3d flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Apply &amp; re-render
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave({ clearCaption: true })}
                  className="btn-3d flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove captions
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave({ resetCaption: true })}
                  className="btn-3d flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Reset to auto
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
