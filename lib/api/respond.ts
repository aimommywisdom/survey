// 分析 API 路由共用：驗證金鑰 → 解析專案 → 執行 → JSON。
import 'server-only';
import { NextResponse } from 'next/server';
import { requireApiKey } from './auth';
import { resolveProject, type ProjectRef } from './analytics';

export async function handleProject(
  req: Request,
  slug: string,
  fn: (p: ProjectRef) => Promise<unknown>
): Promise<Response> {
  const unauthorized = await requireApiKey(req);
  if (unauthorized) return unauthorized;

  const project = await resolveProject(slug);
  if (!project) {
    return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  }
  try {
    const data = await fn(project);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? '伺服器錯誤' },
      { status: 500 }
    );
  }
}
