/**
 * 调查报告（启程前的侦查）
 * 规则：一项任务第一次开始计时前，必须提交一份合格报告。
 * 报告会强制用户回答：学什么、为什么学、学到什么程度、怎么学、不学什么。
 */
import { makeId } from './ids';
import { nowIso } from './time';
import type { Phase, ReportInput, ResearchReport, Task } from './types';

export interface ReportValidation {
  ok: boolean;
  errors: Partial<Record<keyof ReportInput, string>>;
  score: number;
}

const LIMITS = {
  subject: [6, 40],
  goal: [8, 60],
  successCriteria: [8, 50],
  prerequisites: [4, 20],
  usefulScope: [8, 60],
  avoidScope: [4, 40],
  risks: [4, 40],
} as const;

function textLength(value: string | undefined): number {
  return (value ?? '').trim().length;
}

/** 与 UI 填写进度联动，0-100 */
export function reportCompleteness(input: ReportInput): number {
  const steps = input.path.filter((s) => s.title.trim().length > 0);
  const qualitySteps = steps.filter((s) => s.title.trim().length >= 2 && s.estimatedMinutes >= 5);
  const resources = input.resources.filter((r) => r.title.trim().length > 0);
  const stepDetail = steps.filter((s) => (s.detail ?? '').trim().length > 0).length;

  let score = 0;
  score += Math.min(textLength(input.subject) / 24, 1) * 10;
  score += Math.min(textLength(input.goal) / 36, 1) * 15;
  score += Math.min(textLength(input.successCriteria) / 32, 1) * 15;
  score += Math.min(qualitySteps.length / 4, 1) * 12;
  score += steps.length > 0 ? Math.min((stepDetail / steps.length) * 8, 8) : 0;
  score += Math.min(resources.length / 3, 1) * 10;
  score += Math.min(textLength(input.usefulScope) / 36, 1) * 8;
  score += Math.min(textLength(input.avoidScope) / 24, 1) * 7;
  score += Math.min(textLength(input.risks) / 24, 1) * 5;
  score += input.calibratedMinutes >= 10 ? 5 : 0;
  score += Math.min(textLength(input.prerequisites) / 14, 1) * 5;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function validateReport(input: ReportInput): ReportValidation {
  const errors: ReportValidation['errors'] = {};
  const checkText = (key: keyof typeof LIMITS) => {
    const [min, max] = LIMITS[key];
    const len = textLength(input[key] as string | undefined);
    if (len < min) {
      errors[key] = `至少写 ${min} 个字——这是对自己负责，不是走过场`;
    } else if (len > max * 12) {
      errors[key] = '内容过长，请精简到真正重要的部分';
    }
  };
  checkText('subject');
  checkText('goal');
  checkText('successCriteria');
  checkText('prerequisites');
  checkText('usefulScope');
  checkText('avoidScope');
  checkText('risks');

  const steps = input.path.filter((s) => s.title.trim().length > 0);
  if (steps.length < 2) {
    errors.path = '学习路径至少拆成 2 步，才能看清从哪开始';
  } else if (steps.some((s) => s.title.trim().length < 2)) {
    errors.path = '路径步骤名称太短';
  } else if (steps.some((s) => !Number.isFinite(s.estimatedMinutes) || s.estimatedMinutes < 5)) {
    errors.path = '每一步都要给出预计时间（至少 5 分钟）';
  }

  const resources = input.resources.filter((r) => r.title.trim().length > 0);
  if (resources.length < 1) {
    errors.resources = '至少列出一个具体的信息来源';
  }

  if (
    !Number.isFinite(input.calibratedMinutes) ||
    input.calibratedMinutes < 10 ||
    input.calibratedMinutes > 30000
  ) {
    errors.calibratedMinutes = '预计总用时需在 10 分钟到 500 小时之间';
  }

  if (!Number.isFinite(input.confidence) || input.confidence < 1 || input.confidence > 5) {
    errors.confidence = '请选择对时间估计的把握程度';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    score: reportCompleteness(input),
  };
}

export function emptyReportInput(task?: Pick<Task, 'title' | 'estimatedMinutes'>): ReportInput {
  return {
    subject: '',
    goal: '',
    successCriteria: '',
    prerequisites: '',
    usefulScope: '',
    avoidScope: '',
    risks: '',
    path: [
      { id: makeId('p_'), title: '', detail: '', estimatedMinutes: 30 },
      { id: makeId('p_'), title: '', detail: '', estimatedMinutes: 30 },
    ],
    resources: [{ id: makeId('r_'), title: '', type: 'docs' }],
    calibratedMinutes: task?.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 120,
    confidence: 3,
  };
}

export function normalizeReportInput(input: ReportInput): ReportInput {
  const clean = (s: string) => s.trim();
  return {
    subject: clean(input.subject),
    goal: clean(input.goal),
    successCriteria: clean(input.successCriteria),
    prerequisites: clean(input.prerequisites),
    usefulScope: clean(input.usefulScope),
    avoidScope: clean(input.avoidScope),
    risks: clean(input.risks),
    path: input.path
      .map((s) => ({
        id: s.id || makeId('p_'),
        title: clean(s.title),
        detail: clean(s.detail ?? ''),
        estimatedMinutes: Math.max(0, Math.round(Number(s.estimatedMinutes) || 0)),
      }))
      .filter((s) => s.title.length > 0),
    resources: input.resources
      .map((r) => ({
        id: r.id || makeId('r_'),
        title: clean(r.title),
        type: r.type,
        url: r.url?.trim() || undefined,
        note: r.note?.trim() || undefined,
      }))
      .filter((r) => r.title.length > 0),
    calibratedMinutes: Math.round(Number(input.calibratedMinutes) || 0),
    confidence: Math.min(5, Math.max(1, Math.round(Number(input.confidence) || 3))),
  };
}

export function createReport(input: ReportInput, now: Date = new Date()): ResearchReport {
  const normalized = normalizeReportInput(input);
  const at = nowIso(now);
  return {
    ...normalized,
    score: reportCompleteness(normalized),
    submittedAt: at,
    updatedAt: at,
    revisions: 0,
  };
}

export function reviseReport(
  previous: ResearchReport,
  input: ReportInput,
  now: Date = new Date(),
): ResearchReport {
  const normalized = normalizeReportInput(input);
  return {
    ...normalized,
    score: reportCompleteness(normalized),
    submittedAt: previous.submittedAt,
    updatedAt: nowIso(now),
    revisions: previous.revisions + 1,
  };
}

/** 把报告中的学习路径沉淀为任务阶段，形成“不同时期的任务拆分” */
export function phasesFromReport(report: ResearchReport, startOrder = 0): Phase[] {
  return report.path.map((step, index) => ({
    id: makeId('ph_'),
    title: step.title,
    note: step.detail || undefined,
    estimatedMinutes: Math.max(5, Math.round(step.estimatedMinutes)),
    status: 'todo',
    order: startOrder + index,
  }));
}

/** 报告门禁：没有报告，不允许开始计时或进入“攀登” */
export function hasReport(task: Task): boolean {
  return Boolean(task.report) && (task.report?.score ?? 0) > 0;
}

export function reportGrade(score: number): { grade: string; tone: 'high' | 'mid' | 'low' } {
  if (score >= 90) return { grade: '洞若观火', tone: 'high' };
  if (score >= 75) return { grade: '谋定后动', tone: 'mid' };
  if (score >= 60) return { grade: '初具章法', tone: 'low' };
  return { grade: '尚需打磨', tone: 'low' };
}
