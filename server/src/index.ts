import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import { initDb, getDb } from "./db.js";
import { randomUUID } from "node:crypto";
import { buildDailyArticle } from "./article.js";
import { curriculum, itemsById, lessonsById, registerCustomItem, unitOfItem } from "./curriculum.js";

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
const shiftDay = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

async function addXp(day: string, xp: number) {
  if (xp <= 0) return;
  await getDb().query(
    `INSERT INTO activity (day, xp) VALUES ($1, $2)
     ON CONFLICT (day) DO UPDATE SET xp = activity.xp + EXCLUDED.xp`,
    [day, Math.round(xp)],
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
  const { score = 0, xp = 0, day } = req.body ?? {};
  const db = getDb();

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

/** Words from every lesson you've completed at least once. */
async function learnedItemIds() {
  const { rows } = await getDb().query<{ lesson_id: string }>(
    `SELECT lesson_id FROM lesson_progress WHERE completions > 0`,
  );
  return new Set(rows.flatMap((r) => lessonsById.get(r.lesson_id)?.items.map((i) => i.id) ?? []));
}

/** Every item (course + your own) with your learned / saved / starred flags. */
app.get("/api/items", async (_req, res) => {
  const learned = await learnedItemIds();
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
      learned: learned.has(i.id),
    })),
  });
});

/** XP from practice drills (numbers, etc.) that aren't tied to specific words. */
app.post("/api/xp", async (req, res) => {
  const { xp = 0, day } = req.body ?? {};
  await addXp(isDay(day) ? day : todayUtc(), Math.min(Number(xp) || 0, 500));
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

/**
 * Ask the Groq chat model for a JSON object. On failure, sends the error
 * response itself and returns null.
 */
async function groqJson(system: string, user: string, res: Response): Promise<Record<string, any> | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(501).json({ error: "Not set up: add GROQ_API_KEY on the server" });
    return null;
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
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    console.error("groq chat failed", r.status, await r.text());
    res
      .status(r.status === 429 ? 429 : 502)
      .json({ error: r.status === 429 ? "Translation limit reached — try again in a minute" : "translation failed" });
    return null;
  }
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    return JSON.parse(data.choices?.[0]?.message?.content ?? "");
  } catch {
    res.status(502).json({ error: "translation failed" });
    return null;
  }
}

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
  const out = await groqJson(TRANSLATE_PROMPT, text, res);
  if (!out) return;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fr = str(out.fr);
  const en = str(out.en);
  if (!fr || !en) {
    res.status(502).json({ error: "translation failed" });
    return;
  }
  res.json({
    source: out.source === "fr" ? "fr" : "en",
    fr,
    en,
    alternatives: Array.isArray(out.alternatives) ? out.alternatives.map(str).filter(Boolean).slice(0, 2) : [],
    note: str(out.note),
  });
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

// ---- Grammar progress -------------------------------------------------------
// Stored in lesson_progress under "grammar:<topic>" (topics live in the app).

app.get("/api/grammar", async (_req, res) => {
  const { rows } = await getDb().query<{ lesson_id: string; completions: number; best_score: number }>(
    `SELECT lesson_id, completions, best_score FROM lesson_progress WHERE lesson_id LIKE 'grammar:%'`,
  );
  res.json({
    progress: Object.fromEntries(
      rows.map((r) => [r.lesson_id.slice(8), { completions: r.completions, bestScore: r.best_score }]),
    ),
  });
});

app.post("/api/grammar/:topic/complete", async (req, res) => {
  const topic = req.params.topic;
  if (!/^[a-z0-9-]{1,40}$/.test(topic)) {
    res.status(400).json({ error: "bad topic" });
    return;
  }
  const { score = 0, xp = 0, day } = req.body ?? {};
  await getDb().query(
    `INSERT INTO lesson_progress (lesson_id, completions, best_score, last_completed)
     VALUES ($1, 1, $2, now())
     ON CONFLICT (lesson_id) DO UPDATE SET
       completions = lesson_progress.completions + 1,
       best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score),
       last_completed = now()`,
    [`grammar:${topic}`, Math.max(0, Math.min(100, Math.round(Number(score) || 0)))],
  );
  await addXp(isDay(day) ? day : todayUtc(), Math.min(Number(xp) || 0, 100));
  res.json({ ok: true });
});

