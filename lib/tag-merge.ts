/**
 * When saving: treat leftover draft as tags — single token without commas is one tag;
 * commas split into multiple tags. Dedupes against existing tags (case-insensitive).
 */
export function mergeDraftIntoTags(tags: string[], draft: string, maxTags: number): string[] {
  const t = draft.trim();
  if (!t) return tags;
  const parts = t.includes(",") ? t.split(",").map((s) => s.trim()).filter(Boolean) : [t];
  const out = [...tags];
  const seen = new Set(out.map((x) => x.toLowerCase()));
  for (const p of parts) {
    if (out.length >= maxTags) break;
    const k = p.toLowerCase();
    if (!p || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}
