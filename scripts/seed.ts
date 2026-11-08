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
// 2026-11 起資料層為 Cloudflare D1：這裡產生 upsert SQL 交給 wrangler 執行。

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadAndExpandProjectSurvey, SURVEYS_DIR } from '../lib/survey/load';
import type { Block, Option } from '../lib/survey/types';
import { execSql, querySql, sqlLit, targetLabel } from './d1';

const DRY = process.argv.includes('--dry');

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

  // ── 寫入 D1（產生 upsert SQL → wrangler d1 execute）──────────────
  console.log(`\n→ 寫入 ${targetLabel()}`);
  const now = new Date().toISOString();
  const sql: string[] = [];

  // 題庫索引（陣列欄位存 JSON 字串）
  for (const r of bankRows) {
    const row = { ...r, updated_at: now };
    const cols = Object.keys(row);
    sql.push(
      `INSERT INTO bank_blocks (${cols.join(', ')}) VALUES (${cols
        .map((c) => sqlLit((row as Record<string, unknown>)[c]))
        .join(', ')}) ON CONFLICT(code) DO UPDATE SET ${cols
        .filter((c) => c !== 'code')
        .map((c) => `${c} = excluded.${c}`)
        .join(', ')};`
    );
  }

  // 專案 + 問卷快照（撞 slug 只更新欄位、保留原 id）
  for (const p of projects) {
    sql.push(
      `INSERT INTO projects (id, slug, name, contact_name, retention_days, brand_domain) VALUES (${[
        randomUUID(),
        p.slug,
        p.name,
        p.contact_name ?? null,
        p.retention_days ?? 365,
        p.brand_domain ?? 'survey.aimommywisdom.com',
      ]
        .map(sqlLit)
        .join(', ')}) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, contact_name = excluded.contact_name, retention_days = excluded.retention_days, brand_domain = excluded.brand_domain;`
    );
    for (const e of expanded.filter((x) => x.project.slug === p.slug)) {
      sql.push(
        `INSERT INTO surveys (id, project_id, slug, title, version, definition, source_refs) VALUES (${sqlLit(
          randomUUID()
        )}, (SELECT id FROM projects WHERE slug = ${sqlLit(p.slug)}), ${[
          e.slug,
          e.definition.title,
          e.definition.version,
          e.definition,
          e.sourceRefs,
        ]
          .map(sqlLit)
          .join(', ')}) ON CONFLICT(project_id, slug, version) DO UPDATE SET title = excluded.title, definition = excluded.definition, source_refs = excluded.source_refs;`
      );
    }
  }

  execSql(sql);
  console.log(`✓ bank_blocks 已同步（${bankRows.length} 筆）`);
  for (const p of projects) {
    const [{ id }] = querySql<{ id: string }>(`SELECT id FROM projects WHERE slug = ${sqlLit(p.slug)}`);
    console.log(`✓ project ${p.slug}（${id}）`);
    for (const e of expanded.filter((x) => x.project.slug === p.slug)) {
      console.log(`  ✓ survey ${p.slug}/${e.slug} v${e.definition.version}`);
    }
  }

  console.log('\n✓ seed 完成。');
}

main().catch((err) => {
  console.error('\n✗ seed 失敗：', err.message ?? err);
  process.exit(1);
});
