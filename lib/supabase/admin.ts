// 歷史名稱保留：原本這裡建 Supabase service-role client。
// 2026-11 資料層搬到 Cloudflare D1 後，改成回傳 lib/db.ts 的相容層物件，
// 介面與 supabase-js 相同（from().select().eq()… / rpc()），所以各 route 的查詢寫法不用改。
// 只能在後端使用（server component / API route），絕不可 import 進 client component。
import 'server-only';
import { db } from '@/lib/db';

export const supabaseAdmin = db;
