/**
 * Hybrid discovery ("尋找契合對象"): guardrails layered on embeddings + AIML vibe.
 * Non-romantic flows (hire, cofounder, UGC gigs, agencies) intentionally skip inferred family defaults.
 */

import type { ProfileGenderValue } from "@/lib/profile-basics";
import { attractionOrientationSuppressesHeteroDefaultInference } from "@/lib/profile-attraction-orientation";
import type { IntentMatchingSignals } from "@/lib/intent-matching-signals";
import { matchingLaneSuppressesOppositeSexInference } from "@/lib/intent-matching-signals";

/** Suggestions below this cap are omitted from UX and not persisted as sync_top3. */
export const AI_SUGGESTION_MIN_MATCH_SCORE = 15;

export type ExplicitPartnerSexTarget = "female" | "male";

/** Sender profile cues used only for romantic-context guardrails — omitted fields mean "don't infer". */
export type MatchingSenderSnapshot = {
  gender: ProfileGenderValue | string | null | undefined;
  /** `profiles.attraction_orientation` slug or null when not provided */
  attractionOrientation?: string | null | undefined;
};

const LGBT_INCLUSIVE_HINT =
  /\b(gay|lesbian|bisexual|bi[-\s]?curious|\blgbtq?\b|\bqueer\b|homosexual|same[-\s]?sex(?:\s+couple)?|\bmlm\b|\bwlw\b|pansexual|asexual|\b(?:aromantic|aro)\b|同志|同性|男男|女女|拉拉|雙性戀)/i;

const LIGHT_ROMANCE_CUES =
  /(?:\b(?:date|dating|married|wife|gf|boyfriend|husband|love|relationship|spouse)\b|對象|愛情|爱情|恋愛|恋爱|結婚|结婚|伴侶|伴侣|男友|女友|長期關係|长期关系|戀愛)/i;

const BUSINESS_FOCUS =
  /\b(co[-\s]?founder|fundraising|cofounder|angel investor|\bcto\b|\bceo\b|\bstartup\b|\bvc\b|\bseed round|\bsaas\b|融資|創業合伙人|天使投資|技術合伙人|商業合伙人|股權合伙)\b/i;

/** Hiring / paid collaboration / gigs — skips spouse-family default unless romance cues coexist. */
const PROFESSIONAL_MATCHING_FOCUS =
  /\b(?:hire(?:d|s|ing)?|hiring\b|recruit(?:ment|ing)?|job\s+opening|full[-\s]time\b|part[-\s]time\b|intern(?:ship)?|\bfreelancer\b|\bfreelance\b|\bconsultant\b|contractor|\bagency\b|outsourc|subcontract|payroll|\binvoice\b|retainer|ugc\s+creator|content\s+creator|influencer|brand\s+collaboration|paid\s+gig|\$\s*\d+|港币|HKD|酬勞|稿費|創作者|\b承包商\b|\b徵才\b|\b招聘\b|\b招人\b|\b請人\b|\b外包\b|\b服務商\b|\b兼職\b|\b全職\b|测评|評測|試用\b)\b/i;

/** TC/SC cues that the sender names a female partner (beyond English `\b...\b`). */
function traditionalChineseFemalePartnerNamed(blob: string): boolean {
  return (
    /** e.g. 想認識一位 … 女生; 徵女友 … */
    /(?:想認識|想认识|希望認識|希望认识|想找|想找位|徵(?:個)?女友|徵友).{0,120}?女生/.test(blob) ||
    /** e.g. 30歲以下的女生、30 歲以下的女生 */
    /\d{1,3}\s*歲(?:以下|以上)?\s*(?:的)?女生/.test(blob)
  );
}

/** Mirror of {@link traditionalChineseFemalePartnerNamed} when the sender names a male partner. */
function traditionalChineseMalePartnerNamed(blob: string): boolean {
  return (
    /(?:想認識|想认识|希望認識|希望认识|想找|想找位|徵(?:個)?男友|徵(?:個)?男朋友).{0,120}?男生/.test(blob) ||
    /\d{1,3}\s*歲(?:以下|以上)?\s*(?:的)?男生/.test(blob)
  );
}

