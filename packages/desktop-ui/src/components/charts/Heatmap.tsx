import { addDays, dayKey, focusByDay, formatDayKeyCN, startOfDay, type FocusSession } from '@yolo/core';

interface HeatmapProps {
  sessions: FocusSession[];
  weeks?: number;
  now?: Date;
}

/** 专注热力图：最近 N 周，每个格子代表一天 */
export function Heatmap({ sessions, weeks = 12, now = new Date() }: HeatmapProps) {
  const byDay = focusByDay(sessions);
  const today = startOfDay(now);
  const dayOfWeek = (today.getDay() + 6) % 7; // 周一 = 0
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (6 - dayOfWeek));
  const totalDays = weeks * 7;
  const start = new Date(endOfWeek);
  start.setDate(start.getDate() - (totalDays - 1));

  const cells = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const key = dayKey(date);
    const seconds = byDay.get(key) ?? 0;
    const minutes = Math.round(seconds / 60);
    const future = date.getTime() > now.getTime();
    let level = 0;
    if (minutes >= 180) level = 4;
    else if (minutes >= 90) level = 3;
    else if (minutes >= 45) level = 2;
    else if (minutes > 0) level = 1;
    return { key, minutes, level, future, label: formatDayKeyCN(key) };
  });

  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap"
        style={{ gridTemplateRows: 'repeat(7, 1fr)', gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
        role="img"
        aria-label="专注热力图"
      >
        {cells.map((cell) => (
          <span
            key={cell.key}
            className={`heatmap-cell level-${cell.level} ${cell.future ? 'is-future' : ''}`}
            title={`${cell.label} · ${cell.minutes} 分钟`}
          />
        ))}
      </div>
      <div className="heatmap-foot">
        <span>更早</span>
        <div className="heatmap-scale">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`heatmap-cell level-${level}`} />
          ))}
        </div>
        <span>最近 {weeks} 周 · 颜色越亮投入越多</span>
      </div>
    </div>
  );
}

/** 生成最近 N 天日期键（供其他地方复用） */
export function recentKeys(days: number, now: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, index) =>
    addDays(dayKey(now), -(days - 1 - index)),
  );
}
