// 題目外框：題號標題、必填標記、說明文字、錯誤訊息。
// 所有題型共用，維持一致的間距與可及性。
import type { ReactNode } from 'react';

export function FieldShell({
  id,
  label,
  help,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0 m-0">
      <legend className="mb-2 block text-[1.15rem] font-bold leading-relaxed text-ink">
        {label}
        {required && (
          <span className="ml-1 text-amber" aria-hidden>
            *
          </span>
        )}
      </legend>
      {help && <p className="mb-3 text-[0.95rem] text-muted">{help}</p>}
      <div id={id}>{children}</div>
      {error && (
        <p role="alert" className="mt-2 text-[0.95rem] font-medium text-amber">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// 選項列的共用樣式（單選/複選）：觸控目標 ≥ 48px、選中用 ink 邊框+淡底
export function optionRowClass(selected: boolean): string {
  return [
    'flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
    selected
      ? 'border-ink bg-ink/5 font-medium'
      : 'border-rule bg-white hover:border-ink/40',
  ].join(' ');
}
