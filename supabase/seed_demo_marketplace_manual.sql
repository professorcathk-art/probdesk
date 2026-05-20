-- AUTO-GENERATED from lib/demo-showcase-intents.ts — do not hand-edit listings here.
-- Regenerate: npm run gen:demo-marketplace-sql
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
    ($demo_nl_0$We're building an AI SaaS wedge for legal teams — workflows that shave hours off research, drafting, and client updates. Pilot firms are live, MVP is credible, and the story for mid‑size firms is sharpening. I'd love an easy virtual coffee with angels or operators who understand regulated B2B SaaS: not hustling for a term sheet tomorrow, just blunt feedback on narrative, roadmap, and what credible diligence looks like downstream.$demo_nl_0$, 'Global / Remote'::text, $demo_nl_0_mh$Experience investing in, advising, or operating AI / B2B SaaS (legaltech is a plus); comfortable with ~30‑minute exploratory video calls; prefers concrete pointers and introductions over cheerleading; English is fine.$demo_nl_0_mh$),
    ($demo_nl_1$【尋找技術共同創辦人｜AI 應用】我在產品端約五年，正把「AI 應用工具的商業構想」收成可賣得的產品：已有早期客戶嘗試與對價紀錄，缺的是工程和我想像中一樣偏執、能扛起主幹的人。我特別需要你對 LLM 應用層（RAG、工具鏈、評估與品質）有感，對可維護上線的工程有堅持，而不是堆砌 demo。若你接受創辦節奏、願意在優先級上和我正面碰撞，很值得從一場視訊深聊開始。$demo_nl_1$, 'Global / Remote'::text, $demo_nl_1_mh$能以全端或後端身分推進，熟 API 設計與整合 · 可全職，或至少每週 20 小時固定產出 · 接受遠距，但對里程碑與口頭約定要能守紀律 · 願公開討論股權、投入與補貼，避免只靠默契。$demo_nl_1_mh$),
    ($demo_nl_2$【手搖飲新品牌｜徵求品味與執行並重的合夥人】我長年做餐飲營運與行銷，手上已有可作首店投入的資金，港島也有一兩個可談的舖位眉目。接下來想找的是真正能「定下茶譜」的人：對清爽路線與質感表現有標準，能扛研發線、成本控制與 SOP，並願意一起把第一家店做到值得被街拍。你若相信質感來自無數小細節，我會認真對待每一次試茶與對帳會議。$demo_nl_2$, 'Hong Kong'::text, $demo_nl_2_mh$手搖飲或精品茶後場／店長級實務；懂採購、報價與衛生管理 · 人常駐香港，方便備料試作與看場 · 願將分工與時間表落成文字，對股東間的紀錄保持透明 · 對「首店標準」有潔癖者不會吃虧。$demo_nl_2_mh$),
    ($demo_nl_3$【尋找羽毛球教練】球齡半年左右，心肺在進步，但對發力順序跟腳步總是很疑惑，常常「覺得有出力卻控球不穩」。想找願意把動作拆細、可搭配錄影回放說明的教練。目標是每週一到兩堂，半年內能更有餘裕地打一場輕鬆的業餘雙打或小賽，我會把功課當運動紀律在做。$demo_nl_3$, 'Hong Kong'::text, $demo_nl_3_mh$具教練證或可驗證的長期指導紀錄 · 以九龍或港島館為主協調場地 · 能清楚說明「為何這樣發力」，不是只叫你用力 · 對遲到與頻繁改期低容忍；態度仍可輕鬆，但對課堂結構認真。$demo_nl_3_mh$),
    ($demo_nl_4$【寵物品牌｜徵 UGC／短影音創作者合作】新品是一支智慧貓咪餵食器，正在找家裡有貓、也懂短影音節奏（Reels／TikTok）的創作者：真實開箱、幾個生活化場景、以及為什麼日常會省下心的瞬間——口吻自然，不要電視購物式硬廣。品牌方可配合拍攝週程與合約細節，酬勞與素材授權能先寫清楚，避免創作過程卡住。如果你對貓的毛髮質感跟光影同樣龜毛，請帶作品集私訊。$demo_nl_4$, 'Hong Kong'::text, $demo_nl_4_mh$附短影音作品連結／檔（若為非公開可加浮水印） · 家中有貓，貓咪可配合短暫布景與機器運轉錄影 · 能自理剪輯與字幕，收音至少清晰 · 願事前用文件對齊交付清單、稿酬／分潤與肖像授權。$demo_nl_4_mh$),
    ($demo_nl_5$【尋找自動化／流程顧問（微型專案）】團隊被跨表抄寫、表單匯總和通知延遲磨到沒耐性，需要熟悉 Zapier、Make（Integromat）或 Python 自動化／爬蟲的顧問，用幾個「一次建好、接下來會自己跑」的流程幫忙解痛。你不用坐班，但需要願意在前期把工作流的商業規則問透；我對專業報價有尊重，可先從試點估時估價，再決定規模化。$demo_nl_5$, 'Global / Remote'::text, $demo_nl_5_mh$能展示可查證案例（Webhook、OAuth、排程或多系統對接皆可） · 願先做短工作坊式訪談，並把試點與後續擴充分開報價 · 中文為主／中英夾雜都行，但需要回覆可追溯 · 交付附簡短操作說明，方便我們內部接手。$demo_nl_5_mh$),
    ($demo_nl_6$【居屋全屋翻新｜徵細膩統籌或師傅班底】新近買進九龍一個約 400 呎二手居屋，自住用途準備全屋翻新。我最在意的是水電、防水這些「蓋回去就看不到」的工序；視覺上偏好日式木質簡約，但比起造型更在意收口、門片縫隙與收納動線順不順手。你若願意帶我看工地或完工案、報價能列清楚工項／物料級距而不是模糊套餐，那我們從丈量與作息訪談開始就很好。$demo_nl_6$, 'Hong Kong'::text, $demo_nl_6_mh$能給過往案子照片或協調看實際工地 · 正式報價需條列工項／品牌／級距，避免靠口頭追加 · 對水電規劃要能講出為何這樣做，而不是含糊帶過 · 工期願落成文字，對重大延期需提前協商；經常拖延工期的班底請跳過。$demo_nl_6_mh$)
  ) as v(natural_language_input, location_filter, must_haves);
end $$;
