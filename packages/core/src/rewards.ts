/**
 * 攀登式正反馈系统：
 * 专注、写报告、拆阶段、完成任务、点亮知识点都会沉淀为「攀登值」，
 * 攀登值推动你抵达更高的营地，并解锁成就。奖励只加不减，让每一步都算数。
 */
import { makeId } from './ids';
import { dayKey, nowIso, todayKey } from './time';
import type { AppData, RewardEvent, RewardType } from './types';

export const XP = {
  focusPerMinute: 1,
  report: 60,
  revision: 10,
  phase: 25,
  taskBase: 120,
  perDifficulty: 30,
  onTimeBonus: 40,
  knowledge: 40,
  goal: 200,
  dailyGoal: 30,
  achievement: 50,
} as const;

export const ZONES = [
  { name: '山脚', tone: '#9a9183' },
  { name: '林间', tone: '#7fa083' },
  { name: '溪谷', tone: '#7d9aac' },
  { name: '草甸', tone: '#93a066' },
  { name: '岩壁', tone: '#ab8f77' },
  { name: '雪线', tone: '#a9b4ba' },
  { name: '冰川', tone: '#7da7b3' },
  { name: '山脊', tone: '#b08a4a' },
  { name: '风口', tone: '#a68c70' },
  { name: '冲顶营地', tone: '#b87a66' },
  { name: '峰顶', tone: '#b99a58' },
] as const;

export const ZONE_STAGES = ['初探', '渐入', '稳健', '抵达'] as const;
const STAGES_PER_ZONE = ZONE_STAGES.length;
export const MAX_LEVEL = ZONES.length * STAGES_PER_ZONE;

/** 升到下一级所需攀登值 */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.round(45 * Math.pow(level, 1.55));
}

export function xpToReachLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i += 1) total += xpToNextLevel(i);
  return total;
}

export interface LevelInfo {
  level: number;
  zoneIndex: number;
  zone: string;
  tone: string;
  stage: string;
  title: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  /** 当前等级内的进度 0-1 */
  progress: number;
  nextTitle?: string;
  isMax: boolean;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let consumed = 0;
  while (level < MAX_LEVEL) {
    const need = xpToNextLevel(level);
    if (xp < consumed + need) break;
    consumed += need;
    level += 1;
  }
  const zoneIndex = Math.floor((level - 1) / STAGES_PER_ZONE);
  const zone = ZONES[zoneIndex] ?? ZONES[0];
  const stage = ZONE_STAGES[(level - 1) % STAGES_PER_ZONE] ?? ZONE_STAGES[0];
  const xpForNext = xpToNextLevel(level);
  const title = `${zone.name}·${stage}`;
  const isMax = level >= MAX_LEVEL;
  const nextZoneIndex = Math.floor(level / STAGES_PER_ZONE);
  const nextZone = ZONES[nextZoneIndex] ?? zone;
  const nextStage = ZONE_STAGES[level % STAGES_PER_ZONE] ?? ZONE_STAGES[0];
  return {
    level,
    zoneIndex,
    zone: zone.name,
    tone: zone.tone,
    stage,
    title,
    totalXp: xp,
    xpIntoLevel: isMax ? 0 : xp - consumed,
    xpForNext,
    progress: isMax ? 1 : xpForNext > 0 ? (xp - consumed) / xpForNext : 1,
    nextTitle: isMax ? undefined : `${nextZone.name}·${nextStage}`,
    isMax,
  };
}

export function levelUpInfo(previousXp: number, nextXp: number): LevelInfo | null {
  const before = getLevelInfo(previousXp);
  const after = getLevelInfo(nextXp);
  return after.level > before.level ? after : null;
}

export function focusXp(seconds: number): number {
  return Math.max(1, Math.round(Math.max(0, seconds) / 60));
}

export function taskCompletionXp(task: {
  difficulty: number;
  totalFocusSeconds: number;
  estimatedMinutes: number;
}): number {
  const base = XP.taskBase + Math.max(1, Math.min(5, task.difficulty)) * XP.perDifficulty;
  const withinEstimate =
    task.estimatedMinutes <= 0 ||
    task.totalFocusSeconds <= task.estimatedMinutes * 60 * 1.1 ||
    task.totalFocusSeconds === 0;
  return base + (withinEstimate ? XP.onTimeBonus : 0);
}

