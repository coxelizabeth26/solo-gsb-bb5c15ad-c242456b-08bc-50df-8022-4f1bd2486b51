/** mm:ss 或秒数 -> 秒 */
export function parseDuration(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes(':')) {
    const parts = s.split(':').map((p) => p.trim());
    if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) return null;
    const nums = parts.map(Number);
    if (nums.some((n) => n < 0)) return null;
    return nums.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 秒 -> m:ss（超过 60 分钟则 h:mm:ss） */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmt(n: number, digits = 4): string {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
