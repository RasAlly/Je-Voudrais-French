import { api, type Item } from "./api";

/** Flashcard deck ids: due cards, all learned words, the study list, saved words, or one unit. */
export type Deck = "due" | "learned" | "study" | "saved" | `unit:${string}`;
export type Direction = "fr" | "en";

export function filterDeck(deck: Deck, items: Item[], study: Item[]): Item[] {
  if (deck === "study") {
    // Study-list items don't carry the saved flag; take it from the full list.
    const saved = new Set(items.filter((i) => i.saved).map((i) => i.id));
    return study.map((i) => ({ ...i, saved: saved.has(i.id) }));
  }
  if (deck === "saved") return items.filter((i) => i.saved);
  if (deck === "due") return items.filter((i) => i.due);
  if (deck === "learned") return items.filter((i) => i.learned);
  return items.filter((i) => i.unitId === deck.slice(5));
}

export async function loadDeck(deck: Deck): Promise<Item[]> {
  const [{ items }, study] = await Promise.all([
    api.items(),
    deck === "study" ? api.study() : Promise.resolve({ items: [] as Item[] }),
  ]);
  return filterDeck(deck, items, study.items);
}
