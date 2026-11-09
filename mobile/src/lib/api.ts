import Constants from "expo-constants";
import { File } from "expo-file-system";

export interface Item {
  id: string;
  fr: string;
  en: string;
  alt?: string[];
  note?: string;
  learned?: boolean;
  due?: boolean;
  /** You made this into a flashcard (Saved deck) */
  saved?: boolean;
  /** You starred this flashcard (Starred deck) */
  starred?: boolean;
  unitId?: string;
}

export interface StudyItem extends Item {
  cleanRuns: number;
  misses: number;
}

export interface Translation {
  source: "en" | "fr";
  fr: string;
  en: string;
  alternatives: string[];
  note: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  subtitle: string;
  itemCount: number;
  completions: number;
  bestScore: number;
  unlocked: boolean;
}

export interface Unit {
  id: string;
  title: string;
  en?: string;
  lessons: LessonSummary[];
}

export interface Stats {
  streak: number;
  xpToday: number;
  totalXp: number;
  learned: number;
  due: number;
  study: number;
  week: { day: string; xp: number }[];
}

/**
 * API base URL. Set EXPO_PUBLIC_API_URL to your Railway URL in mobile/.env.
 * In development without it, we talk to the server on the same machine that
 * runs Metro (works from a phone on the same Wi-Fi).
 */
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3000`;
}

export const BASE_URL = resolveBaseUrl();
const TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "x-app-token": TOKEN, ...(init.headers as any) };
  if (init.body && typeof init.body === "string") headers["content-type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/** Local calendar day, so streaks follow your timezone rather than the server's. */
export function localDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const api = {
  course: () => request<{ units: Unit[] }>("/api/course"),
  lesson: (id: string) =>
    request<{ lesson: { id: string; title: string; items: Item[] }; pool: Item[] }>(`/api/lessons/${id}`),
  completeLesson: (id: string, body: { score: number; xp: number; results: { itemId: string; correct: boolean }[] }) =>
    request(`/api/lessons/${id}/complete`, { method: "POST", body: JSON.stringify({ ...body, day: localDay() }) }),
  review: () => request<{ items: Item[]; pool: Item[] }>("/api/review"),
  submitReview: (body: { xp: number; results: { itemId: string; grade: number }[] }) =>
    request("/api/review", { method: "POST", body: JSON.stringify({ ...body, day: localDay() }) }),
  items: () => request<{ items: Item[] }>("/api/items"),
  addXp: (xp: number) => request("/api/xp", { method: "POST", body: JSON.stringify({ xp, day: localDay() }) }),
  stats: () => request<Stats>(`/api/stats?today=${localDay()}`),
  study: () => request<{ items: StudyItem[]; pool: Item[]; graduateAt: number }>("/api/study"),
  addToStudy: (itemId: string) => request("/api/study", { method: "POST", body: JSON.stringify({ itemId }) }),
  removeFromStudy: (itemId: string) => request(`/api/study/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
  translate: (text: string) =>
    request<Translation>("/api/translate", { method: "POST", body: JSON.stringify({ text }) }),
  /** Make an existing word into a flashcard (Saved deck). */
  save: (itemId: string) => request("/api/saved", { method: "POST", body: JSON.stringify({ itemId }) }),
  star: (itemId: string) => request("/api/starred", { method: "POST", body: JSON.stringify({ itemId }) }),
  unstar: (itemId: string) => request(`/api/starred/${encodeURIComponent(itemId)}`, { method: "DELETE" }),
  /** Keep a new word/phrase as your own: make a flashcard (Saved) or add it to the study list. */
  saveWord: (word: { fr: string; en: string; note?: string; to: "saved" | "study" }) =>
    request<{ item: Item; existed: boolean }>("/api/custom-items", { method: "POST", body: JSON.stringify(word) }),
  submitStudy: (body: { xp: number; results: { itemId: string; clean: boolean }[] }) =>
    request<{ graduated: string[] }>("/api/study/results", {
      method: "POST",
      body: JSON.stringify({ ...body, day: localDay() }),
    }),

  async transcribe(uri: string): Promise<string> {
    // Expo's fetch needs a real Blob, not React Native's { uri, name, type } object.
    // expo-file-system's File implements Blob and reads the recording from disk.
    const file = new File(uri);
    const form = new FormData();
    form.append("audio", file, file.name || "speech.m4a");
    const res = await fetch(`${BASE_URL}/api/transcribe`, {
      method: "POST",
      headers: { "x-app-token": TOKEN },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `transcription failed (${res.status})`);
    return data.text ?? "";
  },
};
