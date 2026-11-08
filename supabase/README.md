# 舊 Supabase 資料層（歷史保留）

MWForm 2026-11 起資料層搬到 Cloudflare D1（schema 見 `migrations/d1/`，相容層見 `lib/db.ts`）。
這個資料夾的 `migrations/0001~0004` 是原 Supabase 專案 `fqvoz…` 的 Postgres schema，
留作對照；不再套用、不再維護。

- seed / api-key / seed-synthetic script 已移到 `scripts/`，改寫入 D1。
- 從 Supabase 搬資料：`scripts/migrate-from-supabase.mjs`（讀 `.env.local` 的 SUPABASE key）。
- `backups/` 內的 JSON 是切換前最後一次 Supabase 自動備份（2026-08-18），之後的備份改由
  `.github/workflows/backup.yml` 以 Artifact 保存。
