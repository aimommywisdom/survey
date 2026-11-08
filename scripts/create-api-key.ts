// 產生一把分析 API 金鑰：只把 SHA-256 hash 存進 DB，明文只印一次（§6/§8）。
// 用法：npm run api-key -- "蓮心園報告用"              # 寫入本機 D1
//       npm run api-key -- --remote "蓮心園報告用"     # 寫入正式 D1
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { execSql, sqlLit, targetLabel } from './d1';

async function main() {
  const label = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ') || '未命名';
  const key = 'mwf_' + randomBytes(24).toString('base64url'); // 明文金鑰
  const key_hash = createHash('sha256').update(key).digest('hex');

  execSql([
    `INSERT INTO api_keys (id, key_hash, label) VALUES (${[randomUUID(), key_hash, label].map(sqlLit).join(', ')});`,
  ]);

  console.log(`\n✓ 已建立 API 金鑰（${targetLabel()}）：`, label);
  console.log('  只會顯示這一次，請立刻收好：\n');
  console.log('   ' + key + '\n');
  console.log('  用法：Authorization: Bearer ' + key);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
