export type MeetupKind = "one_to_one" | "group";

const GROUP_HINT =
  /群組|聚會|工作坊|讀書會|group\s+event|group\s+meetup|workshop/i;

export function meetupKindFrom(text: string, mustHaves?: string | null): MeetupKind {
  const must = mustHaves ?? "";
  if (must.includes("post_type:group")) return "group";
  if (must.includes("post_type:one_to_one")) return "one_to_one";
  return GROUP_HINT.test(`${text}\n${must}`) ? "group" : "one_to_one";
}

export function stampMustHaves(kind: MeetupKind, who: string): string {
  const body = who.trim();
  return body ? `post_type:${kind}\n${body}` : `post_type:${kind}`;
}

export const TITLE_MAX_UNITS = 20;

/** One AI people-search per post. A repeat inside this window must not call the model. */
export const SUGGESTION_COOLDOWN_MS = 60 * 60 * 1000;

/** Chinese characters count as 1. Other characters count as half, so 20 Chinese or 40 English fit. */
export function titleUnits(value: string) {
  let units = 0;
  for (const char of value) units += /[\u3400-\u9fff]/.test(char) ? 1 : 0.5;
  return units;
}

export function isStoredMetaLine(line: string) {
  return /^(post_type:|when:|price_role:|price_amount:|price_currency:)/.test(line.trim());
}

export function whoFromMustHaves(mustHaves: string | null | undefined): string {
  if (!mustHaves) return "";
  return mustHaves
    .split("\n")
    .filter((line) => line.trim() && !isStoredMetaLine(line))
    .join("\n")
    .trim();
}

export function whenFromMustHaves(mustHaves: string | null | undefined): string {
  const line = (mustHaves ?? "").split("\n").find((item) => item.trim().startsWith("when:"));
  return line ? line.trim().slice(5) : "";
}

