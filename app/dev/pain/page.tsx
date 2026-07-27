'use client';

// Day 3 pain_repeater + live_calc 預覽（開發用）。
import { useState } from 'react';
import type { PainRepeaterQuestion } from '@/lib/survey/types';
import type { PainItemValue } from '@/lib/survey/answers';
import { QuestionField } from '@/components/survey/QuestionField';

const Q: PainRepeaterQuestion = {
  id: 'q_pain',
  type: 'pain_repeater',
  label: '請選出你每天或每週一定要做的重複性文書工作',
  help: '先勾選項目，勾了才會展開細項。最多選 5 項。',
  required: true,
  max_items: 5,
  min_items: 1,
  preset_items: [
    { code: 'record_writing', label: '撰寫服務紀錄／個案紀錄' },
    { code: 'monthly_report', label: '月報表／季報表製作' },
    { code: 'reimburse', label: '核銷單據整理' },
    { code: 'shift_table', label: '排班表製作' },
    { code: 'meeting_notes', label: '會議紀錄' },
    { code: 'custom', label: '其他（請說明）', allow_text: true },
  ],
  fields: [
    { id: 'frequency', type: 'single', label: '多久做一次', options: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] },
    { id: 'minutes', type: 'number', label: '每次大約花', unit: '分鐘', min: 1, max: 960 },
    { id: 'format', type: 'single', label: '目前用什麼方式做', options: ['paper', 'excel', 'word', 'system', 'line', 'verbal'] },
    { id: 'needs_sign', type: 'single', label: '需要簽名或蓋章嗎', options: ['yes', 'no'] },
    { id: 'deliver_to', type: 'short_text', label: '完成後交給誰' },
  ],
  live_calc: {
    enabled: true,
    formula: 'annual_hours',
    display: '你一年花在這件事上約 {value} 小時',
  },
};

export default function PainPreview() {
  const [val, setVal] = useState<PainItemValue[]>([]);
  return (
    <main className="mx-auto w-full max-w-[600px] px-5 py-10">
      <h1 className="mb-2 text-2xl font-bold text-ink">招牌功能預覽</h1>
      <p className="mb-8 text-muted">Day 3 · pain_repeater + live_calc</p>

      <QuestionField
        question={Q}
        value={val}
        onChange={(v) => setVal(v as PainItemValue[])}
      />

      <details className="mt-10">
        <summary className="cursor-pointer text-muted">看目前 answers JSON</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-rule bg-white p-4 text-sm text-ink">
          {JSON.stringify(val, null, 2)}
        </pre>
      </details>
    </main>
  );
}
