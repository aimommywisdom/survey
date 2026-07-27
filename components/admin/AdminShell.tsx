'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SurveyRow {
  projectSlug: string;
  projectName: string;
  surveySlug: string;
  title: string;
  link: string;
  audience: string[];
  purpose: string[];
  complexity: string | null;
  estimatedMinutes: number | null;
  responseCount: number;
}

export interface DashboardData {
  totalResponses: number;
  surveyCount: number;
  painTop: { label: string; org_annual_hours: number; respondents: number }[];
  painTotalHours: number;
  tierDist: Record<string, number>;
  skillSample: number;
}

type Tab = 'dashboard' | 'classification' | 'planning' | 'howto' | 'access';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: '儀表板', icon: '📊' },
  { id: 'classification', label: '問卷分類', icon: '🗂️' },
  { id: 'planning', label: '課程規劃建議書', icon: '📝' },
  { id: 'howto', label: '使用方式', icon: '❓' },
  { id: 'access', label: '權限', icon: '🔑' },
];

export function AdminShell({
  surveys,
  dashboard,
}: {
  surveys: SurveyRow[];
  dashboard: DashboardData;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col md:flex-row">
      {/* 左側欄 */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule p-3 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
        <div className="mb-2 hidden px-2 text-lg font-bold text-ink md:block">
          MWForm 後台
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left transition-colors',
              tab === t.id ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/5',
            ].join(' ')}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={logout}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-muted hover:bg-ink/5 md:mt-auto"
        >
          <span aria-hidden>↩</span>登出
        </button>
      </nav>

      {/* 內容 */}
      <main className="flex-1 px-5 py-6">
        {tab === 'dashboard' && <DashboardView d={dashboard} surveys={surveys} />}
        {tab === 'classification' && <ClassificationView surveys={surveys} />}
        {tab === 'planning' && <PlanningView surveys={surveys} />}
        {tab === 'howto' && <HowToView />}
        {tab === 'access' && <AccessView onLogout={logout} />}
      </main>
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-5 text-2xl font-bold text-ink">{children}</h1>;
}

