'use client';

import type { BehaviorCheckQuestion } from '@/lib/survey/types';
import type { BehaviorValue } from '@/lib/survey/answers';
import { FieldShell, optionRowClass } from '../FieldShell';

// 能力基線：以「具體行為」勾選，不做自我評分（避免高估，§7 notes）。
// 值為勾選到的選項 value 陣列；計分在送出時依 level/weight 換算。
export function BehaviorCheckField({
  question,
  value,
  onChange,
  error,
}: {
  question: BehaviorCheckQuestion;
  value?: BehaviorValue;
  onChange: (v: BehaviorValue) => void;
  error?: string;
}) {
  const values = value ?? [];
  const toggle = (v: string) =>
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v]
    );

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help ?? '請勾選你「實際做得到」的項目，沒做過的就別勾。'}
      required={question.required}
      error={error}
    >
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSel = values.includes(opt.value);
          return (
            <label key={opt.value} className={optionRowClass(isSel)}>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                checked={isSel}
                onChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}
