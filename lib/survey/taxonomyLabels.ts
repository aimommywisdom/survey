// taxonomy 代碼 → 中文標籤（靜態 import，會被 bundle 進 worker）。
import taxonomy from '@/surveys/taxonomy.json';

type Dim = 'purpose' | 'industry' | 'audience' | 'ttqs_stage' | 'complexity';

const dims = (taxonomy as {
  dimensions: Record<string, { code: string; label: string }[]>;
}).dimensions;

function map(dim: Dim): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of dims[dim] ?? []) out[item.code] = item.label;
  return out;
}

const MAPS: Record<Dim, Record<string, string>> = {
  purpose: map('purpose'),
  industry: map('industry'),
  audience: map('audience'),
  ttqs_stage: map('ttqs_stage'),
  complexity: map('complexity'),
};

export function label(dim: Dim, code: string): string {
  return MAPS[dim]?.[code] ?? code;
}

export function labels(dim: Dim, codes?: string[]): string[] {
  return (codes ?? []).map((c) => label(dim, c));
}
