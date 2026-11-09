import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import { initDb, getDb } from "./db.js";
import { randomUUID } from "node:crypto";
import { curriculum, itemsById, lessonsById, registerCustomItem, unitOfItem } from "./curriculum.js";
import { schedule, type Grade, type CardState } from "./srs.js";

// Load server/.env for local development (Railway provides real env vars instead).
try {
  process.loadEnvFile(".env");
} catch {}

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Simple shared-secret auth: this is a personal app, but the Railway URL is
// public and /transcribe costs money, so require a token when one is set.
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const token = process.env.APP_TOKEN;
  if (token && req.header("x-app-token") !== token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
});

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayUtc = () => new Date().toISOString().slice(0, 10);

async function addXp(day: string, xp: number) {
  if (xp <= 0) return;
  await getDb().query(
    `INSERT INTO activity (day, xp) VALUES ($1, $2)
     ON CONFLICT (day) DO UPDATE SET xp = activity.xp + EXCLUDED.xp`,
    [day, Math.round(xp)],
  );
}

async function gradeCard(itemId: string, grade: Grade) {
  const db = getDb();
  const { rows } = await db.query<CardState>(
    `SELECT ease, interval_days, reps, lapses FROM cards WHERE item_id = $1`,
    [itemId],
  );
  const current: CardState = rows[0] ?? { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 };
  const next = schedule(current, grade);
  await db.query(
    `INSERT INTO cards (item_id, ease, interval_days, reps, lapses, due_at, last_reviewed)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (item_id) DO UPDATE SET
       ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days, reps = EXCLUDED.reps,
       lapses = EXCLUDED.lapses, due_at = EXCLUDED.due_at, last_reviewed = now()`,
    [itemId, next.ease, next.interval_days, next.reps, next.lapses, next.due_at.toISOString()],
  );
}

// ---- Course ---------------------------------------------------------------

app.get("/api/course", async (_req, res) => {
  const { rows } = await getDb().query<{ lesson_id: string; completions: number; best_score: number }>(
    `SELECT lesson_id, completions, best_score FROM lesson_progress`,
  );
  const progress = new Map(rows.map((r) => [r.lesson_id, r]));
  const units = curriculum.map((u) => ({
    id: u.id,
    title: u.title,
    en: u.en,
    // The first lesson of every unit is open so you can skip ahead;
    // later lessons in a unit unlock once the one before is done.
    lessons: u.lessons.map((l, i, all) => {
      const p = progress.get(l.id);
      const prev = i > 0 ? progress.get(all[i - 1].id) : undefined;
      const unlocked = i === 0 || (!!prev && prev.completions > 0);
      return {
        id: l.id,
        title: l.title,
        subtitle: l.subtitle,
        itemCount: l.items.length,
        completions: p?.completions ?? 0,
        bestScore: p?.best_score ?? 0,
        unlocked,
      };
    }),
  }));
  res.json({ units });
});

app.get("/api/lessons/:id", (req, res) => {
  const lesson = lessonsById.get(req.params.id);
  if (!lesson) {
    res.status(404).json({ error: "lesson not found" });
    return;
  }
  // Distractor pool: every item in the course, so multiple-choice has options.
  res.json({ lesson, pool: [...itemsById.values()] });
});

app.post("/api/lessons/:id/complete", async (req, res) => {
  const lesson = lessonsById.get(req.params.id);
  if (!lesson) {
    res.status(404).json({ error: "lesson not found" });
    return;
  }
  const { score = 0, xp = 0, day, results = [] } = req.body ?? {};
  const db = getDb();

  for (const r of results as { itemId: string; correct: boolean }[]) {
    if (!itemsById.has(r.itemId)) continue;
    const exists = await db.query(`SELECT 1 FROM cards WHERE item_id = $1`, [r.itemId]);
    // New items enter the review deck; known items only get rescheduled on a miss.
    if (exists.rows.length === 0 || !r.correct) await gradeCard(r.itemId, r.correct ? 2 : 0);
  }

  await db.query(
    `INSERT INTO lesson_progress (lesson_id, completions, best_score, last_completed)
     VALUES ($1, 1, $2, now())
     ON CONFLICT (lesson_id) DO UPDATE SET
       completions = lesson_progress.completions + 1,
       best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score),
       last_completed = now()`,
    [lesson.id, Math.round(score)],
  );
  await addXp(isDay(day) ? day : todayUtc(), xp);
  res.json({ ok: true });
});

