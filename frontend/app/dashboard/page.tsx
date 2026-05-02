"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import URLInput from "@/components/URLInput";
import JobCard from "@/components/JobCard";
import { api, type Job } from "@/lib/api";
import { Scissors, Loader2, RefreshCw, Inbox } from "lucide-react";

const ACTIVE_STATUSES = new Set(["pending", "downloading", "transcribing", "analyzing", "clipping"]);

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.listJobs();
      setJobs(data);
      setError(null);
    } catch {
      setError("Could not connect to backend. Make sure it's running on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll when any job is active
  useEffect(() => {
    const hasActive = jobs.some((j) => ACTIVE_STATUSES.has(j.status));
    if (!hasActive) return;
    const id = setInterval(fetchJobs, 3000);
    return () => clearInterval(id);
  }, [jobs, fetchJobs]);

  async function handleSubmit(url: string) {
    setSubmitting(true);
    try {
      const job = await api.createJob(url);
      setJobs((prev) => [job, ...prev]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(jobId: string) {
    await api.deleteJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  const activeJobs = jobs.filter((j) => ACTIVE_STATUSES.has(j.status));
  const doneJobs = jobs.filter((j) => !ACTIVE_STATUSES.has(j.status));

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pt-28 pb-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Scissors className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Paste a YouTube URL below to generate 5 AI-powered viral clips.
          </p>
        </div>

        {/* URL input */}
        <div className="mb-12">
          <URLInput onSubmit={handleSubmit} loading={submitting} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        )}

        {/* Active jobs */}
        {!loading && activeJobs.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Processing ({activeJobs.length})
              </h2>
            </div>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}

        {/* Completed / past jobs */}
        {!loading && doneJobs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Recent Jobs ({doneJobs.length})
              </h2>
              <button
                onClick={fetchJobs}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {doneJobs.map((job) => (
                <JobCard key={job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-700 mb-5">
              <Inbox className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No clips yet</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Paste a YouTube URL above and ClipFast will turn it into 5 viral short clips automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
