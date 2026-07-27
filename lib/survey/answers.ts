// 作答值模型 — 一份作答就是 { [questionId]: AnswerValue }，序列化後存 responses.answers
// 對應規格書 §4。痛點(pain)與時段(availability)的值型別在 Day 3 補上。

// 單選：value 是選項 value；若選了 allow_text 的「其他」，text 存自填字串
export interface SingleValue {
  value: string;
  text?: string;
}

// 複選：values 是選項 value 陣列；text 為「其他」自填
export interface MultiValue {
  values: string[];
  text?: string;
}

// 能力基線：勾選到的選項 value 陣列（計分時查 level/weight）
export type BehaviorValue = string[];

// pain_repeater 一列（Day 3 會用到；先定義好型別）
export interface PainItemValue {
  code: string;
  label: string;
  is_custom?: boolean;
  custom_text?: string;
  frequency?: string;
  minutes?: number;
  format?: string;
  needs_sign?: string;
  deliver_to?: string;
}

// 受訓時段：可配合的時段 + 最多可離崗時長
export interface AvailabilityValue {
  slots: string[];
  offsite?: string;
}

export type AnswerValue =
  | SingleValue
  | MultiValue
  | BehaviorValue
  | PainItemValue[]
  | AvailabilityValue
  | number
  | string
  | null;

export type Answers = Record<string, AnswerValue>;

// 空值判斷（required 驗證用）
export function isEmpty(v: AnswerValue | undefined): boolean {
  if (v == null || v === '') return true;
  if (typeof v === 'number') return Number.isNaN(v);
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    if ('value' in v) return !v.value;
    if ('values' in v) return v.values.length === 0;
    if ('slots' in v) return (v as { slots: string[] }).slots.length === 0;
  }
  return false;
}
