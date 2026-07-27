-- 個資保存期限自動刪除（§8）：依 projects.retention_days 清除逾期作答。
-- 提供一個函式，pg_cron 排程與 /api/cron/purge 端點都呼叫它。
-- responses 刪除會 cascade 掉 pain_points / skill_scores。

create or replace function purge_expired_responses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with doomed as (
    delete from responses r
    using surveys s, projects p
    where r.survey_id = s.id
      and s.project_id = p.id
      and r.submitted_at < now() - make_interval(days => p.retention_days)
    returning r.id
  )
  select count(*) into deleted_count from doomed;
  return deleted_count;
end;
$$;

-- 只有後端角色可執行（anon 不得呼叫）
revoke all on function purge_expired_responses() from public, anon;
grant execute on function purge_expired_responses() to service_role;

-- ── 每日排程（需先啟用 pg_cron 擴充）──────────────────
-- Supabase：Dashboard → Database → Extensions 啟用 pg_cron 後，執行下面這段：
--
--   select cron.schedule(
--     'mwform-purge-expired',
--     '0 3 * * *',                       -- 每天 03:00
--     $$ select purge_expired_responses(); $$
--   );
--
-- 若要停用：select cron.unschedule('mwform-purge-expired');
