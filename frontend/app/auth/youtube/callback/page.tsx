"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function YouTubeCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      router.replace(
        `/dashboard?tab=social&oauth_error=${encodeURIComponent(error ?? "cancelled")}`
      );
      return;
    }

    const redirectUri = `${window.location.origin}/auth/youtube/callback`;

    api
      .youtubeExchange(code, redirectUri)
      .then(() => router.replace("/dashboard?tab=social"))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "exchange_failed";
        router.replace(
          `/dashboard?tab=social&oauth_error=${encodeURIComponent(msg)}`
        );
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-slate-400">Connecting your YouTube account…</p>
      </div>
    </div>
  );
}
