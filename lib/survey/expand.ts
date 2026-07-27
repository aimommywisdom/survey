// $block / extends 展開 + overrides — 對應規格書 §13
//
// 純函式：不碰檔案系統，方便單測與在任何環境重用。
// 呼叫端傳入 resolver（怎麼拿到 block / template 由外層決定）。
//
// 為什麼要在「發布時」完全展開成快照（§13 correctness 關鍵）：
// 若不展開就存引用，半年後改了某個 block，去年已收案的問卷會跟著變，
// 歷史資料的題目與答案對不起來，跨案比較直接報廢。

import type {
  Block,
  BlockRef,
  Section,
  SurveyDefinition,
  SurveySource,
} from './types';
import { isBlockRef } from './types';

export interface ExpandResult {
  definition: SurveyDefinition;
  sourceRefs: {
    template?: { ref: string };
    blocks: { code: string; version: number; ref: string }[];
  };
}

export type BlockResolver = (ref: string) => Block;
export type TemplateResolver = (ref: string) => SurveySource;

// 依 dot-path 覆寫展開後 section 內某一題的欄位，例如 "q_dept.options"。
// 第一段是題目 id，其餘是該題物件內的路徑。
function applyOverride(section: Section, path: string, value: unknown): void {
  const parts = path.split('.');
  const qid = parts[0];
  const q = section.questions.find((x) => x.id === qid);
  if (!q) {
    throw new Error(
      `override 目標題目不存在：section "${section.id}" 內找不到 "${qid}"（path: ${path}）`
    );
  }
  const rest = parts.slice(1);
  if (rest.length === 0) {
    throw new Error(`override path 需指定欄位，不能只有題目 id：${path}`);
  }
  // 深入設定 q 內的路徑
  let cursor: Record<string, unknown> = q as unknown as Record<string, unknown>;
  for (let i = 0; i < rest.length - 1; i++) {
    const key = rest[i];
    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[rest[rest.length - 1]] = value;
}

// 深拷貝（結構單純的 JSON，用 structuredClone；無則退回 JSON round-trip）
function clone<T>(x: T): T {
  if (typeof structuredClone === 'function') return structuredClone(x);
  return JSON.parse(JSON.stringify(x)) as T;
}

function resolveBlockRef(
  ref: BlockRef,
  resolveBlock: BlockResolver,
  collected: ExpandResult['sourceRefs']['blocks']
): Section {
  const block = resolveBlock(ref.$block);
  const section = clone(block.section);
  if (ref.overrides) {
    for (const [path, value] of Object.entries(ref.overrides)) {
      applyOverride(section, path, value);
    }
  }
  collected.push({ code: block.code, version: block.version, ref: ref.$block });
  return section;
}

// 把一份來源檔（可能含 extends 與 $block）展開成完整快照。
export function expandSource(
  source: SurveySource,
  resolveBlock: BlockResolver,
  resolveTemplate: TemplateResolver
): ExpandResult {
  const blocks: ExpandResult['sourceRefs']['blocks'] = [];

  // 1) 若有 extends，先展開 template 當基底，再讓 source 覆寫其 meta。
  let base: SurveySource = source;
  let templateRef: { ref: string } | undefined;
  if (source.extends) {
    const template = resolveTemplate(source.extends);
    templateRef = { ref: source.extends };
    base = {
      ...template,
      ...source,
      // sections：source 若有提供就用 source 的（可整組重排 block 順序）；
      // 否則沿用 template 的 sections。
      sections: source.sections?.length ? source.sections : template.sections,
    };
  }

  // 2) 逐一解析 sections：$block 引用 → 展開；一般 section → 原樣帶入。
  const sections: Section[] = base.sections.map((s) =>
    isBlockRef(s) ? resolveBlockRef(s, resolveBlock, blocks) : clone(s)
  );

  const definition: SurveyDefinition = {
    slug: base.slug,
    version: base.version ?? 1,
    title: base.title ?? '',
    subtitle: base.subtitle,
    intro: base.intro,
    privacy: base.privacy,
    estimated_minutes: base.estimated_minutes,
    sections,
  };

  return {
    definition,
    sourceRefs: { template: templateRef, blocks },
  };
}
