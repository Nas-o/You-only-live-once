/**
 * 成长档案：不再用随机筹码驱动，而是把真实的专注、报告、阶段、任务、
 * 知识点与文档写作汇成一条可回看的证据链；每棵大目标是一棵技能树。
 */
import type { AppData, Goal, Task } from './types';

export type GrowthEvidenceKind =
  | 'focus'
  | 'writing'
  | 'report'
  | 'phase'
  | 'task'
  | 'knowledge'
  | 'goal';

export interface GrowthEvidence {
  id: string;
  at: string;
  kind: GrowthEvidenceKind;
  title: string;
  detail?: string;
  goalId?: string;
  taskId?: string;
  minutes?: number;
}

export interface GrowthStage {
  id: string;
  name: string;
  hint: string;
  minEvidence: number;
}

export const GROWTH_STAGES: GrowthStage[] = [
  { id: 'start', name: '刚启程', hint: '先留下第一条证据', minEvidence: 0 },
  { id: 'first', name: '留下第一条证据', hint: '开始比准备好更重要', minEvidence: 1 },
  { id: 'practice', name: '持续练习者', hint: '让专注变成日常', minEvidence: 6 },
  { id: 'builder', name: '独立完成者', hint: '把一件事从头做到尾', minEvidence: 20 },
  { id: 'maker', name: '持续建造者', hint: '让证据可以被别人看见', minEvidence: 40 },
  { id: 'teacher', name: '能教别人的人', hint: '讲清楚，才算真的懂', minEvidence: 80 },
  { id: 'long', name: '长期主义者', hint: '把时间站在自己这边', minEvidence: 150 },
];

export interface GrowthStageInfo {
  current: GrowthStage;
  next?: GrowthStage;
  progress: number;
  remaining: number;
}

export function growthStageInfo(evidenceCount: number): GrowthStageInfo {
  const count = Math.max(0, Math.floor(evidenceCount));
  let index = 0;
  for (let i = 0; i < GROWTH_STAGES.length; i += 1) {
    if (count >= GROWTH_STAGES[i]!.minEvidence) index = i;
  }
  const current = GROWTH_STAGES[index]!;
  const next = GROWTH_STAGES[index + 1];
  if (!next) return { current, progress: 1, remaining: 0 };
  const span = Math.max(1, next.minEvidence - current.minEvidence);
  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, (count - current.minEvidence) / span)),
    remaining: Math.max(0, next.minEvidence - count),
  };
}

function taskGoalId(data: AppData, taskId: string): string | undefined {
  return data.tasks.find((task) => task.id === taskId)?.goalId;
}

/** 把 AppData 展开为按时间倒序的证据链。 */
export function growthEvidence(data: AppData): GrowthEvidence[] {
  const evidence: GrowthEvidence[] = [];
  const tasks = new Map(data.tasks.map((task) => [task.id, task]));

  for (const session of data.sessions) {
    const minutes = Math.max(1, Math.round(session.seconds / 60));
    evidence.push({
      id: `ev-focus-${session.id}`,
      at: session.endedAt,
      kind: 'focus',
      title: `专注 ${minutes} 分钟`,
      detail: session.taskTitle,
      goalId: taskGoalId(data, session.taskId),
      taskId: session.taskId,
      minutes,
    });
  }

  for (const log of data.writingLogs ?? []) {
    const minutes = Math.max(1, Math.round(log.seconds / 60));
    const task = tasks.get(log.taskId);
    evidence.push({
      id: `ev-writing-${log.id}`,
      at: log.endedAt,
      kind: 'writing',
      title: `写作 ${minutes} 分钟`,
      detail: task?.title,
      goalId: task?.goalId,
      taskId: log.taskId,
      minutes,
    });
  }

  for (const task of data.tasks) {
    if (task.report) {
      evidence.push({
        id: `ev-report-${task.id}`,
        at: task.report.submittedAt,
        kind: 'report',
        title: `启程侦查 ${task.report.score} 分`,
        detail: task.title,
        goalId: task.goalId,
        taskId: task.id,
      });
    }
    for (const phase of task.phases) {
      if (phase.status !== 'done' || !phase.completedAt) continue;
      evidence.push({
        id: `ev-phase-${task.id}-${phase.id}`,
        at: phase.completedAt,
        kind: 'phase',
        title: '完成阶段',
        detail: `${task.title} · ${phase.title}`,
        goalId: task.goalId,
        taskId: task.id,
      });
    }
    if (task.status === 'done' && task.completedAt) {
      evidence.push({
        id: `ev-task-${task.id}`,
        at: task.completedAt,
        kind: 'task',
        title: '完成一件作品',
        detail: task.title,
        goalId: task.goalId,
        taskId: task.id,
      });
    }
  }

  for (const goal of data.goals) {
    for (const point of goal.knowledgePoints) {
      if (point.status !== 'lit' || !point.litAt) continue;
      evidence.push({
        id: `ev-knowledge-${goal.id}-${point.id}`,
        at: point.litAt,
        kind: 'knowledge',
        title: '点亮知识点',
        detail: point.title,
        goalId: goal.id,
        taskId: point.taskId,
      });
    }
    if (goal.completedAt) {
      evidence.push({
        id: `ev-goal-${goal.id}`,
        at: goal.completedAt,
        kind: 'goal',
        title: '技能树完成',
        detail: goal.title,
        goalId: goal.id,
      });
    }
  }

  return evidence.sort((a, b) => b.at.localeCompare(a.at));
}

