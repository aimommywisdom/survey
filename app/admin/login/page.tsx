'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setErr('密碼錯誤');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[380px] flex-col justify-center px-5">
      <h1 className="mb-6 text-2xl font-bold text-ink">MWForm 後台</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="後台密碼"
          className="min-h-[52px] rounded-lg border border-rule bg-white px-4 text-ink"
        />
        {err && <p className="text-amber">{err}</p>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="min-h-[52px] rounded-lg bg-ink px-6 text-lg font-medium text-paper disabled:opacity-40"
        >
          {busy ? '登入中…' : '登入'}
        </button>
      </form>
    </main>
  );
}
