-- Replace demo_owner with an existing profiles.user_id (e.g. admin), then run in Supabase SQL Editor.
-- Requires is_demo_listing (migration 049) and must_haves column (migration 054).
-- Deletes prior demo intents for that user, then inserts sample Explore listings.

do $$
declare
  demo_owner uuid := '77fbc012-6cff-4b69-8187-fd1ede0e9a34'::uuid;
begin
  delete from public.intent_requests
  where user_id = demo_owner
    and coalesce(is_demo_listing, false) = true;

  insert into public.intent_requests (
    user_id,
    natural_language_input,
    must_haves,
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
    v.must_haves,
    v.location_filter,
    '{}'::jsonb,
    'active',
    true,
    true,
    null
  from (values
    (
      $demo0$【香港｜認真交往】我 32 歲，在金融機構做風控分析，平時喜歡爬山、咖啡館看書，也希望對方願意一起規劃週末與長假。想找一位價值觀接近、願意深度溝通的伴侶——不一定要話很多，但要能好好聽彼此說、也把感受講清楚。希望感情節奏踏實一些：先從聊天與散步開始，彼此舒服再談下一步。$demo0$,
      $mh0$須為單身且願意認真交往；最好長居香港或深港通勤可接受；希望你不抽菸、酒量適度；能接受每月至少一次深度約會（不只吃飯打卡）；若你也喜歡戶外或閱讀更佳。$mh0$,
      '香港'::text
    ),
    (
      $demo1$【台北｜穩定交往一年內】我在軟體新創負責產品策略，30 歲，個性偏沉穩但有幽默感。下班後喜歡慢跑、獨立書店、偶爾自己做晚餐。想找一位願意「慢慢認識彼此」的人——我可以接受忙碌的工作節奏，但希望雙方都把關係放在心上，遇到摩擦時願意坐下來談，而不是冷處理。$demo1$,
      $mh1$希望你也以長期關係為目標；台北生活為主；能接受每週固定見面；不喜歡玩消失或已讀不回超過兩天；若你有運動習慣或喜歡料理會很加分。$mh1$,
      '台北'::text
    ),
    (
      $demo2$Singapore — I''m 34, moved here for work (climate-tech consulting). Looking for a thoughtful partner who enjoys slow weekends: museums, long walks, cooking together. I value emotional maturity, curiosity, and clear communication. Happy to start with voice notes and casual coffee before planning bigger trips.$demo2$,
      $mh2$Living in Singapore or willing to meet centrally weekly; non-smoker; open to discussing boundaries and pace early on; prefers voice or video over endless texting; looking for something intentional, not situationship.$mh2$,
      'Singapore'::text
    ),
    (
      $demo3$【上海｜長期關係】設計總監，熱愛城市徒步與展覽，也在學咖啡拉花。過去幾段感情常敗在「節奏不一致」——這次希望找到願意同步成長的人：可以各自忙碌，但約定好的時間會守約；吵架時不人身攻擊；重大決定可以一起商量。$demo3$,
      $mh3$希望對方也在上海或蘇浙滬一小時圈；經濟與情緒相對獨立；願意認識 3–6 個月再見家長；不接受長期異地；謝絕同時多線曖昧。$mh3$,
      '上海'::text
    ),
    (
      $demo4$Seeking a mentor who has scaled B2B SaaS from 0→1 in North America. I''m a PM turning founder; strongest in discovery research but learning outbound-heavy GTM. Would love structured monthly calls plus async feedback on deck + pricing. Happy to trade user research sprints or competitor teardowns.$demo4$,
      $mh4$Must have led revenue growth at an early-stage SaaS (<50 people); comfortable reviewing outbound sequences; prefers candid feedback over cheerleading; timezone overlap with US ET mornings at least twice a month.$mh4$,
      'Remote / NA'::text
    ),
    (
      $demo5$【金融科技／合規導師】我在支付新創負責風控流程，希望找一位熟 AML／牌照申請或銀行合作談判的前輩。我可以每月整理問題清單、做好紀要與 follow-up，亦可協助資料分析或報告草稿。目標是 6 個月內把我們的合規手冊做到可審計程度。$demo5$,
      $mh5$曾任職持牌機構或協助過牌照申請；願意線上 Office Hour；能接受我先寄背景資料再談；謝絕只推課程不提供實務建議者。$mh5$,
      '香港 / 遠端'::text
    ),
    (
      $demo6$Bay Area — Staff engineer looking for a mentor on infra reliability + hiring playbooks for a 25-person team. I can share concrete metrics (MTTR, cost, incident themes) and run blameless postmortems for review. Ideal mentor has operated at scale but remembers early-stage constraints.$demo6$,
      $mh6$Experience owning on-call + SRE budgets; willing to review architecture diagrams; prefers direct critique; available for two deep dives per month; NDAs ok.$mh6$,
      'Bay Area'::text
    ),
    (
      $demo7$博士在读（机器学习应用），希望找一位走过 academia→industry 转型的学长姐，聊聊选题取舍、实习节奏与第一年 onboarding。我可以每周同步进展、整理笔记，也愿意帮忙跑文献或标注小型实验。倾向线上语音，亦可线下若同城。$demo7$,
      $mh7$已全职在工业界工作的学长姐为佳；熟悉 ML 落地與跨团队合作；每次 meeting 前我可以提交议题；希望回应具体而不是泛泛鼓励。$mh7$,
      '北京 / 線上'::text
    ),
    (
      $demo8$Looking for a technical co-founder (full-stack leaning backend) for an AI compliance workflow MVP — OCR + policy checks + human review queues. I handle product + regulated industries narrative; need someone who enjoys shipping boring-solid systems. HK-based preferred for occasional whiteboarding.$demo8$,
      $mh8$Shipped production APIs + Postgres + background jobs; comfortable with auth and audit logs; willing to work evenings HK time twice a week; equity conversation upfront; no agencies.$mh8$,
      'Hong Kong'::text
    ),
    (
      $demo9$【深圳｜IoT 硬件＋韌體】原型已完成（溫濕度監控＋低功耗），想找懂供應鏈與众筹的共同創辦人。我負責韌體與 App demo，你需要協助 BOM、工廠對接與出海銷售策略。希望性格務實、願意一起做財務模型與里程碑拆解。$demo9$,
      $mh9$有硬件量產或众筹經驗；能接受兼職起步 6 個月；對智能家居或能源管理有興趣；股份與投入時間需書面約定；謝絕只拿 idea 不落地者。$mh9$,
      '深圳'::text
    ),
    (
      $demo10$EU timezone — designer-founder building sustainable packaging D2C (samples ready). Seeking ops/marketing cofounder who likes spreadsheets + storytelling: cohort launches, lifecycle emails, fulfilment partners. I bring brand, packaging systems, and founder grit.$demo10$,
      $mh10$EU resident or CET±1h; proven growth experiment discipline; comfortable negotiating 3PL; wants equal founder grind; transparent cap table discussions early.$mh10$,
      'EU remote'::text
    ),
    (
      $demo11$【廣州｜跨境美妝品牌】已有小規模營收與固定供應鏈，想找熟悉 TikTok Shop／Meta 投放與創意測試的共同創辦人。我可以負責產品開發與客訴，希望你把獲客漏斗跑起來並建立每週复盘節奏。$demo11$,
      $mh11$實際操作過付費投放與素材迭代；願意先做兼職／項目制再談全職；對成分與合規廣告用語有基本概念；接受數據說話、拒絕只靠感覺加預算。$mh11$,
      '廣州'::text
    ),
    (
      $demo12$Seed-stage climate tech — carbon accounting workflows for mid-market manufacturers. Seeking angel / strategic investor with enterprise SaaS portfolio who can open diligence conversations. Traction: 6 pilot LOIs, £180k ARR path mapped.$demo12$,
      $mh12$Ticket £150–400k; adds enterprise intros in EU manufacturing; comfortable with hardware-adjacent SaaS; willing to join quarterly board prep; no predatory terms.$mh12$,
      'London'::text
    ),
    (
      $demo13$天使輪募資中：智慧健身房 SaaS（會員、課表、教練分潤）。已接入 12 間付費門店，月均留存與續約數據可提供。希望投資人熟悉連鎖服務業或健身產業，能協助談區域代理與銀行授信。$demo13$,
      $mh13$投資閾值與交割時程可公開討論；希望投資方能協助介紹連鎖決策者；接受合理的董事會資訊權；謝絕要求過早買回或不合理對賭。$mh13$,
      '台灣'::text
    ),
    (
      $demo14$Looking for pre-seed investors in consumer health journaling apps — emphasis on privacy-by-design and clinician-friendly exports. MAU 8k, week-4 retention 22%. Raising to deepen onboarding + community moderation tooling.$demo14$,
      $mh14$Understand consumer subscription ethics; comfortable with HIPAA-aligned roadmap questions; intros to digital health operators valued; transparent data room.$mh14$,
      'Remote'::text
    )
  ) as v(natural_language_input, must_haves, location_filter);
end $$;
