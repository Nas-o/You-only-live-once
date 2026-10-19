import { describe, expect, it } from 'vitest';
import {
  GROWTH_STAGES,
  createInitialData,
  createSampleData,
  growthEvidence,
  growthStageInfo,
  growthSummary,
  skillStats,
} from '../src';

const NOW = new Date('2026-10-19T09:00:00+08:00');

describe('成长档案', () => {
  it('空白数据没有证据，停在刚启程', () => {
    const data = createInitialData(NOW);
    const summary = growthSummary(data);
    expect(summary.evidenceCount).toBe(0);
    expect(summary.stage.current.id).toBe('start');
    expect(summary.focusMinutes).toBe(0);
    expect(summary.writingMinutes).toBe(0);
  });

  it('阶段随证据数量推进，不会倒退', () => {
    const stages = GROWTH_STAGES.map((stage) => growthStageInfo(stage.minEvidence).current.name);
    expect(stages[0]).toBe('刚启程');
    expect(stages.at(-1)).toBe('长期主义者');
    for (let i = 1; i < GROWTH_STAGES.length; i += 1) {
      expect(GROWTH_STAGES[i]!.minEvidence).toBeGreaterThan(GROWTH_STAGES[i - 1]!.minEvidence);
    }
    expect(growthStageInfo(9999).next).toBeUndefined();
  });

  it('示例数据会产生专注、报告、阶段、知识点和写作证据', () => {
    const data = createSampleData('行者', NOW);
    const evidence = growthEvidence(data);
    expect(evidence.length).toBeGreaterThan(10);
    expect(evidence.some((item) => item.kind === 'focus')).toBe(true);
    expect(evidence.some((item) => item.kind === 'report')).toBe(true);
    expect(evidence.some((item) => item.kind === 'writing')).toBe(true);
    expect(evidence.every((item) => item.at)).toBe(true);
    expect(evidence[0]!.at.localeCompare(evidence.at(-1)!.at)).toBeGreaterThanOrEqual(0);
  });

  it('技能树统计来自关联任务与写作', () => {
    const data = createSampleData('行者', NOW);
    const goal = data.goals.find((item) => item.title === '独立开发者之路');
    expect(goal).toBeTruthy();
    const stats = skillStats(data, goal!);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.evidenceCount).toBeGreaterThan(0);
    expect(stats.focusMinutes).toBeGreaterThan(0);
    expect(stats.writingMinutes).toBeGreaterThan(0);
    expect(stats.progress).toBeGreaterThanOrEqual(0);
    expect(stats.progress).toBeLessThanOrEqual(100);
  });

  it('摘要包含专注与写作分钟数', () => {
    const data = createSampleData('行者', NOW);
    const summary = growthSummary(data);
    expect(summary.focusMinutes).toBeGreaterThan(100);
    expect(summary.writingMinutes).toBeGreaterThan(0);
    expect(summary.evidenceCount).toBe(summary.evidence.length);
    expect(summary.stage.current.minEvidence).toBeLessThanOrEqual(summary.evidenceCount);
  });
});
