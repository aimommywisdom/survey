'use client';

import type { SingleQuestion } from '@/lib/survey/types';
import type { SingleValue } from '@/lib/survey/answers';
import { FieldShell, optionRowClass } from '../FieldShell';

export function SingleField({
  question,
  value,
  onChange,
  error,
}: {
  question: SingleQuestion;
  value?: SingleValue;
  onChange: (v: SingleValue) => void;
  error?: string;
}) {
  const selected = value?.value;
  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      <div role="radiogroup" aria-label={question.label} className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSel = selected === opt.value;
          return (
            <div key={opt.value}>
              <label className={optionRowClass(isSel)}>
                <input
                  type="radio"
                  name={question.id}
                  className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                  checked={isSel}
                  onChange={() =>
                    onChange({ value: opt.value, text: value?.text })
                  }
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
                    onChange({ value: opt.value, text: e.target.value })
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
