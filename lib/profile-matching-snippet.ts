/** Compact profile text folded into LLM vibe scoring (never shown verbatim to end users). */
export type ProfileMatchingFields = {
  bio: string | null;
  industry: string | null;
  skills_tags?: string[] | null;
  languages?: string[] | null;
  current_status?: string | null;
};

export function formatProfileMatchingSnippet(p: ProfileMatchingFields): string {
  const lines: string[] = [];
  if (p.bio?.trim()) lines.push(`Bio: ${p.bio.trim()}`);
  if (p.industry?.trim()) lines.push(`Industry: ${p.industry.trim()}`);
  const tags = (p.skills_tags ?? []).map((s) => s.trim()).filter(Boolean);
  if (tags.length) lines.push(`Skills / traits: ${tags.join(", ")}`);
  const langs = (p.languages ?? []).map((s) => s.trim()).filter(Boolean);
  if (langs.length) lines.push(`Languages: ${langs.join(", ")}`);
  if (p.current_status?.trim()) lines.push(`Availability posture: ${p.current_status.trim()}`);
  return lines.join("\n");
}
