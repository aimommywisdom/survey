// 打錯網址時的友善中文 404。
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center justify-center px-5 text-center">
      <h1 className="mb-3 text-2xl font-bold text-ink">找不到這個頁面</h1>
      <p className="leading-relaxed text-muted">
        連結可能不完整或已失效。
        <br />
        請向發問卷給你的窗口確認正確的網址。
      </p>
    </main>
  );
}
