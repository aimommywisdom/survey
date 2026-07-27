'use client';

import type { TextQuestion } from '@/lib/survey/types';
import { FieldShell } from '../FieldShell';

export function TextField({
  question,
  value,
  onChange,
  error,
}: {
  question: TextQuestion;
  value?: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const isLong = question.type === 'long_text';
  const cls =
    'w-full rounded-lg border border-rule bg-white px-4 py-3 text-ink placeholder:text-muted';

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      {isLong ? (
        <textarea
          rows={4}
          value={value ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} min-h-[96px] resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} min-h-[48px]`}
        />
      )}
    </FieldShell>
  );
}
