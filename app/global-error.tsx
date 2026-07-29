'use client';

// 最後防線：連 root layout 都出錯時。需自帶 html/body（會取代 layout）。
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBFAF7',
          color: '#16233A',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          頁面暫時載入不順
        </h1>
        <p style={{ color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
          請按下方按鈕再試一次；你填過的內容會自動保留。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: 52,
            padding: '0 32px',
            borderRadius: 8,
            border: 'none',
            background: '#16233A',
            color: '#FBFAF7',
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          重新載入
        </button>
      </body>
    </html>
  );
}
