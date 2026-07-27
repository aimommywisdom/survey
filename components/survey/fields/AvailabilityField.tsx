'use client';

import type { AvailabilityQuestion } from '@/lib/survey/types';
import type { AvailabilityValue } from '@/lib/survey/answers';
import { FieldShell, optionRowClass } from '../FieldShell';

// 受訓時段：可配合的時段（複選）+ 一次最多可離開崗位多久（單選）。
export function AvailabilityField({
  question,
  value,
  onChange,
  error,
}: {
  question: AvailabilityQuestion;
  value?: AvailabilityValue;
  onChange: (v: AvailabilityValue) => void;
  error?: string;
}) {
  const slots = value?.slots ?? [];
  const toggleSlot = (v: string) =>
    onChange({
      slots: slots.includes(v) ? slots.filter((x) => x !== v) : [...slots, v],
      offsite: value?.offsite,
    });

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      <div className="flex flex-col gap-2">
        {question.slots.map((s) => {
          const isSel = slots.includes(s.value);
          return (
            <label key={s.value} className={optionRowClass(isSel)}>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                checked={isSel}
                onChange={() => toggleSlot(s.value)}
              />
              <span>{s.label}</span>
            </label>
          );
        })}
      </div>

      {question.offsite_options && question.offsite_options.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-medium text-ink">一次最多可以離開崗位多久？</p>
          <div className="flex flex-wrap gap-2">
            {question.offsite_options.map((opt) => {
              const isSel = value?.offsite === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ slots, offsite: opt.value })}
                  className={[
                    'min-h-[44px] rounded-lg border px-4 py-2 transition-colors',
                    isSel
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-white text-ink hover:border-ink/40',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </FieldShell>
  );
}
