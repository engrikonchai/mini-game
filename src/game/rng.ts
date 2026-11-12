/** Small seeded PRNG (mulberry32) so the game reducer stays pure and replayable. */
export interface Rng {
  next(): number;
  shuffle<T>(items: readonly T[]): T[];
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    shuffle(items) {
      const a = items.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    weighted(items, weight) {
      const total = items.reduce((sum, it) => sum + weight(it), 0);
      let r = next() * total;
      for (const it of items) {
        r -= weight(it);
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
    state: () => s,
  };
}
