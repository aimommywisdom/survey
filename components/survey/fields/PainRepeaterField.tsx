'use client';

// 招牌功能（§5）：痛點動態列 + live_calc 即時年工時。
// 設計重點（§9）：手機流暢、數字用 tabular-nums、計數器變動不造成版面位移。
import type {
  PainRepeaterQuestion,
  PainRepeaterField as PField,
} from '@/lib/survey/types';
import type { PainItemValue } from '@/lib/survey/answers';
import { annualHours, roundHours } from '@/lib/survey/scoring';
import { labelFor } from '@/lib/survey/painLabels';
import { FieldShell } from '../FieldShell';
import { useCountUp } from '../useCountUp';

export function PainRepeaterField({
  question,
  value,
  onChange,
  error,
}: {
  question: PainRepeaterQuestion;
  value?: PainItemValue[];
  onChange: (v: PainItemValue[]) => void;
  error?: string;
}) {
  const items = value ?? [];
  const byCode = (code: string) => items.find((it) => it.code === code);
  const atMax =
    question.max_items != null && items.length >= question.max_items;

  const togglePreset = (code: string, label: string, isCustom?: boolean) => {
    if (byCode(code)) {
      onChange(items.filter((it) => it.code !== code));
    } else {
      if (atMax) return;
      onChange([...items, { code, label, is_custom: !!isCustom }]);
    }
  };

  const patchItem = (code: string, patch: Partial<PainItemValue>) =>
    onChange(items.map((it) => (it.code === code ? { ...it, ...patch } : it)));

  // 總計年工時（signature 計數器）
  const totalHours = roundHours(
    items.reduce((sum, it) => sum + annualHours(it.frequency, it.minutes), 0)
  );

  return (
    <FieldShell
      id={question.id}
      label={question.label}
      help={question.help}
      required={question.required}
      error={error}
    >
      <div className="flex flex-col gap-2">
        {question.preset_items.map((preset) => {
          const item = byCode(preset.code);
          const selected = !!item;
          const disabled = !selected && atMax;
          return (
            <div key={preset.code}>
              <label
                className={[
                  'flex min-h-[52px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-ink bg-ink/5 font-medium'
                    : 'border-rule bg-white hover:border-ink/40',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-[var(--ink)]"
                  checked={selected}
                  disabled={disabled}
                  onChange={() =>
                    togglePreset(preset.code, preset.label, preset.allow_text)
                  }
                />
                <span>{preset.label}</span>
              </label>

              {/* 勾了才展開細項 */}
              {selected && item && (
                <ItemDetail
                  fields={question.fields}
                  item={item}
                  allowText={preset.allow_text}
                  liveDisplay={question.live_calc?.enabled ? question.live_calc.display : undefined}
                  onPatch={(patch) => patchItem(preset.code, patch)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* signature 總計計數器（§9 唯一視覺高點）— 永遠佔位，避免版面跳動 */}
      <TotalCounter hours={totalHours} hasItems={items.length > 0} />
    </FieldShell>
  );
}

// ── 單一痛點的細項 ────────────────────────────────
function ItemDetail({
  fields,
  item,
  allowText,
  liveDisplay,
  onPatch,
}: {
  fields: PField[];
  item: PainItemValue;
  allowText?: boolean;
  liveDisplay?: string;
  onPatch: (patch: Partial<PainItemValue>) => void;
}) {
  const hours = roundHours(annualHours(item.frequency, item.minutes));
  const showLive = liveDisplay && item.frequency && item.minutes != null;

  return (
    <div className="mt-2 ml-1 flex flex-col gap-4 rounded-lg border border-rule bg-white p-4">
      {allowText && (
        <SubText
          label="請說明是哪件事"
          value={item.custom_text ?? ''}
          onChange={(v) => onPatch({ custom_text: v })}
        />
      )}

      {fields.map((f) => (
        <SubField
          key={f.id}
          field={f}
          value={item[f.id as keyof PainItemValue] as string | number | undefined}
          onChange={(v) => onPatch({ [f.id]: v } as Partial<PainItemValue>)}
        />
      ))}

      {/* 每項即時年工時：固定行高，數字 tabular-nums 不位移 */}
      <p className="min-h-[1.6em] text-[0.98rem] font-medium text-ink">
        {showLive ? (
          <span>
            {liveDisplay!.split('{value}')[0]}
            <span className="tnum text-amber">{hours.toLocaleString()}</span>
            {liveDisplay!.split('{value}')[1] ?? ''}
          </span>
        ) : (
          <span className="text-muted">填「多久一次」和「每次幾分鐘」，這裡會即時算出年工時</span>
        )}
      </p>
    </div>
  );
}

// ── 通用子欄位（依 field.type 渲染）────────────────
function SubField({
  field,
  value,
  onChange,
}: {
  field: PField;
  value: string | number | undefined;
  onChange: (v: string | number) => void;
}) {
  if (field.type === 'single' && field.options) {
    return (
      <div>
        <p className="mb-2 font-medium text-ink">{field.label}</p>
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => {
            const isSel = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={[
                  'min-h-[44px] rounded-lg border px-4 py-2 transition-colors',
                  isSel
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-white text-ink hover:border-ink/40',
                ].join(' ')}
              >
                {labelFor(field.id, opt)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (field.type === 'number') {
    return (
      <div>
        <p className="mb-2 font-medium text-ink">{field.label}</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            value={value ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="min-h-[48px] w-28 rounded-lg border border-rule bg-white px-4 py-2 text-ink tnum"
          />
          {field.unit && <span className="text-muted">{field.unit}</span>}
        </div>
      </div>
    );
  }
  // short_text
  return (
    <SubText
      label={field.label}
      value={(value as string) ?? ''}
      onChange={onChange}
    />
  );
}

function SubText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-medium text-ink">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] w-full rounded-lg border border-rule bg-white px-4 py-2 text-ink"
      />
    </div>
  );
}

// ── 總計計數器（signature）────────────────────────
function TotalCounter({ hours, hasItems }: { hours: number; hasItems: boolean }) {
  const shown = useCountUp(hours);
  return (
    <div className="mt-5 flex min-h-[76px] flex-col justify-center rounded-lg border border-amber/40 bg-amber/5 px-5 py-4">
      {hasItems && hours > 0 ? (
        <p className="leading-tight text-ink">
          你一年總共花在這些事上約{' '}
          <span className="tnum text-[1.9rem] font-bold text-amber">
            {shown.toLocaleString()}
          </span>{' '}
          小時
        </p>
      ) : (
        <p className="text-muted">
          勾選項目、填上時間後，這裡會即時算出你一年的總工時。
        </p>
      )}
    </div>
  );
}
