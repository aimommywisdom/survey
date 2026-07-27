// 產生一把分析 API 金鑰：只把 SHA-256 hash 存進 DB，明文只印一次（§6/§8）。
// 用法：npm run api-key -- "蓮心園報告用"
import { randomBytes, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

(process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile('.env.local');

async function main() {
  const label = process.argv.slice(2).join(' ') || '未命名';
  const key = 'mwf_' + randomBytes(24).toString('base64url'); // 明文金鑰
  const key_hash = createHash('sha256').update(key).digest('hex');

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await db.from('api_keys').insert({ key_hash, label });
  if (error) {
    console.error('✗ 建立失敗：', error.message);
    process.exit(1);
  }

  console.log('\n✓ 已建立 API 金鑰：', label);
  console.log('  只會顯示這一次，請立刻收好：\n');
  console.log('   ' + key + '\n');
  console.log('  用法：Authorization: Bearer ' + key);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
