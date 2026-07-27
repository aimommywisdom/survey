import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { decryptSecret } from '@/lib/admin/crypto';
import {
  resolveProject,
  scopeToSurvey,
  getTna,
  getRawResponses,
} from '@/lib/api/analytics';
import { callLLM, type Provider } from '@/lib/llm/client';
import { buildCoursePrompt } from '@/lib/llm/coursePrompt';
import type { SurveyDefinition } from '@/lib/survey/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }
  const { projectSlug, surveySlug } = await req.json().catch(() => ({}));
  if (!projectSlug || !surveySlug) {
    return NextResponse.json({ error: '缺少 projectSlug / surveySlug' }, { status: 400 });
  }

  // LLM 設定 + 解密金鑰
  const { data: s } = await supabaseAdmin
    .from('llm_settings')
    .select('provider, model, api_key_enc, api_key_iv')
    .eq('id', 1)
    .maybeSingle();
  if (!s?.api_key_enc || !s?.api_key_iv) {
    return NextResponse.json({ error: '尚未設定 LLM API 金鑰，請先到設定填入。' }, { status: 400 });
  }
  const apiKey = await decryptSecret(s.api_key_enc, s.api_key_iv);

  // 縮到「這一份問卷」
  const project = await resolveProject(projectSlug);
  if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  const scoped = scopeToSurvey(project, surveySlug);
  if (!scoped) return NextResponse.json({ error: '問卷不存在' }, { status: 404 });

  // 該問卷的 TNA + 原始作答 + 標籤（供 prompt 針對對象規劃）
  const [tna, rawRows] = await Promise.all([
    getTna(scoped),
    getRawResponses(scoped),
  ]);
  const responseCount = rawRows.length;
  if (responseCount === 0) {
    return NextResponse.json({ error: '這份問卷尚無回收資料' }, { status: 400 });
  }
  const sampleAnswers = rawRows.slice(0, 40).map((r) => r.answers);

  const { data: surveyRow } = await supabaseAdmin
    .from('surveys')
    .select('title, definition')
    .eq('id', scoped.surveys[0].id)
    .single();
  const def = surveyRow?.definition as SurveyDefinition | undefined;

  const { system, user } = buildCoursePrompt({
    survey: {
      title: surveyRow?.title ?? surveySlug,
      audience: def?.tags?.audience,
      purpose: def?.tags?.purpose,
    },
    tna,
    sampleAnswers,
    responseCount,
  });

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

  await supabaseAdmin.from('analyses').insert({
    project_id: project.id,
    survey_id: scoped.surveys[0].id,
    provider: s.provider,
    model: s.model,
    tna_snapshot: tna,
    content,
  });

  return NextResponse.json({ ok: true, content });
}