// ── 1. 儀表板 ─────────────────────────────────────
function DashboardView({ d, surveys }: { d: DashboardData; surveys: SurveyRow[] }) {
  const tierTotal = d.tierDist.entry + d.tierDist.basic + d.tierDist.advanced || 1;
  return (
    <>
      <H1>儀表板</H1>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="問卷數" value={d.surveyCount} />
        <Stat label="總回收" value={d.totalResponses} unit="筆" />
        <Stat label="痛點年工時" value={d.painTotalHours.toLocaleString()} unit="小時" amber />
      </div>

      <div className="mb-6 rounded-lg border border-rule bg-white p-4">
        <h2 className="mb-3 font-bold text-ink">各問卷回收</h2>
        {surveys.map((s) => (
          <div key={s.surveySlug} className="flex justify-between border-b border-rule py-1.5 last:border-0">
            <span className="text-ink">{s.title}</span>
            <span className="tnum text-muted">{s.responseCount} 筆</span>
          </div>
        ))}
      </div>

      {d.skillSample > 0 && (
        <div className="mb-6 rounded-lg border border-rule bg-white p-4">
          <h2 className="mb-3 font-bold text-ink">數位能力分級（{d.skillSample} 人）</h2>
          {(['entry', 'basic', 'advanced'] as const).map((k) => {
            const name = { entry: '入門', basic: '基礎', advanced: '進階' }[k];
            const n = d.tierDist[k] ?? 0;
            return (
              <div key={k} className="mb-2">
                <div className="mb-0.5 flex justify-between text-[0.9rem] text-muted">
                  <span>{name}</span>
                  <span className="tnum">{n} 人</span>
                </div>
                <div className="h-2 rounded-full bg-rule">
                  <div className="h-full rounded-full bg-ink" style={{ width: `${(n / tierTotal) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {d.painTop.length > 0 && (
        <div className="rounded-lg border border-rule bg-white p-4">
          <h2 className="mb-3 font-bold text-ink">痛點年工時 Top 5</h2>
          {d.painTop.map((p, i) => (
            <div key={i} className="flex justify-between border-b border-rule py-1.5 last:border-0">
              <span className="text-ink">{p.label}</span>
              <span className="tnum text-amber">{p.org_annual_hours.toLocaleString()} 小時</span>
            </div>
          ))}
        </div>
      )}

      {d.totalResponses === 0 && (
        <p className="text-muted">目前尚無回收資料。把問卷連結發出去，這裡就會出現統計。</p>
      )}
    </>
  );
}

function Stat({ label, value, unit, amber }: { label: string; value: string | number; unit?: string; amber?: boolean }) {
  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="text-[0.85rem] text-muted">{label}</div>
      <div className={`tnum text-3xl font-bold ${amber ? 'text-amber' : 'text-ink'}`}>
        {value}
        {unit && <span className="ml-1 text-base font-normal text-muted">{unit}</span>}
      </div>
    </div>
  );
}

// ── 2. 問卷分類 ───────────────────────────────────
function ClassificationView({ surveys }: { surveys: SurveyRow[] }) {
  const [copied, setCopied] = useState('');
  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  };

  // 依公司（專案）分組：一間公司一組，底下掛多份問卷。
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; items: SurveyRow[] }>();
    for (const s of surveys) {
      if (!m.has(s.projectSlug)) m.set(s.projectSlug, { name: s.projectName, items: [] });
      m.get(s.projectSlug)!.items.push(s);
    }
    return [...m.entries()].map(([slug, g]) => ({ slug, ...g }));
  }, [surveys]);

  return (
    <>
      <H1>問卷分類</H1>
      {groups.length === 0 && <p className="text-muted">目前沒有任何公司／問卷。</p>}
      <div className="flex flex-col gap-8">
        {groups.map((g) => {
          const total = g.items.reduce((n, s) => n + s.responseCount, 0);
          return (
            <section key={g.slug}>
              {/* 公司群組標題 */}
              <div className="mb-3 flex items-baseline gap-3 border-b-2 border-ink pb-2">
                <h2 className="text-lg font-bold text-ink">{g.name}</h2>
                <span className="text-[0.85rem] text-muted">
                  {g.items.length} 份問卷｜共 {total} 筆回收
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {g.items.map((s) => {
                  const key = `${s.projectSlug}/${s.surveySlug}`;
                  return (
                    <div key={key} className="rounded-lg border border-rule bg-white p-4">
                      <div className="font-bold text-ink">{s.title}</div>
                      <div className="mb-2 text-[0.9rem] text-muted">
                        已回收 {s.responseCount} 筆
                        {s.estimatedMinutes ? `｜約 ${s.estimatedMinutes} 分鐘` : ''}
                      </div>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {[...s.audience, ...s.purpose, ...(s.complexity ? [s.complexity] : [])].map((t, i) => (
                          <span key={i} className="rounded-full border border-rule px-2 py-0.5 text-[0.8rem] text-muted">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={s.link} target="_blank" rel="noreferrer" className="truncate text-[0.85rem] text-focus underline">{s.link}</a>
                        <button onClick={() => copy(s.link, key)} className="shrink-0 text-[0.85rem] text-muted underline">
                          {copied === key ? '已複製' : '複製連結'}
                        </button>
                        {s.responseCount > 0 && (
                          <a
                            href={`/api/admin/export?project=${s.projectSlug}&survey=${s.surveySlug}`}
                            className="shrink-0 rounded-lg border border-rule px-3 py-1 text-[0.85rem] font-medium text-ink hover:bg-ink/5"
                          >
                            ⬇ 匯出資料
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

// ── 3. 課程規劃建議書 ─────────────────────────────
function PlanningView({ surveys }: { surveys: SurveyRow[] }) {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('anthropic');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const withData = useMemo(() => surveys.filter((s) => s.responseCount > 0), [surveys]);
  const [sel, setSel] = useState('');
  const [supplement, setSupplement] = useState('');
  const [running, setRunning] = useState(false);
  const [content, setContent] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => {
      if (d.provider) setProvider(d.provider);
      if (d.model) setModel(d.model);
      setHasKey(!!d.hasKey);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sel && withData.length) setSel(`${withData[0].projectSlug}/${withData[0].surveySlug}`);
  }, [withData, sel]);

  const saveSettings = async () => {
    setSavedMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, model, apiKey: apiKey || undefined }),
    });
    if (res.ok) { setSavedMsg('已儲存'); if (apiKey) setHasKey(true); setApiKey(''); }
    else setSavedMsg('儲存失敗');
  };

  const generate = async () => {
    const row = surveys.find((s) => `${s.projectSlug}/${s.surveySlug}` === sel);
    if (!row) return;
    setRunning(true); setErr(''); setContent('');
    try {
      const res = await fetch('/api/admin/analyze', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectSlug: row.projectSlug, surveySlug: row.surveySlug, supplement }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '失敗');
      setContent(d.content);
    } catch (e) { setErr((e as Error).message); } finally { setRunning(false); }
  };

  const downloadProposal = () => {
    const row = surveys.find((s) => `${s.projectSlug}/${s.surveySlug}` === sel);
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `課程規劃建議書-${row?.title ?? sel}-${stamp}.md`;
    const header = `# 課程規劃建議書\n\n問卷：${row?.title ?? sel}\n產出日期：${stamp}\n\n---\n\n`;
    const blob = new Blob([header + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <H1>課程規劃建議書</H1>

      {/* AI 設定 */}
      <details className="mb-5 rounded-lg border border-rule bg-white p-4" open={!hasKey}>
        <summary className="cursor-pointer font-bold text-ink">AI 設定{hasKey ? '（已設定金鑰）' : '（尚未設定）'}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <select value={provider} onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
            className="min-h-[44px] rounded-lg border border-rule bg-white px-3">
            <option value="anthropic">Anthropic（Claude）</option>
            <option value="openai">OpenAI（GPT）</option>
          </select>
          <input value={model} onChange={(e) => setModel(e.target.value)}
            placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250929'}
            className="min-h-[44px] rounded-lg border border-rule bg-white px-3" />
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? '（已設定，留空則不變更）' : provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
            className="min-h-[44px] rounded-lg border border-rule bg-white px-3" />
          <div className="flex items-center gap-3">
            <button onClick={saveSettings} className="min-h-[44px] rounded-lg bg-ink px-5 font-medium text-paper">儲存設定</button>
            {savedMsg && <span className="text-muted">{savedMsg}</span>}
          </div>
        </div>
      </details>

      {withData.length === 0 ? (
        <p className="text-muted">目前沒有任何問卷有回收資料，先收到作答才能產生規劃。</p>
      ) : (
        <>
          <label className="mb-1 block font-medium text-ink">選擇問卷</label>
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            className="mb-4 min-h-[48px] w-full rounded-lg border border-rule bg-white px-3">
            {withData.map((s) => (
              <option key={`${s.projectSlug}/${s.surveySlug}`} value={`${s.projectSlug}/${s.surveySlug}`}>
                {s.title}（{s.responseCount} 筆）
              </option>
            ))}
          </select>

          <label className="mb-1 block font-medium text-ink">補充說明（選填）</label>
          <textarea value={supplement} onChange={(e) => setSupplement(e.target.value)} rows={4}
            placeholder="例如：預算 3 萬、每堂 2 小時、對象電腦程度偏低、希望多實作少講理論、上課時段只能週三下午…"
            className="mb-4 w-full rounded-lg border border-rule bg-white p-3 text-ink" />

          <button onClick={generate} disabled={running || !hasKey}
            className="min-h-[52px] w-full rounded-lg bg-amber px-6 text-lg font-medium text-white disabled:opacity-40">
            {running ? 'AI 分析中…（約 20-40 秒）' : '產生課程規劃建議書'}
          </button>
          {!hasKey && <p className="mt-2 text-[0.9rem] text-muted">請先在上方「AI 設定」填入金鑰。</p>}
          {err && <p className="mt-3 text-amber">{err}</p>}

          {content && (
            <div className="mt-6 rounded-lg border border-rule bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-ink">課程規劃建議書</h2>
                <div className="flex items-center gap-4">
                  <button onClick={() => { navigator.clipboard?.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="text-muted underline">{copied ? '已複製' : '複製全文'}</button>
                  <button onClick={downloadProposal} className="text-muted underline">⬇ 下載</button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-[0.98rem] leading-relaxed text-ink">{content}</pre>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── 4. 使用方式 ───────────────────────────────────
function HowToView() {
  return (
    <>
      <H1>使用方式</H1>
      <div className="flex flex-col gap-4 text-ink">
        <Step n={1} title="發放問卷">
          到「問卷分類」複製該問卷的填答連結，用 LINE、Email 發給對象，或印成 QR Code 貼公佈欄。同一份問卷所有人共用一個連結，不記名。
        </Step>
        <Step n={2} title="回收作答">
          填答會即時進資料庫。回「儀表板」或「問卷分類」看已回收幾筆。紙本回收的可用代填連結鍵入。
        </Step>
        <Step n={3} title="產生課程規劃建議書">
          到「課程規劃建議書」，先在「AI 設定」填一次你的 GPT 或 Claude 金鑰（加密保存）。選一份有回收資料的問卷，需要的話在「補充說明」填預算、時數、對象背景等，按「產生」，AI 會依實際數據給出需求分析與課程規劃。
        </Step>
        <Step n={4} title="每份問卷各自分析">
          三份問卷對象不同（第一線／全職同仁／主管），系統會針對各自的資料給不同規劃，不會混在一起。
        </Step>
      </div>
    </>
  );
}
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="mb-1 font-bold text-ink">
        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[0.85rem] text-paper">{n}</span>
        {title}
      </div>
      <p className="pl-8 leading-relaxed text-muted">{children}</p>
    </div>
  );
}

// ── 5. 權限 ───────────────────────────────────────
function AccessView({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <H1>權限</H1>
      <div className="mb-4 rounded-lg border border-rule bg-white p-4 leading-relaxed text-ink">
        <p className="mb-2">目前為<strong>單一後台密碼</strong>登入，登入後 12 小時有效。</p>
        <p className="text-muted">
          要更換密碼：請聯絡系統維護者更新伺服器上的後台密碼設定（ADMIN_PASSWORD）。未來可再升級為多人 Google 登入與角色權限。
        </p>
      </div>
      <button onClick={onLogout} className="min-h-[48px] rounded-lg border border-rule bg-white px-6 font-medium text-ink">
        登出
      </button>
    </>
  );
}
