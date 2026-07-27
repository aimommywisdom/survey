-- MWForm 表層授權（補 0001 之後）
-- Supabase 三個內建角色需要 table 層級 GRANT，RLS policy 才會真正生效；
-- 新專案有時不會自動補，故明列。只授權本專案 public schema 內 MWForm 的表。

grant usage on schema public to anon, authenticated, service_role;

-- service_role：後端全權（搭配其 BYPASSRLS，供 seed / 分析 API）
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- anon：只給 RLS 允許的操作所需的 table 權限
--   responses → 只能 INSERT（讀取被 RLS + 無 select 權限雙重擋住）
--   surveys / projects → 只能 SELECT
grant insert on responses to anon;
grant select on surveys   to anon;
grant select on projects  to anon;