export function grantXp(
  data: AppData,
  xp: number,
  label: string,
  type: RewardType,
  meta: { taskId?: string; at?: string } = {},
): RewardEvent {
  const amount = Math.max(0, Math.round(xp));
  const at = meta.at ?? nowIso();
  const event: RewardEvent = {
    id: makeId('xp_'),
    at,
    type,
    label,
    xp: amount,
    taskId: meta.taskId,
  };
  data.rewards.xp = Math.max(0, data.rewards.xp + amount);
  data.rewards.events = [event, ...data.rewards.events].slice(0, 300);
  return event;
}

export interface AchievementContext {
  reportCount: number;
  sessionCount: number;
  completedTasks: number;
  litPoints: number;
  maxSessionSeconds: number;
  /** 旧字段，保留用于读取历史数据；并行计时已取消。 */
  maxParallel: number;
  streak: number;
  todayCompleted: number;
  onTimeCompleted: number;
  totalFocusSeconds: number;
  bestReportScore: number;
  level: number;
  chips: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hint: string;
  icon: string;
  xp: number;
  check: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    name: '初次启程',
    description: '提交第一份调查报告',
    hint: '在开始任何任务前，先完成一次启程侦查',
    icon: 'compass',
    xp: 50,
    check: (c) => c.reportCount >= 1,
  },
  {
    id: 'first-focus',
    name: '心流初开',
    description: '完成第一次专注',
    hint: '点击任务上的「开始计时」',
    icon: 'timer',
    xp: 50,
    check: (c) => c.sessionCount >= 1,
  },
  {
    id: 'deep-work',
    name: '深度专注',
    description: '单次专注达到 45 分钟',
    hint: '给自己一段不被打断的完整时间',
    icon: 'moon',
    xp: 50,
    check: (c) => c.maxSessionSeconds >= 45 * 60,
  },
  {
    id: 'streak-3',
    name: '三日不辍',
    description: '连续 3 天有专注记录',
    hint: '连续三天留下专注记录',
    icon: 'flame',
    xp: 50,
    check: (c) => c.streak >= 3,
  },
  {
    id: 'streak-7',
    name: '七日同行',
    description: '连续 7 天有专注记录',
    hint: '把专注变成日常，而不是冲动',
    icon: 'flame',
    xp: 50,
    check: (c) => c.streak >= 7,
  },
  {
    id: 'deep-90',
    name: '九十分钟',
    description: '单次专注达到 90 分钟',
    hint: '一次只做一件事，把时间做深',
    icon: 'moon',
    xp: 50,
    check: (c) => c.maxSessionSeconds >= 90 * 60,
  },
  {
    id: 'session-10',
    name: '专注成习',
    description: '累计完成 10 次专注',
    hint: '不是偶尔努力，而是持续出现',
    icon: 'timer',
    xp: 50,
    check: (c) => c.sessionCount >= 10,
  },
  {
    id: 'report-5',
    name: '洞若观火',
    description: '累计提交 5 份调查报告',
    hint: '每份报告都在替你省下走弯路的时间',
    icon: 'search',
    xp: 50,
    check: (c) => c.reportCount >= 5,
  },
  {
    id: 'star-5',
    name: '手可摘星',
    description: '点亮 5 个知识点',
    hint: '在大目标星图里点亮知识点',
    icon: 'star',
    xp: 50,
    check: (c) => c.litPoints >= 5,
  },
  {
    id: 'task-1',
    name: '初见成效',
    description: '完成第一个任务',
    hint: '把一件事真正做完',
    icon: 'check',
    xp: 50,
    check: (c) => c.completedTasks >= 1,
  },
  {
    id: 'task-10',
    name: '十全十美',
    description: '累计完成 10 个任务',
    hint: '十次把想法变成结果',
    icon: 'trophy',
    xp: 50,
    check: (c) => c.completedTasks >= 10,
  },
  {
    id: 'focus-1000',
    name: '千分钟',
    description: '累计专注 1000 分钟',
    hint: '约 16.7 小时，足以改变一件事',
    icon: 'hourglass',
    xp: 50,
    check: (c) => c.totalFocusSeconds >= 1000 * 60,
  },
  {
    id: 'on-time-3',
    name: '言出必行',
    description: '3 个任务在预计时间内完成',
    hint: '先估计，再兑现',
    icon: 'target',
    xp: 50,
    check: (c) => c.onTimeCompleted >= 3,
  },
  {
    id: 'realm-2',
    name: '千枚筹码',
    description: '累计获得 1000 枚筹码',
    hint: '把专注、报告和摊牌积累到 1000 枚',
    icon: 'coins',
    xp: 50,
    check: (c) => c.chips >= 1000,
  },
  {
    id: 'day-2',
    name: '今日事今日毕',
    description: '单日完成 2 个任务',
    hint: '在同一天完成两个任务',
    icon: 'sun',
    xp: 50,
    check: (c) => c.todayCompleted >= 2,
  },
  {
    id: 'report-90',
    name: '谋定后动',
    description: '完成一个报告评分 ≥ 90 的任务',
    hint: '把侦查报告写到 90 分以上',
    icon: 'scroll',
    xp: 50,
    check: (c) => c.bestReportScore >= 90,
  },
];

