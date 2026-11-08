// lib/db.ts
// Cloudflare D1 相容層：模仿 supabase-js 的查詢寫法
//   from().select().eq().in().is().order().limit().single()/maybeSingle()
//   insert / upsert / update / delete（接 .select() 等於 RETURNING）
//   select(col, { count: 'exact', head: true }) → { count }
//   rpc('purge_expired_responses') → 原 Postgres function 的 SQLite 版
// 讓既有 route 的查詢寫法不用改，回傳同樣的 { data, error, count } 形狀。
// 轉換規則（清單在 lib/db-types.ts）：boolean ↔ INTEGER 0/1、JSON 欄位 ↔ 字串。
//
// 綁定來源：OpenNext 的 getCloudflareContext().env（wrangler.jsonc 的 DB）。
//   - 部署：Workers 執行期自動注入
//   - 本機 next dev：next.config.ts 的 initOpenNextCloudflareForDev() 用 wrangler
//     的本機模擬（.wrangler/state/v3）提供同樣的綁定
// ★ 綁定要在 request 時才拿得到，所以一律在呼叫時讀，不在模組頂層讀。

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { BOOL_COLS, JSON_COLS, UUID_ID_TABLES } from './db-types';

type CfBindings = { DB?: D1Database };

function cfEnv(): CfBindings | undefined {
  try {
    return getCloudflareContext().env as unknown as CfBindings;
  } catch {
    return undefined;
  }
}

export function hasDb(): boolean {
  return Boolean(cfEnv()?.DB);
}

export function getD1(): D1Database {
  const db = cfEnv()?.DB;
  if (!db) {
    throw new Error('D1 binding "DB" 不存在：請確認 wrangler.jsonc 的 d1_databases 設定');
  }
  return db;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// 型別：R＝列型別（預設 any，與未帶 Database 型別參數的 supabase-js 一致），D＝data 的型別
//   select() → R[]、single() → R、maybeSingle() → R | null、insert/update/delete 未接 select() → null
// 這樣既有 route 的 (data ?? []).map(...) 等寫法型別都不必改。
type Filter = { sql: string; args: unknown[] };
export type DbError = { message: string; code?: string };
export type Result<T = any> = {
  data: T;
  error: DbError | null;
  count?: number | null;
};
type Row = Record<string, unknown>;

// 只允許安全的識別字，避免欄位名被拿來拼 SQL
function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`不合法的欄位／表名：${name}`);
  }
  return name;
}

function toRow(table: string, obj: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (BOOL_COLS[table]?.includes(k)) out[k] = v === null ? null : v ? 1 : 0;
    else if (JSON_COLS[table]?.includes(k)) out[k] = v === null ? null : JSON.stringify(v);
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === 'object' && v !== null) out[k] = JSON.stringify(v);
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
    else out[k] = v;
  }
  return out;
}

function fromRow(table: string, row: Row | null): Row | null {
  if (!row) return row;
  const out: Row = { ...row };
  for (const k of BOOL_COLS[table] ?? [])
    if (k in out && out[k] !== null) out[k] = Boolean(out[k]);
  for (const k of JSON_COLS[table] ?? [])
    if (k in out && typeof out[k] === 'string') {
      try {
        out[k] = JSON.parse(out[k] as string);
      } catch {
        out[k] = null;
      }
    }
  return out;
}

function toError(e: unknown): DbError {
  const msg = String((e as Error)?.message ?? e);
  const code = /UNIQUE constraint/i.test(msg) ? '23505' : undefined;
  return { message: msg, code };
}

