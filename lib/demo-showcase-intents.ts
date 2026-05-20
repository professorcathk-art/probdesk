/**
 * Curated marketplace copy for seeding (`npm run seed:demo-marketplace`).
 * Mixed Traditional Chinese + English, covering partner / mentor / cofounder / investor / networking.
 */
export type ShowcaseIntentSeed = {
  natural_language_input: string;
  location_filter: string | null;
  /** Shown under Expectations on Explore cards when set (intent_requests.must_haves). */
  must_haves?: string | null;
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

  // Phase 19 — business, services, gigs & networking (beyond dating-only demos)
  {
    natural_language_input:
      "[AI SaaS] We're building an AI-driven productivity assistant for legal teams — early traction and a working MVP. Looking for an angel investor who understands B2B SaaS for a low-pressure virtual coffee: share our vision, trade feedback, and explore fit. Not asking for an immediate cheque — relationships and honest input first.\n\nTags: fundraising, AI, English",
    location_filter: "Global / Remote",
    must_haves:
      "Experience investing in or advising AI/SaaS startups · up for a 30-minute, no-obligation chat · brings strategic perspective and sector insight beyond capital alone.",
  },
  {
    natural_language_input:
      "【尋找技術合夥人】我有約 5 年產品經驗，正在規劃一款 AI 應用工具，商業模式與早期客戶名單已具雛形。希望找到對產品極致執著、技術底子紮實（尤其 LLM 應用層）的技術共同創辦人（Technical Co-founder），一起把事情做深做穩。\n\n標籤：co-founder、tech、中文",
    location_filter: "Global / Remote",
    must_haves:
      "具全端開發與 API 整合經驗 · 可全職投入，或每週至少 20 小時承諾 · 心理韌性佳，願一起走創業的高低起伏 · 地點不限，接受遠端非同步協作。",
  },
  {
    natural_language_input:
      "【創立手搖飲新品牌】本人具多年餐飲營運與行銷背景，資金與港島區潛在店面資源已就位。徵求一位真正懂茶、能獨立研發配方與把控風味的夥伴，共同打造偏健康、質感路線的新一代奶茶品牌。\n\n標籤：f&b、business、中文",
    location_filter: "Hong Kong",
    must_haves:
      "須具手搖飲門市實務經驗，熟悉原料採購與 SOP · 對品質有堅持、有創業企圖心 · 人在香港，方便實體試茶與開會。",
  },
  {
    natural_language_input:
      "【尋找羽毛球教練】初學者（約半年球齡），想改善發力與步法，目標有朝一日能順利打業餘雙打賽事。偏好耐心、會拆解動作細節的教練；希望每週 1–2 堂。\n\n標籤：sports、coach、中文",
    location_filter: "Hong Kong",
    must_haves:
      "具教練資格或長期教學經驗 · 可在九龍或港島場地上課 · 態度輕鬆但規劃嚴謹；婉拒經常遲到或臨時爽約。",
  },
  {
    natural_language_input:
      "【貓咪用品 UGC 合作】新興寵物用品品牌將推出智慧貓咪餵食器，徵求家中有貓、擅長高質感短影音（Reels／TikTok）的創作者，拍攝開箱與真實使用情境，協助品牌在社群起步。\n\n標籤：creator、marketing、中文",
    location_filter: "Hong Kong",
    must_haves:
      "需提供短影音作品集 · 家中有貓且貓咪可適應新品測試 · 熟悉短片節奏與剪輯 · 報酬與合作細節可另議。",
  },
  {
    natural_language_input:
      "【尋找自動化顧問】團隊日常有不少重複的行政與資料處理流程，想找熟悉 Zapier、Make（Integromat）或 Python 自動化／爬蟲的專家，以外包或顧問方式承接幾個小型專案，逐步拉高營運效率。\n\n標籤：automation、freelance、中文",
    location_filter: "Global / Remote",
    must_haves:
      "有實際 API 串接與自動化工作流成功案例 · 溝通清楚，能快速理解業務流程與痛點 · 可按專案計價或時薪另行商議。",
  },
  {
    natural_language_input:
      "【尋找可靠裝修師傅／統籌】近日購入九龍區約 400 呎二手居屋，預備全屋翻新；重視水電與隱蔽工程品質，風格偏好日式木質簡約。想找手工細緻、報價透明、說明清楚的對象長期配合。\n\n標籤：renovation、services、中文",
    location_filter: "Hong Kong",
    must_haves:
      "可出示完工實景或安排參觀 · 報價條列清楚，不加隱藏費用 · 願意耐心解釋工序與物料 · 工期掌控穩定，少臨時拖延。",
  },
];
