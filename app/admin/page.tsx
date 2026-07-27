import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  resolveProject,
  getPainpoints,
  getSkills,
} from '@/lib/api/analytics';
import { labels, label } from '@/lib/survey/taxonomyLabels';
import type { SurveyDefinition } from '@/lib/survey/types';
import { AdminShell, type SurveyRow, type DashboardData } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, slug, name, brand_domain');

  const rows: SurveyRow[] = [];
  let totalResponses = 0;

  for (const p of projects ?? []) {
    const { data: surveys } = await supabaseAdmin
      .from('surveys')
      .select('id, slug, title, definition')
      .eq('project_id', p.id)
      .order('slug');
    for (const s of surveys ?? []) {
      const def = s.definition as SurveyDefinition;
      const tags = def?.tags ?? {};
      const { count } = await supabaseAdmin
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', s.id);
      const c = count ?? 0;
      totalResponses += c;
      rows.push({
        projectSlug: p.slug,
        projectName: p.name,
        surveySlug: s.slug,
        title: s.title,
        link: `https://${p.brand_domain ?? 'survey.aimommywisdom.com'}/s/${p.slug}/${s.slug}`,
        audience: labels('audience', tags.audience),
        purpose: labels('purpose', tags.purpose),
        complexity: tags.complexity ? label('complexity', tags.complexity) : null,
        estimatedMinutes: def?.estimated_minutes ?? null,
        responseCount: c,
      });
    }
  }

  // 儀表板聚合（跨全部專案的痛點與能力）
  let painTop: DashboardData['painTop'] = [];
  let painTotalHours = 0;
  let tierDist: Record<string, number> = { entry: 0, basic: 0, advanced: 0 };
  let skillSample = 0;
  for (const p of projects ?? []) {
    const ref = await resolveProject(p.slug);
    if (!ref) continue;
    const pains = await getPainpoints(ref);
    for (const it of pains) painTotalHours += it.org_annual_hours;
    painTop.push(
      ...pains.map((it) => ({
        label: it.label,
        org_annual_hours: it.org_annual_hours,
        respondents: it.respondents,
      }))
    );
    const sk = await getSkills(ref);
    tierDist.entry += sk.tier_distribution.entry ?? 0;
    tierDist.basic += sk.tier_distribution.basic ?? 0;
    tierDist.advanced += sk.tier_distribution.advanced ?? 0;
    skillSample += sk.sample_size;
  }
  painTop = painTop
    .sort((a, b) => b.org_annual_hours - a.org_annual_hours)
    .slice(0, 5);

  const dashboard: DashboardData = {
    totalResponses,
    surveyCount: rows.length,
    painTop,
    painTotalHours: Math.round(painTotalHours),
    tierDist,
    skillSample,
  };

  return <AdminShell surveys={rows} dashboard={dashboard} />;
}
