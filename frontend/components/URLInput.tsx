"use client";

import { useState, FormEvent } from "react";
import { Link2, Loader2, Zap } from "lucide-react";

interface Props {
  onSubmit: (url: string) => Promise<void>;
  loading?: boolean;
}

export default function URLInput({ onSubmit, loading = false }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const isValidYouTube = (u: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s&]+/.test(u);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a YouTube URL");
      return;
    }
    if (!isValidYouTube(trimmed)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setError("");
    try {
      await onSubmit(trimmed);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        {/* Icon */}
        <div className="pointer-events-none absolute left-4 flex items-center">
          <Link2 className="h-5 w-5 text-slate-500" />
        </div>

        {/* Input */}
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="Paste a YouTube URL — e.g. https://youtube.com/watch?v=..."
          disabled={loading}
          className="w-full rounded-xl border border-surface-500 bg-surface-800 py-4 pl-12 pr-44 text-sm text-white placeholder-slate-500 outline-none ring-0 transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 disabled:opacity-60"
        />

        {/* Button */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="absolute right-2 flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Create Clips
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400 pl-1">{error}</p>
      )}
    </form>
  );
}
