const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = Object.fromEntries(
  [
    ["倫", "伦"], ["發", "发"], ["東", "东"], ["長", "长"], ["國", "国"], ["門", "门"], ["書", "书"], ["會", "会"],
    ["對", "对"], ["團", "团"], ["體", "体"], ["運", "运"], ["動", "动"], ["網", "网"], ["絡", "络"], ["愛", "爱"],
    ["業", "业"], ["時", "时"], ["間", "间"], ["現", "现"], ["場", "场"], ["關", "关"], ["係", "系"], ["務", "务"],
    ["廣", "广"], ["車", "车"], ["電", "电"], ["話", "话"], ["員", "员"], ["華", "华"], ["語", "语"], ["經", "经"],
    ["驗", "验"], ["師", "师"], ["術", "术"], ["計", "计"], ["設", "设"], ["認", "认"], ["識", "识"], ["這", "这"],
    ["個", "个"], ["們", "们"], ["為", "为"], ["與", "与"], ["後", "后"], ["裡", "里"], ["幹", "干"], ["臺", "台"],
  ].map(([traditional, simplified]) => [traditional, simplified]),
);

function foldText(value: string) {
  return [...value.toLowerCase()].map((char) => TRADITIONAL_TO_SIMPLIFIED[char] ?? char).join("");
}

/** Free-text score. A full phrase ranks highest; separate words and Chinese pairs still match. */
export function scoreListingText(query: string, haystack: string) {
  const needle = foldText(query.trim());
  if (!needle) return 1;
  const hay = foldText(haystack);
  if (hay.includes(needle)) return 100;
  let score = 0;
  for (const part of needle.split(/\s+/).filter(Boolean)) {
    if (hay.includes(part)) score += 12;
    if ([...part].some((char) => char.charCodeAt(0) > 127)) {
      const chars = [...part];
      for (let index = 0; index < chars.length - 1; index += 1) {
        const pair = chars[index] + chars[index + 1];
        if (hay.includes(pair)) score += 3;
      }
    }
  }
  return score;
}
