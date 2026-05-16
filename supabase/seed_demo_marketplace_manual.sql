-- Replace YOUR_USER_UUID with an existing profiles.user_id (e.g. admin), then run in Supabase SQL Editor.
-- Requires is_demo_listing (migration 049). Deletes prior demo intents for that user, then inserts 20 rows.

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
    '{}'::jsonb,
    'active',
    true,
    true,
    null
  from (values
    ($demo_nl_0$香港｜想認真找一位價值觀相近的人生伴侶，彼此支持事業與生活節奏。希望先从深度聊天開始，互相了解後再見面。$demo_nl_0$, '香港'::text),
    ($demo_nl_1$台北｜希望在接下來一年穩定交往，偏好個性成熟、情緒穩定，喜歡爬山與美食探店。$demo_nl_1$, '台北'::text),
    ($demo_nl_2$Looking for a life partner in Singapore — thoughtful, kind, and curious about art & indie films. Prefer slow dating.$demo_nl_2$, 'Singapore'::text),
    ($demo_nl_3$上海｜想找一位願意一起規劃長期關係的對象，偏好周末一起做義工或短途旅行。$demo_nl_3$, '上海'::text),
    ($demo_nl_4$Seeking a mentor who has scaled B2B SaaS from 0→1 in North America. I'm a PM→founder doing outbound-heavy GTM.$demo_nl_4$, 'Remote / NA'::text),
    ($demo_nl_5$想找一位在金融科技／合规方面有經驗的導師，願意每月一次線上 Office Hour，我可協助研究與資料整理。$demo_nl_5$, '香港 / 遠端'::text),
    ($demo_nl_6$Bay Area — experienced eng leader wanted as mentor for infra & hiring playbooks; happy to compensate fairly.$demo_nl_6$, 'Bay Area'::text),
    ($demo_nl_7$博士在读，想找曾在 academia→industry 转型的前辈聊聊职业规划（机器学习方向）。$demo_nl_7$, '北京 / 線上'::text),
    ($demo_nl_8$Looking for a technical co-founder (full-stack leaning backend) for an AI compliance workflow MVP. HK-based preferred.$demo_nl_8$, 'Hong Kong'::text),
    ($demo_nl_9$深圳｜硬件＋軟件 IoT 原型已完成，想找一位懂供應鏈與众筹的共同創辦人，股权可談。$demo_nl_9$, '深圳'::text),
    ($demo_nl_10$EU timezone — designer-founder seeking ops/marketing cofounder for sustainable packaging D2C.$demo_nl_10$, 'EU remote'::text),
    ($demo_nl_11$我正在做跨境電商品牌（美妝），想找有 TikTok / Meta 投放經驗的共同創辦人，兼職起步亦可。$demo_nl_11$, '廣州'::text),
    ($demo_nl_12$Seed-stage climate tech (carbon accounting). Seeking angel / strategic investor with enterprise SaaS portfolio.$demo_nl_12$, 'London'::text),
    ($demo_nl_13$天使輪募資中：智慧健身房 SaaS，已有 12 間付費門店。希望投資人熟悉連鎖零售或健身產業。$demo_nl_13$, '台灣'::text),
    ($demo_nl_14$Looking for pre-seed investors in consumer health apps — traction: 8k MAU, retention week-4 at 22%.$demo_nl_14$, 'Remote'::text),
    ($demo_nl_15$杜拜｜家族办公室資源，尋找中东物流科技項目（Series A）共同投资机会介绍。$demo_nl_15$, 'Dubai'::text),
    ($demo_nl_16$Product designer (Figma systems) open to senior/lead roles or contract squads — prefers hybrid in Tokyo.$demo_nl_16$, '東京'::text),
    ($demo_nl_17$資深數據工程師，想找志同道合的朋友定期線下交流 Spark / Lakehouse 與成本優化實務（咖啡我請）。$demo_nl_17$, '杭州'::text),
    ($demo_nl_18$Photographer building a small studio — seeking collaborators for editorial & brand shoots in Seoul.$demo_nl_18$, 'Seoul'::text),
    ($demo_nl_19$想組一個「週末創業讀書會」，每月一次線下（吉隆坡），分享融资、团队与文化话题，欢迎认真参与者。$demo_nl_19$, 'Kuala Lumpur'::text)
  ) as v(natural_language_input, location_filter);
end $$;
