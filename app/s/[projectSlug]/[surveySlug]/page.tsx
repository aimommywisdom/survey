// 前台填答頁 /s/[projectSlug]/[surveySlug]
import { notFound } from 'next/navigation';
import { getSurveyForFill } from '@/lib/survey/db';
import { SurveyRunner } from '@/components/survey/SurveyRunner';

export const dynamic = 'force-dynamic';

export default async function FillPage({
  params,
}: {
  params: Promise<{ projectSlug: string; surveySlug: string }>;
}) {
  const { projectSlug, surveySlug } = await params;
  const loaded = await getSurveyForFill(projectSlug, surveySlug);
  if (!loaded) notFound();

  if (!loaded.isOpen) {
    return (
      <main className="mx-auto w-full max-w-[600px] px-5 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-ink">問卷已關閉</h1>
        <p className="text-muted">這份問卷目前沒有開放填寫，謝謝你的關心。</p>
      </main>
    );
  }

  return (
    <main className="min-h-full">
      <SurveyRunner
        surveyId={loaded.surveyId}
        projectName={loaded.projectName}
        definition={loaded.definition}
      />
      <footer className="mx-auto w-full max-w-[600px] px-5 pb-10 pt-4 text-center text-[0.85rem] text-muted">
        本問卷由智慧媽咪國際有限公司之診斷平台提供，貴機構無須建置或維護任何系統。
      </footer>
    </main>
  );
}
