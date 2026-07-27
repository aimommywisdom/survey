// MWForm seed — 對應規格書 §11 Day 1、§13
//
// 做兩件事：
//   1) 讀 /surveys/projects/*，展開 $block/extends 成「快照」寫入 surveys.definition
//      （§13 鐵律：發布時完全展開，歷史問卷才不會被日後改 block 波及）
//   2) 讀 /surveys/blocks/*，建立題庫索引 bank_blocks + 產生 bank.index.json
//
// 執行：
//   npm run seed            # 寫入 DB（需 .env.local 有 service_role key）
//   npm run seed -- --dry   # 只展開並印出，不連 DB（無 key 也能驗證引擎）
//
// 注意：只操作 MWForm 自己的表，service_role 僅本機用。

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadAndExpandProjectSurvey, SURVEYS_DIR } from '../lib/survey/load';
import type { Block, Option } from '../lib/survey/types';

const DRY = process.argv.includes('--dry');

// ── 載入 .env.local（tsx 不自動載入）──────────────
function loadEnv() {
  try {
    // Node 20.12+/22：直接載入 env 檔
    (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(
      '.env.local'
    );
  } catch {
    /* 沒有就算了，--dry 不需要 */
  }
}

// ── 題庫索引 ──────────────────────────────────────
function blockSections(block: Block) {
  return block.sections?.length ? block.sections : block.section ? [block.section] : [];
}

function collectItemCodes(block: Block): string[] {
  const codes: string[] = [];
  for (const s of blockSections(block)) {
    for (const q of s.questions) {
      if (q.type === 'pain_repeater') {
        codes.push(...q.preset_items.map((it) => it.code));
      } else if ('options' in q && Array.isArray((q as { options: Option[] }).options)) {
        codes.push(...(q as { options: Option[] }).options.map((o) => o.value));
      }
    }
  }
  return codes;
}

function buildBankIndex() {
  const dir = join(SURVEYS_DIR, 'blocks');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = files.map((f) => {
    const block = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Block;
    return {
      code: block.code,
      title: block.title,
      version: block.version,
      purpose: block.purpose ?? [],
      industry: block.industry ?? [],
      audience: block.audience ?? [],
      ttqs_stage: block.ttqs_stage ?? null,
      kirkpatrick: block.kirkpatrick ?? null,
      question_count: blockSections(block).reduce((n, s) => n + s.questions.length, 0),
      item_codes: collectItemCodes(block),
      notes: block.notes ?? null,
    };
  });
  // 產生 repo 內索引檔（§13：自動產生、勿手改）
  writeFileSync(
    join(SURVEYS_DIR, 'bank.index.json'),
    JSON.stringify(
      { _note: '由 seed script 自動產生，勿手改', blocks: rows },
      null,
      2
    ) + '\n'
  );
  return rows;
}

// ── 專案掃描 ──────────────────────────────────────
interface ProjectMeta {
  slug: string;
  name: string;
  contact_name?: string;
  retention_days?: number;
  brand_domain?: string;
  surveys: string[]; // ['staff.v1']
}

function listProjects(): ProjectMeta[] {
  const dir = join(SURVEYS_DIR, 'projects');
  return readdirSync(dir)
    .filter((d) => statSync(join(dir, d)).isDirectory())
    .map(
      (d) =>
        JSON.parse(
          readFileSync(join(dir, d, 'project.json'), 'utf8')
        ) as ProjectMeta
    );
}

async function main() {
  loadEnv();

  const projects = listProjects();
  const bankRows = buildBankIndex();

  console.log(
    `\n掃描到 ${projects.length} 個專案、${bankRows.length} 個題組。${
      DRY ? '（--dry：只展開不寫 DB）' : ''
    }`
  );

  // 展開所有問卷（不論 dry 與否都先跑，順便驗證引擎）
  const expanded = projects.flatMap((p) =>
    p.surveys.map((s) => {
      const slug = s.replace(/\.v\d+$/, ''); // 'staff.v1' → 'staff'
      const { definition, sourceRefs } = loadAndExpandProjectSurvey(
        p.slug,
        s
      );
      const sectionCount = definition.sections.length;
      const qCount = definition.sections.reduce(
        (n, sec) => n + sec.questions.length,
        0
      );
      console.log(
        `  ✓ ${p.slug}/${slug} v${definition.version}：${sectionCount} 段 / ${qCount} 題，引用 ${sourceRefs.blocks.length} 個 block`
      );
      return { project: p, slug, definition, sourceRefs };
    })
  );

  if (DRY) {
    console.log('\n--- 展開後快照（第一份，供人工檢視）---');
    console.log(JSON.stringify(expanded[0]?.definition ?? {}, null, 2));
    console.log('\n--dry 完成，未寫入 DB。');
    return;
  }

  // ── 寫入 DB（service_role）──────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      '\n✗ 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。' +
        '\n  請在 .env.local 填入新 Supabase 專案的 key，或用 `npm run seed -- --dry` 先驗證引擎。'
    );
    process.exit(1);
  }
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 題庫索引
  const { error: bankErr } = await db
    .from('bank_blocks')
    .upsert(
      bankRows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: 'code' }
    );
  if (bankErr) throw bankErr;
  console.log(`\n✓ bank_blocks 已同步（${bankRows.length} 筆）`);

  // 專案 + 問卷快照
  for (const p of projects) {
    const { data: proj, error: pErr } = await db
      .from('projects')
      .upsert(
        {
          slug: p.slug,
          name: p.name,
          contact_name: p.contact_name ?? null,
          retention_days: p.retention_days ?? 365,
          brand_domain: p.brand_domain ?? 'survey.vega-lin.com',
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();
    if (pErr) throw pErr;
    console.log(`✓ project ${p.slug}（${proj.id}）`);

    for (const e of expanded.filter((x) => x.project.slug === p.slug)) {
      const { error: sErr } = await db.from('surveys').upsert(
        {
          project_id: proj.id,
          slug: e.slug,
          title: e.definition.title,
          version: e.definition.version,
          definition: e.definition, // ← 快照
          source_refs: e.sourceRefs,
        },
        { onConflict: 'project_id,slug,version' }
      );
      if (sErr) throw sErr;
      console.log(`  ✓ survey ${p.slug}/${e.slug} v${e.definition.version}`);
    }
  }

  console.log('\n✓ seed 完成。');
}

main().catch((err) => {
  console.error('\n✗ seed 失敗：', err.message ?? err);
  process.exit(1);
});
