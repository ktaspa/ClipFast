"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import URLInput from "@/components/URLInput";
import JobCard from "@/components/JobCard";
import ChannelCard from "@/components/ChannelCard";
import ClipReviewCard from "@/components/ClipReviewCard";
import SocialCard from "@/components/SocialCard";
import {
  api, type Job, type Channel, type VideoUpload,
  type Clip, type SocialAccount, type ActivityEvent,
  type ManualClipJobOptions, DEFAULT_MANUAL_CLIP_JOB_OPTIONS, type CreditBalance,
} from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Primary3DButton } from "@/components/Primary3DButton";
import {
  Scissors, Tv, CheckSquare, Share2, Activity,
  Plus, Loader2, RefreshCw, Radio, Zap,
  Clock, Check, Mail, X, Settings,
  ChevronDown, Eraser, Cog, ArrowDownWideNarrow,
  CreditCard,
} from "lucide-react";

const dashEase = [0.4, 0, 0.2, 1] as const;

type Tab = "manual" | "channels" | "review" | "social" | "activity";

type ReviewSort = "newest" | "oldest" | "duration_desc" | "duration_asc";

const REVIEW_SORTS: { id: ReviewSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "duration_desc", label: "Longest" },
  { id: "duration_asc", label: "Shortest" },
];

const ACTIVE_JOB = new Set(["pending", "downloading", "transcribing", "analyzing", "clipping"]);
const HIDDEN_JOBS_KEY = "clipfast_hidden_job_ids";
const MANUAL_JOB_OPTS_KEY = "clipfast_manual_job_opts";

function loadManualJobOpts(): ManualClipJobOptions {
  if (typeof window === "undefined") return { ...DEFAULT_MANUAL_CLIP_JOB_OPTIONS };
  try {
    const raw = localStorage.getItem(MANUAL_JOB_OPTS_KEY);
    if (!raw) return { ...DEFAULT_MANUAL_CLIP_JOB_OPTIONS };
    const o = JSON.parse(raw) as Partial<ManualClipJobOptions>;
    return {
      burn_captions: o.burn_captions !== false,
      burn_hook: o.burn_hook !== false,
      letterbox: o.letterbox !== false,
      clip_min_seconds: Math.min(120, Math.max(5, Number(o.clip_min_seconds) || 15)),
      clip_max_seconds: Math.min(180, Math.max(10, Number(o.clip_max_seconds) || 90)),
      clip_count: Math.min(5, Math.max(1, Number(o.clip_count) || 5)),
    };
  } catch {
    return { ...DEFAULT_MANUAL_CLIP_JOB_OPTIONS };
  }
}

const PUBLIC_API_HINT =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://127.0.0.1:8000";

function formatApiLoadError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();
  const looksLikeNetwork =
    raw === "Failed to fetch" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed");
  if (looksLikeNetwork) {
    return (
      `Cannot reach the API (Next proxies to ${PUBLIC_API_HINT}). ` +
      "Start the backend: from the repo root run `./start.sh` or `python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`. " +
      "If the API uses another host/port, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` and restart `npm run dev`."
    );
  }
  return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
}

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "manual",   label: "Manual Clip",  icon: Scissors,    desc: "Clip any video" },
  { id: "channels", label: "Channels",     icon: Tv,          desc: "Auto-monitor" },
  { id: "review",   label: "Review",       icon: CheckSquare, desc: "Preview & download" },
  { id: "social",   label: "Social",       icon: Share2,      desc: "Coming soon" },
  { id: "activity", label: "Activity",     icon: Activity,    desc: "Event log" },
];

const EVENT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  channel_added:      { icon: Tv,        color: "text-violet-400" },
  upload_detected:    { icon: Radio,     color: "text-amber-400" },
  clipping_confirmed: { icon: Scissors,  color: "text-cyan-400" },
  clips_ready:        { icon: Zap,       color: "text-emerald-400" },
  clip_approved:      { icon: Check,     color: "text-emerald-400" },
  clip_rejected:      { icon: RefreshCw, color: "text-red-400" },
};

