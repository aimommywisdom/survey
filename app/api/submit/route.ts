// 送出作答：insert response + 投影寫 pain_points / skill_scores（§4/§7）。
// 用 service_role 一次做完（前台 anon 對衍生表無寫入權；集中投影邏輯於此）。
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SurveyDefinition } from '@/lib/survey/types';
import type { Answers } from '@/lib/survey/answers';
import { buildProjections } from '@/lib/survey/project';
import { annualHours, roundHours } from '@/lib/survey/scoring';

interface SubmitBody {
  survey_id?: string;
  answers?: Answers;
  duration_sec?: number;
  is_proxy?: boolean;
  proxy_note?: string;
}

export async function POST(req: Request) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '格式錯誤' }, { status: 400 });
  }

  const { survey_id, answers, duration_sec, is_proxy, proxy_note } = body;
  if (!survey_id || typeof answers !== 'object' || answers == null) {
    return NextResponse.json(
      { error: '缺少 survey_id 或 answers' },
      { status: 400 }
    );
  }

  // 以 DB 端的定義為準（不信任 client 傳來的題目）
  const { data: survey, error: sErr } = await supabaseAdmin
    .from('surveys')
    .select('id, definition, is_open, opens_at, closes_at')
    .eq('id', survey_id)
    .single();
  if (sErr || !survey) {
    return NextResponse.json({ error: '問卷不存在' }, { status: 404 });
  }

  const now = Date.now();
  const opensOk = !survey.opens_at || new Date(survey.opens_at).getTime() <= now;
  const closesOk =
    !survey.closes_at || new Date(survey.closes_at).getTime() >= now;
  if (!survey.is_open || !opensOk || !closesOk) {
    return NextResponse.json({ error: '此問卷已關閉收件' }, { status: 403 });
  }

  const def = survey.definition as SurveyDefinition;

  // 1) 寫 response（不回傳整列，符合最小揭露）
  const { data: resp, error: rErr } = await supabaseAdmin
    .from('responses')
    .insert({
      survey_id,
      answers,
      is_proxy: !!is_proxy,
      proxy_note: proxy_note ?? null,
      duration_sec: duration_sec ?? null,
    })
    .select('id')
    .single();
  if (rErr || !resp) {
    return NextResponse.json({ error: '寫入失敗' }, { status: 500 });
  }

  // 2) 投影衍生表
  const { pain, skill } = buildProjections(def, answers);

  if (pain.length > 0) {
    const { error } = await supabaseAdmin.from('pain_points').insert(
      pain.map((p) => ({ ...p, response_id: resp.id, survey_id }))
    );
    if (error) {
      // 投影失敗不影響已收到的作答，但要記錄
      console.error('pain_points 投影失敗', error.message);
    }
  }
  if (skill) {
    const { error } = await supabaseAdmin
      .from('skill_scores')
      .insert({ ...skill, response_id: resp.id, survey_id });
    if (error) console.error('skill_scores 投影失敗', error.message);
  }

  // 個人化總結（§9）：這個人一年花在痛點上的總時數
  const totalAnnualHours = roundHours(
    pain.reduce((s, p) => s + annualHours(p.frequency, p.minutes), 0)
  );

  return NextResponse.json({
    ok: true,
    response_id: resp.id,
    summary: { total_annual_hours: totalAnnualHours, pain_count: pain.length },
  });
}
