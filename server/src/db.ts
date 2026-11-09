import pg from "pg";

/**
 * Minimal query interface shared by node-postgres (production / Railway)
 * and PGlite (embedded Postgres for local development, no install needed).
 */
export interface Db {
  query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

let db: Db;

export async function initDb(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const isInternal = process.env.DATABASE_URL.includes(".railway.internal");
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Railway's public proxy URL requires SSL; the private network does not.
      ssl: isInternal || process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    db = { query: (sql, params) => pool.query(sql, params as any[]) as any };
    console.log("DB: Postgres (DATABASE_URL)");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("node:fs");
    mkdirSync("./.data", { recursive: true });
    const lite = new PGlite("./.data/pglite");
    db = { query: (sql, params) => lite.query(sql, params as any[]) as any };
    console.log("DB: embedded PGlite at ./.data/pglite");
  }
  await migrate();
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("DB not initialised");
  return db;
}

async function migrate() {
  // Single-user app: no users table, progress is global.
  const statements = [
    `CREATE TABLE IF NOT EXISTS cards (
      item_id        TEXT PRIMARY KEY,
      ease           REAL NOT NULL DEFAULT 2.5,
      interval_days  REAL NOT NULL DEFAULT 0,
      reps           INTEGER NOT NULL DEFAULT 0,
      lapses         INTEGER NOT NULL DEFAULT 0,
      due_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_reviewed  TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS lesson_progress (
      lesson_id       TEXT PRIMARY KEY,
      completions     INTEGER NOT NULL DEFAULT 0,
      best_score      INTEGER NOT NULL DEFAULT 0,
      last_completed  TIMESTAMPTZ
    )`,
    // Words the learner marked "don't know" — studied in deep-dive sessions.
    `CREATE TABLE IF NOT EXISTS study_list (
      item_id     TEXT PRIMARY KEY,
      added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      misses      INTEGER NOT NULL DEFAULT 1,
      clean_runs  INTEGER NOT NULL DEFAULT 0
    )`,
    // Your own words/phrases, saved from the translator.
    `CREATE TABLE IF NOT EXISTS custom_items (
      id          TEXT PRIMARY KEY,
      fr          TEXT NOT NULL,
      en          TEXT NOT NULL,
      note        TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // Starred flashcards (the star on the flashcard screen). This table used to be
    // called saved_items; rename it once so existing stars carry over.
    `ALTER TABLE IF EXISTS saved_items RENAME TO starred_items`,
    `CREATE TABLE IF NOT EXISTS starred_items (
      item_id   TEXT PRIMARY KEY,
      saved_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // Flashcards you made yourself ("Make flashcard" anywhere in the app) — the Saved deck.
    `CREATE TABLE IF NOT EXISTS made_cards (
      item_id  TEXT PRIMARY KEY,
      made_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // One Daily Article per day (JSON blob from article.ts).
    `CREATE TABLE IF NOT EXISTS articles (
      day         TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      data        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    // Cached word look-ups from the article reader (word + sentence → meaning).
    `CREATE TABLE IF NOT EXISTS glosses (
      key   TEXT PRIMARY KEY,
      data  TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activity (
      day  DATE PRIMARY KEY,
      xp   INTEGER NOT NULL DEFAULT 0
    )`,
  ];
  for (const s of statements) await db.query(s);
}
