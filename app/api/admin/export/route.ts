// 後台匯出某問卷作答為 CSV（Excel 可開）。需登入。
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { buildResponseCsv } from '@/lib/api/exportCsv';
import type { SurveyDefinition } from '@/lib/survey/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '未登入' }, { status: 401 });
  }
  const url = new URL(req.url);
  const projectSlug = url.searchParams.get('project');
  const surveySlug = url.searchParams.get('survey');
  if (!projectSlug || !surveySlug) {
    return NextResponse.json({ error: '缺少 project / survey' }, { status: 400 });
  }

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('slug', projectSlug)
    .single();
  if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

  const { data: survey } = await supabaseAdmin
    .from('surveys')
    .select('id, definition')
    .eq('project_id', project.id)
    .eq('slug', surveySlug)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  if (!survey) return NextResponse.json({ error: '問卷不存在' }, { status: 404 });

  const { data: rows } = await supabaseAdmin
    .from('responses')
    .select('answers, is_proxy, submitted_at')
    .eq('survey_id', survey.id)
    .order('submitted_at', { ascending: true });

  const csv = buildResponseCsv(survey.definition as SurveyDefinition, rows ?? []);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${projectSlug}-${surveySlug}-${stamp}.csv"`,
    },
  });
}
