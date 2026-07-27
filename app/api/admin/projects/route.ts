// 後台新增公司（專案）。需登入。問卷內容仍由維護者以 JSON+seed 建立。
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{2,30}$/;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const slug = String(body.slug ?? '').trim().toLowerCase();
  const retention = Number(body.retention_days);

  if (!name) return NextResponse.json({ error: '請填公司名稱' }, { status: 400 });
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: '代號只能用小寫英數字與連字號（2–30 字），例如 abc-corp' },
      { status: 400 }
    );
  }

  const { data: exists } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (exists) {
    return NextResponse.json({ error: `代號「${slug}」已被使用` }, { status: 409 });
  }

  const { error } = await supabaseAdmin.from('projects').insert({
    slug,
    name,
    retention_days: Number.isFinite(retention) && retention > 0 ? Math.floor(retention) : 365,
    brand_domain: 'survey.aimommywisdom.com',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, slug });
}
