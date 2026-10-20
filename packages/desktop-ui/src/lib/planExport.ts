import { formatMinutes, type AiAssessmentSession, type AiLearningPlan, type EstimateReview, type Task } from '@yolo/core';

/** 把当前 AI 学习计划、访谈和可选评估整理成可保存的 Markdown。 */
export function buildPlanMarkdown(
  task: Task,
  session: AiAssessmentSession,
  review?: EstimateReview,
): string {
  const plan = session.suggestedPlan;
  const lines: string[] = [];
  lines.push(`# ${task.title} · 学习计划`);
  lines.push('');
  lines.push(`生成时间：${new Date().toLocaleString()}`);
  lines.push(`任务预计：${formatMinutes(task.estimatedMinutes)}`);
  if (session.availableMinutes) lines.push(`可用时间：${formatMinutes(session.availableMinutes)}`);
  if (session.level) lines.push(`当前水平：${session.level}`);
  lines.push('');

  if (plan) {
    lines.push('## 计划摘要');
    lines.push('');
    lines.push(plan.summary);
    lines.push('');
    lines.push(`完整计划：${formatMinutes(plan.totalMinutes)}`);
    lines.push('');
    lines.push('## 完整学习路径');
    lines.push('');
    plan.phases.forEach((phase, index) => {
      lines.push(`### ${index + 1}. ${phase.title} · ${formatMinutes(phase.minutes)}${phase.critical ? ' · 关键' : ''}`);
      lines.push('');
      lines.push(`- 学什么：${phase.focus}`);
      lines.push(`- 验收：${phase.outcome}`);
      lines.push('');
    });
    lines.push('## 时间不足时的关键路径');
    lines.push('');
    lines.push(`建议投入：${formatMinutes(plan.minimumPath.minutes)}`);
    lines.push('');
    plan.minimumPath.items.forEach((item) => lines.push(`- ${item}`));
    if (plan.minimumPath.tradeoffs.length > 0) {
      lines.push('');
      lines.push('### 取舍');
      plan.minimumPath.tradeoffs.forEach((item) => lines.push(`- ${item}`));
    }
    if (plan.risks.length > 0) {
      lines.push('');
      lines.push('## 风险');
      plan.risks.forEach((item) => lines.push(`- ${item}`));
    }
  } else if (session.plan) {
    lines.push('## 我的计划');
    lines.push('');
    lines.push(session.plan);
  } else {
    lines.push('## 我的计划');
    lines.push('');
    lines.push('尚未填写计划。');
  }

  if (review) {
    lines.push('');
    lines.push('## AI 评估');
    lines.push('');
    lines.push(review.summary);
    if (review.tips && review.tips.length > 0) {
      lines.push('');
      review.tips.forEach((tip) => lines.push(`- **${tip.title}**：${tip.detail}`));
    }
    if (review.recommendations.length > 0) {
      lines.push('');
      lines.push('### 建议');
      review.recommendations.forEach((item) => lines.push(`- ${item}`));
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('由 YOLO 学习助理生成。');
  return lines.join('\n');
}

export function planMarkdownFilename(task: Task): string {
  const safe = task.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 48);
  const date = new Date().toISOString().slice(0, 10);
  return `YOLO-学习计划-${safe}-${date}.md`;
}

/** 优先调用系统分享（Android/iOS），否则用浏览器下载。 */
export async function savePlanMarkdown(markdown: string, filename: string): Promise<void> {
  const bridge = window.yolo;
  if (bridge?.exportText) {
    const result = await bridge.exportText(filename, markdown);
    if (!result.ok) throw new Error(result.error || '导出失败');
    return;
  }
  const file = new File([markdown], filename, { type: 'text/markdown;charset=utf-8' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function learningPlanToText(plan: AiLearningPlan): string {
  const lines: string[] = [plan.summary, '', `完整计划：${formatMinutes(plan.totalMinutes)}`];
  plan.phases.forEach((phase, index) => {
    lines.push(`${index + 1}. ${phase.title}（${formatMinutes(phase.minutes)}）：${phase.focus}；验收：${phase.outcome}`);
  });
  lines.push('', `时间不足时的关键路径（${formatMinutes(plan.minimumPath.minutes)}）：`);
  plan.minimumPath.items.forEach((item) => lines.push(`- ${item}`));
  if (plan.minimumPath.tradeoffs.length > 0) {
    lines.push('取舍：');
    plan.minimumPath.tradeoffs.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join('\n');
}
