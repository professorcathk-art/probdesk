/**
 * Curated marketplace copy for seeding (`npm run seed:demo-marketplace`).
 * Mixed Traditional Chinese + English, covering partner / mentor / cofounder / investor / networking.
 */
export type ShowcaseIntentSeed = {
  natural_language_input: string;
  location_filter: string | null;
};

export const DEMO_SHOWCASE_INTENTS: ShowcaseIntentSeed[] = [
  {
    natural_language_input:
      "香港｜想認真找一位價值觀相近的人生伴侶，彼此支持事業與生活節奏。希望先从深度聊天開始，互相了解後再見面。",
    location_filter: "香港",
  },
  {
    natural_language_input:
      "台北｜希望在接下來一年穩定交往，偏好個性成熟、情緒穩定，喜歡爬山與美食探店。",
    location_filter: "台北",
  },
  {
    natural_language_input:
      "Looking for a life partner in Singapore — thoughtful, kind, and curious about art & indie films. Prefer slow dating.",
    location_filter: "Singapore",
  },
  {
    natural_language_input:
      "上海｜想找一位願意一起規劃長期關係的對象，偏好周末一起做義工或短途旅行。",
    location_filter: "上海",
  },
  {
    natural_language_input:
      "Seeking a mentor who has scaled B2B SaaS from 0→1 in North America. I'm a PM→founder doing outbound-heavy GTM.",
    location_filter: "Remote / NA",
  },
  {
    natural_language_input:
      "想找一位在金融科技／合规方面有經驗的導師，願意每月一次線上 Office Hour，我可協助研究與資料整理。",
    location_filter: "香港 / 遠端",
  },
  {
    natural_language_input:
      "Bay Area — experienced eng leader wanted as mentor for infra & hiring playbooks; happy to compensate fairly.",
    location_filter: "Bay Area",
  },
  {
    natural_language_input:
      "博士在读，想找曾在 academia→industry 转型的前辈聊聊职业规划（机器学习方向）。",
    location_filter: "北京 / 線上",
  },
  {
    natural_language_input:
      "Looking for a technical co-founder (full-stack leaning backend) for an AI compliance workflow MVP. HK-based preferred.",
    location_filter: "Hong Kong",
  },
  {
    natural_language_input:
      "深圳｜硬件＋軟件 IoT 原型已完成，想找一位懂供應鏈與众筹的共同創辦人，股权可談。",
    location_filter: "深圳",
  },
  {
    natural_language_input:
      "EU timezone — designer-founder seeking ops/marketing cofounder for sustainable packaging D2C.",
    location_filter: "EU remote",
  },
  {
    natural_language_input:
      "我正在做跨境電商品牌（美妝），想找有 TikTok / Meta 投放經驗的共同創辦人，兼職起步亦可。",
    location_filter: "廣州",
  },
  {
    natural_language_input:
      "Seed-stage climate tech (carbon accounting). Seeking angel / strategic investor with enterprise SaaS portfolio.",
    location_filter: "London",
  },
  {
    natural_language_input:
      "天使輪募資中：智慧健身房 SaaS，已有 12 間付費門店。希望投資人熟悉連鎖零售或健身產業。",
    location_filter: "台灣",
  },
  {
    natural_language_input:
      "Looking for pre-seed investors in consumer health apps — traction: 8k MAU, retention week-4 at 22%.",
    location_filter: "Remote",
  },
  {
    natural_language_input:
      "杜拜｜家族办公室資源，尋找中东物流科技項目（Series A）共同投资机会介绍。",
    location_filter: "Dubai",
  },
  {
    natural_language_input:
      "Product designer (Figma systems) open to senior/lead roles or contract squads — prefers hybrid in Tokyo.",
    location_filter: "東京",
  },
  {
    natural_language_input:
      "資深數據工程師，想找志同道合的朋友定期線下交流 Spark / Lakehouse 與成本優化實務（咖啡我請）。",
    location_filter: "杭州",
  },
  {
    natural_language_input:
      "Photographer building a small studio — seeking collaborators for editorial & brand shoots in Seoul.",
    location_filter: "Seoul",
  },
  {
    natural_language_input:
      "想組一個「週末創業讀書會」，每月一次線下（吉隆坡），分享融资、团队与文化话题，欢迎认真参与者。",
    location_filter: "Kuala Lumpur",
  },
];
