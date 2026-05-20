-- AUTO-GENERATED from lib/demo-showcase-intents.ts — do not hand-edit listing rows here.
-- Regenerate: npm run gen:demo-marketplace-sql
--
-- 若你看到「約 120 行、$demo0$」交友草稿，那是舊緩存；請在編輯器「從磁碟重新載入」此檔。正確約 65 行，且含「羽毛球教練」「裝修師傅」。
--
-- Replace YOUR_USER_UUID with an existing profiles.user_id (e.g. admin), then run in Supabase SQL Editor.
-- Requires is_demo_listing (migration 049) and must_haves (migration 054). Deletes prior demo intents for that user, then inserts 7 rows.
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
    ($demo_nl_0$[AI SaaS] Building an AI-driven productivity tool for legal professionals. We have early traction and a working MVP. Looking for an angel investor who understands the B2B SaaS space for a casual virtual coffee to share our vision. Not looking for an immediate check, just building meaningful relationships and seeking feedback.

Tags: fundraising, AI, English$demo_nl_0$, 'Global / Remote'::text, $demo_nl_0_mh$Experience investing in or advising AI/SaaS startups. Willing to have a 30-min no-pressure chat. Brings strategic value and industry insights beyond just capital.$demo_nl_0_mh$),
    ($demo_nl_1$【尋找技術合夥人】我是一名有 5 年經驗的產品經理，目前正在籌備一個 AI 應用工具，已有清晰的商業模式與初期客戶名單。尋找一位對打造偉大產品有極致追求、技術功底深厚（尤其是 LLM 應用層）的技術共同創辦人（Technical Co-founder）。

標籤：co-founder、tech、中文$demo_nl_1$, 'Global / Remote'::text, $demo_nl_1_mh$具備全端開發與 API 串接經驗；能全職投入或每週承諾至少 20 小時；心智堅韌，願意一起經歷創業的起伏；地點不限，接受遠端非同步協作。$demo_nl_1_mh$),
    ($demo_nl_2$【創立手搖飲新品牌】本人有豐富的餐飲營運與行銷經驗，手上有穩定的資金與潛在店面資源（港島區）。現正尋找一位真正懂茶、具備獨立研發飲品能力的合夥人，一起打造主打健康、質感的全新奶茶品牌。

標籤：f&b、business、中文$demo_nl_2$, 'Hong Kong'::text, $demo_nl_2_mh$必須具備手搖飲店實務經驗，熟悉原料採購與 SOP 制定；對品質有堅持，有創業野心；人在香港，能實體開會討論與試茶。$demo_nl_2_mh$),
    ($demo_nl_3$【尋找羽毛球教練】本身是羽毛球初學者（約打過半年），希望找一位有耐心、能針對動作細節調整的教練。希望每週上一到兩堂課，目標是改善發力技巧跟步法，未來能順利參與業餘雙打比賽。

標籤：sports、coach、中文$demo_nl_3$, 'Hong Kong'::text, $demo_nl_3_mh$具備相關教練資格或豐富教學經驗；能安排在九龍或港島區的體育館上課；上課氣氛輕鬆但要求嚴謹，不接受常遲到或臨時改期。$demo_nl_3_mh$),
    ($demo_nl_4$【貓咪用品 UGC 創作者合作】我們是一個新興的寵物用品品牌，即將推出一款智能貓咪餵食器。正在尋找家裡有養貓、擅長拍攝高質感短影音（Reels/TikTok）的 UGC 創作者，來幫我們拍攝產品開箱與實際使用情境。

標籤：creator、marketing、中文$demo_nl_4$, 'Hong Kong'::text, $demo_nl_4_mh$需提供過往拍攝的短影音作品集；家中有貓且貓咪不排斥新設備；熟悉時下短影音節奏與剪輯技巧；酬勞與合作細節可私訊討論。$demo_nl_4_mh$),
    ($demo_nl_5$【尋找自動化專家】日常工作有許多重複性的行政與數據處理流程。想尋找一位熟悉 Zapier、Make (Integromat) 或是 Python 爬蟲的自動化專家，以外包或顧問形式協助處理幾個微型專案（Tiny projects），優化我們團隊的工作效率。

標籤：automation、freelance、中文$demo_nl_5$, 'Global / Remote'::text, $demo_nl_5_mh$有實際串接 API 與建立自動化工作流的成功案例；溝通能力佳，能快速理解商業邏輯與痛點；按專案計件收費或時薪制皆可討論。$demo_nl_5_mh$),
    ($demo_nl_6$【尋找靠譜裝修師傅】近期購入位於九龍區約 400 呎的二手居屋，準備進行全屋翻新。希望尋找一位手工細膩、溝通透明的裝修統籌或師傅。重視水電等隱蔽工程的品質，風格偏向日式木質簡約風。

標籤：renovation、services、中文$demo_nl_6$, 'Hong Kong'::text, $demo_nl_6_mh$能提供過往完工的實景照片或安排參觀；報價單條列清晰，不亂加隱藏收費；好溝通、願意耐心解釋施工細節；工期準確，不隨意拖延。$demo_nl_6_mh$)
  ) as v(natural_language_input, location_filter, must_haves);
end $$;
