/**
 * Mulberry32-style seeded pseudo-random number generator.
 *
 * Produces deterministic sequences from a given seed — critical for SSR
 * where server and client must generate identical values to avoid
 * hydration mismatches.
 *
 * @param seed - Any integer seed value
 * @returns A function that returns the next pseudo-random number in [0, 1)
 *
 * @example
 * ```ts
 * const rng = seededRandom(42);
 * const a = rng(); // always 0.6011037519201636
 * const b = rng(); // always 0.4400689664762467
 * ```
 */
export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
