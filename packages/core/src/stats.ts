/** 统计与洞察：专注趋势、时间校准、并行能力、领域分布。 */
import { dayKey, formatDayKeyShort, recentDayKeys, todayKey } from './time';
import type { AppData, FocusSession, Goal, Task, TaskCategory } from './types';

export interface Totals {
  focusSeconds: number;
  focusMinutes: number;
  sessionCount: number;
  taskDone: number;
  taskActive: number;
  reportCount: number;
  litPoints: number;
  avgSessionMinutes: number;
  parallelSessionCount: number;
  completionRate: number;
}

export function totals(data: AppData): Totals {
  const focusSeconds = data.sessions.reduce((sum, s) => sum + s.seconds, 0);
  const done = data.tasks.filter((t) => t.status === 'done').length;
  const active = data.tasks.filter((t) => t.status === 'active').length;
  const reportCount = data.tasks.filter((t) => t.report).length;
  const litPoints = data.goals.reduce(
    (sum, g) => sum + g.knowledgePoints.filter((p) => p.status === 'lit').length,
    0,
  );
  const considered = data.tasks.filter((t) => t.status !== 'archived').length;
  return {
    focusSeconds,
    focusMinutes: Math.round(focusSeconds / 60),
    sessionCount: data.sessions.length,
    taskDone: done,
    taskActive: active,
    reportCount,
    litPoints,
    avgSessionMinutes:
      data.sessions.length === 0
        ? 0
        : Math.round(focusSeconds / 60 / data.sessions.length),
    parallelSessionCount: data.sessions.filter((s) => s.parallel > 1).length,
    completionRate: considered === 0 ? 0 : Math.round((done / considered) * 100),
  };
}

export interface DaySeriesPoint {
  key: string;
  label: string;
  minutes: number;
  seconds: number;
  sessions: number;
}

export function daySeries(sessions: FocusSession[], days = 14, now: Date = new Date()): DaySeriesPoint[] {
  const keys = recentDayKeys(days, now);
  const map = new Map<string, { seconds: number; sessions: number }>();
  for (const session of sessions) {
    const key = dayKey(session.endedAt || session.startedAt);
    const entry = map.get(key) ?? { seconds: 0, sessions: 0 };
    entry.seconds += session.seconds;
    entry.sessions += 1;
    map.set(key, entry);
  }
  return keys.map((key) => {
    const entry = map.get(key) ?? { seconds: 0, sessions: 0 };
    return {
      key,
      label: formatDayKeyShort(key),
      minutes: Math.round(entry.seconds / 60),
      seconds: entry.seconds,
      sessions: entry.sessions,
    };
  });
}

export function focusByDay(sessions: FocusSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const session of sessions) {
    const key = dayKey(session.endedAt || session.startedAt);
    map.set(key, (map.get(key) ?? 0) + session.seconds);
  }
  return map;
}

export function todayFocusMinutes(sessions: FocusSession[], now: Date = new Date()): number {
  return Math.round((focusByDay(sessions).get(todayKey(now)) ?? 0) / 60);
}

export interface CategorySlice {
  category: TaskCategory;
  seconds: number;
  minutes: number;
  percent: number;
}

const CATEGORY_ORDER: TaskCategory[] = ['learning', 'practice', 'project', 'reading', 'other'];

export function categoryBreakdown(data: AppData): CategorySlice[] {
  const byTask = new Map(data.tasks.map((t) => [t.id, t]));
  const seconds: Record<TaskCategory, number> = {
    learning: 0,
    practice: 0,
    project: 0,
    reading: 0,
    other: 0,
  };
  for (const session of data.sessions) {
    const task = byTask.get(session.taskId);
    const category = task?.category ?? 'other';
    seconds[category] += session.seconds;
  }
  const total = CATEGORY_ORDER.reduce((sum, c) => sum + seconds[c], 0);
  return CATEGORY_ORDER.map((category) => ({
    category,
    seconds: seconds[category],
    minutes: Math.round(seconds[category] / 60),
    percent: total === 0 ? 0 : Math.round((seconds[category] / total) * 100),
  })).filter((slice) => slice.seconds > 0);
}

export interface EstimateRow {
  taskId: string;
  title: string;
  estimatedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  ratio: number;
  accuracy: number;
  status: Task['status'];
}

/** 预估 vs 实际：帮助用户成为更靠谱的时间评估者 */
export function estimateCalibration(tasks: Task[]): EstimateRow[] {
  return tasks
    .filter((t) => t.estimatedMinutes > 0 && t.totalFocusSeconds > 0)
    .map((task) => {
      const actual = Math.round(task.totalFocusSeconds / 60);
      const ratio = actual / task.estimatedMinutes;
      return {
        taskId: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: actual,
        deltaMinutes: actual - task.estimatedMinutes,
        ratio,
        accuracy: Math.round(Math.max(0, 1 - Math.abs(ratio - 1)) * 100),
        status: task.status,
      };
    })
    .sort((a, b) => b.actualMinutes - a.actualMinutes);
}

export function parallelDistribution(sessions: FocusSession[]): { parallel: number; count: number }[] {
  const map = new Map<number, number>();
  for (const session of sessions) {
    const p = Math.max(1, session.parallel || 1);
    map.set(p, (map.get(p) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([parallel, count]) => ({ parallel, count }));
}

export function bestDay(sessions: FocusSession[]): { key: string; minutes: number } | null {
  const map = focusByDay(sessions);
  let best: { key: string; minutes: number } | null = null;
  for (const [key, seconds] of map) {
    const minutes = Math.round(seconds / 60);
    if (!best || minutes > best.minutes) best = { key, minutes };
  }
  return best;
}

/** 目标综合状态：知识点点亮比例 */
export function goalStats(goal: Goal): { lit: number; total: number; percent: number } {
  const total = goal.knowledgePoints.length;
  const lit = goal.knowledgePoints.filter((p) => p.status === 'lit').length;
  return { lit, total, percent: total === 0 ? 0 : Math.round((lit / total) * 100) };
}

/** 今日聚焦任务：进行中且有截止/最近更新 */
export function todayTasks(data: AppData, now: Date = new Date()): Task[] {
  const today = todayKey(now);
  return data.tasks
    .filter((t) => t.status === 'active')
    .sort((a, b) => {
      const aDue = a.dueDate === today ? 0 : a.dueDate ? 1 : 2;
      const bDue = b.dueDate === today ? 0 : b.dueDate ? 1 : 2;
      if (aDue !== bDue) return aDue - bDue;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}
