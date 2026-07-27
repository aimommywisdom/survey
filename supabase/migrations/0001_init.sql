-- MWForm 初始 schema + RLS
-- 對應規格書 §4（資料模型）與 §13（題庫索引 / 基準值）
-- 執行方式：貼到新 Supabase 專案的 SQL Editor 一次跑完
-- 注意：本檔只操作 MWForm 自己的表，不下任何全域指令，不動別站。

-- ─────────────────────────────────────────────
-- 顧問專案（一個客戶一個 project）
-- ─────────────────────────────────────────────
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,          -- 'lsy'
  name           text not null,                 -- '蓮心園基金會'
  contact_name   text,
  retention_days int  not null default 365,     -- 個資保存期限
  brand_domain   text not null default 'survey.vega-lin.com', -- §15 多品牌，先留欄位
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 問卷（一個 project 可有多份：主管版／同仁版）
-- definition 存「完全展開後」的快照（§13 快照關鍵）
-- source_refs 記錄引用了哪些 block 的哪個版本，供追溯
-- ─────────────────────────────────────────────
create table if not exists surveys (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  slug         text not null,                   -- 'staff' | 'manager'
  title        text not null,
  version      int  not null default 1,
  definition   jsonb not null,                  -- 完整展開後的題目定義
  source_refs  jsonb,                           -- { blocks: [{code,version}], template?: {...} }
  is_open      boolean not null default true,
  opens_at     timestamptz,
  closes_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (project_id, slug, version)
);

-- ─────────────────────────────────────────────
-- 作答（刻意不存 IP、user agent、姓名）
-- ─────────────────────────────────────────────
create table if not exists responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references surveys(id) on delete cascade,
  answers      jsonb not null,                  -- { "q_dept": "home_care", ... }
  is_proxy     boolean not null default false,  -- 紙本代填
  proxy_note   text,
  duration_sec int,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_responses_survey on responses(survey_id);

-- ─────────────────────────────────────────────
-- 衍生表：痛點（送出時投影寫入，供跨份聚合）
-- annual_hours 由 DB 依 frequency 倍率自動算（§7）
-- ─────────────────────────────────────────────
create table if not exists pain_points (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references responses(id) on delete cascade,
  survey_id    uuid not null references surveys(id) on delete cascade,
  item_code    text not null,                   -- 'record_writing'
  item_label   text not null,
  is_custom    boolean not null default false,
  frequency    text not null,                   -- daily|weekly|biweekly|monthly|quarterly|yearly
  minutes      int  not null,
  format       text,                            -- paper|excel|word|system|line|verbal
  needs_sign   boolean,
  deliver_to   text,
  annual_hours numeric generated always as (
                 minutes * case frequency
                   when 'daily'     then 250
                   when 'weekly'    then 52
                   when 'biweekly'  then 26
                   when 'monthly'   then 12
                   when 'quarterly' then 4
                   else 1 end / 60.0
               ) stored,
  dept         text,                            -- 冗餘複製，加速聚合
  role_group   text
);
create index if not exists idx_pain_survey on pain_points(survey_id);
create index if not exists idx_pain_item   on pain_points(item_code);

-- ─────────────────────────────────────────────
-- 衍生表：數位能力分數（§7 計分）
-- ─────────────────────────────────────────────
create table if not exists skill_scores (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references responses(id) on delete cascade,
  survey_id    uuid not null references surveys(id) on delete cascade,
  l1_basic     int  not null default 0,   -- 基本操作
  l2_cloud     int  not null default 0,   -- 檔案與雲端
  l3_data      int  not null default 0,   -- 資料處理
  l4_ai        int  not null default 0,   -- AI 工具
  total        int  not null default 0,
  tier         text,                      -- entry | basic | advanced
  dept         text,
  role_group   text
);
create index if not exists idx_skill_survey on skill_scores(survey_id);

-- ─────────────────────────────────────────────
-- API 金鑰（僅存 hash，支援撤銷）
-- ─────────────────────────────────────────────
create table if not exists api_keys (
  id         uuid primary key default gen_random_uuid(),
  key_hash   text not null,             -- SHA-256(key)
  label      text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ─────────────────────────────────────────────
-- 題庫索引（由 /surveys 檔案 build 時產生，DB 僅供查詢）§13
-- ─────────────────────────────────────────────
create table if not exists bank_blocks (
  code           text primary key,        -- 'digital-skill-baseline'
  title          text not null,
  version        int  not null,
  purpose        text[],
  industry       text[],
  audience       text[],
  ttqs_stage     text,                     -- P|D1|D2|R|O
  kirkpatrick    text,                     -- L1|L2|L3|L4|null
  question_count int,
  item_codes     text[],
  notes          text,
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 跨案基準值（去識別化聚合）§13
-- ─────────────────────────────────────────────
create table if not exists benchmarks (
  item_code   text not null,
  industry    text not null,
  audience    text not null,
  metric      text not null,             -- 'annual_hours_p50' 等
  value       numeric not null,
  sample_size int not null,
  computed_at timestamptz not null default now(),
  primary key (item_code, industry, audience, metric)
);

-- ═════════════════════════════════════════════
-- RLS（§4：必做，不可省）
-- 原則：anon 只能新增作答、只能讀題目；其餘一律走 service_role。
-- ═════════════════════════════════════════════
alter table projects     enable row level security;
alter table surveys      enable row level security;
alter table responses    enable row level security;
alter table pain_points  enable row level security;
alter table skill_scores enable row level security;
alter table api_keys     enable row level security;
alter table bank_blocks  enable row level security;
alter table benchmarks   enable row level security;

-- responses：anon 只能 INSERT，不能 SELECT
drop policy if exists anon_insert_responses on responses;
create policy anon_insert_responses on responses
  for insert to anon with check (true);

-- surveys：anon 可讀（前台要拿題目），但只讀「開放中」的
drop policy if exists anon_read_open_surveys on surveys;
create policy anon_read_open_surveys on surveys
  for select to anon using (is_open = true);

-- projects：anon 可讀（前台頁面要顯示機構名稱等公開欄位）
drop policy if exists anon_read_projects on projects;
create policy anon_read_projects on projects
  for select to anon using (true);

-- 其餘表格（pain_points / skill_scores / api_keys / bank_blocks / benchmarks）
-- 不建立任何 anon policy => RLS 開啟後 anon 一律禁止讀寫，全部只能經 service_role。
