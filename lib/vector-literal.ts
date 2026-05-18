/** pgvector literal for PostgREST / Supabase `vector` columns */
export function vectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
