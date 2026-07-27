// 手動 / 備援觸發保存期限清除（§8）。需 CRON_SECRET。
// 主排程建議用 Supabase pg_cron（見 0003_retention.sql）；此端點供手動或外部排程呼叫。
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
