export function envNumber(key: string, fallback: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function envFloat(key: string, fallback: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