/** Every item in the course plus whether it's in the review deck yet. */
app.get("/api/items", async (_req, res) => {
  const { rows } = await getDb().query<{ item_id: string; due: boolean }>(
    `SELECT item_id, due_at <= now() AS due FROM cards`,
  );
  const cards = new Map(rows.map((r) => [r.item_id, r]));
  const starred = await getDb().query<{ item_id: string }>(`SELECT item_id FROM starred_items`);
  const starredIds = new Set(starred.rows.map((r) => r.item_id));
  const made = await getDb().query<{ item_id: string }>(`SELECT item_id FROM made_cards`);
  const savedIds = new Set(made.rows.map((r) => r.item_id));
  res.json({
    items: [...itemsById.values()].map((i) => ({
      ...i,
      unitId: unitOfItem.get(i.id),
      saved: savedIds.has(i.id),
      starred: starredIds.has(i.id),
      learned: cards.has(i.id),
      due: cards.get(i.id)?.due ?? false,
    })),
  });
});

/** XP from practice drills (numbers, etc.) that aren't tied to specific words. */
app.post("/api/xp", async (req, res) => {
  const { xp = 0, day } = req.body ?? {};
  await addXp(isDay(day) ? day : todayUtc(), Math.min(Number(xp) || 0, 500));
  res.json({ ok: true });
});

// ---- Review (spaced repetition) ------------------------------------------

app.get("/api/review", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await getDb().query<{ item_id: string }>(
    `SELECT item_id FROM cards WHERE due_at <= now() ORDER BY due_at ASC LIMIT $1`,
    [limit],
  );
  const items = rows.map((r) => itemsById.get(r.item_id)).filter(Boolean);
  res.json({ items, pool: [...itemsById.values()] });
});

app.post("/api/review", async (req, res) => {
  const { results = [], xp = 0, day } = req.body ?? {};
  for (const r of results as { itemId: string; grade: number }[]) {
    if (!itemsById.has(r.itemId)) continue;
    const g = Math.max(0, Math.min(3, Math.round(r.grade))) as Grade;
    await gradeCard(r.itemId, g);
  }
  await addXp(isDay(day) ? day : todayUtc(), xp);
  res.json({ ok: true });
});

// ---- Saved (flashcards you made) and Starred (existing flashcards) --------

/** POST/DELETE /api/saved and /api/starred — each just toggles membership of one list. */
for (const [path, table] of [
  ["saved", "made_cards"],
  ["starred", "starred_items"],
] as const) {
  app.post(`/api/${path}`, async (req, res) => {
    const itemId = req.body?.itemId;
    if (!itemsById.has(itemId)) {
      res.status(400).json({ error: "unknown item" });
      return;
    }
    await getDb().query(`INSERT INTO ${table} (item_id) VALUES ($1) ON CONFLICT DO NOTHING`, [itemId]);
    res.json({ ok: true });
  });
  app.delete(`/api/${path}/:itemId`, async (req, res) => {
    await getDb().query(`DELETE FROM ${table} WHERE item_id = $1`, [req.params.itemId]);
    res.json({ ok: true });
  });
}

// ---- Study list ("don't know" words) --------------------------------------

/** Clean deep dives needed before a word graduates off the study list. */
const STUDY_GRADUATE_RUNS = 2;

app.get("/api/study", async (_req, res) => {
  const { rows } = await getDb().query<{ item_id: string; clean_runs: number; misses: number }>(
    `SELECT item_id, clean_runs, misses FROM study_list ORDER BY added_at DESC`,
  );
  const items = rows
    .filter((r) => itemsById.has(r.item_id))
    .map((r) => ({ ...itemsById.get(r.item_id)!, cleanRuns: r.clean_runs, misses: r.misses }));
  res.json({ items, pool: [...itemsById.values()], graduateAt: STUDY_GRADUATE_RUNS });
});

