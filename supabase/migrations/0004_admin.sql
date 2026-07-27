-- Phase 2 後台：LLM 設定 + 分析結果。皆為後台資料，anon 完全禁止（只走 service_role）。

-- LLM 設定（單列）：api_key 以 AES-GCM 加密後存 base64，明文永不落地。
create table if not exists llm_settings (
  id           int primary key default 1,
  provider     text not null default 'anthropic',   -- 'openai' | 'anthropic'
  model        text,
  api_key_enc  text,                                 -- base64(ciphertext)
  api_key_iv   text,                                 -- base64(iv)
  updated_at   timestamptz not null default now(),
  constraint llm_settings_singleton check (id = 1)
);

-- 產出的課程規劃（保留歷史，可重看）
create table if not exists analyses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  provider     text,
  model        text,
  tna_snapshot jsonb,                -- 當下餵給 LLM 的數據，供追溯
  content      text not null,        -- LLM 產出的課程規劃
  created_at   timestamptz not null default now()
);
create index if not exists idx_analyses_project on analyses(project_id);

alter table llm_settings enable row level security;
alter table analyses     enable row level security;
-- 不建任何 anon policy => 只有 service_role 可讀寫。

grant all privileges on table llm_settings to service_role;
grant all privileges on table analyses     to service_role;
