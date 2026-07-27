// 問卷定義 Schema 型別 — 對應規格書 §5
// 題目全部由 JSON 驅動；新增題型才需要動這裡（並先跟 Vega 討論）。

export type QuestionType =
  | 'single'
  | 'multi'
  | 'scale'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'behavior_check'
  | 'pain_repeater'
  | 'availability';

export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

// frequency → 一年發生次數（§7 倍率表）
export const FREQUENCY_MULTIPLIER: Record<Frequency, number> = {
  daily: 250,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export interface Option {
  value: string;
  label: string;
  allow_text?: boolean; // 「其他」自填
  level?: 1 | 2 | 3 | 4; // behavior_check 專用
  weight?: number; // behavior_check 專用
}

// 條件邏輯：show_if = { 另一題id: [符合才顯示的值...] }
export type ShowIf = Record<string, string[]>;

interface BaseQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required?: boolean;
  show_if?: ShowIf;
}

export interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: Option[];
}

export interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  options: Option[];
  max_select?: number;
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale';
  min: number;
  max: number;
  min_label?: string;
  max_label?: string;
}

export interface TextQuestion extends BaseQuestion {
  type: 'short_text' | 'long_text';
}

export interface NumberQuestion extends BaseQuestion {
  type: 'number';
  unit?: string;
  min?: number;
  max?: number;
}

// 能力基線勾選：每個選項帶 level(1-4) 與 weight，自動計分（§7）
export interface BehaviorCheckQuestion extends BaseQuestion {
  type: 'behavior_check';
  options: Option[]; // 每個 option 必須有 level 與 weight
}

// 痛點動態列 — 平台招牌功能（§5）
export interface PainRepeaterField {
  id: string;
  type: 'single' | 'number' | 'short_text';
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  options?: string[]; // single 用：值清單（label 由前台字典對應）
}

export interface PainRepeaterQuestion extends BaseQuestion {
  type: 'pain_repeater';
  max_items?: number;
  min_items?: number;
  preset_items: { code: string; label: string; allow_text?: boolean }[];
  fields: PainRepeaterField[];
  live_calc?: {
    enabled: boolean;
    formula: 'annual_hours';
    display: string; // 含 {value} 佔位
  };
}

// 受訓時段矩陣（§5 / §16 待補內容）
export interface AvailabilityQuestion extends BaseQuestion {
  type: 'availability';
  slots: { value: string; label: string }[];
  offsite_options?: Option[];
}

export type Question =
  | SingleQuestion
  | MultiQuestion
  | ScaleQuestion
  | TextQuestion
  | NumberQuestion
  | BehaviorCheckQuestion
  | PainRepeaterQuestion
  | AvailabilityQuestion;

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export interface PrivacyNotice {
  purpose: string;
  items: string;
  retention: string;
  processor: string;
  rights: string;
  consent_required: boolean;
}

// 完全展開後的問卷定義（寫入 surveys.definition 的快照形態）
export interface SurveyDefinition {
  slug: string;
  version: number;
  title: string;
  subtitle?: string;
  intro?: string;
  privacy?: PrivacyNotice;
  estimated_minutes?: number;
  sections: Section[];
}

// ── 題庫（未展開）形態 ──────────────────────────

// /surveys/blocks/*.json 的一個題組
export interface Block {
  code: string;
  title: string;
  version: number;
  purpose?: string[];
  industry?: string[];
  audience?: string[];
  ttqs_stage?: string;
  kirkpatrick?: string | null;
  complexity?: string;
  notes?: string;
  section: Section; // 一個 block 展開成一個 section
}

// 覆寫規則：以 dot-path 覆寫展開後的欄位，例如 "q_dept.options"
export type Overrides = Record<string, unknown>;

// /surveys/projects/<proj>/*.json 或 /templates/*.json 的來源檔（未展開）
export interface SurveySource {
  slug: string;
  version?: number;
  title?: string;
  subtitle?: string;
  intro?: string;
  privacy?: PrivacyNotice;
  estimated_minutes?: number;
  extends?: string; // 'templates/ai-readiness-tna-staff.v1'
  sections: (Section | BlockRef)[];
}

// section 位置上的 $block 引用
export interface BlockRef {
  $block: string; // 'blocks/basic-profile'
  overrides?: Overrides;
}

export function isBlockRef(x: Section | BlockRef): x is BlockRef {
  return typeof (x as BlockRef).$block === 'string';
}
