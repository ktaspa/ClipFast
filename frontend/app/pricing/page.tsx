"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, CreditCard, Loader2, Scissors, ShieldCheck, Zap } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Primary3DButton } from "@/components/Primary3DButton";
import { api, type CreditBalance } from "@/lib/api";

const ease = [0.4, 0, 0.2, 1] as const;

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="dash-app-bg flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    const sessionId = params.get("session_id");
    async function load() {
      setBusy(true);
      try {
        if (sessionId) {
          const next = await api.verifyCheckout(sessionId);
          setCredits(next);
          setMessage("Credits added. You are ready to clip again.");
          window.history.replaceState({}, "", "/pricing");
        } else {
          setCredits(await api.getCredits());
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not load billing status");
      } finally {
        setBusy(false);
      }
    }
    load();
  }, [loading, user, params]);

  async function handleCheckout() {
    setBusy(true);
    setMessage(null);
    try {
      const origin = window.location.origin;
      const { checkout_url } = await api.createCheckout(`${origin}/pricing`, `${origin}/dashboard`);
      window.location.href = checkout_url;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start checkout");
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="dash-app-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="dash-app-bg min-h-screen px-5 py-6 tracking-tight">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain" priority />
          <span className="text-sm font-bold text-white">ClixFair</span>
        </Link>
        <Link href="/dashboard" className="btn-ghost text-xs">Dashboard</Link>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center py-10">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="dash-island grid w-full overflow-hidden p-0 md:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="flex flex-col justify-between border-b border-white/10 p-8 md:border-b-0 md:border-r">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-violet-600/25 ring-1 ring-violet-400/25">
                <Scissors className="h-6 w-6 text-violet-200" />
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Clip credits</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Keep generating high-signal shorts</h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                Your first clip is free. Add credit packs anytime; every pack stacks onto your balance.
              </p>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-3"><Zap className="h-4 w-4 text-cyan-300" /> Fast AI selection and parallel rendering</div>
              <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Secure checkout hosted by Stripe</div>
              <div className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-violet-300" /> Balance visible before every run</div>
            </div>
          </div>

          <div className="p-8">
            <div className="glass-card-dash rounded-[26px] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">20 clip credits</h2>
                  <p className="mt-1 text-sm text-slate-500">One-time pack, no subscription.</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">$5</div>
                  <div className="text-xs text-slate-500">USD</div>
                </div>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className="space-y-3">
                {["20 generated clips", "Works for manual and channel jobs", "Unused credits stay on your account"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-[20px] border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current balance</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {credits ? credits.available_clip_credits : "—"} clip{credits?.available_clip_credits === 1 ? "" : "s"} left
                </p>
              </div>

              {message && <p className="mt-4 text-sm text-slate-400">{message}</p>}

              <Primary3DButton
                onClick={handleCheckout}
                size="lg"
                disabled={busy}
                wrapperClassName="mt-6 w-full"
                className="w-full justify-center gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Add 20 clips
              </Primary3DButton>
              <Link
                href="/dashboard"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
              >
                <Scissors className="h-4 w-4" />
                Back to clipping
              </Link>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
