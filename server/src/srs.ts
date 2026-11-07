/**
 * Simplified SM-2 spaced repetition.
 * grade: 0 = again (forgot), 1 = hard, 2 = good, 3 = easy
 */
export type Grade = 0 | 1 | 2 | 3;

export interface CardState {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
}

export function schedule(card: CardState, grade: Grade): CardState & { due_at: Date } {
  let { ease, interval_days, reps, lapses } = card;
  const now = Date.now();
  const DAY = 86_400_000;

  if (grade === 0) {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    interval_days = 0;
    // Show it again in ~10 minutes.
    return { ease, interval_days, reps, lapses, due_at: new Date(now + 10 * 60_000) };
  }

  reps += 1;
  if (reps === 1) interval_days = grade === 3 ? 3 : 1;
  else if (reps === 2) interval_days = grade === 1 ? 3 : 6;
  else interval_days = Math.round(interval_days * ease * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1));

  ease = Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  return { ease, interval_days, reps, lapses, due_at: new Date(now + interval_days * DAY) };
}
