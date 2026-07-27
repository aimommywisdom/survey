// anon client — 前台填答用。
// 受 RLS 保護：只能 INSERT responses、只能讀 is_open 的 surveys（§4）。
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 開發期給明確錯誤，避免 undefined 靜默失敗
  throw new Error(
    '缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY（見 .env.local）'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