app.post("/api/study", async (req, res) => {
  const itemId = req.body?.itemId;
  if (!itemsById.has(itemId)) {
    res.status(400).json({ error: "unknown item" });
    return;
  }
  // Re-adding a word resets its progress toward graduation.
  await getDb().query(
    `INSERT INTO study_list (item_id) VALUES ($1)
     ON CONFLICT (item_id) DO UPDATE SET misses = study_list.misses + 1, clean_runs = 0`,
    [itemId],
  );
  res.json({ ok: true });
});

app.delete("/api/study/:itemId", async (req, res) => {
  await getDb().query(`DELETE FROM study_list WHERE item_id = $1`, [req.params.itemId]);
  res.json({ ok: true });
});

/** Results of a deep dive: clean = every exercise on that word right the first time. */
app.post("/api/study/results", async (req, res) => {
  const { results = [], xp = 0, day } = req.body ?? {};
  const db = getDb();
  const graduated: string[] = [];
  for (const r of results as { itemId: string; clean: boolean }[]) {
    if (!itemsById.has(r.itemId)) continue;
    if (!r.clean) {
      await db.query(`UPDATE study_list SET clean_runs = 0 WHERE item_id = $1`, [r.itemId]);
      continue;
    }
    const { rows } = await db.query<{ clean_runs: number }>(
      `UPDATE study_list SET clean_runs = clean_runs + 1 WHERE item_id = $1 RETURNING clean_runs`,
      [r.itemId],
    );
    if (rows[0] && rows[0].clean_runs >= STUDY_GRADUATE_RUNS) {
      await db.query(`DELETE FROM study_list WHERE item_id = $1`, [r.itemId]);
      graduated.push(r.itemId);
    }
  }
  await addXp(isDay(day) ? day : todayUtc(), xp);
  res.json({ ok: true, graduated });
});

// ---- Translator + saved words ---------------------------------------------

const TRANSLATE_PROMPT = `You are a French–English translator for someone learning French.
Detect whether the input is English or French and translate it into the other language.
Use natural, everyday French (France). Keep the learner's register; for "you", prefer "tu" unless the input is clearly formal.
Reply with JSON only:
{"source":"en"|"fr","fr":"<French>","en":"<English>","alternatives":["<other natural French phrasings, max 2, may be empty>"],"note":"<one short tip in English about grammar, gender or usage, or empty string>"}
"fr" and "en" must both be filled: one is the input (lightly corrected for typos and accents), the other the translation.
If the input is a single noun (in either language), the "fr" value must include its article (le/la/l'/les), even if the input had none. Write the note in English.`;

app.post("/api/translate", async (req, res) => {
  const text = String(req.body?.text ?? "").trim().slice(0, 500);
  if (!text) {
    res.status(400).json({ error: "Type something to translate" });
    return;
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(501).json({ error: "Translation isn't set up: add GROQ_API_KEY on the server" });
    return;
  }
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.TRANSLATE_MODEL || "openai/gpt-oss-120b",
      reasoning_effort: "low",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TRANSLATE_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });
  if (!r.ok) {
    console.error("translate failed", r.status, await r.text());
    res
      .status(r.status === 429 ? 429 : 502)
      .json({ error: r.status === 429 ? "Translation limit reached — try again in a minute" : "translation failed" });
    return;
  }
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    const out = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const fr = str(out.fr);
    const en = str(out.en);
    if (!fr || !en) throw new Error("incomplete");
    res.json({
      source: out.source === "fr" ? "fr" : "en",
      fr,
      en,
      alternatives: Array.isArray(out.alternatives) ? out.alternatives.map(str).filter(Boolean).slice(0, 2) : [],
      note: str(out.note),
    });
  } catch {
    res.status(502).json({ error: "translation failed" });
  }
});

