export type MeetupKind = "one_to_one" | "group";

const GROUP_HINT =
  /群組|活動|聚會|工作坊|一起|group|meetup|event|workshop|hike|hiking|散步|讀書會/i;

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

export function whoFromMustHaves(mustHaves: string | null | undefined): string {
  if (!mustHaves) return "";
  return mustHaves
    .split("\n")
    .filter((line) => !line.startsWith("post_type:"))
    .join("\n")
    .trim();
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