/** 连续天数（以“有专注记录的连续本地日”计） */
export function focusStreak(sessions: AppData['sessions'], now: Date = new Date()): number {
  const days = new Set(sessions.map((s) => dayKey(s.endedAt || s.startedAt)));
  let cursor = todayKey(now);
  if (!days.has(cursor)) {
    cursor = dayKey(new Date(now.getTime() - 86400000));
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T12:00:00`);
    d.setDate(d.getDate() - 1);
    cursor = dayKey(d);
  }
  return streak;
}

export function achievementContext(data: AppData, now: Date = new Date()): AchievementContext {
  const doneTasks = data.tasks.filter((t) => t.status === 'done');
  const today = todayKey(now);
  const litPoints = data.goals.reduce(
    (sum, g) => sum + g.knowledgePoints.filter((p) => p.status === 'lit').length,
    0,
  );
  const totalFocusSeconds = data.sessions.reduce((sum, s) => sum + s.seconds, 0);
  const maxSessionSeconds = data.sessions.reduce((max, s) => Math.max(max, s.seconds), 0);
  const maxParallel = data.sessions.reduce((max, s) => Math.max(max, s.parallel), 0);
  const todayCompleted = doneTasks.filter((t) => t.completedAt && dayKey(t.completedAt) === today).length;
  const onTimeCompleted = doneTasks.filter(
    (t) =>
      t.estimatedMinutes > 0 &&
      t.totalFocusSeconds > 0 &&
      t.totalFocusSeconds <= t.estimatedMinutes * 60 * 1.1,
  ).length;
  const reports = data.tasks.filter((t) => t.report).map((t) => t.report!);
  return {
    reportCount: reports.length,
    sessionCount: data.sessions.length,
    completedTasks: doneTasks.length,
    litPoints,
    maxSessionSeconds,
    maxParallel,
    streak: focusStreak(data.sessions, now),
    todayCompleted,
    onTimeCompleted,
    totalFocusSeconds,
    bestReportScore: reports.reduce((max, r) => Math.max(max, r.score), 0),
    level: getLevelInfo(data.rewards.xp).level,
    chips: data.rewards.xp,
  };
}

/** 解锁满足条件的成就，并发放成就攀登值。返回本次新解锁的成就。 */
export function syncAchievements(data: AppData, now: Date = new Date()): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (let round = 0; round < 3; round += 1) {
    const ctx = achievementContext(data, now);
    const newly = ACHIEVEMENTS.filter(
      (a) => !data.rewards.unlocked[a.id] && a.check(ctx),
    );
    if (newly.length === 0) break;
    for (const achievement of newly) {
      data.rewards.unlocked[achievement.id] = nowIso(now);
      grantXp(data, achievement.xp, `成就 · ${achievement.name}`, 'achievement', {
        at: nowIso(now),
      });
      unlocked.push(achievement);
    }
  }
  return unlocked;
}

export function dailyGoalAwarded(data: AppData, day: string): boolean {
  return data.rewards.dailyGoalAwards.includes(day);
}

export function todayFocusSeconds(data: AppData, now: Date = new Date()): number {
  const today = todayKey(now);
  return data.sessions
    .filter((s) => dayKey(s.endedAt || s.startedAt) === today)
    .reduce((sum, s) => sum + s.seconds, 0);
}

export function unlockedAchievements(data: AppData): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => Boolean(data.rewards.unlocked[a.id]));
}
