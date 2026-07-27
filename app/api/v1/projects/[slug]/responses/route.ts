import { NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api/auth';
import { resolveProject, getRawResponses } from '@/lib/api/analytics';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const unauthorized = await requireApiKey(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  const project = await resolveProject(slug);
  if (!project) return NextResponse.json({ error: '專案不存在' }, { status: 404 });

  const rows = await getRawResponses(project);
  const format = new URL(req.url).searchParams.get('format') ?? 'json';

  if (format === 'csv') {
    const cols = ['id', 'survey_id', 'submitted_at', 'is_proxy', 'duration_sec', 'answers'];
    const esc = (v: unknown) => {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      cols.join(','),
      ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(',')),
    ];
    return new NextResponse('﻿' + lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${slug}-responses.csv"`,
      },
    });
  }

  return NextResponse.json({ project: { slug: project.slug }, count: rows.length, responses: rows });
}
