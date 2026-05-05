// Prefer same-origin requests so Next.js rewrites proxy to the backend in dev/prod.
// This avoids CORS issues when the backend is on a different port.
const BASE = "";

// ── Types ────────────────────────────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "waiting_youtube"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "clipping"
  | "completed"
  | "failed";

export type ClipStatus = "ready" | "approved" | "rejected";

/** Options for POST /api/jobs (manual clip pipeline). */
export interface ManualClipJobOptions {
  burn_captions: boolean;
  burn_hook: boolean;
  letterbox: boolean;
  clip_min_seconds: number;
  clip_max_seconds: number;
  clip_count: number;
}

export const DEFAULT_MANUAL_CLIP_JOB_OPTIONS: ManualClipJobOptions = {
  burn_captions: true,
  burn_hook: true,
  letterbox: true,
  clip_min_seconds: 15,
  clip_max_seconds: 90,
  clip_count: 5,
};
export type UploadStatus = "pending_confirmation" | "processing" | "ready" | "failed";
export type SocialStatus = "disconnected" | "connected" | "needs_reauth";
export type ChannelStatus = "active" | "paused" | "error";

export interface Clip {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  hook_text: string | null;
  caption_override: string | null;
  start_time: number;
  end_time: number;
  duration: number;
  file_path: string | null;
  thumbnail_path: string | null;
  viral_score: number | null;
  status: ClipStatus;
  created_at: string;
}

export interface Job {
  id: string;
  youtube_url: string;
  title: string | null;
  thumbnail_url: string | null;
  status: JobStatus;
  error: string | null;
  clips: Clip[];
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  channel_url: string;
  channel_id: string | null;
  channel_name: string | null;
  channel_thumbnail: string | null;
  status: ChannelStatus;
  last_checked_at: string | null;
  created_at: string;
  upload_count: number;
}

export interface VideoUpload {
  id: string;
  channel_id: string;
  youtube_url: string;
  youtube_video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  status: UploadStatus;
  job_id: string | null;
  created_at: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  status: SocialStatus;
  display_name: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  description: string;
  meta: string | null;
  created_at: string;
}

export interface CreditBalance {
  free_clip_credits: number;
  free_credits_used: number;
  paid_clip_credits: number;
  available_clip_credits: number;
  next_pack_clip_credits: number;
  next_pack_price_cents: number;
}

// ── Auth token injection ─────────────────────────────────────────────────────

let _tokenProvider: (() => Promise<string | null>) | null = null;

/** Call this once (e.g. in AuthProvider) to wire up Firebase token retrieval. */
export function setTokenProvider(fn: () => Promise<string | null>) {
  _tokenProvider = fn;
}

// ── HTTP client ──────────────────────────────────────────────────────────────

function formatHttpError(status: number, body: string): string {
  const trimmed = body.trim();
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown; message?: string };
    if (j.detail !== undefined) {
      if (typeof j.detail === "string") return `${status}: ${j.detail}`;
      if (Array.isArray(j.detail)) {
        const parts = j.detail.map(
          (x: { msg?: string }) => x?.msg ?? JSON.stringify(x)
        );
        return `${status}: ${parts.join("; ")}`;
      }
      return `${status}: ${JSON.stringify(j.detail)}`;
    }
    if (typeof j.message === "string") return `${status}: ${j.message}`;
  } catch {
    /* not JSON */
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<html")) {
    return `${status}: Server returned HTML instead of JSON — check Next.js rewrite / NEXT_PUBLIC_API_URL and that the API is running.`;
  }
  if (trimmed && trimmed.length < 600) return `${status}: ${trimmed}`;
  return `${status}: Request failed`;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (_tokenProvider) {
    const token = await _tokenProvider().catch(() => null);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    headers,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(formatHttpError(res.status, text || res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── API client ───────────────────────────────────────────────────────────────

export const api = {
  // Jobs
  createJob: (youtubeUrl: string, options: ManualClipJobOptions = DEFAULT_MANUAL_CLIP_JOB_OPTIONS) =>
    req<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        youtube_url: youtubeUrl,
        burn_captions: options.burn_captions,
        burn_hook: options.burn_hook,
        letterbox: options.letterbox,
        clip_min_seconds: options.clip_min_seconds,
        clip_max_seconds: options.clip_max_seconds,
        clip_count: options.clip_count,
      }),
    }),
  listJobs:   () => req<Job[]>("/api/jobs"),
  getJob:     (id: string) => req<Job>(`/api/jobs/${id}`),
  deleteJob:  (id: string) => req<void>(`/api/jobs/${id}`, { method: "DELETE" }),

  // Clips
  listClips:    () => req<Clip[]>("/api/clips"),
  getClip:      (id: string) => req<Clip>(`/api/clips/${id}`),
  approveClip:  (id: string) => req<Clip>(`/api/clips/${id}/approve`, { method: "POST" }),
  rejectClip:   (id: string) => req<Clip>(`/api/clips/${id}/reject`, { method: "POST" }),
  remixClip: (id: string, body: { start_time?: number; end_time?: number; hook_text?: string | null; caption_override?: string | null; reset_caption?: boolean }) =>
    req<Clip>(`/api/clips/${id}/remix`, { method: "PATCH", body: JSON.stringify(body) }),
  downloadClip: (clipId: string) => `${BASE}/api/clips/${clipId}/download`,

  // Channels
  listChannels:  () => req<Channel[]>("/api/channels"),
  addChannel:    (channelUrl: string) =>
    req<Channel>("/api/channels", { method: "POST", body: JSON.stringify({ channel_url: channelUrl }) }),
  deleteChannel: (id: string) => req<void>(`/api/channels/${id}`, { method: "DELETE" }),

  // Uploads
  listUploads:   () => req<VideoUpload[]>("/api/uploads"),

  // Socials
  listSocials:       () => req<SocialAccount[]>("/api/socials"),
  connectPlatform:   (platform: string) =>
    req<SocialAccount>(`/api/socials/${platform}/connect-placeholder`, { method: "POST" }),
  disconnectPlatform: (platform: string) =>
    req<SocialAccount>(`/api/socials/${platform}/disconnect`, { method: "POST" }),
  youtubeAuthUrl: (redirectUri: string) =>
    req<{ auth_url: string; state: string }>(
      `/api/socials/youtube/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`
    ),
  youtubeExchange: (code: string, redirectUri: string) =>
    req<SocialAccount>(
      `/api/socials/youtube/exchange?${new URLSearchParams({ code, redirect_uri: redirectUri })}`,
      { method: "POST" }
    ),

  // Activity
  listActivity: () => req<ActivityEvent[]>("/api/activity"),

  // Billing
  getCredits: () => req<CreditBalance>("/api/billing/credits"),
  createCheckout: (successUrl: string, cancelUrl: string) =>
    req<{ checkout_url: string; session_id: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
    }),
  verifyCheckout: (sessionId: string) =>
    req<CreditBalance>(`/api/billing/checkout/verify?session_id=${encodeURIComponent(sessionId)}`, {
      method: "POST",
    }),

  // Media
  mediaUrl: (path: string | null) => (path ? `${BASE}${path}` : null),
};
