/** Dedupe case-insensitively; preserve first-seen casing; cap count. */
export function normalizeProfileTags(raw: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    const v = String(x).trim();
    if (!v || out.length >= max) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}
