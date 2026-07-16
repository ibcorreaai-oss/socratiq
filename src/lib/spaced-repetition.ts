/**
 * SM-2 lite spaced repetition. Quality scale (0-5):
 *   5 = correct, no hints needed
 *   3 = correct, but needed a Socratic hint from the Sage
 *   0 = still incorrect after hints
 */
export interface ReviewState {
  ease: number;
  intervalDays: number;
  repetitions: number;
}

export const INITIAL_REVIEW_STATE: ReviewState = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

export function nextReview(state: ReviewState, quality: 0 | 3 | 5): ReviewState & { dueAt: string } {
  let { ease, intervalDays, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);

    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }

  const due = new Date();
  due.setDate(due.getDate() + intervalDays);

  return { ease, intervalDays, repetitions, dueAt: due.toISOString() };
}

export function masteryFromAttempts(qualities: number[]): number {
  if (qualities.length === 0) return 0;
  const recent = qualities.slice(-5);
  const weighted = recent.reduce((sum, q, i) => sum + (q / 5) * (i + 1), 0);
  const weightTotal = recent.reduce((sum, _q, i) => sum + (i + 1), 0);
  return Math.round((weighted / weightTotal) * 100);
}