// ---- Daily Article ----------------------------------------------------------

/** Today's article (built from Wikipedia on first request of the day, then cached). */
app.get("/api/article", async (req, res) => {
  const day = isDay(req.query.day) ? req.query.day : todayUtc();
  const db = getDb();
  const found = await db.query<{ data: string }>(`SELECT data FROM articles WHERE day = $1`, [day]);
  if (found.rows[0]) {
    res.json(JSON.parse(found.rows[0].data));
    return;
  }
  if (day > todayUtc() && day !== shiftDay(todayUtc(), 1)) {
    res.status(400).json({ error: "That day hasn't happened yet" });
    return;
  }
  const used = await db.query<{ title: string }>(`SELECT title FROM articles`);
  try {
    const article = await buildDailyArticle(day, new Set(used.rows.map((r) => r.title)));
    await db.query(`INSERT INTO articles (day, title, data) VALUES ($1, $2, $3) ON CONFLICT (day) DO NOTHING`, [
      day,
      article.title,
      JSON.stringify(article),
    ]);
    const saved = await db.query<{ data: string }>(`SELECT data FROM articles WHERE day = $1`, [day]);
    res.json(JSON.parse(saved.rows[0].data));
  } catch (e) {
    console.error("daily article failed", e);
    res.status(502).json({ error: "Couldn't load today's article from Wikipedia" });
  }
});

/** Past articles, newest first. */
app.get("/api/articles", async (_req, res) => {
  const { rows } = await getDb().query<{ day: string; data: string }>(
    `SELECT day, data FROM articles ORDER BY day DESC LIMIT 60`,
  );
  res.json({
    articles: rows.map((r) => {
      const a = JSON.parse(r.data);
      return { day: r.day, title: a.title, description: a.description, thumbnail: a.thumbnail };
    }),
  });
});

const GLOSS_PROMPT = `You help an English speaker read French. Given a French word and the sentence it appears in, explain that word as used in this sentence.
Reply with JSON only:
{"lemma":"<dictionary form: nouns with article (le/la/l'/les), verbs in the infinitive, adjectives masculine singular; for names, the name>","en":"<short English meaning in this context>","pos":"<noun|verb|adjective|adverb|preposition|pronoun|determiner|conjunction|name|other>","note":"<one short English note: gender, or the verb form (e.g. 'passé composé, 3rd person singular'), or empty>","flashcard_en":"<English for the lemma, e.g. 'the actor' or 'to settle'>"}`;

/** Meaning of one word in context (cached, so tapping a word twice is free). */
app.post("/api/gloss", async (req, res) => {
  const word = String(req.body?.word ?? "").trim().slice(0, 60);
  const sentence = String(req.body?.sentence ?? "").trim().slice(0, 600);
  if (!word) {
    res.status(400).json({ error: "missing word" });
    return;
  }
  const db = getDb();
  const key = `${word.toLowerCase()}|${sentence}`;
  const hit = await db.query<{ data: string }>(`SELECT data FROM glosses WHERE key = $1`, [key]);
  if (hit.rows[0]) {
    res.json(JSON.parse(hit.rows[0].data));
    return;
  }
  const out = await groqJson(GLOSS_PROMPT, `Word: ${word}\nSentence: ${sentence}`, res);
  if (!out) return;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const gloss = {
    word,
    lemma: str(out.lemma) || word,
    en: str(out.en),
    pos: str(out.pos),
    note: str(out.note),
    flashcardEn: str(out.flashcard_en) || str(out.en),
  };
  if (!gloss.en) {
    res.status(502).json({ error: "lookup failed" });
    return;
  }
  await db.query(`INSERT INTO glosses (key, data) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [key, JSON.stringify(gloss)]);
  res.json(gloss);
});

// ---- Daily word -------------------------------------------------------------

/** One theme per day (cycled), so words cover lots of everyday life. */
const WORD_THEMES = [
  "food and cooking", "travel and transport", "feelings and emotions", "the home", "work and the office",
  "weather and seasons", "the body and health", "nature and animals", "the city", "time and the calendar",
  "common verbs of movement", "describing people", "shopping and money", "hobbies and sport",
  "school and learning", "family and relationships", "clothes", "everyday conversation", "the café and restaurant",
  "useful adverbs", "common adjectives", "technology", "music and culture", "a common idiomatic expression",
];

const DAILY_WORD_PROMPT = `You choose a "mot du jour" for an English speaker learning French (beginner to intermediate).
Pick ONE genuinely useful, common everyday French word or short expression for the given theme — something a learner would actually use, not rare or technical.
Do not pick any word from the "avoid" list.
Reply with JSON only:
{"word":"<the bare word as in a dictionary, no article>","fr":"<with article for nouns (le/la/l'/un/une), infinitive for verbs>","en":"<English meaning>","pos":"<noun|verb|adjective|adverb|expression|other>","gender":"<masculine|feminine|empty>","definition_fr":"<a short, simple French definition>","definition_en":"<English translation of definition_fr>","example_fr":"<natural example sentence>","example_en":"<its English translation>","note":"<one short English tip: usage, a false friend, a related word, or a fun fact>"}`;

async function wiktionaryUrl(word: string) {
  try {
    const q = new URLSearchParams({ action: "query", titles: word, format: "json", formatversion: "2" });
    const r = await fetch(`https://fr.wiktionary.org/w/api.php?${q}`, {
      headers: { "User-Agent": "JeVoudrais/1.0 (personal French-learning app)" },
    });
    const d = (await r.json()) as { query?: { pages?: { missing?: boolean }[] } };
    if (d.query?.pages?.[0] && !d.query.pages[0].missing)
      return `https://fr.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, "_"))}`;
  } catch {}
  return null;
}

