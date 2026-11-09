/**
 * Daily article: the most-read French Wikipedia article of the previous day,
 * trimmed to its readable prose and pre-split into sentences and words so the
 * app can make every word tappable.
 *
 * Text is from Wikipedia (CC BY-SA 4.0); the app shows attribution + a link.
 */

const UA = "JeVoudrais/1.0 (personal French-learning app)";
const MAX_WORDS = 900;
const MIN_WORDS = 250;

/** Sections that are lists or references rather than prose. */
const SKIP_SECTIONS =
  /^(notes?|références?|notes et références|liens externes|voir aussi|bibliographie|annexes|articles? connexes|filmographie|discographie|théâtre|doublage|ouvrages|publications|distinctions|récompenses|nominations|décorations|galerie|sources|palmarès|statistiques|œuvres|oeuvres|télévision|cinéma|clips|publicités|jeux vidéo|liste.*)$/i;

export type Block = { type: "h"; text: string } | { type: "p"; sentences: string[][] };

export interface Article {
  day: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string | null;
  views: number;
  words: number;
  truncated: boolean;
  blocks: Block[];
}

interface MostRead {
  views: number;
  titles: { normalized: string; canonical: string };
  description?: string;
  thumbnail?: { source: string };
  content_urls?: { mobile?: { page?: string }; desktop?: { page?: string } };
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return (await r.json()) as T;
}

/** Most-read list from the featured feed for `day` (covers the day before). */
async function mostRead(day: string): Promise<MostRead[]> {
  const [y, m, d] = day.split("-");
  const feed = await getJson<{ mostread?: { articles: MostRead[] } }>(
    `https://api.wikimedia.org/feed/v1/wikipedia/fr/featured/${y}/${m}/${d}`,
  );
  return feed.mostread?.articles ?? [];
}

const shiftDay = (day: string, n: number) => {
  const t = new Date(day + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

// ---- Text cleanup + tokenizing ------------------------------------------------

const sentenceSeg = new Intl.Segmenter("fr", { granularity: "sentence" });
const wordSeg = new Intl.Segmenter("fr", { granularity: "word" });
const ELISION = /^(l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu|quoiqu)(['’])(.+)$/i;

/** Split a sentence into tokens; words and the text between them alternate. */
export function tokenize(sentence: string): string[] {
  const out: string[] = [];
  for (const { segment, isWordLike } of wordSeg.segment(sentence)) {
    const m = isWordLike ? segment.match(ELISION) : null;
    if (m) out.push(m[1] + m[2], m[3]); // "l'homme" → "l'" + "homme"
    else if (!isWordLike && out.length && !/\p{L}/u.test(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

const clean = (p: string) =>
  p
    .replace(/\s*\(\/[^)]*\/\)/g, "") // IPA like (/ʒɑ̃ ʁe.no/)
    .replace(/\s*\(\[[^\]]*\]\)/g, "") // IPA like ([ˈd͡ʒɑni dɛp])
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/** Prose-looking paragraph (not a list line like "1995 : French Kiss"). */
const isProse = (p: string) => p.length >= 80 && /[.!?…»]$/.test(p);

function toBlocks(extract: string) {
  const blocks: Block[] = [];
  let words = 0;
  let truncated = false;
  let skipDepth = 0; // inside a skipped section of this heading level (or deeper)
  let pendingHeading: string | null = null;

  for (const raw of extract.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^(=+)\s*(.*?)\s*=+$/);
    if (h) {
      const level = h[1].length;
      if (skipDepth && level > skipDepth) continue;
      skipDepth = SKIP_SECTIONS.test(h[2]) ? level : 0;
      if (!skipDepth) pendingHeading = h[2];
      continue;
    }
    if (skipDepth) continue;
    const text = clean(line);
    if (!isProse(text)) continue;

    const count = text.split(/\s+/).length;
    if (words >= MIN_WORDS && words + count > MAX_WORDS) {
      truncated = true;
      break;
    }
    if (pendingHeading) {
      blocks.push({ type: "h", text: pendingHeading });
      pendingHeading = null;
    }
    const sentences = [...sentenceSeg.segment(text)].map((s) => tokenize(s.segment));
    blocks.push({ type: "p", sentences });
    words += count;
  }
  return { blocks, words, truncated };
}

async function fetchExtract(title: string) {
  const q = new URLSearchParams({
    action: "query",
    prop: "extracts|info",
    inprop: "url",
    explaintext: "1",
    exsectionformat: "wiki",
    redirects: "1",
    format: "json",
    formatversion: "2",
    titles: title,
  });
  const data = await getJson<{ query: { pages: { extract?: string; fullurl?: string; missing?: boolean }[] } }>(
    `https://fr.wikipedia.org/w/api.php?${q}`,
  );
  return data.query.pages[0];
}

/**
 * Build the article for `day`: walk the most-read list and take the first
 * real prose article not already used (skips lists, disambiguation pages, etc.).
 */
export async function buildDailyArticle(day: string, usedTitles: Set<string>): Promise<Article> {
  let list = await mostRead(day).catch(() => []);
  if (!list.length) list = await mostRead(shiftDay(day, -1));

  const candidates = list.filter(
    (a) =>
      !usedTitles.has(a.titles.normalized) &&
      !/^(liste|list)\b/i.test(a.titles.normalized) &&
      !/(page de liste|homonymie|page d'homonymie)/i.test(a.description ?? "") &&
      !a.titles.canonical.includes(":"),
  );

  for (const a of candidates.slice(0, 8)) {
    const page = await fetchExtract(a.titles.canonical).catch(() => null);
    if (!page?.extract || page.missing) continue;
    const { blocks, words, truncated } = toBlocks(page.extract);
    if (words < MIN_WORDS) continue;
    return {
      day,
      title: a.titles.normalized,
      description: a.description ?? "",
      url: page.fullurl ?? a.content_urls?.mobile?.page ?? `https://fr.wikipedia.org/wiki/${a.titles.canonical}`,
      thumbnail: a.thumbnail?.source ?? null,
      views: a.views,
      words,
      truncated,
      blocks,
    };
  }
  throw new Error("No suitable article found today");
}
