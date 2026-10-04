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

export function whoFromMustHaves(mustHaves: string | null | undefined): string {
  if (!mustHaves) return "";
  return mustHaves
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("post_type:") && !trimmed.startsWith("when:");
    })
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

export function composeMustHaves(kind: MeetupKind, expectations: string, when: string) {
  const lines = [`post_type:${kind}`];
  if (when.trim()) lines.push(`when:${when.trim()}`);
  if (expectations.trim()) lines.push(expectations.trim());
  return lines.join("\n");
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
  const place = input.location?.trim() ?? "";
  const lines = [
    `Post type: ${kind === "group" ? "group activity" : "one-to-one"}`,
    `Title: ${split.title || "(none)"}`,
    `Details: ${split.details || "(none)"}`,
    `Location: ${place || "(none stated)"}`,
  ];
  if (kind === "group") lines.push(`Date and time: ${when || "(none stated)"}`);
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
