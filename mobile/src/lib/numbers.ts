/**
 * French number words + generators for number drills (plain numbers,
 * prices, times and phone numbers). Traditional spelling (hyphens under 100).
 */

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS: Record<number, string> = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };

/**
 * `final` = nothing multiplies this number afterwards. "quatre-vingts" and
 * "deux cents" lose their -s when followed by "mille" (but not by "millions").
 */
function below100(n: number, final = true): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t <= 6) return u === 0 ? TENS[t] : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  if (t === 7) return u === 1 ? "soixante et onze" : `soixante-${UNITS[10 + u]}`; // 70–79 = 60 + 10..19
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${UNITS[n - 80]}`; // 81–99 = 4×20 + 1..19
}

function below1000(n: number, final = true): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h === 0) return below100(r, final);
  const hundreds = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 && final ? "s" : ""}`;
  return r ? `${hundreds} ${below100(r, final)}` : hundreds;
}

export function toFrench(n: number): string {
  if (n === 0) return "zéro";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un million" : `${below1000(millions)} millions`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

/** Feminine form for counting feminine nouns (une heure, vingt et une minutes). */
const feminine = (words: string) => words.replace(/\bun$/, "une");

const fmtThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ---------------------------------------------------------------------------

export type NumberKind = "number" | "price" | "time" | "phone";
export type NumberRange = "0-20" | "0-100" | "70-99" | "0-1000" | "big";

export interface NumberPrompt {
  kind: NumberKind;
  /** How it's written, e.g. "78", "3,50 €", "14h30", "06 12 34 56 78" */
  display: string;
  /** How it's said, used for text-to-speech and the "write it" answer */
  spoken: string;
  /** Canonical digits used for answer checking */
  digits: string;
}

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function randomInRange(range: NumberRange) {
  switch (range) {
    case "0-20":
      return rand(0, 20);
    case "0-100":
      return rand(0, 100);
    case "70-99":
      return rand(70, 99);
    case "0-1000":
      return rand(0, 1000);
    case "big": {
      // Spread across magnitudes so it's not always seven digits.
      const digits = rand(4, 7);
      return rand(10 ** (digits - 1), 10 ** digits - 1);
    }
  }
}

export function makeNumberPrompt(kind: NumberKind, range: NumberRange = "0-100"): NumberPrompt {
  switch (kind) {
    case "number": {
      const n = randomInRange(range);
      return { kind, display: fmtThousands(n), spoken: toFrench(n), digits: String(n) };
    }
    case "price": {
      const euros = rand(1, 99);
      const cents = Math.random() < 0.25 ? 0 : rand(1, 19) * 5;
      const display = cents ? `${euros},${String(cents).padStart(2, "0")} €` : `${euros} €`;
      const e = euros === 1 ? "un euro" : `${toFrench(euros)} euros`;
      return { kind, display, spoken: cents ? `${e} ${toFrench(cents)}` : e, digits: `${euros}.${String(cents).padStart(2, "0")}` };
    }
    case "time": {
      const h = rand(1, 23);
      const m = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? rand(1, 3) * 15 : rand(1, 59);
      const hours = h === 1 ? "une heure" : `${feminine(toFrench(h))} heures`;
      return {
        kind,
        display: `${h}h${m ? String(m).padStart(2, "0") : ""}`,
        spoken: m ? `${hours} ${feminine(toFrench(m))}` : hours,
        digits: `${h}:${String(m).padStart(2, "0")}`,
      };
    }
    case "phone": {
      const pairs = [`0${rand(1, 7)}`, ...Array.from({ length: 4 }, () => String(rand(0, 99)).padStart(2, "0"))];
      const say = (p: string) => (p[0] === "0" ? `zéro ${UNITS[Number(p[1])]}` : toFrench(Number(p)));
      return { kind, display: pairs.join(" "), spoken: pairs.map(say).join(", "), digits: pairs.join("") };
    }
  }
}

/** Parse a typed answer into the same canonical form as `digits`. */
export function canonicalAnswer(kind: NumberKind, input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  switch (kind) {
    case "number":
    case "phone": {
      const d = s.replace(/\D/g, "");
      return d ? (kind === "number" ? String(Number(d)) : d) : null;
    }
    case "price": {
      const m = s.replace(/[€\s]/g, "").replace(",", ".").match(/^(\d+)(?:\.(\d{1,2}))?$/);
      if (!m) return null;
      return `${Number(m[1])}.${(m[2] ?? "0").padEnd(2, "0")}`;
    }
    case "time": {
      const m = s.match(/^(\d{1,2})\s*(?:[h:.\s]\s*(\d{1,2})?)?$/i);
      if (!m) return null;
      return `${Number(m[1])}:${String(Number(m[2] ?? 0)).padStart(2, "0")}`;
    }
  }
}

/**
 * Check a spoken answer. Whisper usually writes numbers as digits
 * ("14h30", "3,50 €"), but sometimes as words, so accept either.
 */
export function spokenMatches(prompt: NumberPrompt, transcript: string, similarity: (a: string, b: string) => number) {
  const heardDigits = transcript.replace(/\D/g, "");
  if (heardDigits) {
    const want = prompt.digits.replace(/\D/g, "");
    // "3 €" may be heard as "3" while digits are "300"; trim trailing cents zeros for prices.
    if (heardDigits === want) return true;
    if (prompt.kind === "price" && want.endsWith("00") && heardDigits === want.slice(0, -2)) return true;
    if (prompt.kind === "time" && want.endsWith("00") && heardDigits === want.slice(0, -2)) return true;
  }
  return similarity(transcript, prompt.spoken) >= 0.8;
}
