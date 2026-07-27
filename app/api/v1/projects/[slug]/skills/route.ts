import { handleProject } from '@/lib/api/respond';
import { getSkills } from '@/lib/api/analytics';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const gb = new URL(req.url).searchParams.get('group_by');
  const groupBy = gb === 'dept' || gb === 'role' ? gb : undefined;
  return handleProject(req, slug, (p) => getSkills(p, groupBy));
}
