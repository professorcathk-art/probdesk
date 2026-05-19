/** pgvector literal for PostgREST / Supabase `vector` columns */
export function vectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/**
 * PostgREST returns `vector` as a bracket string or (depending on client/settings) a number[].
 * Supabase RPC expects a value Postgres can cast to `vector(1536)`.
 */
export function embeddingVectorForRpc(raw: unknown): string {
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[") && t.endsWith("]")) return t;
  }
  if (Array.isArray(raw) && raw.length > 0 && raw.every((x) => typeof x === "number" && Number.isFinite(x))) {
    return `[${raw.join(",")}]`;
  }
  if (typeof raw === "object" && raw !== null && ArrayBuffer.isView(raw)) {
    const v = raw as unknown as ArrayLike<number>;
    const arr = Array.from({ length: v.length }, (_, i) => Number(v[i]));
    if (arr.length > 0 && arr.every((x) => Number.isFinite(x))) {
      return `[${arr.join(",")}]`;
    }
  }
  throw new Error("Intent embedding has an unexpected shape — save the intent again or contact support.");
}