function explicitFemalePartnerSeeks(blob: string): boolean {
  if (
    /\b(business|co[-\s]?founder).*partner/i.test(blob) &&
    !/\b(date|dating|married|wife|gf)\b/i.test(blob)
  ) {
    if (!/\bgirlfriend\b|\bwife\b|女朋友|女友|老婆/i.test(blob)) return false;
  }
  return (
    /\bgirlfriend\b|\bfiancee\b|\b(?:biological\s+)?mother\b(?:\s+to\s+)?|\bmotherhood\b|\bwoman\s+who\b|\bwomen\b(?:\s+who)?|\blady\b|\bwife\b(?:\s+material\b)?|\bwives\b|\bwomen\b(?!\s+(?:intech|finance|engineering|\bcto\b))|异性女|異性女友|異性(?:的)?女生|想找(?:个|個)?(?:女|女生|女友|女朋友|异性女)|找女生|女性朋友(?!男性)|女伴侶|女性伴侶|女性對象|\bstraight\s+(?:woman|lady|women)\s+seek|\bstraight\s+guy\b.*(?:seek|looking.*)\b\b(?:woman|lady|wife|women)\b/i.test(
      blob,
    ) ||
    /老婆|太太(?!.(?:過世|身故))|女友|女朋友(?!(?:的)?男生)/i.test(blob) ||
    traditionalChineseFemalePartnerNamed(blob)
  );
}

function explicitMalePartnerSeeks(blob: string): boolean {
  return (
    /\bboyfriend\b|\bfiance\b(?!\bfiancee\b)|\b(?:biological\s+)?father\b|\bfatherhood\b|\b(?:man|men)\s+(?:who|seek|looking(?:\s+for)?)|\bhusbands?\b|\bgay\s+partner\b(?!\sfemale)|男(?:性)?朋友(?!.(?:已婚女性))|異性(?:的)?(?:男|男生|男友)|想找(?:个|個)?(?:男|男生|男友|男朋友)|男士伴侣|男方|男性對象|\bstraight\s+guy\b.*(?:seek|want).*\bwife\b/i.test(
      blob,
    ) ||
    traditionalChineseMalePartnerNamed(blob)
  );
}

export function inferExplicitPartnerSexTarget(naturalLanguage: string, mustHaves?: string | null): ExplicitPartnerSexTarget | null {
  const blob = `${naturalLanguage}\n${mustHaves ?? ""}`.trim();
  if (!blob) return null;
  const f = explicitFemalePartnerSeeks(blob);
  const m = explicitMalePartnerSeeks(blob);
  if (f && !m) return "female";
  if (m && !f) return "male";
  return null;
}

function neutralFamilyOrLongTermPartnershipCue(blob: string): boolean {
  const rom = LIGHT_ROMANCE_CUES.test(blob);
  if (PROFESSIONAL_MATCHING_FOCUS.test(blob) && !rom) return false;

  if (BUSINESS_FOCUS.test(blob) && !rom) return false;

  return (
    /\b(long(?:[-\s])term\s+(?:relationship|partner|commitment))\b|\bpartner\b.*(?:(?:starting|start)\s+a\s+family|\bfamily\b(?:\s+plan(?:ning)?|\s+oriented))|(?:starting|start)\s+a\s+family\b|\b(?:want|wants)\s+(?:kids?|children|bab(?:y|ies))\b|\b(?:have|having)\s+children\b|組織家庭|穩定對象|長期對象|長期關係|长期关系|認真發展|认真发展|認真談(?:戀愛)?|认真谈(?:恋爱)?|婚姻|對象\b.*家庭|想找(?:人生)?伴侶|終(?:身|生)伴侣|適婚|想(?:要)?(?:結婚)|生(?:小)?(?:孩|寶)/i.test(
      blob,
    )
  );
}

export function inferredDefaultOppositeSexTarget(
  sender: MatchingSenderSnapshot,
  naturalLanguage: string,
  mustHaves?: string | null,
): ExplicitPartnerSexTarget | null {
  const blob = `${naturalLanguage}\n${mustHaves ?? ""}`.trim();
  const sg = normalizeBinaryGender(sender.gender);
  if (!sg || LGBT_INCLUSIVE_HINT.test(blob)) return null;
  if (inferExplicitPartnerSexTarget(naturalLanguage, mustHaves)) return null;

  if (attractionOrientationSuppressesHeteroDefaultInference(sender.attractionOrientation)) return null;

  if (!neutralFamilyOrLongTermPartnershipCue(blob)) return null;

  return sg === "man" ? "female" : "male";
}

