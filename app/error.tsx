'use client';

// 路由層錯誤邊界：app 內部出錯時顯示友善中文。
// 對「載到舊 HTML、程式檔被新版換掉」這類錯誤，必須「整頁重新載入」才有用
// （React 的 reset() 只重繪、不會重抓 HTML/chunk），所以這裡用 location.reload()。
import { useEffect } from 'react';

function hardReload() {
  try {
    window.location.reload();
  } catch {
    /* noop */
  }
}

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    try {
      // 只自動重載一次，避免真的壞掉時無限重載
      if (!sessionStorage.getItem('mwform_retried')) {
        sessionStorage.setItem('mwform_retried', '1');
        const t = setTimeout(hardReload, 1200);
        return () => clearTimeout(t);
      }
    } catch {
      /* sessionStorage 不可用就略過自動重載 */
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center justify-center px-5 text-center">
      <h1 className="mb-3 text-2xl font-bold text-ink">頁面暫時載入不順</h1>
      <p className="mb-6 leading-relaxed text-muted">
        系統正在為你重新載入…
        <br />
        如果沒有自動恢復，請按下方按鈕再試一次。你填過的內容會自動保留。
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.removeItem('mwform_retried');
          } catch {
            /* noop */
          }
          hardReload();
        }}
        className="min-h-[52px] rounded-lg bg-ink px-8 text-lg font-medium text-paper"
      >
        重新載入
      </button>
    </main>
  );
}
