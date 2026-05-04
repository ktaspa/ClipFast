"use client";

import { useState, useEffect, FormEvent, type ReactNode } from "react";
import { Link2, Loader2, Zap } from "lucide-react";
import { Primary3DButton } from "@/components/Primary3DButton";

interface Props {
  onSubmit: (url: string) => Promise<void>;
  loading?: boolean;
  initialUrl?: string;
  /** Rendered after the submit button (e.g. settings cog). */
  trailingSlot?: ReactNode;
}

export default function URLInput({ onSubmit, loading = false, initialUrl = "", trailingSlot }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const isValidYouTube = (u: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s&]+/.test(u);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { setError("Please enter a YouTube URL"); return; }
    if (!isValidYouTube(trimmed)) { setError("Please enter a valid YouTube URL"); return; }
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
      <div className="input-sunken-shell flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="input-sunken-well flex min-h-0 flex-1 items-center gap-3 py-3">
          <Link2 className="h-5 w-5 flex-shrink-0 text-slate-500" />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="Paste a YouTube URL — e.g. https://youtube.com/watch?v=..."
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-tight text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:px-1 sm:pb-1">
          <Primary3DButton
            type="submit"
            size="md"
            disabled={loading || !url.trim()}
            className="w-full justify-center gap-2 sm:w-auto"
            wrapperClassName="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Create clips
              </>
            )}
          </Primary3DButton>
          {trailingSlot}
        </div>
      </div>
      {error && <p className="mt-3 pl-1 text-xs text-red-400">{error}</p>}
    </form>
  );
}
