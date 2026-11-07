/** Lowercase, drop punctuation, collapse whitespace. Keeps accents. */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!?;:«»"()…\-]/g, " ")
    .replace(/'/g, "' ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 0..1 similarity, ignoring accents and punctuation. */
export function similarity(a: string, b: string) {
  const x = stripAccents(normalize(a)).replace(/ /g, "");
  const y = stripAccents(normalize(b)).replace(/ /g, "");
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

export type TypedResult = "correct" | "accents" | "typo" | "wrong";

/** Grade a typed French answer. Accent slips and tiny typos still pass. */
export function gradeTyped(answer: string, expected: string): TypedResult {
  const a = normalize(answer);
  const e = normalize(expected);
  if (a === e) return "correct";
  if (stripAccents(a) === stripAccents(e)) return "accents";
  const sim = similarity(a, e);
  if (e.length > 6 && sim >= 0.9) return "typo";
  return "wrong";
}

/** Does an English choice match the item? (used for multiple choice keys) */
export function sameMeaning(a: string, b: string) {
  return normalize(a) === normalize(b);
}

/** For speaking feedback: which expected words appear in what was heard. */
export function wordMatches(expected: string, heard: string) {
  const heardWords = new Set(stripAccents(normalize(heard)).split(" "));
  return expected.split(/\s+/).map((word) => ({
    word,
    ok: stripAccents(normalize(word))
      .split(" ")
      .filter(Boolean)
      .every((w) => heardWords.has(w)),
  }));
}
