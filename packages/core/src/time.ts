/** 时间与格式化工具。全部使用本地时区，避免跨时区日期错位。 */

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 本地日期键：YYYY-MM-DD */
export function dayKey(value: Date | string | number = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now);
}

/** 把 YYYY-MM-DD 解析为本地正午，规避夏令时边界 */
function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDayKey(fromKey).getTime();
  const b = parseDayKey(toKey).getTime();
  return Math.round((b - a) / (DAY * 1000));
}

export function startOfDay(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function endOfDay(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/** 秒 -> 01:23:45 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

/** 分钟 -> 「1 小时 30 分」 */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} 小时` : `${h} 小时 ${rest} 分`;
}

/** 秒 -> 紧凑展示，用于表格 */
export function formatSecondsShort(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h${rest}m`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayCN(value: Date | string = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  return `星期${WEEKDAYS[d.getDay()] ?? '日'}`;
}

export function formatDateCN(value: Date | string = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function formatFullDateCN(value: Date | string = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** YYYY-MM-DD -> 10/19 */
export function formatDayKeyShort(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** YYYY-MM-DD -> 10 月 19 日 */
export function formatDayKeyCN(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(m)} 月 ${Number(d)} 日`;
}

/** 相对日期描述 */
export function relativeDay(key: string, now: Date = new Date()): string {
  const diff = daysBetween(todayKey(now), key);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  if (diff > 2) return `还有 ${diff} 天`;
  return `已逾期 ${Math.abs(diff)} 天`;
}

export function isOverdue(key: string | undefined, now: Date = new Date()): boolean {
  if (!key) return false;
  return daysBetween(todayKey(now), key) < 0;
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** 以周一为一周开始，返回最近 N 周的日期键（含今天） */
export function recentDayKeys(days: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return '夜阑人静';
  if (h < 9) return '一日之计';
  if (h < 12) return '上午好';
  if (h < 14) return '日中而作';
  if (h < 18) return '下午好';
  if (h < 22) return '华灯初上';
  return '夜深了';
}

/** 秒数转“x.x 小时”用于统计 */
export function hours(seconds: number): string {
  return (seconds / HOUR).toFixed(1);
}

/** ISO 时间 -> 人类友好的相对时间（用于足迹、专注记录等） */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now.getTime() - then) / 1000));
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return formatDayKeyCN(dayKey(iso));
}
