'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ProjectRow {
  slug: string;
  name: string;
  responseCount: number;
}

export function AdminDashboard({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();

  // 設定
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('anthropic');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // 分析
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; content: string } | null>(null);
  const [err, setErr] = useState('');

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
    } else {
      setSavedMsg('儲存失敗');
    }
  };

  const analyze = async (slug: string) => {
    setRunning(slug);
    setErr('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectSlug: slug }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '失敗');
      setResult({ slug, content: d.content });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-[820px] px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">MWForm 後台</h1>
        <button onClick={logout} className="text-muted underline">
          登出
        </button>
      </div>

      {/* LLM 設定 */}
      <section className="mb-8 rounded-lg border border-rule bg-white p-5">
        <h2 className="mb-3 font-bold text-ink">AI 分析設定</h2>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <span className="w-20 text-muted">供應商</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3"
            >
              <option value="anthropic">Anthropic（Claude）</option>
              <option value="openai">OpenAI（GPT）</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 text-muted">模型</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250929'}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3"
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 text-muted">API 金鑰</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '（已設定，留空則不變更）' : provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="min-h-[44px] flex-1 rounded-lg border border-rule bg-white px-3"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSettings}
              className="min-h-[44px] rounded-lg bg-ink px-5 font-medium text-paper"
            >
              儲存設定
            </button>
            {savedMsg && <span className="text-muted">{savedMsg}</span>}
            <span className="text-[0.85rem] text-muted">
              金鑰加密後存於後端，不會外流到前端。
            </span>
          </div>
        </div>
      </section>

      {/* 專案清單 */}
      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink">專案</h2>
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <div
              key={p.slug}
              className="flex items-center justify-between rounded-lg border border-rule bg-white px-4 py-3"
            >
              <div>
                <div className="font-medium text-ink">{p.name}</div>
                <div className="text-[0.9rem] text-muted">
                  {p.slug}｜已回收 {p.responseCount} 筆
                </div>
              </div>
              <button
                onClick={() => analyze(p.slug)}
                disabled={running !== null || !hasKey || p.responseCount === 0}
                className="min-h-[44px] rounded-lg bg-amber px-4 font-medium text-white disabled:opacity-40"
                title={!hasKey ? '請先設定 API 金鑰' : p.responseCount === 0 ? '尚無回收資料' : ''}
              >
                {running === p.slug ? '分析中…' : '產生課程規劃'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {err && <p className="mb-4 text-amber">{err}</p>}

      {/* 結果 */}
      {result && (
        <section className="rounded-lg border border-rule bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">課程規劃（{result.slug}）</h2>
            <button
              onClick={() => navigator.clipboard?.writeText(result.content)}
              className="text-muted underline"
            >
              複製
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
