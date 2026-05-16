import { embedTextSmall } from "@/lib/aiml";

export type AimlProbeResult =
  | { ok: true; latencyMs: number; embeddingDimensions: number }
  | { ok: false; error: string };

/** Minimal live call: embeddings endpoint + tiny input (same stack as production matching). */
export async function probeAimlApi(): Promise<AimlProbeResult> {
  if (!process.env.AIML_API_KEY?.trim()) {
    return { ok: false, error: "AIML_API_KEY is not set" };
  }

  const started = Date.now();
  try {
    const vec = await embedTextSmall("health-check ping");
    const latencyMs = Date.now() - started;
    if (!vec.length) {
      return { ok: false, error: "Embedding response had zero dimensions" };
    }
    return { ok: true, latencyMs, embeddingDimensions: vec.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