export interface GrowthSummary {
  evidence: GrowthEvidence[];
  evidenceCount: number;
  focusMinutes: number;
  writingMinutes: number;
  reportCount: number;
  phaseCount: number;
  taskCount: number;
  knowledgeCount: number;
  goalCount: number;
  stage: GrowthStageInfo;
}

export function growthSummary(data: AppData): GrowthSummary {
  const evidence = growthEvidence(data);
  return {
    evidence,
    evidenceCount: evidence.length,
    focusMinutes: Math.round(data.sessions.reduce((sum, session) => sum + session.seconds, 0) / 60),
    writingMinutes: Math.round(
      (data.writingLogs ?? []).reduce((sum, log) => sum + log.seconds, 0) / 60,
    ),
    reportCount: data.tasks.filter((task) => Boolean(task.report)).length,
    phaseCount: data.tasks.reduce(
      (sum, task) => sum + task.phases.filter((phase) => phase.status === 'done').length,
      0,
    ),
    taskCount: data.tasks.filter((task) => task.status === 'done').length,
    knowledgeCount: data.goals.reduce(
      (sum, goal) => sum + goal.knowledgePoints.filter((point) => point.status === 'lit').length,
      0,
    ),
    goalCount: data.goals.filter((goal) => Boolean(goal.completedAt)).length,
    stage: growthStageInfo(evidence.length),
  };
}

export interface SkillStats {
  goal: Goal;
  tasks: Task[];
  focusMinutes: number;
  writingMinutes: number;
  evidenceCount: number;
  lit: number;
  total: number;
  progress: number;
}

export function skillStats(data: AppData, goal: Goal): SkillStats {
  const tasks = data.tasks.filter((task) => task.goalId === goal.id && task.status !== 'archived');
  const taskIds = new Set(tasks.map((task) => task.id));
  const focusMinutes = Math.round(
    data.sessions
      .filter((session) => taskIds.has(session.taskId))
      .reduce((sum, session) => sum + session.seconds, 0) / 60,
  );
  const writingMinutes = Math.round(
    (data.writingLogs ?? [])
      .filter((log) => taskIds.has(log.taskId))
      .reduce((sum, log) => sum + log.seconds, 0) / 60,
  );
  const evidenceCount = growthEvidence(data).filter((item) => item.goalId === goal.id).length;
  const lit = goal.knowledgePoints.filter((point) => point.status === 'lit').length;
  const total = goal.knowledgePoints.length;
  return {
    goal,
    tasks,
    focusMinutes,
    writingMinutes,
    evidenceCount,
    lit,
    total,
    progress: total === 0 ? 0 : Math.round((lit / total) * 100),
  };
}
