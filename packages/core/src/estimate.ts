/**
 * 时间评估的确定性基线。
 * 先由代码算事实，再让 AI 解释和判断；AI 不负责加减乘除。
 */
import type { AiConfidence, AppData, EstimateFactor, Task } from './types';

export interface EstimatePeer {
  taskId: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  actualMinutes: number;
  ratio: number;
  sameGoal: boolean;
  weight: number;
}

export interface EstimateBaseline {
  taskId: string;
  estimateMinutes: number;
  focusMinutes: number;
  writingMinutes: number;
  actualMinutes: number;
  peerCount: number;
  peerRatio: number | null;
  peerActualMinutes: number | null;
  peers: EstimatePeer[];
  suggestedMin: number;
  suggestedMax: number;
  confidence: AiConfidence;
  factors: EstimateFactor[];
}

export function taskActualMinutes(data: AppData, task: Task): { focus: number; writing: number; total: number } {
  const focusSeconds = data.sessions
    .filter((session) => session.taskId === task.id)
    .reduce((sum, session) => sum + session.seconds, 0);
  const writingSeconds = (data.writingLogs ?? [])
    .filter((log) => log.taskId === task.id)
    .reduce((sum, log) => sum + log.seconds, 0);
  const focus = Math.round((focusSeconds || task.totalFocusSeconds) / 60);
  const writing = Math.round(writingSeconds / 60);
  return { focus, writing, total: focus + writing };
}

function weightedMedian(entries: { value: number; weight: number }[]): number | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= total / 2) return entry.value;
  }
  return sorted.at(-1)?.value ?? null;
}

function round15(value: number): number {
  return Math.max(15, Math.round(value / 15) * 15);
}

export function estimateBaseline(data: AppData, taskId: string): EstimateBaseline {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error('任务不存在');
  const actual = taskActualMinutes(data, task);
  const currentEstimate =
    task.estimatedMinutes > 0 ? task.estimatedMinutes : task.report?.calibratedMinutes ?? 120;

  const peers: EstimatePeer[] = [];
  for (const candidate of data.tasks) {
    if (candidate.id === task.id || candidate.status !== 'done') continue;
    if (candidate.estimatedMinutes <= 0) continue;
    const candidateActual = taskActualMinutes(data, candidate);
    if (candidateActual.total <= 0) continue;
    const ratio = Math.min(4, Math.max(0.25, candidateActual.total / candidate.estimatedMinutes));
    const sameGoal = Boolean(task.goalId) && candidate.goalId === task.goalId;
    const sameCategory = candidate.category === task.category;
    // 同一技能树和同一任务类型优先，但不完全排除其他样本。
    const weight = 1 + (sameGoal ? 0.8 : 0) + (sameCategory ? 0.4 : 0);
    peers.push({
      taskId: candidate.id,
      title: candidate.title,
      category: candidate.category,
      estimatedMinutes: candidate.estimatedMinutes,
      actualMinutes: candidateActual.total,
      ratio,
      sameGoal,
      weight,
    });
  }

  const peerRatio = weightedMedian(peers.map((peer) => ({ value: peer.ratio, weight: peer.weight })));
  const peerActualMinutes = weightedMedian(
    peers.map((peer) => ({ value: peer.actualMinutes, weight: peer.weight })),
  );
  const confidence: AiConfidence =
    peers.length >= 5 ? 'high' : peers.length >= 2 ? 'medium' : 'low';
  const ratio = peerRatio ?? 1;
  const center = Math.min(6000, Math.max(15, currentEstimate * ratio));
  const spread = confidence === 'high' ? 0.15 : confidence === 'medium' ? 0.22 : 0.3;
  const suggestedMin = round15(center * (1 - spread));
  const suggestedMax = round15(Math.max(suggestedMin + 15, center * (1 + spread)));

  const ratioImpact = ratio >= 1.1 ? 'up' : ratio <= 0.9 ? 'down' : 'neutral';
  const factors: EstimateFactor[] = [
    {
      label: '当前预计',
      impact: 'neutral',
      explanation: `任务表填写 ${Math.round(currentEstimate / 6) / 10} 小时${
        task.report ? `，报告校准 ${Math.round(task.report.calibratedMinutes / 6) / 10} 小时` : ''
      }。`,
    },
    {
      label: '历史校准',
      impact: ratioImpact,
      explanation:
        peerRatio === null
          ? '还没有可比较的已完成任务，暂按原估算保留。'
          : `同类任务实际 / 预计的中位数为 ${ratio.toFixed(2)}，样本 ${peers.length} 个。`,
    },
    {
      label: '实际投入',
      impact: actual.total > 0 ? (actual.total > currentEstimate ? 'up' : 'down') : 'neutral',
      explanation:
        actual.total > 0
          ? `目前已经投入 ${actual.total} 分钟（专注 ${actual.focus} + 写作 ${actual.writing}）。`
          : '任务还未产生实际投入，当前只能做前置判断。',
    },
  ];

  if (task.phases.length >= 4) {
    factors.push({
      label: '阶段数量',
      impact: 'up',
      explanation: `拆成了 ${task.phases.length} 个阶段，阶段间切换和收尾通常会额外增加时间。`,
    });
  }
  if (task.report && task.report.confidence <= 2) {
    factors.push({
      label: '报告把握度',
      impact: 'up',
      explanation: `你对这次估算的把握只有 ${task.report.confidence}/5，建议保留更多缓冲。`,
    });
  }
  if (confidence === 'low') {
    factors.push({
      label: '样本不足',
      impact: 'neutral',
      explanation: '完成更多同类任务后，时间评估会逐步变得更可靠。',
    });
  }

  return {
    taskId: task.id,
    estimateMinutes: currentEstimate,
    focusMinutes: actual.focus,
    writingMinutes: actual.writing,
    actualMinutes: actual.total,
    peerCount: peers.length,
    peerRatio,
    peerActualMinutes,
    peers: peers.sort((a, b) => b.weight - a.weight).slice(0, 8),
    suggestedMin,
    suggestedMax,
    confidence,
    factors,
  };
}
