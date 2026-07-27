// $block / extends 展開 + overrides + append_questions — 對應規格書 §13
//
// 純函式：不碰檔案系統，方便單測與在任何環境重用。
// 為什麼要在「發布時」完全展開成快照（§13 correctness 關鍵）：
// 若不展開就存引用，半年後改了某個 block，去年已收案的問卷會跟著變，跨案比較報廢。

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

function clone<T>(x: T): T {
  if (typeof structuredClone === 'function') return structuredClone(x);
  return JSON.parse(JSON.stringify(x)) as T;
}

// 一個 block 可能是新格式 sections[] 或舊格式 section
function blockSections(block: Block): Section[] {
  if (block.sections?.length) return block.sections;
  if (block.section) return [block.section];
  return [];
}

// 依 dot-path 覆寫「跨所有段落」的某一題欄位，例如 "q_dept.options"。
function applyOverride(sections: Section[], path: string, value: unknown): void {
  const parts = path.split('.');
  const qid = parts[0];
  let q: Record<string, unknown> | undefined;
  for (const s of sections) {
    const found = s.questions.find((x) => x.id === qid);
    if (found) {
      q = found as unknown as Record<string, unknown>;
      break;
    }
  }
  if (!q) throw new Error(`override 目標題目不存在：${qid}（path: ${path}）`);
  const rest = parts.slice(1);
  if (rest.length === 0) throw new Error(`override path 需指定欄位：${path}`);
  let cursor = q;
  for (let i = 0; i < rest.length - 1; i++) {
    const key = rest[i];
    if (cursor[key] == null || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[rest[rest.length - 1]] = value;
}

function resolveBlockRef(
  ref: BlockRef,
  resolveBlock: BlockResolver,
  collected: ExpandResult['sourceRefs']['blocks']
): Section[] {
  const block = resolveBlock(ref.$block);
  const sections = blockSections(block).map((s) => clone(s));
  // BlockRef 內的 overrides（舊模型仍支援）
  if (ref.overrides) {
    for (const [path, value] of Object.entries(ref.overrides)) {
      applyOverride(sections, path, value);
    }
  }
  collected.push({ code: block.code, version: block.version, ref: ref.$block });
  return sections;
}

export function expandSource(
  source: SurveySource,
  resolveBlock: BlockResolver,
  resolveTemplate: TemplateResolver
): ExpandResult {
  const blocks: ExpandResult['sourceRefs']['blocks'] = [];

  // 1) extends：template 當基底，source 覆寫 meta。
  let base: SurveySource = source;
  let templateRef: { ref: string } | undefined;
  if (source.extends) {
    const template = resolveTemplate(source.extends);
    templateRef = { ref: source.extends };
    base = {
      ...template,
      ...source,
      // sections 以 source 為主，沒提供就沿用 template。
      sections: source.sections?.length ? source.sections : template.sections,
    };
  }

  // 2) 解析 sections（$block → 展開成多段；一般 section 原樣帶入）。
  const sections: Section[] = (base.sections ?? []).flatMap((s) =>
    isBlockRef(s) ? resolveBlockRef(s, resolveBlock, blocks) : [clone(s)]
  );

  // 3) 頂層 overrides（客戶客製，dot-path 跨所有題目）。
  if (source.overrides) {
    for (const [path, value] of Object.entries(source.overrides)) {
      applyOverride(sections, path, value);
    }
  }

  // 4) append_questions：往指定段落追加題目。
  if (source.append_questions) {
    for (const ap of source.append_questions) {
      const target = sections.find((s) => s.id === ap.section_id);
      if (!target) {
        throw new Error(`append_questions 目標段落不存在：${ap.section_id}`);
      }
      target.questions.push(...clone(ap.questions));
    }
  }

  const definition: SurveyDefinition = {
    slug: base.slug,
    version: base.version ?? 1,
    title: base.title ?? '',
    subtitle: base.subtitle,
    intro: base.intro,
    privacy: base.privacy,
    estimated_minutes: base.estimated_minutes,
    tags: {
      purpose: base.purpose,
      industry: base.industry,
      audience: base.audience,
      ttqs_stage: base.ttqs_stage,
      kirkpatrick: base.kirkpatrick,
      complexity: base.complexity,
    },
    closing: base.closing,
    sections,
  };

  return { definition, sourceRefs: { template: templateRef, blocks } };
}
