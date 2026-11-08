// 維護 script 共用：把 SQL 丟給 wrangler 對 D1 執行（本機或遠端）。
// 預設本機（.wrangler/state/v3，與 next dev 同一份）；加 --remote 才打正式 D1。
// 認證走 wrangler 的登入（npx wrangler login），不需要任何 key 在 .env。
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const D1_NAME = 'mwform';
export const REMOTE = process.argv.includes('--remote');
export const targetLabel = () => (REMOTE ? '正式 D1（--remote）' : '本機 D1');

export function sqlLit(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) return sqlLit(v.toISOString());
  if (typeof v === 'object') return sqlLit(JSON.stringify(v));
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function wrangler(args: string[]): string {
  const r = spawnSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || ''));
    throw new Error(`wrangler ${args.slice(0, 3).join(' ')} 失敗`);
  }
  return r.stdout;
}

// 執行多句 SQL（寫到暫存檔再用 --file，避免 shell 引號問題）
export function execSql(statements: string[]): void {
  if (!statements.length) return;
  const dir = mkdtempSync(join(tmpdir(), 'mwform-d1-'));
  const file = join(dir, 'batch.sql');
  try {
    writeFileSync(file, statements.join('\n') + '\n');
    wrangler(['d1', 'execute', D1_NAME, REMOTE ? '--remote' : '--local', '--yes', '--file', file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// 查詢（單句 SELECT），回傳 results 陣列
export function querySql<T = Record<string, unknown>>(sql: string): T[] {
  const out = wrangler([
    'd1', 'execute', D1_NAME, REMOTE ? '--remote' : '--local', '--yes', '--json', '--command', sql,
  ]);
  return JSON.parse(out.slice(out.indexOf('['))) [0].results as T[];
}
