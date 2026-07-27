'use client';

import type { MultiQuestion } from '@/lib/survey/types';
import type { MultiValue } from '@/lib/survey/answers';
import { FieldShell, optionRowClass } from '../FieldShell';

export function MultiField({
  question,
  value,
  onChange,
  error,
}: {
  question: MultiQuestion;
  value?: MultiValue;
  onChange: (v: MultiValue) => void;
  error?: string;
}) {
  const values = value?.values ?? [];
  const atMax =
    question.max_select != null && values.length >= question.max_select;

  const toggle = (v: string) => {
    const has = values.includes(v);
    if (!has && atMax) return; // 已達上限，不再加選
    const next = has ? values.filter((x) => x !== v) : [...values, v];
    onChange({ values: next, text: value?.text });
  };

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={
        question.max_select
          ? `${question.help ? question.help + '　' : ''}最多選 ${question.max_select} 項`
          : question.help
      }
      required={question.required}
      error={error}
    >
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSel = values.includes(opt.value);
          const disabled = !isSel && atMax;
          return (
            <div key={opt.value}>
              <label
                className={`${optionRowClass(isSel)} ${
                  disabled ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                  checked={isSel}
                  disabled={disabled}
                  onChange={() => toggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
              {isSel && opt.allow_text && (
                <input
                  type="text"
                  aria-label={`${opt.label} — 請說明`}
                  placeholder="請說明"
                  value={value?.text ?? ''}
                  onChange={(e) =>
                    onChange({ values, text: e.target.value })
                  }
                  className="mt-2 ml-1 min-h-[48px] w-full rounded-lg border border-rule bg-white px-4 py-2"
                />
              )}
            </div>
          );
        })}
      </div>
    </FieldShell>
  );
}
