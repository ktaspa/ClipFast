"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  ArrowDown, ArrowRight, Brain, Captions, Smartphone,
  Scissors, Shield, Radio, Star, Play,
  ChevronRight, Youtube,
} from "lucide-react";
import { Primary3DButton } from "@/components/Primary3DButton";
import { useAuth } from "@/components/AuthProvider";

const ease = [0.4, 0, 0.2, 1] as const;
const transitionSaas = { duration: 0.5, ease } as const;

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease } },
};
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const cardVariant = {
  hidden:  { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease } },
};

function vp() { return { once: true, margin: "-80px" } as const; }

const navLinkClass =
  "text-[13px] font-medium text-white transition-[opacity,color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-80 whitespace-nowrap";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.p variants={fadeIn} initial="hidden" whileInView="visible" viewport={vp()}
      className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
      {children}
    </motion.p>
  );
}
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={vp()}
      className="mb-3 text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl">
      {children}
    </motion.h2>
  );
}

// ── Dashboard screenshot — `public/dashboard-showcase.png` (plain <img>, no Next/Image).
// SHOWCASE_NATURAL_* must match the PNG pixel dimensions (currently hi-res from Downloads).

const SHOWCASE_IMG_SRC = "/dashboard-showcase.png";
const SHOWCASE_NATURAL_W = 2922;
const SHOWCASE_NATURAL_H = 1580;

function DashboardShowcase() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07070f] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_32px_80px_rgba(0,0,0,0.8)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SHOWCASE_IMG_SRC}
        alt="ClixFair dashboard — channels, monitoring, and uploads"
        width={SHOWCASE_NATURAL_W}
        height={SHOWCASE_NATURAL_H}
        className="mx-auto block h-auto w-full max-w-full object-contain align-top"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

// ── Earn / Whop ────────────────────────────────────────────────────────────────

const WHOP_URL = "https://whop.com";

