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

export type ParsedIntent = {
  location_filter: string | null;
  extracted_persona: Record<string, unknown>;
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
            },
            required: ["location_filter", "extracted_persona"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Extract structured intent from the user's natural-language networking request. " +
            "Return JSON only. location_filter should be a concise city/region string if mentioned, else null. " +
            "extracted_persona should summarize who they are, who they seek, and the goal.",
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
}): Promise<VibeResult> {
  const model = process.env.AIML_VIBE_MODEL ?? "gpt-4o";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vibe_check",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              match_score: { type: "integer", minimum: 1, maximum: 100 },
              compatibility_reason: { type: "string" },
            },
            required: ["match_score", "compatibility_reason"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You evaluate whether someone REACHING OUT (sender intent text — what they say they want) meaningfully aligns with an Explore LISTING (candidate intent — what the listing owner published they want). " +
            "Use optional profile snippets for grounding only — penalize spam, nonsense repetition, empty fluff, or obvious mismatched domains (romantic vs hiring vs fundraising vs mentorship). " +
            "Scoring calibration: unrelated or contradictory topics or spam-like bios → 1–35; weak or speculative overlap → 36–55; moderate plausible overlap → 56–72; strong overlap → 73–88; exceptional mutual fit → 89–100. " +
            "Do NOT output scores above 55 unless there is substantive topical overlap between sender intent and listing intent. Be conservative. " +
            "Return JSON only. compatibility_reason: exactly two concise sentences for a premium UI.",
        },
        {
          role: "user",
          content:
            `Sender intent:\n${params.senderIntent}\n\nCandidate intent:\n${params.candidateIntent}` +
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
  const parsed = JSON.parse(raw) as VibeResult;
  let score = Math.round(Number(parsed.match_score));
  if (!Number.isFinite(score)) score = 42;
  score = Math.max(1, Math.min(100, score));
  const compatibility_reason =
    typeof parsed.compatibility_reason === "string" && parsed.compatibility_reason.trim().length > 0
      ? parsed.compatibility_reason.trim()
      : "Overlap could not be summarized cleanly — treat this as a tentative signal.";
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

export async function sanitizeProfilePreview(profile: {
  display_name: string | null;
  industry: string | null;
  location: string | null;
  bio: string | null;
  superpower: string | null;
  skills_tags?: string[] | null;
  languages?: string[] | null;
  intent_level?: string | null;
}): Promise<Record<string, unknown>> {
  const model = process.env.AIML_SANITIZE_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${base()}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sanitized_profile",
          schema: {
            type: "object",
            additionalProperties: true,
            properties: {
              headline: { type: "string" },
              summary: { type: "string" },
              signals: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["headline", "summary", "signals"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Produce a double-blind networking preview: no exact real name or email; use role-style headline. " +
            "2-3 credibility signals max. JSON only.",
        },
        { role: "user", content: JSON.stringify(profile) },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AIML sanitize failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AIML sanitize returned empty content");
  return JSON.parse(raw) as Record<string, unknown>;
}
