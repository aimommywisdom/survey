// 產生合成作答，用來驗證分析端點的聚合。全部標記 proxy_note='__synthetic__'，
// 可用 `npm run seed-synthetic -- --clean` 一次刪除。務必只在測試/展示用。
// 預設寫本機 D1；加 --remote 才寫正式 D1（2026-11 起資料層為 Cloudflare D1）。
import { randomUUID } from 'node:crypto';
import { buildProjections } from '../lib/survey/project';
import type { SurveyDefinition } from '../lib/survey/types';
import type { Answers, PainItemValue } from '../lib/survey/answers';
import { execSql, querySql, sqlLit, targetLabel } from './d1';

const TAG = '__synthetic__';
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

async function main() {
  if (process.argv.includes('--clean')) {
    const rows = querySql<{ id: string }>(`SELECT id FROM responses WHERE proxy_note = ${sqlLit(TAG)}`);
    // pain_points / skill_scores 由 FK ON DELETE CASCADE 連帶刪除
    if (rows.length) execSql([`DELETE FROM responses WHERE proxy_note = ${sqlLit(TAG)};`]);
    console.log(`✓ 已清除 ${rows.length} 筆合成作答（${targetLabel()}）`);
    return;
  }

  const [survey] = querySql<{ id: string; definition: string }>(
    `SELECT id, definition FROM surveys WHERE slug = 'staff' ORDER BY version DESC LIMIT 1`
  );
  if (!survey) throw new Error('找不到 staff 問卷，請先 npm run seed');
  const def = JSON.parse(survey.definition) as SurveyDefinition;
  const sql: string[] = [];

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

    const responseId = randomUUID();
    sql.push(
      `INSERT INTO responses (id, survey_id, answers, is_proxy, proxy_note, duration_sec) VALUES (${[
        responseId, survey.id, answers, true, TAG, rint(120, 600),
      ].map(sqlLit).join(', ')});`
    );
    const { pain, skill } = buildProjections(def, answers);
    for (const p of pain) {
      const row = { ...p, id: randomUUID(), response_id: responseId, survey_id: survey.id } as Record<string, unknown>;
      const cols = Object.keys(row);
      sql.push(`INSERT INTO pain_points (${cols.join(', ')}) VALUES (${cols.map((c) => sqlLit(row[c])).join(', ')});`);
    }
    if (skill) {
      const row = { ...skill, id: randomUUID(), response_id: responseId, survey_id: survey.id } as Record<string, unknown>;
      const cols = Object.keys(row);
      sql.push(`INSERT INTO skill_scores (${cols.join(', ')}) VALUES (${cols.map((c) => sqlLit(row[c])).join(', ')});`);
    }
  }
  execSql(sql);
  console.log(`✓ 已產生 ${N} 筆合成作答（proxy_note=${TAG}，${targetLabel()}）`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
