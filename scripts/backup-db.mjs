// 每日備份 + keep-alive：查詢 Supabase（保持活躍避免免費專案暫停）並把資料存成備份檔。
// 在 GitHub Actions 執行，env 由 repo secrets 提供。
import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const svc = createClient(url, key, { auth: { persistSession: false } });

const DIR = 'backups';
mkdirSync(DIR, { recursive: true });

const tables = ['projects', 'surveys', 'responses', 'pain_points', 'skill_scores', 'analyses'];
let totalResponses = 0;
for (const t of tables) {
  const { data, error } = await svc.from(t).select('*');
  if (error) {
    console.error(`✗ ${t}: ${error.message}`);
    process.exit(1);
  }
  writeFileSync(`${DIR}/${t}.json`, JSON.stringify(data, null, 2) + '\n');
  if (t === 'responses') totalResponses = data.length;
  console.log(`✓ ${t}: ${data.length} 筆`);
}

// 一個簡單的摘要檔，方便一眼看目前收了幾筆
writeFileSync(
  `${DIR}/_摘要.txt`,
  `最後備份時間（UTC）：${process.env.BACKUP_TIME ?? 'n/a'}\n作答總數：${totalResponses}\n`
);
console.log(`\n備份完成，作答總數 ${totalResponses}（同時已保持資料庫活躍）`);
