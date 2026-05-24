/**
 * Phase 14 — demand/supply split for cross-vector retrieval:
 * intent_requests.demand_embedding vs profiles.supply_embedding.
 *
 * Phase 24 — dynamic Goal / Profile Context prefixes (no fixed category enum).
 */

import type { ProfileAttractionOrientationSlug } from "@/lib/profile-attraction-orientation";
import { attractionOrientationEmbeddingNote } from "@/lib/profile-attraction-orientation";

const MAX_GOAL_LANE_TOKENS = 32;
const MAX_GOAL_FRAGMENT_CHARS = 96;
const MAX_PROFILE_CONTEXT_TOKENS = 20;

function sanitizeLaneToken(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim().replace(/[\[\]]/g, "");
  return t;
}

function truncateFragment(s: string, max = MAX_GOAL_FRAGMENT_CHARS): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function collectStringsFromUnknown(
  value: unknown,
  push: (s: string) => void,
  depth: number,
): void {
  if (value == null || depth > 10) return;
  const t = typeof value;
  if (t === "string") {
    const s = sanitizeLaneToken(value as string);
    if (s.length > 0) push(truncateFragment(s));
    return;
  }
  if (t === "number") {
    push(String(value));
    return;
  }
  if (t === "boolean") return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        const s = sanitizeLaneToken(item as string);
        if (s.length > 0) push(truncateFragment(s));
      } else if (item && typeof item === "object") {
        collectStringsFromUnknown(item, push, depth + 1);
      }
    }
    return;
  }
  if (t === "object") {
    collectStringsFromUnknownObject(value as Record<string, unknown>, push, depth + 1);
  }
}

function collectStringsFromUnknownObject(
  record: Record<string, unknown>,
  push: (s: string) => void,
  depth: number,
): void {
  for (const v of Object.values(record)) {
    collectStringsFromUnknown(v, push, depth);
  }
}

/** Narrow JSON blobs from Supabase for demand context (backward compatible). */
export function asEmbeddingContextRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

/** JSON / persona blob → deduped comma pieces for `[Goal: …]` (no category switch). */
export function buildGoalLanePrefixFromContext(params: {
  tags?: string[] | null | undefined;
  extracted_persona?: Record<string, unknown> | null | undefined;
  enrichment?: Record<string, unknown> | null | undefined;
}): string {
  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (raw: string) => {
    if (ordered.length >= MAX_GOAL_LANE_TOKENS) return;
    const s = sanitizeLaneToken(raw);
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(s);
  };

  for (const t of params.tags ?? []) {
    if (typeof t !== "string") continue;
    push(truncateFragment(sanitizeLaneToken(t)));
    if (ordered.length >= MAX_GOAL_LANE_TOKENS) break;
  }

  if (ordered.length < MAX_GOAL_LANE_TOKENS && params.extracted_persona) {
    collectStringsFromUnknownObject(params.extracted_persona, push, 0);
  }
  if (ordered.length < MAX_GOAL_LANE_TOKENS && params.enrichment) {
    collectStringsFromUnknownObject(params.enrichment, push, 0);
  }

  if (ordered.length === 0) {
    return "[Goal: general connection]";
  }
  return `[Goal: ${ordered.join(", ")}]`;
}

export type DemandEmbeddingContext = {
  /** Explicit tags attached to the intent (UI / future columns); merged with persona-derived strings */
  tags?: string[] | null | undefined;
  extracted_persona?: Record<string, unknown> | null | undefined;
  /** onboarding Q&A blob — folded in when present */
  enrichment?: Record<string, unknown> | null | undefined;
};

/** Text embedded into `intent_requests.demand_embedding`. */
export function buildDemandEmbeddingText(
  intentDescription: string,
  mustHaves: string | null | undefined,
  context?: DemandEmbeddingContext,
): string {
  const goal = buildGoalLanePrefixFromContext({
    tags: context?.tags,
    extracted_persona: context?.extracted_persona ?? null,
    enrichment: context?.enrichment ?? null,
  });

  const d = intentDescription.trim();
  const m = mustHaves?.trim();

  return `${goal} Looking for: ${d}. Must-haves constraints: ${m && m.length > 0 ? m : "(none stated)"}.`;
}

/** JSON-safe profile record slice for `[Profile Context: …]` */
export type ProfileEmbeddingContextLane = {
  industry: string | null;
  interestsTags?: string[] | null | undefined;
  /** Optional headline / role when you store it separately from superpower */
  role?: string | null | undefined;
};

function buildProfileContextPrefix(lane: ProfileEmbeddingContextLane): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  const push = (raw: string) => {
    if (parts.length >= MAX_PROFILE_CONTEXT_TOKENS) return;
    const s = sanitizeLaneToken(raw);
    if (!s) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    parts.push(s);
  };

  const ind = lane.industry?.trim();
  if (ind) push(truncateFragment(ind, MAX_GOAL_FRAGMENT_CHARS));

  for (const tag of lane.interestsTags ?? []) {
    if (typeof tag !== "string") continue;
    const s = sanitizeLaneToken(tag);
    if (s) push(truncateFragment(s, MAX_GOAL_FRAGMENT_CHARS));
    if (parts.length >= MAX_PROFILE_CONTEXT_TOKENS) break;
  }

  const role = lane.role?.trim();
  if (role && parts.length < MAX_PROFILE_CONTEXT_TOKENS) {
    push(truncateFragment(role, MAX_GOAL_FRAGMENT_CHARS));
  }

  if (parts.length === 0) {
    return "[Profile Context: networking profile]";
  }

  return `[Profile Context: ${parts.slice(0, MAX_PROFILE_CONTEXT_TOKENS).join(", ")}]`;
}

/**
 * Text embedded into `profiles.supply_embedding`.
 * Profile-centric only (Phase 22): no active intent / demand text — keeps supply distinct from intent demand vectors.
 */
export function buildSupplyEmbeddingText(p: {
  industry: string | null;
  bio: string | null;
  superpower: string | null;
  languages: string[];
  skills_tags?: string[];
  /** Optional explicit role separate from Strengths — forward-compatible when persisted */
  role?: string | null;
  /** Parsed `profiles.attraction_orientation` slug; omitted or null skips */
  attraction_orientation_slug?: ProfileAttractionOrientationSlug | null;
}): string {
  const contextPrefix = buildProfileContextPrefix({
    industry: p.industry,
    interestsTags: p.skills_tags,
    role: p.role ?? null,
  });

  const bioContent = sanitizeLaneToken(p.bio ?? "") || "(not stated)";
  const strengthContent = sanitizeLaneToken(p.superpower ?? "") || "(not stated)";

  const langs = (p.languages ?? []).map((s) => String(s).trim()).filter(Boolean);
  const langStr = langs.length > 0 ? langs.join(", ") : "(none stated)";

  const tags = (p.skills_tags ?? []).map((s) => String(s).trim()).filter(Boolean);
  const tagStr = tags.length > 0 ? tags.join(", ") : "(none stated)";

  let body = `${contextPrefix} Bio: ${bioContent}. Strengths: ${strengthContent}. Spoken languages: ${langStr}. Keywords/interests: ${tagStr}.`;
  const orientNote = attractionOrientationEmbeddingNote(p.attraction_orientation_slug ?? null);
  if (orientNote) {
    body += ` Romantic attraction (member optional field): ${orientNote}`;
  }

  return body;
}
