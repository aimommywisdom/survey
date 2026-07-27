// 紙本列印頁 /s/[projectSlug]/[surveySlug]/print
import { notFound } from 'next/navigation';
import { getSurveyForFill } from '@/lib/survey/db';
import { PrintView } from '@/components/survey/PrintView';

export const dynamic = 'force-dynamic';

export default async function PrintPage({
  params,
}: {
  params: Promise<{ projectSlug: string; surveySlug: string }>;
}) {
  const { projectSlug, surveySlug } = await params;
  const loaded = await getSurveyForFill(projectSlug, surveySlug);
  if (!loaded) notFound();

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-toolbar">
        <span>紙本預覽 — 用瀏覽器「列印」即可輸出 A4</span>
      </div>
      <PrintView definition={loaded.definition} projectName={loaded.projectName} />
    </>
  );
}

const PRINT_CSS = `
.print-toolbar{position:sticky;top:0;background:#16233a;color:#fff;padding:10px 16px;font-size:14px;text-align:center}
.print-root{max-width:760px;margin:0 auto;padding:24px;color:#16233a;background:#fff}
.print-running-header{display:none}
.print-title{font-size:22px;font-weight:700;margin:0 0 4px}
.print-subtitle{color:#444;margin:0 0 10px}
.print-intro{font-size:14px;line-height:1.6;margin:0 0 8px}
.print-header{border-bottom:2px solid #16233a;padding-bottom:12px;margin-bottom:16px}
.print-section{margin:18px 0;break-inside:avoid}
.print-section-title{font-size:16px;font-weight:700;background:#f0eee8;padding:6px 10px;margin:0 0 10px}
.print-q{margin:0 0 14px;break-inside:avoid}
.print-q-label{font-weight:600;margin-bottom:6px}
.print-opts{display:flex;flex-wrap:wrap;gap:6px 18px}
.print-opt{display:inline-flex;align-items:center;gap:6px;font-size:14px}
.print-box{font-size:18px;line-height:1}
.print-scale{display:flex;gap:14px;align-items:center;margin-top:4px}
.print-circle{display:inline-flex;width:30px;height:30px;border:1.5px solid #16233a;border-radius:50%;align-items:center;justify-content:center;font-size:14px}
.print-scale-labels{display:flex;justify-content:space-between;width:220px;font-size:12px;color:#666}
.print-blank{margin-top:4px}
.print-line{border-bottom:1px solid #999;height:22px;margin:6px 0}
.print-hint{font-size:13px;color:#555;margin-bottom:6px}
.print-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
.print-table th,.print-table td{border:1px solid #999;padding:6px 4px;text-align:left;vertical-align:top;height:34px}
.print-choices{color:#666;font-size:11px}
.print-footer{margin-top:20px;border-top:1px solid #999;padding-top:10px;font-size:11px;color:#555;line-height:1.6}

@media print{
  @page{size:A4;margin:16mm 14mm 18mm}
  .print-toolbar{display:none}
  .print-root{max-width:none;padding:0}
  .print-running-header{display:block;position:fixed;top:-10mm;left:0;right:0;font-size:10px;color:#888;text-align:right}
  body{background:#fff}
}
`;
