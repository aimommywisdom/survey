// lib/db-types.ts
// SQLite 沒有 boolean / jsonb / 陣列，讀寫時由 lib/db.ts 依這份清單轉換：
//   BOOL_COLS：integer 0/1 ↔ boolean
//   JSON_COLS：JSON 字串 ↔ 物件/陣列
//   UUID_ID_TABLES：insert 沒給 id 時自動補 crypto.randomUUID()（對應 Postgres 的 gen_random_uuid()）
// 新增表或欄位時記得補上，否則程式會拿到 0/1 或字串。

export const BOOL_COLS: Record<string, string[]> = {
  surveys: ['is_open'],
  responses: ['is_proxy'],
  pain_points: ['is_custom', 'needs_sign'],
};

export const JSON_COLS: Record<string, string[]> = {
  surveys: ['definition', 'source_refs'],
  responses: ['answers'],
  bank_blocks: ['purpose', 'industry', 'audience', 'item_codes'],
  analyses: ['tna_snapshot'],
};

export const UUID_ID_TABLES = new Set([
  'projects',
  'surveys',
  'responses',
  'pain_points',
  'skill_scores',
  'api_keys',
  'analyses',
]);
