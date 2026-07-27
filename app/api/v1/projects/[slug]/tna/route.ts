import { handleProject } from '@/lib/api/respond';
import { getTna } from '@/lib/api/analytics';

export const dynamic = 'force-dynamic';

// 一次打包：summary + painpoints + skills + cohorts + scheduling（餵給 Claude 寫報告）。
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return handleProject(req, slug, (p) => getTna(p));
}
