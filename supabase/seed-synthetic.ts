// 產生合成作答，用來驗證分析端點的聚合。全部標記 proxy_note='__synthetic__'，
// 可用 `npm run seed-synthetic -- --clean` 一次刪除。務必只在測試/展示用。
import { createClient } from '@supabase/supabase-js';
import { buildProjections } from '../lib/survey/project';
import type { SurveyDefinition } from '../lib/survey/types';
import type { Answers, PainItemValue } from '../lib/survey/answers';

(process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile('.env.local');
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const TAG = '__synthetic__';
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

async function main() {
  if (process.argv.includes('--clean')) {
    const { data } = await db.from('responses').select('id').eq('proxy_note', TAG);
    const ids = (data ?? []).map((r) => r.id);
    if (ids.length) await db.from('responses').delete().in('id', ids);
    console.log(`✓ 已清除 ${ids.length} 筆合成作答`);
    return;
  }

  const { data: survey } = await db
    .from('surveys')
    .select('id, definition')
    .eq('slug', 'staff')
    .order('version', { ascending: false })
    .limit(1)
    .single();
  if (!survey) throw new Error('找不到 staff 問卷，請先 npm run seed');
  const def = survey.definition as SurveyDefinition;

  const depts = ['residential', 'day_care', 'home_care', 'admin'];
  const roles = ['manager', 'social_worker', 'caregiver', 'driver', 'admin_staff'];
  const painCodes = ['record_writing', 'monthly_report', 'reimburse', 'shift_table', 'meeting_notes'];
  const freqs = ['daily', 'weekly', 'monthly'];
  const formats = ['paper', 'excel', 'word', 'line'];
  const skillOpts = ['skill_photo_transfer', 'skill_zhuyin', 'skill_search', 'skill_gdrive_save', 'skill_gdrive_share', 'skill_excel_sort', 'skill_excel_pivot', 'skill_ai_used'];

  const N = 15;
  for (let i = 0; i < N; i++) {
    const pains: PainItemValue[] = [];
    const k = rint(1, 3);
    const chosen = [...painCodes].sort(() => Math.random() - 0.5).slice(0, k);
    for (const code of chosen) {
      pains.push({
        code,
        label: code,
        frequency: pick(freqs),
        minutes: rint(10, 90),
        format: pick(formats),
        needs_sign: pick(['yes', 'no']),
        deliver_to: '主管',
      });
    }
    const skills = skillOpts.filter(() => Math.random() < 0.4);
    const answers: Answers = {
      q_dept: { value: pick(depts) },
      q_role: { value: pick(roles) },
      q_tenure: { value: pick(['lt1', '1to3', '3to5', 'gt5']) },
      q_pain: pains,
      q_skill: skills,
    };

    const { data: resp } = await db
      .from('responses')
      .insert({ survey_id: survey.id, answers, is_proxy: true, proxy_note: TAG, duration_sec: rint(120, 600) })
      .select('id')
      .single();
    const { pain, skill } = buildProjections(def, answers);
    if (pain.length) await db.from('pain_points').insert(pain.map((p) => ({ ...p, response_id: resp!.id, survey_id: survey.id })));
    if (skill) await db.from('skill_scores').insert({ ...skill, response_id: resp!.id, survey_id: survey.id });
  }
  console.log(`✓ 已產生 ${N} 筆合成作答（proxy_note=${TAG}）`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
