/**
 * Explore marketplace demo seed (`npm run seed:demo-marketplace`).
 * Listing body + optional tag footer · expectations (`must_haves`).
 */
export type ShowcaseIntentSeed = {
  natural_language_input: string;
  location_filter: string | null;
  /** Expectations on Explore (`intent_requests.must_haves`). */
  must_haves?: string | null;
};

/** Scripted Explore demos: warm 1-to-1 chats, weekend groups, plus a few longer listings. */
export const DEMO_SHOWCASE_INTENTS: ShowcaseIntentSeed[] = [
  {
    natural_language_input:
      "【創業尋找合夥人】AI 產品想找 Tech/Full-Stack Co-founder 咖啡交流 ☕️\n\n目前已有清晰商業模式與初期用戶，正在打造下一代 AI 應用。希望能找到對 LLM 應用有熱情、具備技術底子的夥伴一起打造大產品！地點在香港或線上均可。\n\n#創業 #AI #TechCo-founder #HongKong",
    location_filter: "香港 / 線上",
    must_haves:
      "post_type:one_to_one\n對 LLM 應用有熱情，有全端或後端底子。可以先約一杯咖啡，香港或線上都可以。",
  },
  {
    natural_language_input:
      "【職涯請益】倫敦 FinTech 產業經驗分享 & Coffee Chat 🇬🇧\n\n目前在倫敦外商擔任 Product Manager，歡迎準備轉職 FinTech、剛到倫敦生活或對英國職場感興趣的朋友一起聊聊交流！\n\n#FinTech #倫敦 #ProductManager #Career",
    location_filter: "倫敦 / 線上",
    must_haves:
      "post_type:one_to_one\n準備認識 FinTech、倫敦生活或英國職場的朋友。輕鬆 coffee chat，沒有推銷。",
  },
  {
    natural_language_input:
      "【興趣配對】尋找週末羽毛球球友 🏸（初學者友善！）\n\n本身是羽毛球初學者，想找一位有耐心、能一起練球調整動作細節的球友。地點主要在港島或九龍體育館。\n\n#羽毛球 #運動Buddy #香港",
    location_filter: "港島或九龍",
    must_haves:
      "post_type:one_to_one\n初學者友善。希望對方有耐心，願意一起練球、慢慢調動作。週末為主。",
  },
  {
    natural_language_input:
      "【寵物產品】尋找 UGC 創作者協助測試貓狗自動餵食機 🐾\n\n品牌方小額合作！尋找家中養貓養狗、喜歡拍短影音分享的創作者合作產品開箱與實測，提供免費產品與車馬費。\n\n#寵物 #UGCCreator #行銷合作",
    location_filter: "香港",
    must_haves:
      "post_type:one_to_one\nprice_role:receive\nprice_amount:800\nprice_currency:HKD\n家裡有貓或狗，喜歡拍短影音。提供產品和車馬費，細節可以再聊。",
  },
  {
    natural_language_input:
      "【週末戶外】石澳龍脊輕鬆健行與海景咖啡 🌊\n\n告別一週工作壓力！週末一起去龍脊步道散步、呼吸新鮮空氣，全程新手友善，結束後可以在石澳海邊喝咖啡聊聊天。\n\n#健行 #戶外 #週末聚會 #香港",
    location_filter: "石澳 · 香港",
    must_haves:
      "post_type:group\nwhen:週末上午，約 3 小時\n新手友善，自備水和一雙好走的鞋。結束後在石澳海邊喝咖啡。",
  },
  {
    natural_language_input:
      "【獨立開發者小聚】Side Project & AI 工具交流夜 💡\n\n歡迎所有對獨立開發、Vibe Coding、AI 工具感興趣的朋友！大家可以帶自己的專案來展示、互相給 Feedback 與交流心得。\n\n#AI #獨立開發 #Networking",
    location_filter: "香港 / 線上",
    must_haves:
      "post_type:group\nwhen:平日晚上\n歡迎帶自己的 side project。沒有專案也可以來聽、來認識人。",
  },
  {
    natural_language_input:
      "【歡樂桌遊】週五晚放鬆派對 🎲 內向者友善！\n\n精選熱門派對與策略桌遊，現場提供零食與飲料。即使一個人來也能快速融入，一起開心地玩遊戲交朋友！\n\n#桌遊 #派對 #週末聚會",
    location_filter: "香港",
    must_haves:
      "post_type:group\nwhen:週五晚上\nprice_role:pay\nprice_amount:80\nprice_currency:HKD\n一個人來也沒問題。零食和飲料現場提供。",
  },
  {
    natural_language_input:
      "【香港｜認真交往】我 32 歲，在金融機構做風控分析，平時喜歡爬山、咖啡館看書，也希望對方願意一起規劃週末與長假。想找一位價值觀接近、願意深度溝通的伴侶——不一定要話很多，但要能好好聽彼此說、也把感受講清楚。希望感情節奏踏實一些：先從聊天與散步開始，彼此舒服再談下一步。\n\n標籤：dating、伴侶、香港",
    location_filter: "香港",
    must_haves:
      "須為單身且願意認真交往；最好長居香港或深港通勤可接受；希望你不抽菸、酒量適度；能接受每月至少一次深度約會（不只吃飯打卡）；若你也喜歡戶外或閱讀更佳。",
  },
  {
    natural_language_input:
      "Seeking a mentor who has scaled B2B SaaS from 0→1 in North America. I'm a PM turning founder; strongest in discovery research but learning outbound-heavy GTM. Would love structured monthly calls plus async feedback on deck + pricing. Happy to trade user research sprints or competitor teardowns.\n\nTags: mentorship, B2B SaaS, English",
    location_filter: "Remote / NA",
    must_haves:
      "Must have led revenue growth at an early-stage SaaS (<50 people); comfortable reviewing outbound sequences; prefers candid feedback over cheerleading; timezone overlap with US ET mornings at least twice a month.",
  },
  {
    natural_language_input:
      "天使輪募資中：智慧健身房 SaaS（會員、課表、教練分潤）。已接入 12 間付費門店，月均留存與續約數據可提供。希望投資人熟悉連鎖服務業或健身產業，能協助談區域代理與銀行授信。\n\n標籤：fundraising、健身 SaaS、中文",
    location_filter: "台灣",
    must_haves:
      "投資閾值與交割時程可公開討論；希望投資方能協助介紹連鎖決策者；接受合理的董事會資訊權；謝絕要求過早買回或不合理對賭。",
  },
  {
    natural_language_input:
      "Looking for pre-seed investors in consumer health journaling apps — emphasis on privacy-by-design and clinician-friendly exports. MAU 8k, week-4 retention 22%. Raising to deepen onboarding + community moderation tooling.\n\nTags: fundraising, digital health, English",
    location_filter: "Remote",
    must_haves:
      "Understand consumer subscription ethics; comfortable with HIPAA-aligned roadmap questions; intros to digital health operators valued; transparent data room.",
  },
];