// /surveys 檔案讀取 — 對應規格書 §11 Day 1「/surveys/*.json 讀取」
//
// server-only：使用 node fs。前台頁面應改從 DB 讀展開後的快照，
// 這支主要給 seed script 與 build/library 用。

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Block, SurveySource } from './types';
import {
  expandSource,
  type BlockResolver,
  type ExpandResult,
  type TemplateResolver,
} from './expand';

// repo 內 /surveys 根目錄
export const SURVEYS_DIR = join(process.cwd(), 'surveys');

function readJson<T>(relPath: string): T {
  // 允許帶或不帶 .json 副檔名
  const withExt = relPath.endsWith('.json') ? relPath : `${relPath}.json`;
  const abs = join(SURVEYS_DIR, withExt);
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch (err) {
    throw new Error(`讀取問卷檔失敗：${withExt}（${(err as Error).message}）`);
  }
}

// 'blocks/basic-profile' → surveys/blocks/basic-profile.json
export const resolveBlock: BlockResolver = (ref) => readJson<Block>(ref);

// 'templates/ai-readiness-tna-staff.v1' → surveys/templates/...json
export const resolveTemplate: TemplateResolver = (ref) =>
  readJson<SurveySource>(ref);

// 讀某專案某份問卷的來源檔並完全展開成快照。
export function loadAndExpandProjectSurvey(
  projectSlug: string,
  surveySlug: string
): ExpandResult {
  const source = readJson<SurveySource>(
    `projects/${projectSlug}/${surveySlug}`
  );
  return expandSource(source, resolveBlock, resolveTemplate);
}

// 直接展開任意來源物件（供 /api/surveys/compose 等重用）。
export function expandInMemory(source: SurveySource): ExpandResult {
  return expandSource(source, resolveBlock, resolveTemplate);
}
