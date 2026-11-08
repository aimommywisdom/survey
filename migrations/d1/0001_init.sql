-- ============================================
-- MWForm schema（Cloudflare D1 / SQLite 版）
-- 由 supabase/migrations/0001~0004 轉換：
--   uuid → text、boolean → integer(0/1)、jsonb → text(JSON 字串)、
--   text[] → text(JSON 陣列字串)、timestamptz → text(ISO 8601 UTC)、numeric → real
-- 布林／JSON 欄位的轉換在 lib/db.ts（相容層）處理，程式端看到的仍是 boolean / 物件。
-- RLS / GRANT 不適用：D1 只有 Worker 能存取，前台一律經 API route（原本就都走 service_role）。
-- purge_expired_responses() 改在 lib/db.ts 的 rpc() 實作。
--
-- 套用：
--   本機  npx wrangler d1 migrations apply mwform --local
--   遠端  npx wrangler d1 migrations apply mwform --remote
-- ============================================

-- 顧問專案（一個客戶一個 project）
CREATE TABLE IF NOT EXISTS projects (
  id             text PRIMARY KEY,
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  contact_name   text,
  retention_days integer NOT NULL DEFAULT 365,
  brand_domain   text NOT NULL DEFAULT 'survey.aimommywisdom.com',
  created_at     text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 問卷（definition 存完全展開後的快照）
CREATE TABLE IF NOT EXISTS surveys (
  id           text PRIMARY KEY,
  project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  title        text NOT NULL,
  version      integer NOT NULL DEFAULT 1,
  definition   text NOT NULL,                 -- JSON
  source_refs  text,                          -- JSON
  is_open      integer NOT NULL DEFAULT 1,
  opens_at     text,
  closes_at    text,
  created_at   text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, slug, version)
);

-- 作答（刻意不存 IP、user agent、姓名）
CREATE TABLE IF NOT EXISTS responses (
  id           text PRIMARY KEY,
  survey_id    text NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  answers      text NOT NULL,                 -- JSON
  is_proxy     integer NOT NULL DEFAULT 0,
  proxy_note   text,
  duration_sec integer,
  submitted_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);

-- 衍生表：痛點（annual_hours 仍由 DB 依 frequency 倍率算，SQLite 的 generated column）
CREATE TABLE IF NOT EXISTS pain_points (
  id           text PRIMARY KEY,
  response_id  text NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  survey_id    text NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  item_code    text NOT NULL,
  item_label   text NOT NULL,
  is_custom    integer NOT NULL DEFAULT 0,
  frequency    text NOT NULL,
  minutes      integer NOT NULL,
  format       text,
  needs_sign   integer,
  deliver_to   text,
  annual_hours real GENERATED ALWAYS AS (
                 minutes * CASE frequency
                   WHEN 'daily'     THEN 250
                   WHEN 'weekly'    THEN 52
                   WHEN 'biweekly'  THEN 26
                   WHEN 'monthly'   THEN 12
                   WHEN 'quarterly' THEN 4
                   ELSE 1 END / 60.0
               ) STORED,
  dept         text,
  role_group   text
);
CREATE INDEX IF NOT EXISTS idx_pain_survey ON pain_points(survey_id);
CREATE INDEX IF NOT EXISTS idx_pain_item   ON pain_points(item_code);

-- 衍生表：數位能力分數
CREATE TABLE IF NOT EXISTS skill_scores (
  id           text PRIMARY KEY,
  response_id  text NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  survey_id    text NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  l1_basic     integer NOT NULL DEFAULT 0,
  l2_cloud     integer NOT NULL DEFAULT 0,
  l3_data      integer NOT NULL DEFAULT 0,
  l4_ai        integer NOT NULL DEFAULT 0,
  total        integer NOT NULL DEFAULT 0,
  tier         text,
  dept         text,
  role_group   text
);
CREATE INDEX IF NOT EXISTS idx_skill_survey ON skill_scores(survey_id);

-- API 金鑰（僅存 hash）
CREATE TABLE IF NOT EXISTS api_keys (
  id         text PRIMARY KEY,
  key_hash   text NOT NULL,
  label      text,
  created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at text
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- 題庫索引（seed 時由 /surveys 檔案產生）
CREATE TABLE IF NOT EXISTS bank_blocks (
  code           text PRIMARY KEY,
  title          text NOT NULL,
  version        integer NOT NULL,
  purpose        text,                        -- JSON 陣列
  industry       text,                        -- JSON 陣列
  audience       text,                        -- JSON 陣列
  ttqs_stage     text,
  kirkpatrick    text,
  question_count integer,
  item_codes     text,                        -- JSON 陣列
  notes          text,
  updated_at     text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 跨案基準值
CREATE TABLE IF NOT EXISTS benchmarks (
  item_code   text NOT NULL,
  industry    text NOT NULL,
  audience    text NOT NULL,
  metric      text NOT NULL,
  value       real NOT NULL,
  sample_size integer NOT NULL,
  computed_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (item_code, industry, audience, metric)
);

-- LLM 設定（單列；api_key 以 AES-GCM 加密後存 base64）
CREATE TABLE IF NOT EXISTS llm_settings (
  id           integer PRIMARY KEY CHECK (id = 1),
  provider     text NOT NULL DEFAULT 'anthropic',
  model        text,
  api_key_enc  text,
  api_key_iv   text,
  updated_at   text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 課程規劃產出（保留歷史）
CREATE TABLE IF NOT EXISTS analyses (
  id           text PRIMARY KEY,
  project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  survey_id    text REFERENCES surveys(id) ON DELETE CASCADE,
  provider     text,
  model        text,
  tna_snapshot text,                          -- JSON
  content      text NOT NULL,
  created_at   text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_analyses_project ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_survey  ON analyses(survey_id);
