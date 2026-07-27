// 代填模式 /entry/[projectSlug]/[surveySlug]?key=...（§10/§15，需 key）
// 紙本回收後由窗口鍵入；每筆標記 is_proxy。
import { notFound } from 'next/navigation';
import { getSurveyForFill } from '@/lib/survey/db';
import { hashKey } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SurveyRunner } from '@/components/survey/SurveyRunner';

export const dynamic = 'force-dynamic';

async function keyValid(key: string | undefined): Promise<boolean> {
  if (!key) return false;
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('id')
    .eq('key_hash', hashKey(key))
    .is('revoked_at', null)
    .maybeSingle();
  return !!data;
}

export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectSlug: string; surveySlug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { projectSlug, surveySlug } = await params;
  const { key } = await searchParams;

  if (!(await keyValid(key))) {
    return (
      <main className="mx-auto w-full max-w-[600px] px-5 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-ink">需要有效的代填連結</h1>
        <p className="text-muted">
          這個頁面僅供內部人員鍵入紙本問卷，請使用帶有金鑰的連結。
        </p>
      </main>
    );
  }

  const loaded = await getSurveyForFill(projectSlug, surveySlug);
  if (!loaded) notFound();

  return (
    <main className="min-h-full">
      <SurveyRunner
        surveyId={loaded.surveyId}
        projectName={loaded.projectName}
        definition={loaded.definition}
        proxyMode
      />
    </main>
  );
}
