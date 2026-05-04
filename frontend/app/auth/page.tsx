"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { ArrowLeft, CheckCircle2, Lock, Mail, RefreshCw, Sparkles } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Primary3DButton } from "@/components/Primary3DButton";
import { auth } from "@/lib/firebase";

type AuthMode = "login" | "signup";
type Step = "idle" | "submitting" | "verify" | "checking" | "resending";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function isPasswordUser() {
  return auth.currentUser?.providerData.some((p) => p.providerId === "password") ?? false;
}

function verificationSettings() {
  return {
    url: `${window.location.origin}/dashboard`,
    handleCodeInApp: true,
  };
}

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (user.providerData.some((p) => p.providerId === "password") && !user.emailVerified) {
      setEmail(user.email ?? email);
      setStep("verify");
      return;
    }
    router.replace("/dashboard");
  }, [user, loading, router, email]);

  const isLoading = step === "submitting" || step === "checking" || step === "resending" || googleLoading;

  function validateEmailAndPassword(forSignup: boolean): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    if (forSignup) {
      if (password.length < 8 || !/[^\w\s]/.test(password)) {
        setError("Password must be at least 8 characters and include a special character.");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }
    return true;
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
      setGoogleLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "login") await handleEmailLogin();
    else await handleEmailSignup();
  }

  async function handleEmailLogin() {
    if (!validateEmailAndPassword(false)) return;
    setError("");
    setStep("submitting");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      if (!credential.user.emailVerified) {
        setStep("verify");
        return;
      }
      router.replace("/dashboard");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError("Email or password is incorrect.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a bit and try again.");
      } else {
        setError("Email sign-in failed. Please try again.");
      }
      setStep("idle");
    }
  }

  async function handleEmailSignup() {
    if (!validateEmailAndPassword(true)) return;
    setError("");
    setStep("submitting");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await sendEmailVerification(credential.user, verificationSettings());
      setStep("verify");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("That email already has an account. Log in instead.");
        setMode("login");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 8 characters and a special character.");
      } else {
        setError("Could not create account. Please try again.");
      }
      setStep("idle");
    }
  }

  async function handleResendVerification() {
    setError("");
    setStep("resending");
    try {
      if (!auth.currentUser || !isPasswordUser()) throw new Error("Please sign up again to resend verification.");
      await sendEmailVerification(auth.currentUser, verificationSettings());
      setStep("verify");
    } catch (err: any) {
      if (err?.code === "auth/too-many-requests") {
        setError("Too many emails sent. Please wait a bit before resending.");
      } else {
        setError(err.message || "Could not resend verification email.");
      }
      setStep("verify");
    }
  }

  async function handleVerifiedContinue() {
    setError("");
    setStep("checking");
    try {
      if (!auth.currentUser) throw new Error("Please log in again.");
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) {
        setError("Still waiting on verification. Open the email link, then try again.");
        setStep("verify");
        return;
      }
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Could not refresh verification status.");
      setStep("verify");
    }
  }

  async function handleBackToEmail() {
    setError("");
    setStep("idle");
    if (auth.currentUser && isPasswordUser() && !auth.currentUser.emailVerified) {
      await signOut(auth).catch(() => {});
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030303] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/12 blur-[140px]" />
        <div className="absolute right-1/4 top-1/3 h-[320px] w-[320px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="group mb-8 inline-flex items-center justify-center" aria-label="Home">
            <Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 object-contain transition-opacity group-hover:opacity-90" priority />
          </Link>

          {step === "verify" || step === "checking" || step === "resending" ? (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-600/15 shadow-[0_0_32px_rgba(124,58,237,0.22)]">
                <Mail className="h-6 w-6 text-violet-300" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white">Verify your email</h1>
              <p className="text-sm leading-relaxed text-slate-400">
                Open the Firebase verification link sent to<br />
                <span className="font-semibold text-white">{auth.currentUser?.email ?? email}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-white">Get started</h1>
              <p className="text-sm text-slate-400">Sign in to generate your viral clips.</p>
            </>
          )}
        </div>

        <div className="relative space-y-4 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.72),0_0_0_1px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative space-y-4">
            {(step === "verify" || step === "checking" || step === "resending") ? (
              <>
                <div className="rounded-[20px] border border-violet-400/20 bg-violet-500/[0.08] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                    <CheckCircle2 className="h-4 w-4 text-violet-300" />
                    Check your inbox
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">
                    After you click the email link, return here and press continue. Firebase needs a quick refresh before we let you into the dashboard.
                  </p>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <Primary3DButton
                  type="button"
                  size="md"
                  wrapperClassName="w-full"
                  className="w-full justify-center gap-2 py-3.5 text-sm font-bold"
                  disabled={step === "checking" || step === "resending"}
                  onClick={handleVerifiedContinue}
                >
                  {step === "checking" ? <><Spinner /> Checking…</> : "I verified → Continue"}
                </Primary3DButton>

                <div className="flex items-center justify-between pt-1">
                  <button onClick={handleBackToEmail} className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-white">
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <button
                    onClick={handleResendVerification}
                    disabled={step === "checking" || step === "resending"}
                    className="flex items-center gap-1.5 text-xs text-violet-400 transition-colors hover:text-violet-300 disabled:opacity-40"
                  >
                    <RefreshCw className="h-3 w-3" /> {step === "resending" ? "Sending…" : "Resend email"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="btn-3d flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-semibold text-[#1a1a1a] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {googleLoading ? <Spinner dark /> : <GoogleIcon />}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs text-slate-600">or use email</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-black/25 p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.35)]">
                  {(["login", "signup"] as const).map((nextMode) => (
                    <button
                      key={nextMode}
                      type="button"
                      onClick={() => { setMode(nextMode); setError(""); }}
                      disabled={isLoading}
                      className={`rounded-[15px] px-3 py-2 text-xs font-bold transition ${
                        mode === nextMode
                          ? "bg-violet-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      {nextMode === "login" ? "Log in" : "Sign up"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                    <Mail className="h-4 w-4 flex-shrink-0 text-slate-500" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      disabled={isLoading}
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                    <Lock className="h-4 w-4 flex-shrink-0 text-slate-500" />
                    <input
                      type="password"
                      placeholder={mode === "signup" ? "Password with special character" : "Password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      disabled={isLoading}
                      minLength={mode === "signup" ? 8 : undefined}
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                  {mode === "signup" && (
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      <input
                        type="password"
                        placeholder="Type password again"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        required
                      />
                    </div>
                  )}

                  {mode === "signup" && (
                    <p className="pl-1 text-[11px] leading-relaxed text-slate-600">
                      We send a Firebase verification link before dashboard access.
                    </p>
                  )}

                  {error && <p className="pl-1 text-xs text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || !password.trim() || (mode === "signup" && !confirmPassword.trim())}
                    className="btn-3d flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {step === "submitting" ? <><Spinner /> {mode === "signup" ? "Creating account…" : "Signing in…"}</> : mode === "signup" ? "Create account →" : "Log in with email →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
          By continuing, you agree to our Terms of Service<br />and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${dark ? "text-[#1a1a1a]" : "text-white"}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 010 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
