'use client';

import type { ScaleQuestion } from '@/lib/survey/types';
import { FieldShell } from '../FieldShell';

export function ScaleField({
  question,
  value,
  onChange,
  error,
}: {
  question: ScaleQuestion;
  value?: number;
  onChange: (v: number) => void;
  error?: string;
}) {
  const nums: number[] = [];
  for (let n = question.min; n <= question.max; n++) nums.push(n);

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      <div
        role="radiogroup"
        aria-label={question.label}
        className="flex flex-wrap gap-2"
      >
        {nums.map((n) => {
          const isSel = value === n;
          return (
            <label
              key={n}
              className={[
                'flex h-12 min-w-12 flex-1 cursor-pointer items-center justify-center rounded-lg border px-3 text-lg font-medium tnum transition-colors',
                isSel
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-white text-ink hover:border-ink/40',
              ].join(' ')}
            >
              <input
                type="radio"
                name={question.id}
                className="sr-only"
                checked={isSel}
                onChange={() => onChange(n)}
              />
              {n}
            </label>
          );
        })}
      </div>
      {(question.min_label || question.max_label) && (
        <div className="mt-2 flex justify-between text-[0.9rem] text-muted">
          <span>{question.min_label}</span>
          <span>{question.max_label}</span>
        </div>
      )}
    </FieldShell>
  );
}
