import { api, type Item } from "./api";

/** Flashcard deck ids: due cards, all learned words, the study list, or one unit. */
export type Deck = "due" | "learned" | "study" | `unit:${string}`;
export type Direction = "fr" | "en";

export function filterDeck(deck: Deck, items: Item[], study: Item[]): Item[] {
  if (deck === "study") return study;
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