export default function DashboardPage() {
  const { user: session, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("manual");

  const [jobs, setJobs]                     = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading]       = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [pendingUrl, setPendingUrl]         = useState("");

  const [channels, setChannels]             = useState<Channel[]>([]);
  const [uploads, setUploads]               = useState<VideoUpload[]>([]);
  const [channelUrl, setChannelUrl]         = useState("");
  const [addingChannel, setAddingChannel]   = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);

  const [clips, setClips]                   = useState<Clip[]>([]);
  const [clipsLoading, setClipsLoading]     = useState(true);
  const [reviewSort, setReviewSort]         = useState<ReviewSort>("newest");

  const [socials, setSocials]               = useState<SocialAccount[]>([]);
  const [socialsLoading, setSocialsLoading] = useState(true);

  const [events, setEvents]                 = useState<ActivityEvent[]>([]);
  const [eventsLoading, setEventsLoading]   = useState(true);
  const [credits, setCredits]               = useState<CreditBalance | null>(null);

  const [error, setError]                   = useState<string | null>(null);
  const [emailNotification, setEmailNotification] = useState<{ jobTitle: string; clips: number } | null>(null);

  const [hiddenJobIds, setHiddenJobIds]     = useState<Set<string>>(new Set());
  const [recentJobsOpen, setRecentJobsOpen] = useState(false);
  const [manualJobOpts, setManualJobOpts] = useState<ManualClipJobOptions>(DEFAULT_MANUAL_CLIP_JOB_OPTIONS);
  const [manualSettingsOpen, setManualSettingsOpen] = useState(false);

  // Track previously-active jobs to detect completions
  const prevJobsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      window.location.assign("/auth");
      return;
    }
    const needsVerification = session.providerData.some((p) => p.providerId === "password") && !session.emailVerified;
    if (needsVerification) {
      auth.currentUser?.reload().finally(() => {
        const refreshed = auth.currentUser;
        const stillUnverified = refreshed?.providerData.some((p) => p.providerId === "password") && !refreshed.emailVerified;
        if (stillUnverified) window.location.assign("/auth");
      });
    }
  }, [session, authLoading]);

  // ── Load pending URL from localStorage ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("clipfast_pending_url");
    if (saved) {
      setPendingUrl(saved);
      localStorage.removeItem("clipfast_pending_url");
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_JOBS_KEY);
      if (raw) setHiddenJobIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setManualJobOpts(loadManualJobOpts());
  }, []);

  useEffect(() => {
    const pt = localStorage.getItem("clipfast_preferred_tab");
    if (
      pt === "manual" ||
      pt === "channels" ||
      pt === "review" ||
      pt === "social" ||
      pt === "activity"
    ) {
      setTab(pt);
    }
  }, []);

  function persistHidden(next: Set<string>) {
    setHiddenJobIds(next);
    try {
      localStorage.setItem(HIDDEN_JOBS_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* ignore */
    }
  }

  // ── Data fetchers ────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.listJobs();
      setJobs((prev) => {
        // Detect newly-completed jobs
        data.forEach((job) => {
          const wasActive = ACTIVE_JOB.has(prevJobsRef.current.get(job.id) ?? "");
          const isNowDone = job.status === "completed";
          if (wasActive && isNowDone && job.clips.length > 0) {
            setEmailNotification({ jobTitle: job.title ?? "Your video", clips: job.clips.length });
            // Fire email notification
            if (session?.email) {
              fetch("/api/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: session.email,
                  jobTitle: job.title ?? "Your video",
                  clipsCount: job.clips.length,
                }),
              }).catch(() => {});
            }
          }
        });
        // Update ref map
        data.forEach((j) => prevJobsRef.current.set(j.id, j.status));
        return data;
      });
      setError(null);
    } catch (e) {
      console.error(e);
      setError(formatApiLoadError(e));
    } finally {
      setJobsLoading(false);
    }
  }, [session]);

  const fetchChannels  = useCallback(async () => { try { const [chs, ups] = await Promise.all([api.listChannels(), api.listUploads()]); setChannels(chs); setUploads(ups); } finally { setChannelsLoading(false); } }, []);
  const fetchClips     = useCallback(async () => { try { setClips(await api.listClips()); } finally { setClipsLoading(false); } }, []);
  const fetchSocials   = useCallback(async () => { try { setSocials(await api.listSocials()); } finally { setSocialsLoading(false); } }, []);
  const fetchActivity  = useCallback(async () => { try { setEvents(await api.listActivity()); } finally { setEventsLoading(false); } }, []);
  const fetchCredits   = useCallback(async () => { try { setCredits(await api.getCredits()); } catch { /* non-blocking */ } }, []);

  useEffect(() => { if (!authLoading) fetchJobs(); },      [fetchJobs, authLoading]);
  useEffect(() => { if (!authLoading) fetchCredits(); },   [fetchCredits, authLoading]);
  useEffect(() => { if (!authLoading) fetchChannels(); },  [fetchChannels, authLoading]);
  useEffect(() => {
    if (tab === "review") {
      fetchClips();
      fetchJobs();
    }
  }, [tab, fetchClips, fetchJobs]);
  useEffect(() => { if (tab === "social")   fetchSocials(); },  [tab, fetchSocials]);
  useEffect(() => { if (tab === "activity") fetchActivity(); }, [tab, fetchActivity]);

  // ── Handle OAuth callback params (must be after fetchSocials is declared) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthTab = params.get("tab");
    const oauthErr = params.get("oauth_error");
    if (oauthTab === "social") {
      setTab("social");
      if (oauthErr) {
        setError(`YouTube connection failed: ${oauthErr}`);
      } else {
        fetchSocials();
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      url.searchParams.delete("oauth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchSocials]);

  useEffect(() => {
    if (tab !== "channels") return;
    const id = setInterval(fetchChannels, 45_000);
    return () => clearInterval(id);
  }, [tab, fetchChannels]);

  useEffect(() => {
    const hasActive = jobs.some((j) => ACTIVE_JOB.has(j.status));
    if (!hasActive) return;
    let ms = 3000;
    try {
      const s = localStorage.getItem("clipfast_job_poll_ms");
      if (s) {
        const n = parseInt(s, 10);
        if (!Number.isNaN(n) && n >= 2000 && n <= 120_000) ms = n;
      }
    } catch {
      /* ignore */
    }
    const id = setInterval(fetchJobs, ms);
    return () => clearInterval(id);
  }, [jobs, fetchJobs]);

  // ── Handlers ─────────────────────────────────────────────────────────
  function patchManualJobOpts(patch: Partial<ManualClipJobOptions>) {
    setManualJobOpts((prev) => {
      const next = { ...prev, ...patch };
      if (next.clip_max_seconds < next.clip_min_seconds) {
        next.clip_max_seconds = next.clip_min_seconds;
      }
      try {
        localStorage.setItem(MANUAL_JOB_OPTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSubmitJob(url: string) {
    setSubmitting(true);
    setError(null);
    try {
      const job = await api.createJob(url, manualJobOpts);
      setJobs((prev) => [job, ...prev]);
      prevJobsRef.current.set(job.id, job.status);
      fetchCredits();
    } catch (e) {
      console.error(e);
      const msg = formatApiLoadError(e);
      if (msg.startsWith("402:")) {
        window.location.href = "/pricing";
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteJob(jobId: string) {
    await api.deleteJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    prevJobsRef.current.delete(jobId);
  }

  function handleClearRecentJobs() {
    const next = new Set(hiddenJobIds);
    visibleDoneJobs.forEach((j) => next.add(j.id));
    persistHidden(next);
  }

  function handleRefreshRecentJobs() {
    persistHidden(new Set());
    fetchJobs();
  }

  function toggleRecentJobs() {
    setRecentJobsOpen((open) => {
      const next = !open;
      if (open && !next) fetchJobs();
      return next;
    });
  }

  async function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!channelUrl.trim()) return;
    setAddingChannel(true);
    setError(null);
    try {
      await api.addChannel(channelUrl.trim());
      setChannelUrl("");
      await fetchChannels();
    } catch (err: any) {
      setError(err.message || "Failed to add channel");
    } finally {
      setAddingChannel(false);
    }
  }

  async function handleDeleteChannel(id: string) {
    await api.deleteChannel(id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
    setUploads((prev) => prev.filter((u) => u.channel_id !== id));
  }

  function handleSocialUpdate(updated: SocialAccount) {
    setSocials((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  // ── Derived ──────────────────────────────────────────────────────────
  const activeJobs          = jobs.filter((j) => ACTIVE_JOB.has(j.status));
  const doneJobs            = jobs.filter((j) => !ACTIVE_JOB.has(j.status));
  const visibleDoneJobs     = useMemo(
    () => doneJobs.filter((j) => !hiddenJobIds.has(j.id)),
    [doneJobs, hiddenJobIds],
  );
  const channelClippingCount = uploads.filter((u) => u.status === "processing").length;
  const readyClipsCount     = clips.filter((c) => c.status === "ready").length;
  const sortedClips         = useMemo(() => {
    const copy = [...clips];
    switch (reviewSort) {
      case "newest":
        copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "duration_desc":
        copy.sort((a, b) => b.duration - a.duration);
        break;
      case "duration_asc":
        copy.sort((a, b) => a.duration - b.duration);
        break;
    }
    return copy;
  }, [clips, reviewSort]);

  function jobTitleForClip(clip: Clip) { return jobs.find((j) => j.id === clip.job_id)?.title ?? undefined; }
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
    <div className="dash-app-bg flex min-h-screen gap-6 p-6 tracking-tight">

      {/* ── Floating sidebar island ───────────────────────────────────── */}
      <aside className="dash-sidebar-shell sticky top-6 z-50 flex h-[calc(100vh-3rem)] w-[272px] shrink-0 flex-col overflow-y-auto p-3">
        <div className="mb-3 flex min-h-[52px] shrink-0 items-center gap-3 px-1">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] transition-opacity duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-85"
            aria-label="Home"
          >
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
          </Link>
          {session && (
            <div className="dash-badge-lift flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
              {session.photoURL ? (
                <img src={session.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 flex-shrink-0 rounded-full ring-1 ring-white/10" />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/35 ring-1 ring-violet-400/30">
                  <span className="text-xs font-bold text-violet-200">{(session.displayName ?? session.email ?? "U")[0].toUpperCase()}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{session.displayName ?? "User"}</p>
                <p className="truncate text-[10px] text-slate-500">{session.email}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 py-1">
          {TABS.map(({ id, label, icon: Icon, desc }) => {
            const badge =
              id === "channels" && channelClippingCount > 0 ? channelClippingCount :
              id === "review" && readyClipsCount > 0 ? readyClipsCount : 0;
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`group flex w-full items-center gap-3 px-3.5 py-3 text-left ${
                  isActive ? "dash-nav-active" : "dash-nav-idle"
                }`}
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] transition-[background-color,box-shadow] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isActive
                      ? "bg-violet-600 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35),0_0_20px_rgba(124,58,237,0.35)]"
                      : "bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] group-hover:bg-white/10"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`mb-0.5 text-sm font-semibold leading-none ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>{label}</div>
                  <div className="text-[10px] text-slate-600">{desc}</div>
                </div>
                {badge > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white shadow-[0_4px_12px_rgba(124,58,237,0.45)] animate-pulse">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-3">
          <Link href="/settings" className="dash-nav-idle group flex items-center gap-3 px-3.5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group-hover:bg-white/10">
              <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">Settings</div>
              <div className="text-[10px] text-slate-600">Account & preferences</div>
            </div>
          </Link>
          {credits && (
            <Link href="/pricing" className="dash-nav-idle group mt-1 flex items-center gap-3 px-3.5 py-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors group-hover:bg-white/10">
                <CreditCard className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">
                  {credits.available_clip_credits} clips left
                </div>
                <div className="text-[10px] text-slate-600">Add 20 more</div>
              </div>
            </Link>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
        {emailNotification && (
          <div className="dash-island flex items-center gap-3 border-emerald-500/30 bg-emerald-500/[0.07] px-5 py-4 shadow-[0_0_32px_rgba(52,211,153,0.12)]">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 flex-shrink-0">
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Your {emailNotification.clips} clips are ready! 🎬
              </p>
              {session?.email && (
                <p className="text-xs text-emerald-400">
                  Email sent to {session.email}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setEmailNotification(null)} className="text-slate-500 transition-colors duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: dashEase }}
          className="dash-island flex-1 px-8 py-8 pb-24"
        >
          {error && (
            <div className="mb-6 flex items-start justify-between gap-4 rounded-[22px] border border-red-500/30 bg-red-500/[0.08] px-5 py-4 shadow-[0_0_32px_rgba(239,68,68,0.12)]">
              <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-red-200">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="flex-shrink-0 rounded-[14px] p-2 text-red-300 transition-colors duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-red-500/15 hover:text-white"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Manual Clip ─────────────────────────────────────────────── */}
          {tab === "manual" && (
            <div className="animate-fade-in space-y-10">
              <div className="flex min-h-[52vh] flex-col items-center justify-center px-2">
                <div className="w-full max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55, ease: dashEase }}
                    className="mx-auto mb-8 flex h-[100px] w-[100px] items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 dash-medallion"
                  >
                    <Scissors className="h-11 w-11 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
                  </motion.div>
                  <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-violet-400/90">Manual clip</p>
                  <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">Paste a YouTube link</h2>
                  <p className="mx-auto mb-8 max-w-md text-center text-sm font-medium text-slate-500">
                    We&apos;ll download, transcribe, and generate vertical clips. Use the{" "}
                    <span className="text-slate-400">settings</span> cog to tune captions, hooks, framing, and length.
                  </p>
                  {credits && (
                    <motion.div
                      animate={{ scale: [1, 1.045, 1] }}
                      transition={{ duration: 1.65, repeat: Infinity, ease: "easeInOut" }}
                      className="mx-auto mb-5 w-fit"
                    >
                      <Link
                        href="/pricing"
                        className="flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-600/15 px-4 py-2 text-xs font-semibold text-slate-100 shadow-[0_0_24px_rgba(124,58,237,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-violet-300/60 hover:bg-violet-600/25"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-violet-300" />
                        <span>{credits.available_clip_credits} clip{credits.available_clip_credits === 1 ? "" : "s"} left</span>
                        <span className="text-violet-200">Add more</span>
                      </Link>
                    </motion.div>
                  )}
                  <URLInput
                    onSubmit={handleSubmitJob}
                    loading={submitting}
                    initialUrl={pendingUrl}
                    trailingSlot={
                      <button
                        type="button"
                        onClick={() => setManualSettingsOpen(true)}
                        className="-ml-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                        title="Clip generation settings"
                        aria-label="Open clip generation settings"
                      >
                        <Cog className="h-5 w-5" strokeWidth={2} />
                      </button>
                    }
                  />
                </div>
              </div>

              {manualSettingsOpen && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
                  onClick={() => setManualSettingsOpen(false)}
                >
                  <div
                    className="glass-card-dash max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.65)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-white">Clip generation</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Saved on this device. Used for the next manual job only.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualSettingsOpen(false)}
                        className="rounded-[14px] p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(
                        [
                          {
                            key: "burn_captions" as const,
                            title: "Word captions",
                            desc: "Burn synced captions (needs FFmpeg with libass).",
                            val: manualJobOpts.burn_captions,
                          },
                          {
                            key: "burn_hook" as const,
                            title: "AI hook line",
                            desc: "Headline in the top black bar for the full clip.",
                            val: manualJobOpts.burn_hook,
                          },
                          {
                            key: "letterbox" as const,
                            title: "Letterbox & zoom framing",
                            desc: "Centered 9:16 with black bars. Off = older tight crop style.",
                            val: manualJobOpts.letterbox,
                          },
                        ] as const
                      ).map((row) => (
                        <div
                          key={row.key}
                          className="dash-nested-lift flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.06] px-4 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{row.title}</p>
                            <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-500">{row.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => patchManualJobOpts({ [row.key]: !row.val })}
                            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                              row.val ? "bg-violet-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]" : "bg-white/10"
                            }`}
                            aria-pressed={row.val}
                          >
                            <span
                              className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                row.val ? "left-[calc(100%-1.625rem)]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      ))}

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="dash-nested-lift rounded-[20px] border border-white/[0.06] p-3">
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Min length (s)
                          </label>
                          <input
                            type="number"
                            min={5}
                            max={120}
                            step={1}
                            value={manualJobOpts.clip_min_seconds}
                            onChange={(e) =>
                              patchManualJobOpts({ clip_min_seconds: Number(e.target.value) || 5 })
                            }
                            className="w-full rounded-[14px] border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                          />
                        </div>
                        <div className="dash-nested-lift rounded-[20px] border border-white/[0.06] p-3">
                          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Max length (s)
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={180}
                            step={1}
                            value={manualJobOpts.clip_max_seconds}
                            onChange={(e) =>
                              patchManualJobOpts({ clip_max_seconds: Number(e.target.value) || 90 })
                            }
                            className="w-full rounded-[14px] border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                          />
                        </div>
                      </div>

                      <div className="dash-nested-lift rounded-[20px] border border-white/[0.06] p-3">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Clips to generate
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {([1, 2, 3, 4, 5] as const).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => patchManualJobOpts({ clip_count: n })}
                              className={`rounded-[14px] border px-3 py-2 text-xs font-semibold transition ${
                                manualJobOpts.clip_count === n
                                  ? "border-violet-500/40 bg-violet-600/25 text-white"
                                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setManualSettingsOpen(false)}
                      className="btn-3d mt-6 w-full rounded-[18px] bg-gradient-to-r from-violet-600 to-violet-700 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.3)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {jobsLoading && <Spinner />}

              {!jobsLoading && activeJobs.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Processing ({activeJobs.length})</h3>
                  </div>
                  <div className="space-y-3">{activeJobs.map((job) => <JobCard key={job.id} job={job} onDelete={handleDeleteJob} />)}</div>
                </section>
              )}

              {!jobsLoading && visibleDoneJobs.length > 0 && (
                <section className="max-w-3xl mx-auto w-full">
                  <button
                    type="button"
                    onClick={toggleRecentJobs}
                    className="dash-nested-lift flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-white">
                      Recent jobs
                      <span className="ml-2 text-xs font-normal text-slate-500">({visibleDoneJobs.length})</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${recentJobsOpen ? "rotate-180" : ""}`} />
                  </button>

                  {recentJobsOpen && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={handleClearRecentJobs} className="btn-ghost flex items-center gap-1.5 text-xs">
                          <Eraser className="w-3 h-3" /> Clear
                        </button>
                        <button type="button" onClick={handleRefreshRecentJobs} className="btn-ghost flex items-center gap-1.5 text-xs">
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      </div>
                      <div className="space-y-3">
                        {visibleDoneJobs.map((job) => (
                          <JobCard key={job.id} job={job} onDelete={handleDeleteJob} />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!jobsLoading && jobs.length === 0 && (
                <EmptyState icon={<Scissors className="w-8 h-8 text-slate-500" />} title="No clips yet" desc="Paste a YouTube URL above to generate your first 5 viral clips." />
              )}
            </div>
          )}

          {/* ── Channels ────────────────────────────────────────────────── */}
          {tab === "channels" && (
            <div className="animate-fade-in space-y-6">
              <form onSubmit={handleAddChannel}>
                <div className="glass-card-dash p-6">
                  <label className="mb-4 block text-sm font-semibold tracking-tight text-white">Monitor a YouTube Channel</label>
                  <div className="input-sunken-shell flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="input-sunken-well flex min-h-0 flex-1 items-center gap-3 py-3">
                      <Tv className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/@channelname"
                        value={channelUrl}
                        onChange={(e) => setChannelUrl(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium tracking-tight text-white outline-none placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <div className="flex shrink-0 items-center justify-center sm:px-1 sm:pb-1">
                    <Primary3DButton
                      type="submit"
                      size="md"
                      disabled={addingChannel || !channelUrl.trim()}
                      className="gap-2"
                    >
                      {addingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Monitor
                    </Primary3DButton>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-600">
                      Supports @handle, /c/, /channel/, and /user/ URL formats. Only videos published after you add the channel are clipped; the server checks for new uploads about every 3 hours.
                    </p>
                    {addingChannel && (
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        Resolving channel profile…
                      </p>
                    )}
                  </div>
                </div>
              </form>
              {channelsLoading && <Spinner />}
              {!channelsLoading && channels.length === 0 && <EmptyState icon={<Tv className="w-8 h-8 text-slate-500" />} title="No channels yet" desc="Add a YouTube channel above. New uploads are detected on a schedule and clipped automatically." />}
              {!channelsLoading && channels.length > 0 && (
                <div className="space-y-4">{channels.map((ch) => <ChannelCard key={ch.id} channel={ch} uploads={uploads} onDelete={handleDeleteChannel} />)}</div>
              )}
            </div>
          )}

          {/* ── Review Queue ─────────────────────────────────────────────── */}
          {tab === "review" && (
            <div className="animate-fade-in space-y-6">
              {activeJobs.length > 0 && (
                <section className="glass-card-dash border-violet-500/25 bg-gradient-to-br from-violet-500/[0.1] via-transparent to-cyan-500/[0.04] p-6 shadow-[0_0_40px_rgba(124,58,237,0.12)]">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] border border-violet-500/35 bg-violet-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                      <Loader2 className="w-5 h-5 text-violet-300 animate-spin" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Clips in progress</h2>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {activeJobs.length} job{activeJobs.length !== 1 ? "s" : ""} still running. Finished clips will appear in the grid below.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeJobs.map((job) => (
                      <JobCard key={job.id} job={job} onDelete={handleDeleteJob} />
                    ))}
                  </div>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Sort</span>
                </div>
                <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[22px] border border-white/10 bg-black/20 p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.35)]">
                  {REVIEW_SORTS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setReviewSort(id)}
                      className={`rounded-[18px] px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:px-4 sm:py-2.5 ${
                        reviewSort === id
                          ? "bg-violet-600 text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.35),0_0_28px_rgba(139,92,246,0.35)]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {clipsLoading && <Spinner />}
              {!clipsLoading && sortedClips.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sortedClips.map((clip) => (
                    <ClipReviewCard key={clip.id} clip={clip} jobTitle={jobTitleForClip(clip)} />
                  ))}
                </div>
              )}
              {!clipsLoading && sortedClips.length === 0 && activeJobs.length > 0 && (
                  <div className="dash-nested-lift flex flex-col items-center justify-center px-4 py-16">
                    <Loader2 className="w-9 h-9 text-violet-400 animate-spin mb-4" />
                    <p className="text-sm font-semibold text-white">Hang tight — clips are generating</p>
                    <p className="text-xs text-slate-500 mt-2 text-center max-w-sm leading-relaxed">
                      Transcription and AI clipping can take a few minutes. Progress for each job is in the card above.
                    </p>
                  </div>
                )}
              {!clipsLoading && sortedClips.length === 0 && activeJobs.length === 0 && (
                  <EmptyState
                    icon={<CheckSquare className="w-8 h-8 text-slate-500" />}
                    title="No clips yet"
                    desc="Start a clip job from Manual Clip, or wait for channel monitoring to finish — finished clips show up here."
                  />
                )}
            </div>
          )}

          {/* ── Social ───────────────────────────────────────────────────── */}
          {tab === "social" && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Social Publishing</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Connect your accounts to post approved clips directly. Nothing is published without your approval.
                </p>
              </div>
              {socialsLoading ? (
                <Spinner />
              ) : (
                <div className="grid gap-5 sm:grid-cols-3">
                  {[...socials]
                    .sort((a, b) => {
                      const order: Record<string, number> = { youtube: 0, instagram: 1, tiktok: 2 };
                      return (order[a.platform] ?? 9) - (order[b.platform] ?? 9);
                    })
                    .map((account) => (
                      <SocialCard key={account.id} account={account} onUpdate={handleSocialUpdate} />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── Activity ─────────────────────────────────────────────────── */}
          {tab === "activity" && (
            <div className="animate-fade-in space-y-6">
              <div className="flex justify-end">
                <button onClick={fetchActivity} className="btn-ghost flex items-center gap-1.5 text-xs"><RefreshCw className="w-3 h-3" /> Refresh</button>
              </div>
              {eventsLoading && <Spinner />}
              {!eventsLoading && events.length === 0 && <EmptyState icon={<Activity className="w-8 h-8 text-slate-500" />} title="No activity yet" desc="Events will appear here as you add channels, new uploads are detected, and you review clips." />}
              {!eventsLoading && events.length > 0 && (
                <div className="relative pl-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-white/5" />
                  <div className="space-y-3">
                    {events.map((ev) => {
                      const cfg = EVENT_ICONS[ev.event_type] ?? { icon: Activity, color: "text-slate-400" };
                      const Icon = cfg.icon;
                      return (
                        <div key={ev.id} className="relative flex items-start gap-4">
                          <div className={`absolute -left-6 flex items-center justify-center w-5 h-5 rounded-full bg-[#0d0d0d] border border-white/10 flex-shrink-0 mt-0.5 ${cfg.color}`}>
                            <Icon className="w-2.5 h-2.5" />
                          </div>
                          <div className="glass-card-dash rounded-[22px] flex-1 px-4 py-3">
                            <p className="text-sm text-slate-300">{ev.description}</p>
                            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(ev.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.main>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>;
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="dash-badge-lift mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[26px]">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}