export function derivePreferredPartnerBinarySex(
  sender: MatchingSenderSnapshot,
  naturalLanguage: string,
  mustHaves?: string | null,
  /** Optional AIML-produced signals (multi-language); when absent or unknown, heuristic regex + profile defaults apply. */
  matchingSignals?: IntentMatchingSignals | null,
): ExplicitPartnerSexTarget | null {
  const fromModel = matchingSignals?.binary_gender_preference;
  if (fromModel === "female" || fromModel === "male") return fromModel;

  const fromRegex = inferExplicitPartnerSexTarget(naturalLanguage, mustHaves);
  if (fromRegex) return fromRegex;

  if (matchingSignals && matchingLaneSuppressesOppositeSexInference(matchingSignals.goal_lane)) {
    return null;
  }

  return inferredDefaultOppositeSexTarget(sender, naturalLanguage, mustHaves);
}

function normalizeBinaryGender(g: ProfileGenderValue | string | null | undefined): ProfileGenderValue | null {
  if (g === "man" || g === "woman") return g;
  return null;
}

export type GenderFilterForMatching = ExplicitPartnerSexTarget | null;

export function rankSupplyPoolForPartnerSemantics<T extends { gender: string | null }>(
  rows: T[],
  sender: MatchingSenderSnapshot,
  naturalLanguage: string,
  mustHaves: string | null | undefined,
  matchingSignals?: IntentMatchingSignals | null,
): T[] {
  const target: GenderFilterForMatching = derivePreferredPartnerBinarySex(
    sender,
    naturalLanguage,
    mustHaves,
    matchingSignals ?? null,
  );
  if (!target) return rows;

  const prefers = target;
  let scoreCell: (g: string | null) => number;
  if (prefers === "female") {
    scoreCell = (g) =>
      g === "woman" ? 0 : g === null ? 1 : g === "man" ? 4 : g === "non_binary" ? 2 : g === "prefer_not_say" ? 3 : g === "other" ? 2 : 9;
  } else {
    scoreCell = (g) =>
      g === "man" ? 0 : g === null ? 1 : g === "woman" ? 4 : g === "non_binary" ? 2 : g === "prefer_not_say" ? 3 : g === "other" ? 2 : 9;
  }

  return [...rows].sort((a, b) => {
    const ds = scoreCell(a.gender) - scoreCell(b.gender);
    if (ds !== 0) return ds;
    return 0;
  });
}

export function applyPartnershipSemanticsScoreCap(params: {
  sender: MatchingSenderSnapshot;
  candidateGender: string | null | undefined;
  naturalLanguageIntent: string;
  mustHaves?: string | null;
  matchingSignals?: IntentMatchingSignals | null;
  score: number;
}): { score: number; capped_note?: string } {
  const blob = `${params.naturalLanguageIntent}\n${params.mustHaves ?? ""}`;
  const score = Math.max(0, Math.min(100, Math.round(params.score)));
  const prev = score;

  if (LGBT_INCLUSIVE_HINT.test(blob)) return { score };

  const pref = derivePreferredPartnerBinarySex(
    params.sender,
    params.naturalLanguageIntent,
    params.mustHaves,
    params.matchingSignals ?? null,
  );
  if (!pref) return { score };

  const candBin = normalizeBinaryGender(params.candidateGender);
  if (candBin !== "man" && candBin !== "woman") return { score };

  const contradictory =
    (pref === "female" && candBin === "man") || (pref === "male" && candBin === "woman");

  const CAP_MISMATCH = AI_SUGGESTION_MIN_MATCH_SCORE - 1;
  const next = contradictory ? Math.min(score, CAP_MISMATCH) : score;

  if (next < prev) return { score: Math.max(0, next), capped_note: "preferred_partner_binary_mismatch_cap" };
  return { score: next };
}