app.get("/api/daily-word", async (req, res) => {
  const day = isDay(req.query.day) ? req.query.day : todayUtc();
  const db = getDb();
  const found = await db.query<{ data: string }>(`SELECT data FROM daily_words WHERE day = $1`, [day]);
  if (found.rows[0]) {
    const cached = JSON.parse(found.rows[0].data);
    // Words saved before definitions had an English version: translate once and store it.
    if (cached.definitionFr && !cached.definitionEn && process.env.GROQ_API_KEY) {
      const t = await groqJson(
        `Translate the French text into natural English. Reply with JSON only: {"en":"<translation>"}`,
        cached.definitionFr,
        res,
      );
      if (!t) return;
      if (typeof t.en === "string" && t.en.trim()) {
        cached.definitionEn = t.en.trim();
        await db.query(`UPDATE daily_words SET data = $2 WHERE day = $1`, [day, JSON.stringify(cached)]);
      }
    }
    res.json(cached);
    return;
  }
  const past = await db.query<{ word: string }>(`SELECT word FROM daily_words ORDER BY day DESC LIMIT 300`);
  const avoid = [...past.rows.map((r) => r.word), ...[...itemsById.values()].map((i) => i.fr)];
  const dayNumber = Math.floor(Date.parse(day + "T00:00:00Z") / 86_400_000);
  const theme = WORD_THEMES[dayNumber % WORD_THEMES.length];

  const out = await groqJson(DAILY_WORD_PROMPT, `Theme: ${theme}\nAvoid: ${avoid.join(", ")}`, res);
  if (!out) return;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const word = str(out.word) || str(out.fr);
  if (!word || !str(out.en)) {
    res.status(502).json({ error: "Couldn't pick today's word" });
    return;
  }
  const daily = {
    day,
    theme,
    word,
    fr: str(out.fr) || word,
    en: str(out.en),
    pos: str(out.pos),
    gender: /^(masculine|feminine)$/i.test(str(out.gender)) ? str(out.gender).toLowerCase() : "",
    definitionFr: str(out.definition_fr),
    definitionEn: str(out.definition_en),
    exampleFr: str(out.example_fr),
    exampleEn: str(out.example_en),
    note: str(out.note),
    wiktionary: await wiktionaryUrl(word),
  };
  await db.query(`INSERT INTO daily_words (day, word, data) VALUES ($1, $2, $3) ON CONFLICT (day) DO NOTHING`, [
    day,
    word,
    JSON.stringify(daily),
  ]);
  const saved = await db.query<{ data: string }>(`SELECT data FROM daily_words WHERE day = $1`, [day]);
  res.json(JSON.parse(saved.rows[0].data));
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

  const totalXp = days.rows.reduce((s, d) => s + Number(d.xp), 0);
  const study = await db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM study_list`);

  res.json({
    streak,
    xpToday: week[6].xp,
    totalXp,
    learned: (await learnedItemIds()).size,
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
