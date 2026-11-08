// 保存期限清除（§8）：依 projects.retention_days 刪除逾期作答。需 CRON_SECRET。
// 排程由 ~/cf-scheduler（Cloudflare Worker）每日呼叫；也可手動 POST。
// 2026-11 起資料在 Cloudflare D1：purge_expired_responses 在 lib/db.ts 的 rpc() 用 SQL 實作，
// responses 刪除會因 FK ON DELETE CASCADE 連帶刪掉 pain_points / skill_scores。
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function authed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authed(req)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.rpc('purge_expired_responses');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: data ?? 0 });
}
