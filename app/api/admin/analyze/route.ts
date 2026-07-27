import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decryptSecret } from '@/lib/admin/crypto';
import { resolveProject, getTna } from '@/lib/api/analytics';
import { callLLM, type Provider } from '@/lib/llm/client';
import { buildCoursePrompt } from '@/lib/llm/coursePrompt';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }
  const { projectSlug } = await req.json().catch(() => ({}));
  if (!projectSlug) {
    return NextResponse.json({ error: '缺少 projectSlug' }, { status: 400 });
  }

  // 讀 LLM 設定 + 解密金鑰
  const { data: s } = await supabaseAdmin
    .from('llm_settings')
    .select('provider, model, api_key_enc, api_key_iv')
    .eq('id', 1)
    .maybeSingle();
  if (!s?.api_key_enc || !s?.api_key_iv) {
    return NextResponse.json({ error: '尚未設定 LLM API 金鑰，請先到設定填入。' }, { status: 400 });
  }
  const apiKey = await decryptSecret(s.api_key_enc, s.api_key_iv);

  // 拉精準 TNA 數據
  const project = await resolveProject(projectSlug);
  if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  const tna = await getTna(project);

  // 呼叫 LLM
  const { system, user } = buildCoursePrompt(tna);
  let content: string;
  try {
    content = await callLLM({
      provider: s.provider as Provider,
      apiKey,
      model: s.model || undefined,
      system,
      user,
    });
  } catch (e) {
    return NextResponse.json({ error: `LLM 呼叫失敗：${(e as Error).message}` }, { status: 502 });
  }

  // 保存
  const { data: saved } = await supabaseAdmin
    .from('analyses')
    .insert({
      project_id: project.id,
      provider: s.provider,
      model: s.model,
      tna_snapshot: tna,
      content,
    })
    .select('id, created_at')
    .single();

  return NextResponse.json({ ok: true, content, analysis: saved });
}
