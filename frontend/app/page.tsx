import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Zap,
  Captions,
  Smartphone,
  Brain,
  Download,
  Scissors,
  ArrowRight,
  Play,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Gemini scans your transcript and identifies the 5 moments most likely to go viral — hooks, surprises, emotion, value.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Captions,
    title: "Auto-Burned Captions",
    description:
      "Word-level timestamps from AssemblyAI become perfectly-timed captions burned directly into your video.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Smartphone,
    title: "9:16 Vertical Format",
    description:
      "Every clip is automatically reframed to portrait mode, ready for TikTok, Reels, and YouTube Shorts.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Scissors,
    title: "Precision Cutting",
    description:
      "FFmpeg cuts clips frame-accurately based on the AI's identified timestamps — no choppy edits.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Download,
    title: "Instant Download",
    description:
      "Clips are ready to download as MP4 — optimized for mobile and ready to post, no extra editing needed.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description:
      "Parallel processing pipeline means you get all 5 clips in minutes, not hours.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Paste a YouTube URL",
    description: "Drop any YouTube link into ClipFast — interviews, podcasts, tutorials, talks, anything.",
  },
  {
    number: "02",
    title: "AI Does the Work",
    description:
      "We download, transcribe, and let Gemini pick the 5 moments with the highest viral potential.",
  },
  {
    number: "03",
    title: "Download & Post",
    description:
      "Get 5 vertical 9:16 clips with captions burned in. Download and publish straight to your socials.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Video Clipping
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Turn Any Video Into{" "}
            <span className="gradient-text">5 Viral Clips</span>
            <br className="hidden sm:block" /> in Minutes
          </h1>

          {/* Subheading */}
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste a YouTube URL. ClipFast downloads the video, transcribes it with
            AssemblyAI, uses Gemini to find the best moments, and delivers
            9:16 clips with captions — ready to post.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:from-violet-500 hover:to-violet-400 transition-all"
            >
              Start Clipping Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-surface-500 bg-surface-800 px-8 py-4 text-base font-medium text-slate-300 hover:bg-surface-700 hover:text-white transition-all"
            >
              <Play className="w-4 h-4" />
              See Demo
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-slate-600">
            No credit card required · Built with AssemblyAI + Gemini + FFmpeg
          </p>
        </div>

        {/* Mock UI card */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="rounded-2xl border border-surface-600 bg-surface-800 p-1 shadow-2xl shadow-black/50">
            <div className="rounded-xl bg-surface-700 p-6">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <div className="ml-3 flex-1 rounded-md bg-surface-600 px-3 py-1.5 text-xs text-slate-500">
                  clipfast.app/dashboard
                </div>
              </div>

              {/* Mock URL input */}
              <div className="flex items-center gap-3 rounded-xl border border-violet-500/40 bg-surface-800 p-4 mb-6">
                <div className="w-5 h-5 rounded-full bg-surface-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-64 rounded bg-slate-600/50" />
                </div>
                <div className="rounded-lg bg-violet-600 px-4 py-2">
                  <div className="h-3 w-20 rounded bg-white/30" />
                </div>
              </div>

              {/* Mock clip grid */}
              <div className="grid grid-cols-5 gap-3">
                {[8.9, 8.4, 7.8, 7.5, 7.2].map((score, i) => (
                  <div key={i} className="rounded-lg bg-surface-600 overflow-hidden">
                    <div className="aspect-[9/16] bg-gradient-to-br from-violet-900/40 to-surface-700 flex items-center justify-center">
                      <Play className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="p-2">
                      <div className="h-2 w-full rounded bg-slate-600/60 mb-1" />
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 flex-1 rounded-full bg-violet-500/40" />
                        <span className="text-[10px] text-violet-400 font-medium">{score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-surface-600">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              From URL to viral clips in 3 steps
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              The entire pipeline runs automatically — you just paste the URL and wait.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-6xl font-bold text-surface-600 mb-4 leading-none select-none">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-surface-600">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need for viral clips
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A complete AI-driven pipeline — from raw YouTube video to post-ready short-form content.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-surface-600 bg-surface-800 p-6 hover:border-surface-500 transition-colors"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${f.bg} mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-surface-600">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to go viral?
          </h2>
          <p className="text-slate-400 mb-8">
            Paste any YouTube URL and get 5 ready-to-post clips in minutes.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all"
          >
            Try ClipFast Free
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-600 py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="text-white font-medium">ClipFast</span>
            <span>· AI Video Clipping Platform</span>
          </div>
          <p>Built with AssemblyAI · Google Gemini · FFmpeg · yt-dlp</p>
        </div>
      </footer>
    </div>
  );
}
