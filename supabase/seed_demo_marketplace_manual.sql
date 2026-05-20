-- AUTO-GENERATED from lib/demo-showcase-intents.ts — do not hand-edit listings here.
-- Regenerate: npm run gen:demo-marketplace-sql
--
-- Replace YOUR_USER_UUID with an existing profiles.user_id (e.g. admin), then run in Supabase SQL Editor.
-- Requires is_demo_listing (migration 049) and must_haves (migration 054). Deletes prior demo intents for that user, then inserts 27 rows.
--
-- After wiping auth.users / all users:
-- 1) Authentication → Add user (email/password or magic link) for your admin.
-- 2) Confirm email if required; sign in once so public.users / profiles rows exist (trigger handle_new_auth_user),
--    or insert matching public.users + profiles manually if triggers did not run.
-- 3) Dashboard → SQL → select id from auth.users where email = 'your-admin@...'; copy UUID into demo_owner below.
-- 4) Embeddings are NULL — re-save intents in the app or run your embedding backfill for hybrid matching.

do $$
declare
  demo_owner uuid := 'YOUR_USER_UUID'::uuid;
begin
  delete from public.intent_requests
  where user_id = demo_owner
    and coalesce(is_demo_listing, false) = true;

  insert into public.intent_requests (
    user_id,
    natural_language_input,
    location_filter,
    must_haves,
    extracted_persona,
    status,
    is_marketplace_public,
    is_demo_listing,
    embedding
  )
  select
    demo_owner,
    v.natural_language_input,
    v.location_filter,
    v.must_haves,
    '{}'::jsonb,
    'active',
    true,
    true,
    null
  from (values
    ($demo_nl_0$香港｜想認真找一位價值觀相近的人生伴侶，彼此支持事業與生活節奏。希望先从深度聊天開始，互相了解後再見面。$demo_nl_0$, '香港'::text, null::text),
    ($demo_nl_1$台北｜希望在接下來一年穩定交往，偏好個性成熟、情緒穩定，喜歡爬山與美食探店。$demo_nl_1$, '台北'::text, null::text),
    ($demo_nl_2$Looking for a life partner in Singapore — thoughtful, kind, and curious about art & indie films. Prefer slow dating.$demo_nl_2$, 'Singapore'::text, null::text),
    ($demo_nl_3$上海｜想找一位願意一起規劃長期關係的對象，偏好周末一起做義工或短途旅行。$demo_nl_3$, '上海'::text, null::text),
    ($demo_nl_4$Seeking a mentor who has scaled B2B SaaS from 0→1 in North America. I'm a PM→founder doing outbound-heavy GTM.$demo_nl_4$, 'Remote / NA'::text, null::text),
    ($demo_nl_5$想找一位在金融科技／合规方面有經驗的導師，願意每月一次線上 Office Hour，我可協助研究與資料整理。$demo_nl_5$, '香港 / 遠端'::text, null::text),
    ($demo_nl_6$Bay Area — experienced eng leader wanted as mentor for infra & hiring playbooks; happy to compensate fairly.$demo_nl_6$, 'Bay Area'::text, null::text),
    ($demo_nl_7$博士在读，想找曾在 academia→industry 转型的前辈聊聊职业规划（机器学习方向）。$demo_nl_7$, '北京 / 線上'::text, null::text),
    ($demo_nl_8$Looking for a technical co-founder (full-stack leaning backend) for an AI compliance workflow MVP. HK-based preferred.$demo_nl_8$, 'Hong Kong'::text, null::text),
    ($demo_nl_9$深圳｜硬件＋軟件 IoT 原型已完成，想找一位懂供應鏈與众筹的共同創辦人，股权可談。$demo_nl_9$, '深圳'::text, null::text),
    ($demo_nl_10$EU timezone — designer-founder seeking ops/marketing cofounder for sustainable packaging D2C.$demo_nl_10$, 'EU remote'::text, null::text),
    ($demo_nl_11$我正在做跨境電商品牌（美妝），想找有 TikTok / Meta 投放經驗的共同創辦人，兼職起步亦可。$demo_nl_11$, '廣州'::text, null::text),
    ($demo_nl_12$Seed-stage climate tech (carbon accounting). Seeking angel / strategic investor with enterprise SaaS portfolio.$demo_nl_12$, 'London'::text, null::text),
    ($demo_nl_13$天使輪募資中：智慧健身房 SaaS，已有 12 間付費門店。希望投資人熟悉連鎖零售或健身產業。$demo_nl_13$, '台灣'::text, null::text),
    ($demo_nl_14$Looking for pre-seed investors in consumer health apps — traction: 8k MAU, retention week-4 at 22%.$demo_nl_14$, 'Remote'::text, null::text),
    ($demo_nl_15$杜拜｜家族办公室資源，尋找中东物流科技項目（Series A）共同投资机会介绍。$demo_nl_15$, 'Dubai'::text, null::text),
    ($demo_nl_16$Product designer (Figma systems) open to senior/lead roles or contract squads — prefers hybrid in Tokyo.$demo_nl_16$, '東京'::text, null::text),
    ($demo_nl_17$資深數據工程師，想找志同道合的朋友定期線下交流 Spark / Lakehouse 與成本優化實務（咖啡我請）。$demo_nl_17$, '杭州'::text, null::text),
    ($demo_nl_18$Photographer building a small studio — seeking collaborators for editorial & brand shoots in Seoul.$demo_nl_18$, 'Seoul'::text, null::text),
    ($demo_nl_19$想組一個「週末創業讀書會」，每月一次線下（吉隆坡），分享融资、团队与文化话题，欢迎认真参与者。$demo_nl_19$, 'Kuala Lumpur'::text, null::text),
    ($demo_nl_20$[AI SaaS] We're building an AI-driven productivity assistant for legal teams — early traction and a working MVP. Looking for an angel investor who understands B2B SaaS for a low-pressure virtual coffee: share our vision, trade feedback, and explore fit. Not asking for an immediate cheque — relationships and honest input first.

Tags: fundraising, AI, English$demo_nl_20$, 'Global / Remote'::text, $demo_nl_20_mh$Experience investing in or advising AI/SaaS startups · up for a 30-minute, no-obligation chat · brings strategic perspective and sector insight beyond capital alone.$demo_nl_20_mh$),
    ($demo_nl_21$【尋找技術合夥人】我有約 5 年產品經驗，正在規劃一款 AI 應用工具，商業模式與早期客戶名單已具雛形。希望找到對產品極致執著、技術底子紮實（尤其 LLM 應用層）的技術共同創辦人（Technical Co-founder），一起把事情做深做穩。

標籤：co-founder、tech、中文$demo_nl_21$, 'Global / Remote'::text, $demo_nl_21_mh$具全端開發與 API 整合經驗 · 可全職投入，或每週至少 20 小時承諾 · 心理韌性佳，願一起走創業的高低起伏 · 地點不限，接受遠端非同步協作。$demo_nl_21_mh$),
    ($demo_nl_22$【創立手搖飲新品牌】本人具多年餐飲營運與行銷背景，資金與港島區潛在店面資源已就位。徵求一位真正懂茶、能獨立研發配方與把控風味的夥伴，共同打造偏健康、質感路線的新一代奶茶品牌。

標籤：f&b、business、中文$demo_nl_22$, 'Hong Kong'::text, $demo_nl_22_mh$須具手搖飲門市實務經驗，熟悉原料採購與 SOP · 對品質有堅持、有創業企圖心 · 人在香港，方便實體試茶與開會。$demo_nl_22_mh$),
    ($demo_nl_23$【尋找羽毛球教練】初學者（約半年球齡），想改善發力與步法，目標有朝一日能順利打業餘雙打賽事。偏好耐心、會拆解動作細節的教練；希望每週 1–2 堂。

標籤：sports、coach、中文$demo_nl_23$, 'Hong Kong'::text, $demo_nl_23_mh$具教練資格或長期教學經驗 · 可在九龍或港島場地上課 · 態度輕鬆但規劃嚴謹；婉拒經常遲到或臨時爽約。$demo_nl_23_mh$),
    ($demo_nl_24$【貓咪用品 UGC 合作】新興寵物用品品牌將推出智慧貓咪餵食器，徵求家中有貓、擅長高質感短影音（Reels／TikTok）的創作者，拍攝開箱與真實使用情境，協助品牌在社群起步。

標籤：creator、marketing、中文$demo_nl_24$, 'Hong Kong'::text, $demo_nl_24_mh$需提供短影音作品集 · 家中有貓且貓咪可適應新品測試 · 熟悉短片節奏與剪輯 · 報酬與合作細節可另議。$demo_nl_24_mh$),
    ($demo_nl_25$【尋找自動化顧問】團隊日常有不少重複的行政與資料處理流程，想找熟悉 Zapier、Make（Integromat）或 Python 自動化／爬蟲的專家，以外包或顧問方式承接幾個小型專案，逐步拉高營運效率。

標籤：automation、freelance、中文$demo_nl_25$, 'Global / Remote'::text, $demo_nl_25_mh$有實際 API 串接與自動化工作流成功案例 · 溝通清楚，能快速理解業務流程與痛點 · 可按專案計價或時薪另行商議。$demo_nl_25_mh$),
    ($demo_nl_26$【尋找可靠裝修師傅／統籌】近日購入九龍區約 400 呎二手居屋，預備全屋翻新；重視水電與隱蔽工程品質，風格偏好日式木質簡約。想找手工細緻、報價透明、說明清楚的對象長期配合。

標籤：renovation、services、中文$demo_nl_26$, 'Hong Kong'::text, $demo_nl_26_mh$可出示完工實景或安排參觀 · 報價條列清楚，不加隱藏費用 · 願意耐心解釋工序與物料 · 工期掌控穩定，少臨時拖延。$demo_nl_26_mh$)
  ) as v(natural_language_input, location_filter, must_haves);
end $$;
