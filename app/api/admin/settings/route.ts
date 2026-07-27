import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encryptSecret } from '@/lib/admin/crypto';
import { DEFAULT_MODEL, type Provider } from '@/lib/llm/client';

export const dynamic = 'force-dynamic';

async function guard() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }
  return null;
}

// 讀設定（金鑰只回傳「有沒有設」，不回明文）
export async function GET() {
  const g = await guard();
  if (g) return g;
  const { data } = await supabaseAdmin
    .from('llm_settings')
    .select('provider, model, api_key_enc')
    .eq('id', 1)
    .maybeSingle();
  return NextResponse.json({
    provider: data?.provider ?? 'anthropic',
    model: data?.model ?? '',
    hasKey: !!data?.api_key_enc,
  });
}

// 儲存設定（有帶 apiKey 才更新金鑰；否則只更新 provider/model）
export async function POST(req: Request) {
  const g = await guard();
  if (g) return g;
  const body = await req.json().catch(() => ({}));
  const provider = (body.provider === 'openai' ? 'openai' : 'anthropic') as Provider;
  const model = String(body.model ?? '').trim() || DEFAULT_MODEL[provider];
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

  const row: Record<string, unknown> = { id: 1, provider, model, updated_at: new Date().toISOString() };
  if (apiKey) {
    const { enc, iv } = await encryptSecret(apiKey);
    row.api_key_enc = enc;
    row.api_key_iv = iv;
  }
  const { error } = await supabaseAdmin.from('llm_settings').upsert(row, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
