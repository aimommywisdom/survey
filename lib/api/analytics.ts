// 分析聚合（§6/§7）— 全部走 service_role，over pain_points / skill_scores / responses。
// 痛點與能力在送出時已投影成正規化列，這裡只做聚合。
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FREQUENCY_MULTIPLIER } from '@/lib/survey/types';

const num = (v: unknown) => (v == null ? 0 : Number(v));

export interface ProjectRef {
  id: string;
  slug: string;
  name: string;
  surveys: { id: string; slug: string }[];
}

export async function resolveProject(slug: string): Promise<ProjectRef | null> {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, slug, name')
    .eq('slug', slug)
    .single();
  if (!project) return null;
  const { data: surveys } = await supabaseAdmin
    .from('surveys')
    .select('id, slug, title')
    .eq('project_id', project.id);
  return { ...project, surveys: surveys ?? [] };
}

// 把 ProjectRef 縮到只含一份問卷，讓所有聚合函式自然過濾到該問卷。
export function scopeToSurvey(p: ProjectRef, surveySlug: string): ProjectRef | null {
  const s = p.surveys.find((x) => x.slug === surveySlug);
  if (!s) return null;
  return { ...p, surveys: [s] };
}

function surveyIds(p: ProjectRef) {
  return p.surveys.map((s) => s.id);
}

// ── /summary ──────────────────────────────────────
export async function getSummary(p: ProjectRef) {
  const ids = surveyIds(p);
  const { data: responses } = await supabaseAdmin
    .from('responses')
    .select('id, survey_id, duration_sec, is_proxy')
    .in('survey_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const rows = responses ?? [];

  const bySurvey: Record<string, number> = {};
  for (const s of p.surveys) bySurvey[s.slug] = 0;
  const slugById = Object.fromEntries(p.surveys.map((s) => [s.id, s.slug]));
  let durSum = 0;
  let durN = 0;
  let proxy = 0;
  for (const r of rows) {
    const slug = slugById[r.survey_id];
    if (slug) bySurvey[slug] = (bySurvey[slug] ?? 0) + 1;
    if (r.duration_sec != null) {
      durSum += r.duration_sec;
      durN++;
    }
    if (r.is_proxy) proxy++;
  }

  // 單位分佈（從 pain_points 的冗餘 dept 取，去重到 response）
  const { data: pp } = await supabaseAdmin
    .from('pain_points')
    .select('response_id, dept')
    .in('survey_id', ids.length ? ids : ['x']);
  const deptByResp: Record<string, string | null> = {};
  for (const row of pp ?? []) deptByResp[row.response_id] = row.dept;
  const deptDist: Record<string, number> = {};
  for (const d of Object.values(deptByResp)) {
    const k = d ?? 'unknown';
    deptDist[k] = (deptDist[k] ?? 0) + 1;
  }

  return {
    response_count: bySurvey,
    total_responses: rows.length,
    proxy_count: proxy,
    avg_duration_sec: durN ? Math.round(durSum / durN) : null,
    dept_distribution: deptDist,
  };
}

// ── /painpoints ───────────────────────────────────
interface PainRowDb {
  response_id: string;
  item_code: string;
  item_label: string;
  is_custom: boolean;
  annual_hours: unknown;
  format: string | null;
  needs_sign: boolean | null;
  dept: string | null;
  role_group: string | null;
}

async function fetchPain(p: ProjectRef): Promise<PainRowDb[]> {
  const ids = surveyIds(p);
  const { data } = await supabaseAdmin
    .from('pain_points')
    .select(
      'response_id, item_code, item_label, is_custom, annual_hours, format, needs_sign, dept, role_group'
    )
    .in('survey_id', ids.length ? ids : ['x']);
  return (data ?? []) as PainRowDb[];
}

function mode(values: (string | null)[]): string | null {
  const counts: Record<string, number> = {};
  for (const v of values) if (v) counts[v] = (counts[v] ?? 0) + 1;
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(counts))
    if (n > bestN) ((best = k), (bestN = n));
  return best;
}

export async function getPainpoints(
  p: ProjectRef,
  groupBy?: 'dept' | 'role'
) {
  const rows = await fetchPain(p);
  const byCode: Record<string, PainRowDb[]> = {};
  for (const r of rows) (byCode[r.item_code] ??= []).push(r);

  const items = Object.entries(byCode).map(([code, rs]) => {
    const respondents = new Set(rs.map((r) => r.response_id)).size;
    const org = rs.reduce((s, r) => s + num(r.annual_hours), 0);
    const signRows = rs.filter((r) => r.needs_sign != null);
    const groupKey = groupBy === 'role' ? 'role_group' : 'dept';
    const byGroup: Record<string, number> = {};
    if (groupBy) {
      for (const r of rs) {
        const k = (r[groupKey] as string | null) ?? 'unknown';
        byGroup[k] = (byGroup[k] ?? 0) + num(r.annual_hours);
      }
    }
    return {
      code,
      label: rs[0].item_label,
      is_custom: rs.some((r) => r.is_custom),
      respondents,
      org_annual_hours: Math.round(org * 10) / 10,
      avg_annual_hours_per_person:
        respondents ? Math.round((org / respondents) * 10) / 10 : 0,
      dominant_format: mode(rs.map((r) => r.format)),
      needs_sign_ratio: signRows.length
        ? Math.round(
            (signRows.filter((r) => r.needs_sign).length / signRows.length) * 100
          ) / 100
        : null,
      ...(groupBy ? { [`by_${groupBy}`]: byGroup } : {}),
    };
  });

  items.sort((a, b) => b.org_annual_hours - a.org_annual_hours);
  return items;
}

