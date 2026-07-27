import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { labels, label } from '@/lib/survey/taxonomyLabels';
import type { SurveyDefinition } from '@/lib/survey/types';
import { AdminDashboard, type SurveyRow } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, slug, name, brand_domain');

  const rows: SurveyRow[] = [];
  for (const p of projects ?? []) {
    const { data: surveys } = await supabaseAdmin
      .from('surveys')
      .select('slug, title, definition')
      .eq('project_id', p.id)
      .order('slug');
    for (const s of surveys ?? []) {
      const def = s.definition as SurveyDefinition;
      const tags = def?.tags ?? {};
      // 該問卷回收數
      const { data: sid } = await supabaseAdmin
        .from('surveys')
        .select('id')
        .eq('project_id', p.id)
        .eq('slug', s.slug)
        .limit(1)
        .single();
      let count = 0;
      if (sid) {
        const { count: c } = await supabaseAdmin
          .from('responses')
          .select('id', { count: 'exact', head: true })
          .eq('survey_id', sid.id);
        count = c ?? 0;
      }
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
        responseCount: count,
      });
    }
  }

  return <AdminDashboard surveys={rows} />;
}