export function splitMeetupPost(text: string) {
  const lines = text.split("\n");
  const titleLine = lines.find((line) => line.trim()) ?? "";
  const title = titleLine.trim();
  const rest = text.slice(text.indexOf(titleLine) + titleLine.length).trim();
  const tags = [...rest.matchAll(/#([^\s#]+)/g)].map((match) => match[1]);
  const details = rest.replace(/#[^\s#]+/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { title, details, tags };
}

export function composeMeetupPost(input: { title: string; details: string; tags: string[] }) {
  const tags = input.tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);
  const tagLine = tags.map((tag) => `#${tag}`).join(" ");
  return [input.title.trim(), "", input.details.trim(), tagLine].filter((part, index) => part || index === 1).join("\n").trim();
}

export const PRICE_CURRENCIES = ["HKD", "TWD", "CNY", "USD", "SGD", "JPY", "EUR", "GBP", "AUD", "KRW", "MYR"] as const;

export type PriceRole = "none" | "pay" | "receive";

export type ListingPrice = {
  role: PriceRole;
  amount: string;
  currency: string;
};

export function priceFromMustHaves(mustHaves: string | null | undefined): ListingPrice {
  const lines = (mustHaves ?? "").split("\n").map((line) => line.trim());
  const roleRaw = lines.find((line) => line.startsWith("price_role:"))?.slice("price_role:".length) ?? "none";
  const role: PriceRole = roleRaw === "pay" || roleRaw === "receive" ? roleRaw : "none";
  const amount = lines.find((line) => line.startsWith("price_amount:"))?.slice("price_amount:".length) ?? "";
  const currencyRaw = lines.find((line) => line.startsWith("price_currency:"))?.slice("price_currency:".length) ?? "HKD";
  const currency = (PRICE_CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : "HKD";
  return { role, amount, currency };
}

export function composeMustHaves(kind: MeetupKind, expectations: string, when: string, price?: ListingPrice | null) {
  const lines = [`post_type:${kind}`];
  if (when.trim()) lines.push(`when:${when.trim()}`);
  if (price && price.role !== "none" && price.amount.trim()) {
    lines.push(`price_role:${price.role}`);
    lines.push(`price_amount:${price.amount.trim()}`);
    lines.push(`price_currency:${price.currency}`);
  }
  if (expectations.trim()) lines.push(expectations.trim());
  return lines.join("\n");
}

export function formatListingPrice(lang: "zh" | "en", price: ListingPrice): string | null {
  if (price.role === "none" || !price.amount.trim()) return null;
  const numeric = Number(price.amount);
  const shown = Number.isFinite(numeric)
    ? new Intl.NumberFormat(lang === "zh" ? "zh-Hant" : "en", { maximumFractionDigits: 2 }).format(numeric)
    : price.amount.trim();
  if (lang === "zh") return price.role === "pay" ? `申請人付款 ${price.currency} ${shown}` : `申請人可收 ${price.currency} ${shown}`;
  return price.role === "pay" ? `Applicants pay ${price.currency} ${shown}` : `Applicants can receive ${price.currency} ${shown}`;
}

/** Labeled listing for classifiers, embeddings, and fit checks. */
export function screeningTextForAi(input: {
  naturalLanguage: string;
  mustHaves?: string | null;
  location?: string | null;
}): string {
  const text = input.naturalLanguage.trim();
  const kind = meetupKindFrom(text, input.mustHaves);
  const split = splitMeetupPost(text);
  const expectations = whoFromMustHaves(input.mustHaves);
  const when = whenFromMustHaves(input.mustHaves);
  const price = priceFromMustHaves(input.mustHaves);
  const place = input.location?.trim() ?? "";
  const lines = [
    `Post type: ${kind === "group" ? "group activity" : "one-to-one"}`,
    `Title: ${split.title || "(none)"}`,
    `Details: ${split.details || "(none)"}`,
    `Location: ${place || "(none stated)"}`,
  ];
  if (kind === "group") lines.push(`Date and time: ${when || "(none stated)"}`);
  if (price.role === "none") lines.push("Price: none (no money on this post)");
  else lines.push(`Price: applicants ${price.role === "pay" ? "pay" : "can receive"} ${price.amount} ${price.currency}. Settled offline between the people involved. Vennode does not collect or settle this money.`);
  lines.push(`Expectations: ${expectations || "(none stated)"}`);
  if (split.tags.length > 0) lines.push(`Hashtags: ${split.tags.join(", ")}`);
  return lines.join("\n");
}

export function listingTitle(text: string): string {
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return text.trim();
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}

export function draftMeetupCopy(input: {
  lang: "en" | "zh";
  kind: MeetupKind;
  title: string;
  place: string;
  when: string;
  who: string;
}): string {
  const title = input.title.trim();
  const place = input.place.trim();
  const when = input.when.trim();
  const who = input.who.trim();
  if (input.lang === "zh") {
    if (input.kind === "group") {
      return [
        title,
        "",
        `地點：${place}`,
        when ? `時間：${when}` : "",
        "",
        `我想找的人：${who}`,
        "",
        "這則內容只幫你把想法寫清楚，不會自動配對任何人。留下一句話申請，由我親自回覆。",
      ]
        .filter((line, index, all) => line !== "" || (index > 0 && all[index - 1] !== ""))
        .join("\n");
    }
    return [
      title,
      "",
      place ? `地點或方式：${place}` : "",
      "",
      `我想認識：${who}`,
      "",
      "這則內容只幫你潤色文字，不會自動配對。如果你覺得合適，留下一句話，我會自己決定。",
    ]
      .filter((line, index, all) => !(line === "" && index > 0 && all[index - 1] === ""))
      .join("\n");
  }
  if (input.kind === "group") {
    return [
      title,
      "",
      `Place: ${place}`,
      when ? `When: ${when}` : "",
      "",
      `Who I'm hoping to meet: ${who}`,
      "",
      "This only drafts the wording. It does not match anyone for you. Leave a short note to apply, and I'll reply myself.",
    ]
      .filter((line, index, all) => !(line === "" && index > 0 && all[index - 1] === ""))
      .join("\n");
  }
  return [
    title,
    "",
    place ? `Place or format: ${place}` : "",
    "",
    `Who I'd like to meet: ${who}`,
    "",
    "This only polishes the wording. It does not match anyone. If this sounds right, leave a short note and I'll decide.",
  ]
    .filter((line, index, all) => !(line === "" && index > 0 && all[index - 1] === ""))
    .join("\n");
}