// ── /painpoints/matrix（影響度 × 難度）───────────────
// 難度為啟發式（可調）：格式越「手動、需簽章」越難數位化。
const FORMAT_DIFFICULTY: Record<string, number> = {
  paper: 0.8,
  verbal: 0.65,
  line: 0.5,
  word: 0.5,
  excel: 0.4,
  system: 0.3,
};

export async function getPainMatrix(p: ProjectRef) {
  const items = await getPainpoints(p);
  const maxHours = Math.max(1, ...items.map((i) => i.org_annual_hours));
  const rows = await fetchPain(p);
  const signByCode: Record<string, { sign: number; n: number }> = {};
  const fmtByCode: Record<string, (string | null)[]> = {};
  for (const r of rows) {
    (fmtByCode[r.item_code] ??= []).push(r.format);
    const s = (signByCode[r.item_code] ??= { sign: 0, n: 0 });
    if (r.needs_sign != null) {
      s.n++;
      if (r.needs_sign) s.sign++;
    }
  }

  return items.map((it) => {
    const fmt = mode(fmtByCode[it.code] ?? []);
    let difficulty = FORMAT_DIFFICULTY[fmt ?? ''] ?? 0.5;
    const sign = signByCode[it.code];
    if (sign && sign.n && sign.sign / sign.n > 0.5) difficulty += 0.15;
    difficulty = Math.min(1, Math.round(difficulty * 100) / 100);
    const impact = Math.round((it.org_annual_hours / maxHours) * 100) / 100;
    const quadrant =
      impact >= 0.5 && difficulty < 0.5
        ? 'quick_win' // 高影響低難度：優先自動化
        : impact >= 0.5
          ? 'major_project' // 高影響高難度：值得投資
          : difficulty < 0.5
            ? 'fill_in' // 低影響低難度：順手做
            : 'low_priority'; // 低影響高難度：暫緩
    return {
      code: it.code,
      label: it.label,
      impact,
      impact_hours: it.org_annual_hours,
      difficulty,
      quadrant,
    };
  });
}

// ── /skills ───────────────────────────────────────
interface SkillRowDb {
  l1_basic: number;
  l2_cloud: number;
  l3_data: number;
  l4_ai: number;
  total: number;
  tier: string;
  dept: string | null;
  role_group: string | null;
}

export async function getSkills(p: ProjectRef, groupBy?: 'dept' | 'role') {
  const ids = surveyIds(p);
  const { data } = await supabaseAdmin
    .from('skill_scores')
    .select('l1_basic, l2_cloud, l3_data, l4_ai, total, tier, dept, role_group')
    .in('survey_id', ids.length ? ids : ['x']);
  const rows = (data ?? []) as SkillRowDb[];

  const tierDist: Record<string, number> = { entry: 0, basic: 0, advanced: 0 };
  const dim = { l1: 0, l2: 0, l3: 0, l4: 0 };
  for (const r of rows) {
    tierDist[r.tier] = (tierDist[r.tier] ?? 0) + 1;
    dim.l1 += r.l1_basic;
    dim.l2 += r.l2_cloud;
    dim.l3 += r.l3_data;
    dim.l4 += r.l4_ai;
  }
  const weakest = (['l1', 'l2', 'l3', 'l4'] as const).reduce((a, b) =>
    dim[a] <= dim[b] ? a : b
  );
  const dimName: Record<string, string> = {
    l1: 'l1_basic',
    l2: 'l2_cloud',
    l3: 'l3_data',
    l4: 'l4_ai',
  };

  const grouped: Record<string, Record<string, number>> = {};
  if (groupBy) {
    const key = groupBy === 'role' ? 'role_group' : 'dept';
    for (const r of rows) {
      const g = (r[key] as string | null) ?? 'unknown';
      (grouped[g] ??= { entry: 0, basic: 0, advanced: 0 })[r.tier] += 1;
    }
  }

  return {
    tier_distribution: tierDist,
    sample_size: rows.length,
    weakest_dimension: dimName[weakest],
    ...(groupBy ? { [`by_${groupBy}`]: grouped } : {}),
  };
}

