/** Level curve: level N requires N*100 total XP to complete (level 1 = 0-100, level 2 = 100-300, ...). */
export function totalXpForLevel(level: number): number {
  return (50 * level * (level - 1));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= totalXpForLevel(level + 1)) level += 1;
  return level;
}

export function xpForNextLevel(xp: number, level: number): { pct: number; into: number; needed: number } {
  const floor = totalXpForLevel(level);
  const ceil = totalXpForLevel(level + 1);
  const into = xp - floor;
  const needed = ceil - floor;
  return { pct: Math.max(0, Math.min(100, Math.round((into / needed) * 100))), into, needed };
}

export function xpForQuestion(difficulty: number, usedHint: boolean): number {
  const base = 8 + difficulty * 4;
  return usedHint ? Math.round(base * 0.6) : base;
}
