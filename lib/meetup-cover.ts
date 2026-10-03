const SCENES: { src: string; keys: string[] }[] = [
  { src: "/meetup-covers/cover-badminton.jpg", keys: ["羽毛", "badminton"] },
  { src: "/meetup-covers/cover-pets.jpg", keys: ["寵物", "宠物", "貓", "猫", "狗", "餵食", "喂食", "pet"] },
  { src: "/meetup-covers/cover-renovation.jpg", keys: ["裝修", "装修", "翻新", "木質", "木质"] },
  { src: "/meetup-covers/cover-milktea.jpg", keys: ["奶茶", "手搖", "手摇"] },
  { src: "/meetup-covers/cover-harbour.jpg", keys: ["爬山", "長假", "长假"] },
  { src: "/meetup-covers/cover-london.jpg", keys: ["倫敦", "伦敦", "london"] },
  {
    src: "/meetup-covers/cover-startup.jpg",
    keys: ["技術", "技术", "ai", "saas", "創辦", "创办", "募資", "募资", "自動化", "自动化", "健身", "n8n", "投資", "投资"],
  },
  { src: "/meetup-covers/cover-home.jpg", keys: ["family", "kids", "家庭"] },
  { src: "/meetup-covers/cover-date.jpg", keys: ["交往", "女生", "關係", "关系", "伴侶", "伴侣", "長期", "长期"] },
];

const FALLBACKS = [
  "/meetup-covers/cover-date.jpg",
  "/meetup-covers/cover-london.jpg",
  "/meetup-covers/cover-harbour.jpg",
  "/meetup-covers/cover-startup.jpg",
];

function hasKey(hay: string, key: string) {
  const needle = key.toLowerCase();
  if (/^[a-z0-9]{2,3}$/.test(needle)) {
    return new RegExp(`(?:^|[^a-z0-9])${needle}(?:[^a-z0-9]|$)`, "i").test(hay);
  }
  return hay.includes(needle);
}

export function meetupCoverSrc(text: string, id: string) {
  const hay = text.toLowerCase();
  for (const scene of SCENES) {
    if (scene.keys.some((key) => hasKey(hay, key))) return scene.src;
  }
  const n = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACKS[n % FALLBACKS.length];
}
