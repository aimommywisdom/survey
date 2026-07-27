'use client';

import { useEffect, useState } from 'react';
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

export function AdminDashboard({ surveys }: { surveys: SurveyRow[] }) {
  const router = useRouter();

  const [provider, setProvider] = useState<'openai' | 'anthropic'>('anthropic');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; title: string; content: string } | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.provider) setProvider(d.provider);
        if (d.model) setModel(d.model);
        setHasKey(!!d.hasKey);
      })
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSavedMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, model, apiKey: apiKey || undefined }),
    });
    if (res.ok) {
      setSavedMsg('已儲存');
      if (apiKey) setHasKey(true);
      setApiKey('');
    } else setSavedMsg('儲存失敗');
  };

  const analyze = async (row: SurveyRow) => {
    const key = `${row.projectSlug}/${row.surveySlug}`;
    setRunning(key);
    setErr('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectSlug: row.projectSlug, surveySlug: row.surveySlug }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '失敗');
      setResult({ key, title: row.title, content: d.content });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-[860px] px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">MWForm 後台</h1>
        <button onClick={logout} className="text-muted underline">登出</button>
      </div>

      {/* LLM 設定 */}
      <section className="mb-8 rounded-lg border border-rule bg-white p-5">
        <h2 className="mb-3 font-bold text-ink">AI 分析設定</h2>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-muted">供應商</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3">
              <option value="anthropic">Anthropic（Claude）</option>
              <option value="openai">OpenAI（GPT）</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-muted">模型</span>
            <input value={model} onChange={(e) => setModel(e.target.value)}
              placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250929'}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3" />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-muted">API 金鑰</span>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '（已設定，留空則不變更）' : provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={saveSettings} className="min-h-[44px] rounded-lg bg-ink px-5 font-medium text-paper">儲存設定</button>
            {savedMsg && <span className="text-muted">{savedMsg}</span>}
            <span className="text-[0.85rem] text-muted">金鑰加密後存於後端，不會外流到前端。</span>
          </div>
        </div>
      </section>

      {/* 問卷清單 */}
      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink">問卷</h2>
        <div className="flex flex-col gap-3">
          {surveys.map((s) => {
            const key = `${s.projectSlug}/${s.surveySlug}`;
            return (
              <div key={key} className="rounded-lg border border-rule bg-white p-4">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="font-bold text-ink">{s.title}</div>
                  <button
                    onClick={() => analyze(s)}
                    disabled={running !== null || !hasKey || s.responseCount === 0}
                    className="min-h-[40px] shrink-0 rounded-lg bg-amber px-4 font-medium text-white disabled:opacity-40"
                    title={!hasKey ? '請先設定 API 金鑰' : s.responseCount === 0 ? '尚無回收資料' : ''}
                  >
                    {running === key ? '分析中…' : '產生課程規劃'}
                  </button>
                </div>
                <div className="mb-2 text-[0.9rem] text-muted">
                  {s.projectName}｜已回收 {s.responseCount} 筆
                  {s.estimatedMinutes ? `｜約 ${s.estimatedMinutes} 分鐘` : ''}
                </div>
                {/* 分類標籤 */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[...s.audience, ...s.purpose, ...(s.complexity ? [s.complexity] : [])].map((t, i) => (
                    <span key={i} className="rounded-full border border-rule px-2 py-0.5 text-[0.8rem] text-muted">{t}</span>
                  ))}
                </div>
                {/* 填答連結 */}
                <div className="flex items-center gap-2">
                  <a href={s.link} target="_blank" rel="noreferrer"
                    className="truncate text-[0.85rem] text-focus underline">{s.link}</a>
                  <button onClick={() => copy(s.link, key)} className="shrink-0 text-[0.85rem] text-muted underline">
                    {copied === key ? '已複製' : '複製連結'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {err && <p className="mb-4 text-amber">{err}</p>}

      {result && (
        <section className="rounded-lg border border-rule bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">課程規劃 — {result.title}</h2>
            <button onClick={() => copy(result.content, 'result')} className="text-muted underline">
              {copied === 'result' ? '已複製' : '複製'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-[0.98rem] leading-relaxed text-ink">
            {result.content}
          </pre>
        </section>
      )}
    </main>
  );
}
