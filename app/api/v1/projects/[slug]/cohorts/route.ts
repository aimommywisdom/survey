import { handleProject } from '@/lib/api/respond';
import { getCohorts } from '@/lib/api/analytics';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return handleProject(req, slug, (p) => getCohorts(p));
}