// ── /cohorts（職務群 × 能力分級）─────────────────────
const RECOMMENDED_HOURS: Record<string, number> = {
  entry: 6,
  basic: 6,
  advanced: 4,
};
const ROLE_GROUP_LABEL: Record<string, string> = {
  admin_mgmt: '行政管理層',
  professional: '社工／教保專業人員',
  frontline: '第一線服務人員',
  unknown: '未分類',
};

export async function getCohorts(p: ProjectRef) {
  const ids = surveyIds(p);
  const { data: skills } = await supabaseAdmin
    .from('skill_scores')
    .select('response_id, tier, role_group')
    .in('survey_id', ids.length ? ids : ['x']);
  const pain = await fetchPain(p);

  // response → (role_group, tier)
  const painByResp: Record<string, string[]> = {};
  const painHoursByCode: Record<string, Record<string, number>> = {};
  for (const r of pain) {
    (painByResp[r.response_id] ??= []).push(r.item_code);
  }

  const groups: Record<string, { size: number; responses: string[] }> = {};
  for (const s of skills ?? []) {
    const key = `${s.role_group ?? 'unknown'}|${s.tier}`;
    (groups[key] ??= { size: 0, responses: [] }).size++;
    groups[key].responses.push(s.response_id);
  }

  return Object.entries(groups).map(([key, g], i) => {
    const [role, tier] = key.split('|');
    // 該群成員的痛點年工時彙總 → top 3
    const hours: Record<string, { h: number; label: string }> = {};
    for (const r of pain) {
      if (!g.responses.includes(r.response_id)) continue;
      const e = (hours[r.item_code] ??= { h: 0, label: r.item_label });
      e.h += num(r.annual_hours);
    }
    const top = Object.entries(hours)
      .sort((a, b) => b[1].h - a[1].h)
      .slice(0, 3)
      .map(([code]) => code);
    return {
      code: String.fromCharCode(65 + i), // A, B, C...
      label: `${ROLE_GROUP_LABEL[role] ?? role}（${tierLabel(tier)}）`,
      role_group: role,
      tier,
      size: g.size,
      top_pain_points: top,
      recommended_hours: RECOMMENDED_HOURS[tier] ?? 6,
      needs_split: g.size > 20, // 每班上限 20（§7）
    };
  });
}

function tierLabel(t: string) {
  return t === 'entry' ? '入門' : t === 'basic' ? '基礎' : '進階';
}

// ── /scheduling（時段交集）──────────────────────────
export async function getScheduling(p: ProjectRef) {
  const ids = surveyIds(p);
  const { data } = await supabaseAdmin
    .from('responses')
    .select('answers')
    .in('survey_id', ids.length ? ids : ['x']);
  const rows = data ?? [];

  // 掃描 answers 內任何 availability 值（{slots:[], offsite})
  const slotCounts: Record<string, number> = {};
  const offsite: number[] = [];
  let n = 0;
  for (const r of rows) {
    const ans = (r.answers ?? {}) as Record<string, unknown>;
    for (const v of Object.values(ans)) {
      if (v && typeof v === 'object' && Array.isArray((v as { slots?: unknown }).slots)) {
        n++;
        for (const s of (v as { slots: string[] }).slots)
          slotCounts[s] = (slotCounts[s] ?? 0) + 1;
        const off = (v as { offsite?: string }).offsite;
        const m = off ? Number(off) : NaN;
        if (!Number.isNaN(m)) offsite.push(m);
      }
    }
  }
  const best = Object.entries(slotCounts)
    .map(([slot, c]) => ({
      slot,
      available: c,
      coverage: n ? Math.round((c / n) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.available - a.available);
  offsite.sort((a, b) => a - b);
  const p50 = offsite.length ? offsite[Math.floor(offsite.length / 2)] : null;
  return { respondents_with_availability: n, best_slots: best, max_offsite_minutes_p50: p50 };
}

// ── /responses（去識別化原始）───────────────────────
export async function getRawResponses(p: ProjectRef) {
  const ids = surveyIds(p);
  const { data } = await supabaseAdmin
    .from('responses')
    .select('id, survey_id, answers, is_proxy, duration_sec, submitted_at')
    .in('survey_id', ids.length ? ids : ['x'])
    .order('submitted_at', { ascending: true });
  return data ?? [];
}

// ── /tna（一次打包）─────────────────────────────────
export async function getTna(p: ProjectRef) {
  const [summary, pain, skills, cohorts, scheduling] = await Promise.all([
    getSummary(p),
    getPainpoints(p),
    getSkills(p, 'role'),
    getCohorts(p),
    getScheduling(p),
  ]);
  return {
    project: { slug: p.slug, name: p.name },
    response_count: summary.response_count,
    pain_points: pain,
    skills,
    cohorts,
    scheduling,
  };
}
