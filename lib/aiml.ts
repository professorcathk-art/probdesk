import type { IntentMatchingSignals } from "@/lib/intent-matching-signals";
import {
  FALLBACK_MIXED_SIGNALS,
  normalizeIntentMatchingSignals,
} from "@/lib/intent-matching-signals";

const base = () => process.env.AIML_API_BASE_URL ?? "https://api.aimlapi.com/v1";
const key = () => process.env.AIML_API_KEY;

function authHeaders(): HeadersInit {
  const apiKey = key();
  if (!apiKey) {
    throw new Error("AIML_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

const MATCHING_SIGNALS_SCHEMA_PROPERTIES = {
  goal_lane: {
    type: "string",
    enum: [
      "romantic_partner",
      "friendship_platonic",
      "professional_hire_or_service",
      "employment_seeking",
      "mentorship_learning",
      "cofounder_equity",
      "investor_fundraising",
      "general_networking",
      "mixed_or_unclear",
    ],
  },
  binary_gender_preference: {
    anyOf: [{ type: "null" }, { type: "string", enum: ["female", "male"] }],
  },
} as const;

function parseIntentSignalsSystemPromptExtra(): string {
  return (
    "Also set matching_signals.goal_lane to the SINGLE dominant purpose (English enum): " +
    "romantic_partner (dating / spouse / girlfriend / boyfriend wording in any language), " +
    "friendship_platonic (non-romantic friends/community), professional_hire_or_service (agency, freelancer, buy/sell service, client/provider), " +
    "employment_seeking (candidate wants job or employer wants hires), mentorship_learning (tutor/coach/learn from), " +
    "cofounder_equity (startup equity partner / technical partner), investor_fundraising, general_networking (vague meet-people intent), mixed_or_unclear. " +
    "matching_signals.binary_gender_preference MUST be female or male only when the user clearly restricts who they meet to women/girls/ladies/etc. vs men/guys/etc. across ANY script or language—else null (including LGBTQ+ ambiguous or non-binary inclusive asks). " +
    "Professional/business intents should normally keep binary_gender_preference null unless they explicitly constrain peer gender."
  );
}

export type ParsedIntent = {
  location_filter: string | null;
  extracted_persona: Record<string, unknown>;
  matching_signals: Record<string, unknown>;
};

export async function parseIntentWithMini(input: string): Promise<ParsedIntent> {
  const model = process.env.AIML_PARSE_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_parse",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              location_filter: { type: ["string", "null"] },
              extracted_persona: { type: "object", additionalProperties: true },
              matching_signals: {
                type: "object",
                additionalProperties: false,
                properties: MATCHING_SIGNALS_SCHEMA_PROPERTIES,
                required: ["goal_lane", "binary_gender_preference"],
              },
            },
            required: ["location_filter", "extracted_persona", "matching_signals"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Extract structured intent from the user's natural-language networking request (any natural language acceptable). " +
            "Return JSON only. location_filter should be a concise city/region string if mentioned, else null. " +
            "extracted_persona should summarize who they are, who they seek, and the goal. " +
            parseIntentSignalsSystemPromptExtra(),
        },
        { role: "user", content: input },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML parse failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AIML parse returned empty content");
  return JSON.parse(raw) as ParsedIntent;
}

/**
 * Lightweight re-parse used for legacy intents created before matching_signals persisted.
 * Same enums as parseIntentWithMini.matching_signals.
 */
export async function parseIntentMatchingSignalsMini(userContent: string): Promise<IntentMatchingSignals> {
  const model = process.env.AIML_PARSE_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "matching_signals_parse",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: MATCHING_SIGNALS_SCHEMA_PROPERTIES,
            required: ["goal_lane", "binary_gender_preference"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Classify a Vennode Explore request for hybrid matching guardrails only. Respond JSON only (any input language). " +
            parseIntentSignalsSystemPromptExtra(),
        },
        { role: "user", content: userContent.slice(0, 8000) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML matching_signals parse failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("AIML matching_signals parse returned empty content");
  try {
    return normalizeIntentMatchingSignals(JSON.parse(rawContent) as Record<string, unknown>);
  } catch {
    return FALLBACK_MIXED_SIGNALS;
  }
}

export async function embedTextSmall(text: string): Promise<number[]> {
  const model = process.env.AIML_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const res = await fetch(`${base()}/embeddings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML embedding failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) throw new Error("AIML embedding returned empty vector");
  return embedding;
}

export type VibeResult = {
  match_score: number;
  compatibility_reason: string;
};

export async function vibeCheckWith4o(params: {
  senderIntent: string;
  candidateIntent: string;
  senderProfileSnippet?: string;
  candidateProfileSnippet?: string;
  /** Expectations / constraints — weighted heavily vs geography */
  senderMustHaves?: string | null;
  candidateMustHaves?: string | null;
  /** Listing regions — tie-breakers unless expectations demand geography */
  senderLocationPreference?: string | null;
  candidateLocation?: string | null;
  /** Optional gender markers from profiles (helps romance-style complementary checks). */
  senderGender?: string | null;
  candidateGender?: string | null;
  /** Optional slug from profiles.attraction_orientation — use only when intent is romantic/personal; ignore for recruiting/service workflows. */
  senderAttractionOrientationSlug?: string | null;
}): Promise<VibeResult> {
  const reqLine = (label: string, text: string | null | undefined) => {
    const t = text?.trim();
    return `${label}:\n${t && t.length > 0 ? t : "(none stated)"}`;
  };

  const geoParts: string[] = [];
  const sl = params.senderLocationPreference?.trim();
  const cl = params.candidateLocation?.trim();
  if (sl) geoParts.push(`Sender geographic note on their listing: ${sl}`);
  if (cl) geoParts.push(`Candidate listing region: ${cl}`);

  const genderParts: string[] = [];
  const sg = params.senderGender?.trim();
  const cg = params.candidateGender?.trim();
  if (sg) genderParts.push(`Sender profile gender field (if stated): ${sg}`);
  if (cg) genderParts.push(`Candidate profile gender field (if stated): ${cg}`);
  const so = params.senderAttractionOrientationSlug?.trim();
  if (so) {
    genderParts.push(
      `Sender optional romantic-orientation slug (members only; may be omitted): ${so} — consider only alongside dating/romance/personal-relationship intents; irrelevant for hiring, services, cofounders, or general networking unless the wording is clearly romantic.`,
    );
  }

  const model = process.env.AIML_VIBE_MODEL ?? "gpt-4o";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vibe_check",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: { type: "integer", minimum: 0, maximum: 100 },
              reason: { type: "string" },
            },
            required: ["score", "reason"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You are Vennode's Complementary Matching Engine. Evaluate the mutual fit between the Sender's Demand and the Candidate's Supply (what they offer via profile superpower/bio vs what they ask in their listing text when present). " +
            "CRITICAL RULE: Penalize **parallel demands** only when both sides want the **same kind of outcome from the peer** without either supplying what the other needs (e.g. both only seek a technical co-founder but neither offers shipped product / equity / capital). " +
            "ROMANCE / DATING: **Seeking a boyfriend** vs **seeking a girlfriend** is often **complementary**, not parallel — e.g. sender listing seeks a boyfriend while candidate (male profile marker) seeks a girlfriend is a typical complementary pairing; do **not** call that a gender mismatch or apply the parallel-demands penalty. Reserve \"gender mismatch\" for cases where stated partner-type seeks plus profile gender markers clearly contradict (e.g. both explicitly seek the same partner gender that neither satisfies). If unsure, do not claim mismatch. " +
            "FRIENDSHIP / PLATONIC / GENERAL INTROS: If the sender intent **clearly specifies the gender of the person they want to meet** (e.g. \"friends with a girl/woman/lady\", \"找女生／女性朋友\", analogous male-seeking wording), compare to **Candidate profile gender marker** when present. If candidate gender **plainly contradicts** that stated target (e.g. seeks women; candidate marker is male), assign a **low score (cap at 25)** and briefly say why. This rule **overrides** the dating complementary logic above — do **not** mark that as complementary. If candidate gender is missing, do not infer; score on other axes but mention uncertainty about gender alignment. " +
            "SPOUSE / FAMILY INTENT: Life-partner wording (marriage, children,組織家庭, long‑term parenting) plus **matching** profile gender markers (both man/both woman) normally signals a **hetero-shaped** mismatch vs stated opposite‑sex wording — score such pairings conservatively (**≤20**) unless the text clearly welcomes LGBTQ+ paths. Vennode also applies deterministic post‑filters downstream. " +
            "**WORK / HIRING / SERVICES / BUSINESS:** When the sender request is mainly about recruiting, gigs, freelancers, agencies, mentorship, tutoring, internships, cofounders, investors, collaborators, introductions, hobbies, friendships **without** a stated romantic partner gender, or similar non-romantic goals, treat profile gender markers and romantic-orientation slug as **orthogonal** guidance — score fit on complementary skills, supply/demand overlap, geography, expectations, etc.; **do not** downgrade solely for gender pairing or opposite-sex default logic unless the wording is plainly romantic or partner-gender constrained. " +
            "Input data may include: Sender intent & must-haves; Candidate intent/listing (if any); Candidate superpower/bio/profile snippet; geography as a secondary constraint. " +
            "Respond strictly as JSON with integer `score` (0–100) and a single-sentence `reason` explaining complementary fit or mismatch. Be conservative.",
        },
        {
          role: "user",
          content:
            `Input data provided:\n\n${reqLine("Sender intent", params.senderIntent)}\n\n${reqLine("Candidate intent / listing", params.candidateIntent)}\n\n${reqLine("Sender requirements / expectations", params.senderMustHaves)}\n\n${reqLine("Candidate requirements / expectations", params.candidateMustHaves)}` +
            (geoParts.length > 0
              ? `\n\nGeographic context (secondary):\n${geoParts.join("\n")}`
              : "") +
            (genderParts.length > 0 ? `\n\nProfile gender markers (optional):\n${genderParts.join("\n")}` : "") +
            (params.senderProfileSnippet?.trim()
              ? `\n\nSender profile context:\n${params.senderProfileSnippet.trim()}`
              : "") +
            (params.candidateProfileSnippet?.trim()
              ? `\n\nCandidate profile context:\n${params.candidateProfileSnippet.trim()}`
              : ""),
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML vibe check failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AIML vibe check returned empty content");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const rawScore = parsed.score ?? parsed.match_score;
  const rawReason = parsed.reason ?? parsed.compatibility_reason;
  let score = Math.round(Number(rawScore));
  if (!Number.isFinite(score)) score = 42;
  score = Math.max(0, Math.min(100, score));
  const compatibility_reason =
    typeof rawReason === "string" && rawReason.trim().length > 0
      ? rawReason.trim()
      : "Fit could not be summarized cleanly — verify complementary demand/supply before inviting.";
  return { match_score: score, compatibility_reason };
}

export async function generateFollowUpQuestions(persona: Record<string, unknown>): Promise<string[]> {
  const model = process.env.AIML_PARSE_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "followups",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["questions"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Generate exactly 3 short, respectful enrichment questions to clarify an intent-driven networking profile. " +
            "Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify(persona),
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML follow-ups failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AIML follow-ups returned empty content");
  const parsed = JSON.parse(raw) as { questions: string[] };
  return parsed.questions.slice(0, 3);
}
