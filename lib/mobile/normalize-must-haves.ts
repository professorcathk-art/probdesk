export function normalizeMustHaves(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t ? t : null;
}
