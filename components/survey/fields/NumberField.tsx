'use client';

import type { NumberQuestion } from '@/lib/survey/types';
import { FieldShell } from '../FieldShell';

export function NumberField({
  question,
  value,
  onChange,
  error,
}: {
  question: NumberQuestion;
  value?: number | null;
  onChange: (v: number | null) => void;
  error?: string;
}) {
  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          min={question.min}
          max={question.max}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
          className="min-h-[48px] w-32 rounded-lg border border-rule bg-white px-4 py-3 text-ink tnum"
        />
        {question.unit && <span className="text-muted">{question.unit}</span>}
      </div>
    </FieldShell>
  );
}
