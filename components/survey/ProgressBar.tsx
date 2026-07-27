'use client';

// 頂部進度條 + 「還剩約 X 分鐘」（§9）。amber 僅用於此與年工時計數器。
export function ProgressBar({
  current,
  total,
  minutesLeft,
}: {
  current: number; // 目前第幾段（1-based）
  total: number;
  minutesLeft: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="sticky top-0 z-10 bg-paper/95 pb-3 pt-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-[0.9rem] text-muted">
        <span>
          第 {current} 段，共 {total} 段
        </span>
        <span>還剩約 {Math.max(1, minutesLeft)} 分鐘</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-rule"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-amber transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