class QueryBuilder<R = any, D = R[]> implements PromiseLike<Result<D>> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private cols = '*';
  private countMode = false;
  private headOnly = false;
  private filters: Filter[] = [];
  private orders: string[] = [];
  private limitN: number | null = null;
  private offsetN: number | null = null;
  private singleRow = false;
  private maybe = false;
  private payload: unknown = null;
  private returning = false;
  private conflictCols = 'id';

  constructor(private table: string) {
    ident(table);
  }

  select(cols = '*', opts?: { count?: string; head?: boolean }): QueryBuilder<R, R[]> {
    if (this.op === 'select') {
      this.cols = cols;
      if (opts?.count) this.countMode = true;
      if (opts?.head) this.headOnly = true;
    } else this.returning = true; // insert/update/upsert 後的 .select() = RETURNING
    return this as unknown as QueryBuilder<R, R[]>;
  }
  insert(v: unknown): QueryBuilder<R, null> {
    this.op = 'insert';
    this.payload = v;
    return this as unknown as QueryBuilder<R, null>;
  }
  upsert(v: unknown, opts?: { onConflict?: string }): QueryBuilder<R, null> {
    this.op = 'upsert';
    this.payload = v;
    if (opts?.onConflict) this.conflictCols = opts.onConflict;
    return this as unknown as QueryBuilder<R, null>;
  }
  update(v: unknown): QueryBuilder<R, null> {
    this.op = 'update';
    this.payload = v;
    return this as unknown as QueryBuilder<R, null>;
  }
  delete(): QueryBuilder<R, null> {
    this.op = 'delete';
    return this as unknown as QueryBuilder<R, null>;
  }

  eq(c: string, v: unknown) {
    ident(c);
    return v === null ? this.push(`${c} IS NULL`, []) : this.push(`${c} = ?`, [this.val(v)]);
  }
  neq(c: string, v: unknown) {
    ident(c);
    return v === null ? this.push(`${c} IS NOT NULL`, []) : this.push(`${c} != ?`, [this.val(v)]);
  }
  lt(c: string, v: unknown) {
    return this.push(`${ident(c)} < ?`, [this.val(v)]);
  }
  lte(c: string, v: unknown) {
    return this.push(`${ident(c)} <= ?`, [this.val(v)]);
  }
  gt(c: string, v: unknown) {
    return this.push(`${ident(c)} > ?`, [this.val(v)]);
  }
  gte(c: string, v: unknown) {
    return this.push(`${ident(c)} >= ?`, [this.val(v)]);
  }
  is(c: string, v: unknown) {
    return this.eq(c, v);
  }
  like(c: string, v: string) {
    return this.push(`${ident(c)} LIKE ?`, [v]);
  }
  ilike(c: string, v: string) {
    return this.push(`${ident(c)} LIKE ? COLLATE NOCASE`, [v]);
  }
  in(c: string, arr: unknown[]) {
    ident(c);
    if (!arr.length) return this.push('0 = 1', []);
    return this.push(
      `${c} IN (${arr.map(() => '?').join(',')})`,
      arr.map((x) => this.val(x))
    );
  }
  order(c: string, opts?: { ascending?: boolean }) {
    this.orders.push(`${ident(c)} ${opts?.ascending === false ? 'DESC' : 'ASC'}`);
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.offsetN = from;
    this.limitN = to - from + 1;
    return this;
  }
  single(): QueryBuilder<R, R> {
    this.singleRow = true;
    return this as unknown as QueryBuilder<R, R>;
  }
  maybeSingle(): QueryBuilder<R, R | null> {
    this.singleRow = true;
    this.maybe = true;
    return this as unknown as QueryBuilder<R, R | null>;
  }

  private val(v: unknown) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Date) return v.toISOString();
    return v;
  }
  private push(sql: string, args: unknown[]) {
    this.filters.push({ sql, args });
    return this;
  }
  private where(): { sql: string; args: unknown[] } {
    if (!this.filters.length) return { sql: '', args: [] };
    return {
      sql: ' WHERE ' + this.filters.map((f) => f.sql).join(' AND '),
      args: this.filters.flatMap((f) => f.args),
    };
  }

  then<R1 = Result<D>, R2 = never>(
    onf?: ((v: Result<D>) => R1 | PromiseLike<R1>) | null,
    onr?: ((e: unknown) => R2 | PromiseLike<R2>) | null
  ) {
    return (this.run() as Promise<Result<D>>).then(onf, onr);
  }

  // run() 內部一律用 T = any 組裝，對外由 D 決定型別
  private notFound(): Result<any> {
    return this.maybe
      ? { data: null, error: null }
      : { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
  }

  private async run(): Promise<Result<any>> {
    try {
      const db = getD1();
      const t = this.table;
      const w = this.where();

      if (this.op === 'select') {
        if (this.countMode && this.headOnly) {
          const r = await db
            .prepare(`SELECT COUNT(*) AS n FROM ${t}${w.sql}`)
            .bind(...w.args)
            .first<{ n: number }>();
          return { data: null, error: null, count: r?.n ?? 0 };
        }
        const cols =
          this.cols === '*'
            ? '*'
            : this.cols
                .split(',')
                .map((s) => ident(s.trim()))
                .join(', ');
        let sql = `SELECT ${cols} FROM ${t}${w.sql}`;
        if (this.orders.length) sql += ' ORDER BY ' + this.orders.join(', ');
        if (this.singleRow && this.limitN === null) this.limitN = 1;
        if (this.limitN !== null) sql += ` LIMIT ${Number(this.limitN)}`;
        if (this.offsetN !== null) sql += ` OFFSET ${Number(this.offsetN)}`;
        const r = await db.prepare(sql).bind(...w.args).all<Row>();
        const rows = (r.results ?? []).map((x) => fromRow(t, x));
        if (this.singleRow) {
          if (!rows.length) return this.notFound();
          return { data: rows[0], error: null };
        }
        return { data: rows, error: null, count: this.countMode ? rows.length : null };
      }

      if (this.op === 'insert' || this.op === 'upsert') {
        const list = Array.isArray(this.payload) ? (this.payload as Row[]) : [this.payload as Row];
        const stmts = list.map((o) => {
          const row = toRow(t, o);
          if (UUID_ID_TABLES.has(t) && !('id' in row)) row.id = crypto.randomUUID();
          const keys = Object.keys(row).map(ident);
          let sql = `INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
          if (this.op === 'upsert') {
            // 跟 PostgREST upsert 一樣：撞 key 只更新有給的欄位，其餘保留
            const conflict = this.conflictCols.split(',').map((s) => ident(s.trim()));
            const sets = keys.filter((k) => !conflict.includes(k));
            sql += sets.length
              ? ` ON CONFLICT(${conflict.join(', ')}) DO UPDATE SET ${sets
                  .map((k) => `${k} = excluded.${k}`)
                  .join(', ')}`
              : ` ON CONFLICT(${conflict.join(', ')}) DO NOTHING`;
          }
          sql += ' RETURNING *';
          return db.prepare(sql).bind(...keys.map((k) => row[k]));
        });
        // 多列一次 batch（同一交易），單列直接跑
        const results =
          stmts.length === 1 ? [await stmts[0].all<Row>()] : await db.batch<Row>(stmts);
        const out = results.map((r) => fromRow(t, r.results?.[0] ?? null) as Row);
        const data = this.singleRow || !Array.isArray(this.payload) ? out[0] : out;
        return { data: this.returning || this.singleRow ? data : null, error: null };
      }

      if (this.op === 'update') {
        const row = toRow(t, this.payload as Row);
        const keys = Object.keys(row).map(ident);
        if (!keys.length) return { data: null, error: null };
        const sql = `UPDATE ${t} SET ${keys.map((k) => `${k} = ?`).join(', ')}${w.sql} RETURNING *`;
        const r = await db
          .prepare(sql)
          .bind(...keys.map((k) => row[k]), ...w.args)
          .all<Row>();
        const rows = (r.results ?? []).map((x) => fromRow(t, x));
        if (this.singleRow) return rows.length ? { data: rows[0], error: null } : this.notFound();
        return { data: this.returning ? rows : null, error: null };
      }

      if (this.op === 'delete') {
        const r = await db.prepare(`DELETE FROM ${t}${w.sql} RETURNING *`).bind(...w.args).all<Row>();
        const rows = (r.results ?? []).map((x) => fromRow(t, x));
        return { data: this.returning ? rows : null, error: null };
      }

      return { data: null, error: { message: 'unsupported op' } };
    } catch (e) {
      return { data: null, error: toError(e) };
    }
  }
}

// ── RPC：原本 Postgres 的 stored function，改成這裡的 SQL ──────────────
// purge_expired_responses：依 projects.retention_days 刪除逾期作答（§8）。
// responses 刪除會因 FK ON DELETE CASCADE 連帶刪掉 pain_points / skill_scores
// （D1 預設開啟 foreign_keys）。時間比較用 julianday()，不受 ISO 字串格式差異影響。
const RPC: Record<string, (db: D1Database, args: Row) => Promise<unknown>> = {
  async purge_expired_responses(db) {
    const r = await db
      .prepare(
        `DELETE FROM responses WHERE id IN (
           SELECT r.id FROM responses r
           JOIN surveys s ON s.id = r.survey_id
           JOIN projects p ON p.id = s.project_id
           WHERE julianday(r.submitted_at) < julianday('now', '-' || p.retention_days || ' days')
         )`
      )
      .run();
    return Number((r.meta as { changes?: number })?.changes ?? 0);
  },
};

export async function rpc<T = any>(fn: string, args: Row = {}): Promise<Result<T | null>> {
  const impl = RPC[fn];
  if (!impl) return { data: null, error: { message: `rpc 不存在：${fn}` } };
  try {
    return { data: (await impl(getD1(), args)) as T, error: null };
  } catch (e) {
    return { data: null, error: toError(e) };
  }
}

export const db = {
  from<R = any>(table: string) {
    return new QueryBuilder<R>(table);
  },
  rpc,
};
export type Db = typeof db;
