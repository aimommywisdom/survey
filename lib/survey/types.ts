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
  exclusive?: boolean; // multi 專用：選了它就取消其他
  meta?: { role_group?: string; [k: string]: unknown }; // 分班等衍生資訊
}

// 條件邏輯：show_if = { 另一題id: [符合才顯示的值...], mode?: 'any'|'all' }
// mode 決定「多個條件」之間是 AND(all，預設) 還是 OR(any)。
export type ShowIf = Record<string, string[] | string>;

interface BaseQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required?: boolean;
  placeholder?: string;
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
  description?: string;
  questions: Question[];
}

export interface PrivacyNotice {
  // notice 有值時，同意頁只顯示這句簡短說明（不列下面五欄）。
  notice?: string;
  purpose?: string;
  items?: string;
  retention?: string;
  processor?: string;
  rights?: string;
  no_collect?: string;
  consent_label?: string; // 同意勾選的文字
  consent_required: boolean;
}

// 結尾頁設定
export interface ClosingConfig {
  title?: string;
  body?: string;
  show_personal_summary?: boolean;
  summary_template?: string; // 含 {total_annual_hours}
}

// 完全展開後的問卷定義（寫入 surveys.definition 的快照形態）
// 分類標籤（§14 taxonomy）
export interface SurveyTags {
  purpose?: string[];
  industry?: string[];
  audience?: string[];
  ttqs_stage?: string;
  kirkpatrick?: string | null;
  complexity?: string;
}

export interface SurveyDefinition {
  slug: string;
  version: number;
  title: string;
  subtitle?: string;
  intro?: string;
  privacy?: PrivacyNotice;
  estimated_minutes?: number;
  tags?: SurveyTags;
  closing?: ClosingConfig;
  sections: Section[];
}

// ── 題庫（未展開）形態 ──────────────────────────

// /surveys/blocks/*.json 的一個題組
// 一個 block 可含一或多個 section（sections 陣列）；舊格式的單數 section 仍相容。
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
  sections?: Section[];
  section?: Section; // 舊格式相容
}

// 覆寫規則：以 dot-path 覆寫展開後的欄位，例如 "q_dept.options"
export type Overrides = Record<string, unknown>;

// 往指定段落追加題目
export interface AppendSpec {
  section_id: string;
  questions: Question[];
}

// /surveys/projects/<proj>/*.json 或 /templates/*.json 的來源檔（未展開）
export interface SurveySource {
  slug: string;
  project?: string;
  version?: number;
  title?: string;
  subtitle?: string;
  intro?: string;
  privacy?: PrivacyNotice;
  estimated_minutes?: number;
  purpose?: string[];
  industry?: string[];
  audience?: string[];
  ttqs_stage?: string;
  kirkpatrick?: string | null;
  complexity?: string;
  closing?: ClosingConfig;
  extends?: string; // 'templates/ai-readiness-tna-staff.v1'
  sections?: (Section | BlockRef)[];
  // 頂層覆寫：dot-path（跨所有展開後的題目），例如 "q_dept.options"
  overrides?: Overrides;
  // 往某段落追加題目
  append_questions?: AppendSpec[];
}

// section 位置上的 $block 引用
export interface BlockRef {
  $block: string; // 'blocks/basic-profile'
  overrides?: Overrides;
}

export function isBlockRef(x: Section | BlockRef): x is BlockRef {
  return typeof (x as BlockRef).$block === 'string';
}