/** Keep a new word/phrase as your own item: make it a flashcard ("saved") or put it on the study list. */
app.post("/api/custom-items", async (req, res) => {
  const fr = String(req.body?.fr ?? "").trim().slice(0, 300);
  const en = String(req.body?.en ?? "").trim().slice(0, 300);
  const note = String(req.body?.note ?? "").trim().slice(0, 300) || null;
  if (!fr || !en) {
    res.status(400).json({ error: "fr and en are required" });
    return;
  }
  const db = getDb();
  // Same French text saved twice → reuse the existing item.
  const existing = [...itemsById.values()].find((i) => i.fr.toLowerCase() === fr.toLowerCase());
  let item = existing;
  if (!item) {
    item = { id: `c-${randomUUID().slice(0, 8)}`, fr, en, ...(note ? { note } : {}) };
    await db.query(`INSERT INTO custom_items (id, fr, en, note) VALUES ($1, $2, $3, $4)`, [item.id, fr, en, note]);
    registerCustomItem(item);
  }
  if (req.body?.to === "saved") {
    await db.query(`INSERT INTO made_cards (item_id) VALUES ($1) ON CONFLICT DO NOTHING`, [item.id]);
  } else {
    await db.query(
      `INSERT INTO study_list (item_id) VALUES ($1)
       ON CONFLICT (item_id) DO UPDATE SET clean_runs = 0`,
      [item.id],
    );
  }
  res.json({ item, existed: !!existing });
});

// ---- Stats ----------------------------------------------------------------

app.get("/api/stats", async (req, res) => {
  const today = isDay(req.query.today) ? req.query.today : todayUtc();
  const db = getDb();

  const days = await db.query<{ day: string; xp: number }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, xp FROM activity WHERE xp > 0 ORDER BY day DESC LIMIT 400`,
  );
  const active = new Set(days.rows.map((d) => d.day));

  // Streak: consecutive active days ending today (or yesterday, if today isn't done yet).
  const shift = (d: string, n: number) => {
    const t = new Date(d + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  let cursor = active.has(today) ? today : shift(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = shift(cursor, -1);
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = shift(today, i - 6);
    return { day: d, xp: days.rows.find((r) => r.day === d)?.xp ?? 0 };
  });

  const totals = await db.query<{ learned: string; due: string }>(
    `SELECT COUNT(*) AS learned, COUNT(*) FILTER (WHERE due_at <= now()) AS due FROM cards`,
  );
  const totalXp = days.rows.reduce((s, d) => s + Number(d.xp), 0);
  const study = await db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM study_list`);

  res.json({
    streak,
    xpToday: week[6].xp,
    totalXp,
    learned: Number(totals.rows[0]?.learned ?? 0),
    due: Number(totals.rows[0]?.due ?? 0),
    study: Number(study.rows[0]?.n ?? 0),
    week,
  });
});

// ---- Speech to text -------------------------------------------------------

/**
 * Both providers speak the same OpenAI-compatible transcription API.
 * Groq (free tier) is used whenever GROQ_API_KEY is set; otherwise OpenAI.
 */
function transcriptionProvider() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: "groq",
      key: process.env.GROQ_API_KEY,
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      model: process.env.TRANSCRIBE_MODEL || "whisper-large-v3",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai",
      key: process.env.OPENAI_API_KEY,
      url: "https://api.openai.com/v1/audio/transcriptions",
      model: process.env.TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
    };
  }
  return null;
}

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  const provider = transcriptionProvider();
  if (!provider) {
    res.status(501).json({ error: "Speech-to-text isn't set up: add GROQ_API_KEY on the server" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "missing audio file" });
    return;
  }
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || "audio/m4a" }),
    req.file.originalname || "speech.m4a",
  );
  form.append("model", provider.model);
  form.append("language", "fr");
  form.append("temperature", "0");

  const r = await fetch(provider.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.key}` },
    body: form,
  });
  if (!r.ok) {
    const detail = await r.text();
    console.error(`transcription failed (${provider.name})`, r.status, detail);
    res
      .status(r.status === 429 ? 429 : 502)
      .json({ error: r.status === 429 ? "Speech limit reached — try again in a minute" : "transcription failed" });
    return;
  }
  const data = (await r.json()) as { text?: string };
  res.json({ text: (data.text ?? "").trim() });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = Number(process.env.PORT) || 3000;
initDb().then(async () => {
  const saved = await getDb().query<{ id: string; fr: string; en: string; note: string | null }>(
    `SELECT id, fr, en, note FROM custom_items`,
  );
  for (const r of saved.rows) registerCustomItem({ id: r.id, fr: r.fr, en: r.en, ...(r.note ? { note: r.note } : {}) });
  app.listen(port, "0.0.0.0", () => console.log(`French API listening on :${port}`));
});
