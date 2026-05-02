const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export type JobStatus =
  | "pending"
  | "downloading"
  | "transcribing"
  | "analyzing"
  | "clipping"
  | "completed"
  | "failed";

export interface Clip {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  start_time: number;
  end_time: number;
  duration: number;
  file_path: string | null;
  thumbnail_path: string | null;
  viral_score: number | null;
  created_at: string;
}

export interface Job {
  id: string;
  youtube_url: string;
  title: string | null;
  status: JobStatus;
  error: string | null;
  clips: Clip[];
  created_at: string;
  updated_at: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createJob: (youtubeUrl: string) =>
    req<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ youtube_url: youtubeUrl }),
    }),

  listJobs: () => req<Job[]>("/api/jobs"),

  getJob: (id: string) => req<Job>(`/api/jobs/${id}`),

  deleteJob: (id: string) =>
    fetch(`${BASE}/api/jobs/${id}`, { method: "DELETE" }),

  downloadClip: (clipId: string) => `${BASE}/api/clips/${clipId}/download`,

  mediaUrl: (path: string | null) => (path ? `${BASE}${path}` : null),
};
