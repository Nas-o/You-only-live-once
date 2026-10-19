/** 任务、阶段、大目标、知识点的构造与派生计算。 */
import { makeId } from './ids';
import { phasesFromReport } from './report';
import { nowIso } from './time';
import { MAX_TASK_LEVEL } from './types';
import type {
  Goal,
  GoalInput,
  KnowledgePoint,
  KnowledgePointInput,
  Phase,
  PhaseInput,
  ResearchReport,
  Task,
  TaskInput,
  TaskLevel,
} from './types';

export function createTask(input: TaskInput, now: Date = new Date()): Task {
  const at = nowIso(now);
  return {
    id: makeId('t_'),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    category: input.category ?? 'learning',
    status: 'backlog',
    priority: input.priority ?? 'medium',
    difficulty: Math.min(5, Math.max(1, Math.round(input.difficulty ?? 3))),
    estimatedMinutes: Math.max(0, Math.round(input.estimatedMinutes ?? 120)),
    dueDate: input.dueDate || undefined,
    progress: 0,
    createdAt: at,
    updatedAt: at,
    goalId: input.goalId || undefined,
    level: (input.level ?? 1) as TaskLevel,
    parentId: input.parentId || undefined,
    phases: [],
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    totalFocusSeconds: 0,
    sessionCount: 0,
    xpEarned: 0,
  };
}

export function createPhase(input: PhaseInput, order = 0): Phase {
  return {
    id: makeId('ph_'),
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    estimatedMinutes: Math.max(0, Math.round(input.estimatedMinutes ?? 30)),
    status: 'todo',
    dueDate: input.dueDate || undefined,
    order,
  };
}

export function createGoal(input: GoalInput, now: Date = new Date()): Goal {
  const palette = ['gold', 'jade', 'azure', 'rose', 'violet'] as const;
  return {
    id: makeId('g_'),
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    motto: input.motto?.trim() || undefined,
    color: input.color ?? palette[Math.floor(Math.random() * palette.length)] ?? 'gold',
    deadline: input.deadline || undefined,
    createdAt: nowIso(now),
    knowledgePoints: [],
  };
}

export function createKnowledgePoint(
  input: KnowledgePointInput,
  now: Date = new Date(),
): KnowledgePoint {
  return {
    id: makeId('k_'),
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    status: 'available',
    xp: 50,
    estimatedMinutes: input.estimatedMinutes ? Math.max(0, Math.round(input.estimatedMinutes)) : undefined,
    taskId: input.taskId || undefined,
    createdAt: nowIso(now),
  };
}

export function applyReportToTask(
  task: Task,
  report: ResearchReport,
  options: { phases: 'append' | 'replace' | 'none' } = { phases: 'none' },
  now: Date = new Date(),
): Task {
  if (options.phases !== 'none' && report.path.length > 0) {
    const generated = phasesFromReport(report, options.phases === 'append' ? task.phases.length : 0);
    task.phases = options.phases === 'append' ? [...task.phases, ...generated] : generated;
  }
  task.report = report;
  task.estimatedMinutes = report.calibratedMinutes;
  task.updatedAt = nowIso(now);
  if (task.status === 'backlog') task.status = 'active';
  return task;
}

/** 阶段加权的进度，用于在手动进度之外给出一个“拆解进度”参考 */
export function phaseProgress(task: Task): number {
  if (task.phases.length === 0) return 0;
  const total = task.phases.reduce((sum, p) => sum + Math.max(1, p.estimatedMinutes), 0);
  const done = task.phases
    .filter((p) => p.status === 'done')
    .reduce((sum, p) => sum + Math.max(1, p.estimatedMinutes), 0);
  return Math.round((done / total) * 100);
}

export function phaseEstimateMinutes(task: Task): number {
  return task.phases.reduce((sum, p) => sum + p.estimatedMinutes, 0);
}

export function actualMinutes(task: Task): number {
  return Math.round(task.totalFocusSeconds / 60);
}

/** 预估准确度 0-100；没有实际投入时返回 null */
export function estimateAccuracy(task: Task): number | null {
  if (task.estimatedMinutes <= 0 || task.totalFocusSeconds <= 0) return null;
  const ratio = task.totalFocusSeconds / 60 / task.estimatedMinutes;
  return Math.round(Math.max(0, 1 - Math.abs(ratio - 1)) * 100);
}

export function isReportReady(task: Task): boolean {
  return Boolean(task.report) && (task.report?.score ?? 0) > 0;
}

export function isOverdueTask(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate || task.status === 'done' || task.status === 'archived') return false;
  const today = nowIso(now).slice(0, 10);
  return task.dueDate < today;
}

export function nextPhase(task: Task): Phase | undefined {
  return task.phases.find((p) => p.status !== 'done');
}

export function sortByUpdated(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function goalProgress(goal: Goal): {
  lit: number;
  total: number;
  percent: number;
  complete: boolean;
} {
  const total = goal.knowledgePoints.length;
  const lit = goal.knowledgePoints.filter((p) => p.status === 'lit').length;
  return {
    lit,
    total,
    percent: total === 0 ? 0 : Math.round((lit / total) * 100),
    complete: total > 0 && lit === total,
  };
}


/** 从当前任务向上回溯，返回根到当前的链路。 */
export function taskAncestors(tasks: Task[], taskId: string): Task[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const chain: Task[] = [];
  let current = byId.get(taskId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function taskDescendantIds(tasks: Task[], taskId: string): string[] {
  const result: string[] = [];
  const walk = (parentId: string) => {
    for (const task of tasks) {
      if (task.parentId !== parentId) continue;
      result.push(task.id);
      walk(task.id);
    }
  };
  walk(taskId);
  return result;
}

/** 校验 parent 关系是否合法：层级相邻、不能指向自己或后代、最多 3 级。 */
export function canAssignTaskParent(
  tasks: Task[],
  taskId: string,
  parentId: string | undefined,
  level: TaskLevel,
): boolean {
  if (level === 1) return !parentId;
  if (!parentId) return false;
  if (parentId === taskId) return false;
  const parent = tasks.find((task) => task.id === parentId);
  if (!parent || parent.level !== level - 1) return false;
  if (taskDescendantIds(tasks, taskId).includes(parentId)) return false;
  return level <= MAX_TASK_LEVEL;
}

export function taskParentLevel(level: TaskLevel): TaskLevel | null {
  return level > 1 ? ((level - 1) as TaskLevel) : null;
}
