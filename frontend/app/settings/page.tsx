"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut, updateProfile } from "firebase/auth";
import {
  ArrowLeft, User, Bell, Shield, LogOut,
  Save, Loader2, Check, Trash2, Mail, Settings,
  Copy, CheckCheck, Sparkles, Monitor, Sliders, Palette,
} from "lucide-react";
import { Primary3DButton } from "@/components/Primary3DButton";

const LS_EMAIL_NOTIFS = "clipfast_email_notifs";
const LS_REDUCE_MOTION = "clipfast_reduce_motion";
const LS_PREFERRED_TAB = "clipfast_preferred_tab";
const LS_POLL = "clipfast_job_poll_ms";

type PrefTab = "manual" | "channels" | "review" | "social" | "activity";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [preferredTab, setPreferredTab] = useState<PrefTab>("manual");
  const [jobPollMs, setJobPollMs] = useState("3000");
  const [signingOut, setSigningOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  /** Skip "kick to /auth" when we intentionally sign out or delete the account (avoids racing router.push with a full document load). */
  const intentionalSessionEndRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !intentionalSessionEndRef.current) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  useEffect(() => {
    const en = localStorage.getItem(LS_EMAIL_NOTIFS);
    if (en !== null) setEmailNotifs(en === "true");
    const rm = localStorage.getItem(LS_REDUCE_MOTION);
    if (rm !== null) setReduceMotion(rm === "true");
    const pt = localStorage.getItem(LS_PREFERRED_TAB) as PrefTab | null;
    if (
      pt === "manual" ||
      pt === "channels" ||
      pt === "review" ||
      pt === "social" ||
      pt === "activity"
    ) {
      setPreferredTab(pt);
    }
    const poll = localStorage.getItem(LS_POLL);
    if (poll === "5000" || poll === "3000" || poll === "10000") setJobPollMs(poll);
  }, []);

  useEffect(() => {
    if (reduceMotion) document.documentElement.classList.add("reduce-motion");
    else document.documentElement.classList.remove("reduce-motion");
    localStorage.setItem(LS_REDUCE_MOTION, String(reduceMotion));
  }, [reduceMotion]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } finally {
      setSavingName(false);
    }
  }

  function handleEmailNotifsToggle(val: boolean) {
    setEmailNotifs(val);
    localStorage.setItem(LS_EMAIL_NOTIFS, String(val));
  }

  function savePreferredTab(t: PrefTab) {
    setPreferredTab(t);
    localStorage.setItem(LS_PREFERRED_TAB, t);
  }

  function savePollMs(ms: string) {
    setJobPollMs(ms);
    localStorage.setItem(LS_POLL, ms);
  }

  function clearUiCache() {
    const keep = new Set([LS_EMAIL_NOTIFS, LS_REDUCE_MOTION, LS_PREFERRED_TAB, LS_POLL]);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("clipfast_") && !keep.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  async function handleSignOut() {
    setSigningOut(true);
    intentionalSessionEndRef.current = true;
    await signOut(auth);
    // Full navigation avoids a second client `router.push` from the !user effect and
    // prevents stale webpack chunk / CSS issues after auth state flips in dev.
    window.location.assign("/");
  }

  function copyUid() {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  }

  if (loading || !user) {
    return (
      <div className="dash-app-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const isGoogleUser = user.providerData.some((p) => p.providerId === "google.com");
  const lastSignIn = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString()
    : "—";

  return (
    <div className="dash-app-bg flex min-h-screen gap-6 p-6 tracking-tight">
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
          <div className="dash-badge-lift flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 flex-shrink-0 rounded-full ring-1 ring-white/10" />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600/35 ring-1 ring-violet-400/30">
                <span className="text-xs font-bold text-violet-200">{(user.displayName ?? user.email ?? "U")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.displayName ?? "User"}</p>
              <p className="truncate text-[10px] text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 py-1">
          <Link href="/dashboard" className="dash-nav-idle group flex items-center gap-3 px-3.5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors group-hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-200" />
            </div>
            <div className="text-sm font-semibold text-slate-400 group-hover:text-slate-200">Back to dashboard</div>
          </Link>
        </nav>

        <div className="mt-auto border-t border-white/5 pt-3">
          <div className="dash-nav-active flex items-center gap-3 px-3.5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] bg-violet-600 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm font-semibold text-white">Settings</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <main className="dash-island mx-auto w-full max-w-2xl flex-1 space-y-6 px-8 py-8 pb-24">
          <div className="mb-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Preferences</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Account, notifications, and workspace defaults</p>
          </div>

          {/* Profile */}
          <section className="glass-card-dash space-y-5 p-6">
            <div className="mb-1 flex items-center gap-2">
              <User className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Profile</h2>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-20 w-20 flex-shrink-0 rounded-[22px] object-cover shadow-[0_12px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/10" />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl font-bold text-white shadow-[0_12px_32px_rgba(124,58,237,0.35)]">
                  {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{user.displayName ?? "No name set"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isGoogleUser ? "bg-blue-500/15 text-blue-400" : "bg-violet-500/15 text-violet-400"}`}
                  >
                    {isGoogleUser ? "Google account" : "Email account"}
                  </span>
                  <span className="text-[10px] text-slate-600">Last sign-in: {lastSignIn}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Display name</label>
                <div className="input-sunken-shell !p-2">
                  <div className="input-sunken-well flex min-h-0 items-center py-2.5">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Email</label>
                <div className="input-sunken-shell !p-2 opacity-80">
                  <div className="input-sunken-well flex items-center py-2.5">
                    <input type="email" value={user.email ?? ""} disabled className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-slate-500 outline-none" />
                  </div>
                </div>
              </div>
              <Primary3DButton type="submit" size="md" disabled={savingName || !displayName.trim()} className="gap-2">
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {nameSaved ? "Saved!" : "Save changes"}
              </Primary3DButton>
            </form>
          </section>

          {/* Workspace defaults */}
          <section className="glass-card-dash space-y-4 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Workspace</h2>
            </div>
            <p className="text-xs font-medium text-slate-500">Defaults apply the next time you open the dashboard.</p>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-400">Default tab</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "manual" as const, label: "Manual clip" },
                    { id: "channels" as const, label: "Channels" },
                    { id: "review" as const, label: "Review" },
                    { id: "social" as const, label: "Social" },
                    { id: "activity" as const, label: "Activity" },
                  ]
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => savePreferredTab(id)}
                    className={`rounded-[18px] border px-4 py-2.5 text-xs font-semibold transition-[background-color,box-shadow,border-color] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      preferredTab === id
                        ? "border-violet-500/40 bg-violet-600/25 text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-400">Job progress refresh interval</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { ms: "3000", label: "Fast (3s)" },
                  { ms: "5000", label: "Normal (5s)" },
                  { ms: "10000", label: "Slow (10s)" },
                ].map(({ ms, label }) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => savePollMs(ms)}
                    className={`rounded-[18px] border px-4 py-2.5 text-xs font-semibold transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      jobPollMs === ms
                        ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-200 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="glass-card-dash space-y-2 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Notifications</h2>
            </div>

            <div className="dash-nested-lift flex items-center justify-between gap-4 border border-white/6 px-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Email when clips are ready</p>
                <p className="mt-0.5 text-xs text-slate-500">Uses {user.email} when the app sends the completion email</p>
              </div>
              <button
                type="button"
                onClick={() => handleEmailNotifsToggle(!emailNotifs)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${emailNotifs ? "bg-violet-600 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]" : "bg-white/10"}`}
                aria-pressed={emailNotifs}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${emailNotifs ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`}
                />
              </button>
            </div>

            <div className="dash-nested-lift flex items-center justify-between gap-4 border border-white/6 px-4 py-4 opacity-70">
              <div>
                <p className="text-sm font-medium text-slate-400">Push notifications</p>
                <p className="text-xs text-slate-600">Browser push — coming soon</p>
              </div>
              <button type="button" disabled className="relative h-7 w-12 flex-shrink-0 cursor-not-allowed rounded-full bg-white/5">
                <span className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white/30" />
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section className="glass-card-dash space-y-3 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Appearance</h2>
            </div>
            <div className="dash-nested-lift flex items-center justify-between gap-4 border border-white/6 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Reduce motion</p>
                <p className="text-xs text-slate-500">Tones down animations across the app</p>
              </div>
              <button
                type="button"
                onClick={() => setReduceMotion(!reduceMotion)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${reduceMotion ? "bg-violet-600" : "bg-white/10"}`}
                aria-pressed={reduceMotion}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${reduceMotion ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`}
                />
              </button>
            </div>
          </section>

          {/* Account & data */}
          <section className="glass-card-dash space-y-4 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Account & data</h2>
            </div>

            <div className="dash-nested-lift flex flex-col gap-3 border border-white/6 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">Firebase user ID</p>
                <code className="mt-1 block truncate text-[11px] text-violet-300/90">{user.uid}</code>
              </div>
              <button
                type="button"
                onClick={copyUid}
                className="dash-btn-inset flex flex-shrink-0 items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                {copiedUid ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedUid ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              type="button"
              onClick={clearUiCache}
              className="dash-btn-inset w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                Clear local UI cache (hidden jobs, pending URL, etc.)
              </span>
              <span className="mt-1 block font-normal text-slate-600">Keeps your sign-in and the preferences on this page.</span>
            </button>
          </section>

          {/* Connected accounts */}
          <section className="glass-card-dash space-y-3 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Connected accounts</h2>
            </div>
            {user.providerData.map((provider) => (
              <div key={provider.providerId} className="dash-nested-lift flex items-center justify-between border border-white/6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-[16px] ${provider.providerId === "google.com" ? "bg-blue-500/20" : "bg-violet-500/20"}`}
                  >
                    {provider.providerId === "google.com" ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    ) : (
                      <Mail className="h-4 w-4 text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{provider.providerId === "google.com" ? "Google" : "Email"}</p>
                    <p className="text-xs text-slate-500">{provider.email ?? user.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">Connected</span>
              </div>
            ))}
          </section>

          {/* Danger */}
          <section className="glass-card-dash space-y-4 border border-red-500/20 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">Danger zone</h2>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Sign out</p>
                <p className="text-xs text-slate-500">Sign out on this device</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="dash-btn-inset flex items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-50"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out
              </button>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Delete account</p>
                <p className="text-xs text-slate-500">Requires recent login · removes your Firebase auth user</p>
              </div>
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-[18px] border border-red-500/35 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15"
                >
                  Delete…
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="rounded-[14px] border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      intentionalSessionEndRef.current = true;
                      await user.delete();
                      window.location.assign("/");
                    }}
                    className="rounded-[14px] bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Confirm delete
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
