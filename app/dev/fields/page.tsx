'use client';

// Day 2 題型元件預覽（僅開發用，正式站不連結、noindex）。
import { useState } from 'react';
import type { Question } from '@/lib/survey/types';
import type { Answers, AnswerValue } from '@/lib/survey/answers';
import { QuestionField } from '@/components/survey/QuestionField';

const DEMO: Question[] = [
  {
    id: 'q_dept',
    type: 'single',
    label: '你的服務單位？',
    required: true,
    options: [
      { value: 'home_care', label: '居家服務' },
      { value: 'day_care', label: '日間照顧服務' },
      { value: 'admin', label: '行政／會計／人資' },
      { value: 'other', label: '其他', allow_text: true },
    ],
  },
  {
    id: 'q_tools',
    type: 'multi',
    label: '你平常會用到哪些工具？（可複選）',
    max_select: 3,
    options: [
      { value: 'line', label: 'LINE' },
      { value: 'excel', label: 'Excel' },
      { value: 'word', label: 'Word' },
      { value: 'gdrive', label: 'Google 雲端硬碟' },
      { value: 'other', label: '其他', allow_text: true },
    ],
  },
  {
    id: 'q_sat',
    type: 'scale',
    label: '現有系統好用程度',
    min: 1,
    max: 5,
    min_label: '很難用',
    max_label: '很好用',
  },
  {
    id: 'q_name_free',
    type: 'short_text',
    label: '你最想解決的一件事（一句話）',
  },
  {
    id: 'q_more',
    type: 'long_text',
    label: '還有什麼想補充的嗎？',
    help: '沒有可以留白。',
  },
  {
    id: 'q_hours',
    type: 'number',
    label: '你每週大約加班幾小時？',
    unit: '小時',
    min: 0,
    max: 80,
  },
  {
    id: 'q_skill',
    type: 'behavior_check',
    label: '以下這些事，你實際做得到哪些？',
    options: [
      { value: 'photo_transfer', label: '把手機照片傳到電腦', level: 1, weight: 1 },
      { value: 'zhuyin', label: '用注音打字', level: 1, weight: 1 },
      { value: 'gdrive_share', label: '把檔案存到 Google 雲端硬碟並分享', level: 2, weight: 2 },
      { value: 'excel_sort', label: '用 Excel 排序、篩選', level: 3, weight: 3 },
      { value: 'chatgpt', label: '用過 ChatGPT 並實際完成工作', level: 4, weight: 4 },
    ],
  },
];

export default function FieldsPreview() {
  const [answers, setAnswers] = useState<Answers>({});
  const set = (id: string) => (v: AnswerValue) =>
    setAnswers((a) => ({ ...a, [id]: v }));

  return (
    <main className="mx-auto w-full max-w-[600px] px-5 py-10">
      <h1 className="mb-2 text-2xl font-bold text-ink">題型元件預覽</h1>
      <p className="mb-8 text-muted">Day 2 · single / multi / scale / text / number / behavior_check</p>

      <div className="flex flex-col gap-8">
        {DEMO.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={set(q.id)}
          />
        ))}
      </div>

      <details className="mt-10">
        <summary className="cursor-pointer text-muted">看目前 answers JSON</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-rule bg-white p-4 text-sm text-ink">
          {JSON.stringify(answers, null, 2)}
        </pre>
      </details>
    </main>
  );
}
