import type { Item } from "./api";

export type Exercise =
  | { kind: "intro"; item: Item }
  | { kind: "choose_en"; item: Item; options: string[] } // see/hear French → pick English
  | { kind: "listen_choose"; item: Item; options: string[] } // hear only → pick French
  | { kind: "type_fr"; item: Item } // see English → type French
  | { kind: "arrange"; item: Item; bank: string[] } // see English → build French from tiles
  | { kind: "speak"; item: Item }; // say the French out loud

export type GradedKind = Exclude<Exercise["kind"], "intro">;

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const wordCount = (s: string) => s.trim().split(/\s+/).length;

function distractors(item: Item, pool: Item[], key: "fr" | "en", n = 3) {
  // Prefer distractors of similar length so the answer isn't obvious.
  const target = wordCount(item[key]);
  const others = shuffle(pool.filter((p) => p.id !== item.id && p[key] !== item[key]));
  others.sort((a, b) => Math.abs(wordCount(a[key]) - target) - Math.abs(wordCount(b[key]) - target));
  const picked: string[] = [];
  for (const o of others) {
    if (!picked.includes(o[key])) picked.push(o[key]);
    if (picked.length === n) break;
  }
  return picked;
}

export function makeExercise(kind: GradedKind, item: Item, pool: Item[]): Exercise {
  switch (kind) {
    case "choose_en":
      return { kind, item, options: shuffle([item.en, ...distractors(item, pool, "en")]) };
    case "listen_choose":
      return { kind, item, options: shuffle([item.fr, ...distractors(item, pool, "fr")]) };
    case "arrange": {
      const words = item.fr.split(/\s+/);
      const extra = shuffle(
        pool
          .filter((p) => p.id !== item.id)
          .flatMap((p) => p.fr.split(/\s+/))
          .filter((w) => !words.includes(w)),
      ).slice(0, 3);
      return { kind, item, bank: shuffle([...words, ...extra]) };
    }
    default:
      return { kind, item } as Exercise;
  }
}

/** Duolingo-style lesson: introduce each item, check it, then a harder mixed round. */
export function buildLesson(items: Item[], pool: Item[]): Exercise[] {
  const out: Exercise[] = [];
  items.forEach((item, i) => {
    out.push({ kind: "intro", item });
    out.push(makeExercise(i % 2 === 0 ? "choose_en" : "listen_choose", item, pool));
  });

  const hard: GradedKind[] = ["type_fr", "speak", "listen_choose", "speak"];
  shuffle(items)
    .slice(0, Math.ceil(items.length * 0.75))
    .forEach((item, i) => {
      let kind = hard[i % hard.length];
      if (kind === "type_fr" && wordCount(item.fr) >= 3) kind = "arrange";
      out.push(makeExercise(kind, item, pool));
    });
  return out;
}

/** One recall exercise per due card. Leans on production (typing/speaking). */
export function buildReview(items: Item[], pool: Item[]): Exercise[] {
  const kinds: GradedKind[] = ["type_fr", "speak", "listen_choose", "choose_en", "type_fr"];
  return shuffle(items).map((item, i) => {
    let kind = kinds[i % kinds.length];
    if (kind === "type_fr" && wordCount(item.fr) >= 3) kind = "arrange";
    return makeExercise(kind, item, pool);
  });
}
