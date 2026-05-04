"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ClipCard from "@/components/ClipCard";
import StatusBadge from "@/components/StatusBadge";
import { api, type Job } from "@/lib/api";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  Scissors,
  Clock,
  Video,
} from "lucide-react";

const ACTIVE = new Set(["pending", "downloading", "transcribing", "analyzing", "clipping"]);

const STEPS = [
  { key: "downloading",  label: "Downloading video",        icon: "⬇️" },
  { key: "transcribing", label: "Transcribing audio",       icon: "🎙️" },
  { key: "analyzing",    label: "AI analysis",              icon: "🧠" },
  { key: "clipping",     label: "Cutting & captioning",     icon: "✂️" },
  { key: "completed",    label: "Clips ready!",             icon: "✅" },
];

const ORDER = ["pending", "downloading", "transcribing", "analyzing", "clipping", "completed", "failed"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const data = await api.getJob(id);
      setJob(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) fetchJob();
  }, [fetchJob, authLoading]);

  // Poll while active
  useEffect(() => {
    if (!job || !ACTIVE.has(job.status)) return;
    const timer = setInterval(fetchJob, 3000);
    return () => clearInterval(timer);
  }, [job, fetchJob]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030303]">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030303]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Job not found</h2>
          <Link href="/dashboard" className="text-violet-400 hover:underline text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusIdx = ORDER.indexOf(job.status);

  return (
    <div className="min-h-screen bg-[#030303]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Job header */}
        <div className="rounded-2xl border border-surface-600 bg-surface-800 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-surface-700">
                <Video className="w-6 h-6 text-violet-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white truncate">
                  {job.title || "Processing…"}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <a
                    href={job.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-xs">{job.youtube_url}</span>
                  </a>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(job.created_at)}
                </div>
              </div>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {/* Progress pipeline */}
          {job.status !== "failed" && (
            <div className="mt-6">
              <div className="flex items-start gap-0">
                {STEPS.map((step, i) => {
                  const stepIdx = ORDER.indexOf(step.key);
                  const done = statusIdx > stepIdx;
                  const active = job.status === step.key;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center">
                      <div className="flex items-center w-full">
                        {/* Left connector */}
                        {i > 0 && (
                          <div
                            className={`flex-1 h-0.5 transition-all ${
                              done || active ? "bg-violet-500" : "bg-surface-600"
                            }`}
                          />
                        )}
                        {/* Step circle */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 flex-shrink-0 transition-all ${
                            done
                              ? "bg-violet-600 border-violet-600"
                              : active
                              ? "border-violet-500 bg-violet-500/20 animate-pulse"
                              : "border-surface-500 bg-surface-700"
                          }`}
                        >
                          {done ? (
                            <span className="text-white text-xs">✓</span>
                          ) : (
                            <span className={active ? "animate-pulse" : ""}>{step.icon}</span>
                          )}
                        </div>
                        {/* Right connector */}
                        {i < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 transition-all ${
                              done ? "bg-violet-500" : "bg-surface-600"
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`mt-2 text-[10px] text-center leading-tight ${
                          active ? "text-violet-400 font-medium" : done ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error details */}
          {job.status === "failed" && job.error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Processing failed</p>
                  <pre className="text-xs text-red-300/70 whitespace-pre-wrap font-mono overflow-auto max-h-40">
                    {job.error}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clips */}
        {job.clips.length > 0 ? (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Scissors className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold text-white">
                {job.clips.length} Viral Clip{job.clips.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {job.clips
                .sort((a, b) => (b.viral_score ?? 0) - (a.viral_score ?? 0))
                .map((clip, i) => (
                  <ClipCard key={clip.id} clip={clip} index={i} />
                ))}
            </div>
          </section>
        ) : ACTIVE.has(job.status) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">
              Your clips are being generated. This usually takes 2–5 minutes…
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
