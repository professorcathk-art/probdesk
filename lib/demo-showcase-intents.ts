/**
 * Explore marketplace demo seed — exactly seven public listings (`npm run seed:demo-marketplace`).
 * `natural_language_input` = authoring `content` + tag line · `must_haves` = authoring `expectations`.
 */
export type ShowcaseIntentSeed = {
  natural_language_input: string;
  location_filter: string | null;
  /** Expectations on Explore (`intent_requests.must_haves`). */
  must_haves?: string | null;
};

/** Seven scripted Explore cards — text aligned to your authoring JSON (content / expectations / location / tags). */
export const DEMO_SHOWCASE_INTENTS: ShowcaseIntentSeed[] = [
  {
    natural_language_input:
      "[AI SaaS] Building an AI-driven productivity tool for legal professionals. We have early traction and a working MVP. Looking for an angel investor who understands the B2B SaaS space for a casual virtual coffee to share our vision. Not looking for an immediate check, just building meaningful relationships and seeking feedback.\n\nTags: fundraising, AI, English",
    location_filter: "Global / Remote",
    must_haves:
      "Experience investing in or advising AI/SaaS startups. Willing to have a 30-min no-pressure chat. Brings strategic value and industry insights beyond just capital.",
  },
  {
    natural_language_input:
      "【尋找技術合夥人】我是一名有 5 年經驗的產品經理，目前正在籌備一個 AI 應用工具，已有清晰的商業模式與初期客戶名單。尋找一位對打造偉大產品有極致追求、技術功底深厚（尤其是 LLM 應用層）的技術共同創辦人（Technical Co-founder）。\n\n標籤：co-founder、tech、中文",
    location_filter: "Global / Remote",
    must_haves:
      "具備全端開發與 API 串接經驗；能全職投入或每週承諾至少 20 小時；心智堅韌，願意一起經歷創業的起伏；地點不限，接受遠端非同步協作。",
  },
  {
    natural_language_input:
      "【創立手搖飲新品牌】本人有豐富的餐飲營運與行銷經驗，手上有穩定的資金與潛在店面資源（港島區）。現正尋找一位真正懂茶、具備獨立研發飲品能力的合夥人，一起打造主打健康、質感的全新奶茶品牌。\n\n標籤：f&b、business、中文",
    location_filter: "Hong Kong",
    must_haves:
      "必須具備手搖飲店實務經驗，熟悉原料採購與 SOP 制定；對品質有堅持，有創業野心；人在香港，能實體開會討論與試茶。",
  },
  {
    natural_language_input:
      "【尋找羽毛球教練】本身是羽毛球初學者（約打過半年），希望找一位有耐心、能針對動作細節調整的教練。希望每週上一到兩堂課，目標是改善發力技巧跟步法，未來能順利參與業餘雙打比賽。\n\n標籤：sports、coach、中文",
    location_filter: "Hong Kong",
    must_haves:
      "具備相關教練資格或豐富教學經驗；能安排在九龍或港島區的體育館上課；上課氣氛輕鬆但要求嚴謹，不接受常遲到或臨時改期。",
  },
  {
    natural_language_input:
      "【貓咪用品 UGC 創作者合作】我們是一個新興的寵物用品品牌，即將推出一款智能貓咪餵食器。正在尋找家裡有養貓、擅長拍攝高質感短影音（Reels/TikTok）的 UGC 創作者，來幫我們拍攝產品開箱與實際使用情境。\n\n標籤：creator、marketing、中文",
    location_filter: "Hong Kong",
    must_haves:
      "需提供過往拍攝的短影音作品集；家中有貓且貓咪不排斥新設備；熟悉時下短影音節奏與剪輯技巧；酬勞與合作細節可私訊討論。",
  },
  {
    natural_language_input:
      "【尋找自動化專家】日常工作有許多重複性的行政與數據處理流程。想尋找一位熟悉 Zapier、Make (Integromat) 或是 Python 爬蟲的自動化專家，以外包或顧問形式協助處理幾個微型專案（Tiny projects），優化我們團隊的工作效率。\n\n標籤：automation、freelance、中文",
    location_filter: "Global / Remote",
    must_haves:
      "有實際串接 API 與建立自動化工作流的成功案例；溝通能力佳，能快速理解商業邏輯與痛點；按專案計件收費或時薪制皆可討論。",
  },
  {
    natural_language_input:
      "【尋找靠譜裝修師傅】近期購入位於九龍區約 400 呎的二手居屋，準備進行全屋翻新。希望尋找一位手工細膩、溝通透明的裝修統籌或師傅。重視水電等隱蔽工程的品質，風格偏向日式木質簡約風。\n\n標籤：renovation、services、中文",
    location_filter: "Hong Kong",
    must_haves:
      "能提供過往完工的實景照片或安排參觀；報價單條列清晰，不亂加隱藏收費；好溝通、願意耐心解釋施工細節；工期準確，不隨意拖延。",
  },
];