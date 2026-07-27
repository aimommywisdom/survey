import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminDashboard, type ProjectRow } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, slug, name');

  const rows: ProjectRow[] = [];
  for (const p of projects ?? []) {
    const { data: surveys } = await supabaseAdmin
      .from('surveys')
      .select('id')
      .eq('project_id', p.id);
    const ids = (surveys ?? []).map((s) => s.id);
    let count = 0;
    if (ids.length) {
      const { count: c } = await supabaseAdmin
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('survey_id', ids);
      count = c ?? 0;
    }
    rows.push({ slug: p.slug, name: p.name, responseCount: count });
  }

  return <AdminDashboard projects={rows} />;
}
