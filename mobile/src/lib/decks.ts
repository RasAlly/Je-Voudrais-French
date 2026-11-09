import { api, type Item } from "./api";

/** Flashcard deck ids: the study list, flashcards you made, starred cards, or one unit. */
export type Deck = "study" | "saved" | "starred" | `unit:${string}`;
export type Direction = "fr" | "en";

export function filterDeck(deck: Deck, items: Item[], study: Item[]): Item[] {
  if (deck === "study") {
    // Study-list items don't carry the starred flag; take it from the full list.
    const starred = new Set(items.filter((i) => i.starred).map((i) => i.id));
    return study.map((i) => ({ ...i, starred: starred.has(i.id) }));
  }
  if (deck === "starred") return items.filter((i) => i.starred);
  if (deck === "saved") return items.filter((i) => i.saved);
  return items.filter((i) => i.unitId === deck.slice(5));
}

export async function loadDeck(deck: Deck): Promise<Item[]> {
  const [{ items }, study] = await Promise.all([
    api.items(),
    deck === "study" ? api.study() : Promise.resolve({ items: [] as Item[] }),
  ]);
  return filterDeck(deck, items, study.items);
}