function EarnWhopSection() {
  const stats = [
    { value: "842+", label: "Live Campaigns" },
    { value: "$0.50-$20", label: "Per 1,000 Views" },
    { value: "$100,000,000+", label: "Paid Out to Creators" },
  ] as const;
  const steps = [
    { emoji: "🎬", title: "Create Clips", desc: "Use ClixFair to generate clips" },
    { emoji: "💰", title: "Join Campaigns", desc: "Browse Whop's reward programs" },
    { emoji: "📈", title: "Get Paid", desc: "Earn money for every view" },
  ] as const;

  return (
    <section id="earn" className="relative scroll-mt-24 overflow-hidden border-t border-white/[0.04] px-4 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[min(100%,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.07] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <SectionLabel>Earn</SectionLabel>
          <div className="mb-5 flex flex-col items-center justify-center sm:mb-6">
            <div
              className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 shadow-[0_0_0_1px_rgba(254,215,170,0.35),0_0_48px_rgba(249,115,22,0.55),0_0_96px_rgba(234,88,12,0.35)] ring-2 ring-orange-400/25 sm:h-[132px] sm:w-[132px] sm:rounded-[32px]"
            >
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-t from-black/10 to-transparent sm:rounded-[32px]" aria-hidden />
              <Image
                src="/whop-logo.png"
                alt="Whop"
                width={360}
                height={185}
                className="relative z-[1] h-10 w-auto max-w-[88px] object-contain mix-blend-screen sm:h-11 sm:max-w-[96px]"
                unoptimized
              />
            </div>
          </div>

          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp()}
            className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Monetize Your Clips with Whop
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={vp()}
            className="mx-auto mb-6 max-w-xl text-[15px] leading-relaxed text-slate-400 sm:text-[17px]"
          >
            Turn your ClixFair clips into cash through Whop&apos;s Content Rewards.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={vp()} className="mb-8">
            <a
              href={WHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_40px_rgba(234,88,12,0.35)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(234,88,12,0.45)]"
            >
              Start Earning on Whop
            </a>
          </motion.div>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp()}
          className="mb-10 grid gap-3 sm:grid-cols-3 sm:gap-4"
        >
          {stats.map(({ value, label }) => (
            <motion.div
              key={label}
              variants={cardVariant}
              className="glass-card flex flex-col items-center justify-center px-5 py-6 text-center"
            >
              <p className="mb-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
              <p className="text-[13px] font-medium text-slate-500">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={vp()} className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-white sm:text-xl">How It Works</h3>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp()}
          className="grid gap-4 md:grid-cols-3"
        >
          {steps.map(({ emoji, title, desc }) => (
            <motion.div key={title} variants={cardVariant} className="glass-card p-6 text-center md:text-left">
              <span className="mb-3 block text-3xl" aria-hidden>
                {emoji}
              </span>
              <h4 className="mb-1.5 text-[15px] font-semibold text-white">{title}</h4>
              <p className="text-[13px] leading-relaxed text-slate-500">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Channel URL hero input ─────────────────────────────────────────────────────

function HeroChannelInput() {
  const router = useRouter();
  const { user } = useAuth();
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(user ? "/dashboard" : "/auth");
  }

  return (
    <motion.div
      variants={fadeUp} initial="hidden" animate="visible"
      transition={{ delay: 0.25 }}
      className="mx-auto mt-6 w-full max-w-[560px]"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div className="input-sunken-shell flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="input-sunken-well flex min-h-0 flex-1 items-center gap-3 py-3">
            <Youtube className="h-5 w-5 shrink-0 text-red-400" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="youtube.com/@mkbhd or channel URL"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-tight text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:px-1 sm:pb-1">
            <Primary3DButton
              type="submit"
              size="md"
              className="w-full justify-center gap-2 sm:w-auto"
              wrapperClassName="w-full sm:w-auto"
            >
              <span className="flex items-center gap-1.5">
                Get clips
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Primary3DButton>
          </div>
        </div>
      </form>
      <p className="text-center text-[11px] text-slate-600 mt-2.5">
        Paste any YouTube channel URL · No credit card needed
      </p>
    </motion.div>
  );
}

// ── Features data ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Radio,      color: "violet",  title: "Channel monitoring",      desc: "Add any YouTube channel and we watch it 24/7. New upload? It lands in your queue instantly." },
  { icon: Brain,      color: "violet",  title: "AI clip selection",       desc: "Our AI reads your full transcript and scores every moment. You get the 5 clips with the highest viral potential, every time." },
  { icon: Captions,   color: "sky",     title: "Auto-burned captions",    desc: "Word-level timestamps from transcription. Captions are burned directly into the video. No third-party apps, no extra steps." },
  { icon: Smartphone, color: "emerald", title: "9:16 auto-reframe",       desc: "Every clip is automatically cropped, scaled, and padded to portrait. TikTok, Reels, Shorts-ready out of the box." },
  { icon: Shield,     color: "amber",   title: "You're always in control",desc: "Nothing gets clipped without your confirm. Nothing gets posted without your approve. The app never acts autonomously." },
  { icon: Scissors,   color: "sky",     title: "Manual clip",             desc: "No channel? Just paste a YouTube video URL and get clips in minutes. Both modes live side by side." },
];

const colorMap: Record<string, string> = {
  violet:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  sky:     "bg-sky-500/10    text-sky-400    border-sky-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber:   "bg-amber-500/10  text-amber-400  border-amber-500/20",
};

// ── Main export ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();
  const appEntry = user ? "/dashboard" : "/auth";
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y       = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const ySpring = useSpring(y, { stiffness: 100, damping: 30 });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden tracking-tight">

      {/* ── Floating pill nav ─────────────────────────────────────── */}
      <header className="fixed top-5 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-5xl items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] py-2 pl-4 pr-2 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)] transition-[background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sm:pl-5 lg:max-w-6xl"
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:opacity-90"
            aria-label="Home"
          >
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
            <span className="truncate bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text text-[15px] font-bold tracking-tight text-transparent sm:text-base">
              ClixFair
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 md:flex lg:gap-8" aria-label="Page sections">
            <a href="#preview" className={navLinkClass}>
              Product
            </a>
            <a href="#workflow" className={navLinkClass}>
              Workflow
            </a>
            <a href="#features" className={navLinkClass}>
              Features
            </a>
            <a href="#earn" className={navLinkClass}>
              Earn
            </a>
          </nav>

          <Primary3DButton href={appEntry} size="sm" className="shrink-0 gap-1">
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Primary3DButton>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section id="top" ref={heroRef} className="relative flex flex-col items-center overflow-hidden px-4 pb-10 pt-24 sm:pb-14 sm:pt-28">

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px]" />
          <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-800/10 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#030303] to-transparent" />
        </div>

        {/* Hero content */}
        <motion.div style={{ y: ySpring, opacity }} className="relative z-10 text-center max-w-[900px] mx-auto w-full">

          {/* Badge */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-[12px] font-semibold text-violet-300">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Creator Automation Platform · Beta
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={stagger} initial="hidden" animate="visible"
            className="mb-5 select-none text-[52px] font-extrabold leading-[0.92] tracking-[-0.04em] sm:mb-6 sm:text-[72px] md:text-[88px] lg:text-[96px]"
          >
            <motion.span variants={fadeUp} className="block text-white">Turn YouTube</motion.span>
            <motion.span variants={fadeUp} className="block">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                into viral clips
              </span>
            </motion.span>
          </motion.h1>

          {/* Subheading */}
          <motion.p variants={fadeUp} initial="hidden" animate="visible"
            className="mx-auto mb-6 max-w-[520px] text-[17px] leading-relaxed text-slate-400 sm:text-[18px]">
            Monitor channels, detect uploads, and post with one click.
            Get perfectly cut vertical clips with captions.
          </motion.p>

          {/* ── Channel URL input ─────────────────────────────────── */}
          <HeroChannelInput />

          {/* Secondary CTAs */}
          <motion.div variants={stagger} initial="hidden" animate="visible"
            className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div variants={fadeUp}>
              <Link
                href={appEntry}
                className="inline-flex items-center gap-2 text-[14px] font-medium text-slate-400 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-white"
              >
                <Play className="w-4 h-4" />
                Or try manual clip mode
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </motion.div>

        </motion.div>

        {/* ── Dashboard showcase ──────────────────────────────────── */}
        <motion.div
          id="preview"
          variants={fadeUp} initial="hidden" animate="visible"
          transition={{ delay: 0.45, duration: 0.9, ease }}
          className="relative z-10 mx-auto mt-8 w-full max-w-[840px] scroll-mt-24 px-2 sm:mt-10 sm:px-4"
        >
          <div className="absolute -inset-x-8 top-8 bottom-0 bg-violet-600/10 blur-3xl rounded-3xl pointer-events-none" />

          <motion.div whileHover={{ y: -4, transition: transitionSaas }} className="relative">
            <DashboardShowcase />
          </motion.div>

          {/* Floating badges */}
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-4 top-[30%] hidden lg:flex items-center gap-2 bg-[#0e0e1a] border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <div>
              <p className="text-[12px] font-bold text-white">9.4 viral score</p>
              <p className="text-[10px] text-slate-500">Top clip</p>
            </div>
          </motion.div>

          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -right-4 top-[20%] hidden lg:flex items-center gap-2 bg-[#0e0e1a] border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-[12px] font-bold text-white">Clip approved</p>
              <p className="text-[10px] text-slate-500">Ready to post</p>
            </div>
          </motion.div>

          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -right-4 bottom-[25%] hidden lg:flex items-center gap-2 bg-[#0e0e1a] border border-amber-500/25 rounded-2xl px-4 py-3 shadow-xl">
            <Radio className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[12px] font-bold text-white">New upload</p>
              <p className="text-[10px] text-slate-500">Awaiting confirm</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="workflow" className="scroll-mt-24 px-4 py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-5xl text-center">
          <SectionLabel>The workflow</SectionLabel>
          <SectionHeading>
            Few steps to <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">full automation</span>
          </SectionHeading>
          <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={vp()}
            className="text-slate-400 max-w-md mx-auto text-[15px] leading-relaxed">
            Connect your channel and automate everything.
          </motion.p>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={vp()}
          className="mx-auto flex max-w-5xl flex-col items-center gap-0 lg:flex-row lg:items-stretch lg:justify-center lg:gap-2"
        >
          {[
            { n: "01", color: "violet",  title: "Connect channel", desc: "Paste any YouTube channel URL and we start watching for new uploads." },
            { n: "02", color: "fuchsia", title: "Upload Detected",  desc: "New video drops and appears in your dashboard." },
            { n: "03", color: "sky",     title: "Confirm & Clip",   desc: "One click to confirm. AI transcribes and finds the viral moments to clip." },
            { n: "04", color: "emerald", title: "Review & Post",    desc: "Preview every clip. Approve the best ones. Download and push to TikTok, Reels, and YouTube Shorts." },
          ].map(({ n, color, title, desc }, idx) => (
            <Fragment key={n}>
              <motion.div
                variants={cardVariant}
                whileHover={{ y: -6, transition: transitionSaas }}
                className="glass-card flex w-full min-w-0 flex-col p-6 lg:max-w-[220px] lg:flex-1 xl:max-w-none"
              >
                <span className={`mb-5 text-[10px] font-black tracking-widest ${
                  color === "violet" ? "text-violet-400" : color === "fuchsia" ? "text-fuchsia-400" :
                  color === "sky" ? "text-sky-400" : "text-emerald-400"
                }`}>{n}</span>
                <h3 className="mb-2 text-[15px] font-semibold text-white">{title}</h3>
                <p className="flex-1 text-[13px] leading-relaxed text-slate-500">{desc}</p>
              </motion.div>
              {idx < 3 && (
                <>
                  <div className="flex h-10 w-full shrink-0 items-center justify-center py-1 lg:hidden" aria-hidden>
                    <ArrowDown className="h-6 w-6 text-violet-400/45" strokeWidth={2} />
                  </div>
                  <div className="hidden shrink-0 items-center justify-center px-0.5 lg:flex" aria-hidden>
                    <ArrowRight className="h-7 w-7 text-violet-400/45" strokeWidth={2} />
                  </div>
                </>
              )}
            </Fragment>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-24 border-t border-white/[0.04] px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <SectionLabel>Built different</SectionLabel>
            <SectionHeading>Creator Automation<br />in one place</SectionHeading>
          </div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={vp()}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <motion.div key={title} variants={cardVariant}
                whileHover={{ y: -6, scale: 1.01, transition: transitionSaas }}
                className="glass-card p-6 cursor-default">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-5 ${colorMap[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <EarnWhopSection />

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="bg-gradient-to-r from-violet-300 to-cyan-400 bg-clip-text text-[15px] font-bold text-transparent">ClixFair</span>
            <span className="text-[13px] text-slate-600">· Creator automation platform</span>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-slate-600">
            <a href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <span>·</span>
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="mailto:kapiltaspa@gmail.com" className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
