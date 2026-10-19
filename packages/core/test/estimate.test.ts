import { describe, expect, it } from 'vitest';
import { createInitialData, createSampleData, estimateBaseline, migrateData, taskActualMinutes } from '../src';

const NOW = new Date('2026-10-19T09:00:00+08:00');

describe('时间评估基线', () => {
  it('空白数据没有任何任务', () => {
    const data = createInitialData(NOW);
    expect(data.tasks).toHaveLength(0);
  });

  it('示例数据能给出任务实际投入和同类校准', () => {
    const data = createSampleData('行者', NOW);
    const task = data.tasks.find((item) => item.title === 'JavaScript 核心语法');
    expect(task).toBeTruthy();
    const baseline = estimateBaseline(data, task!.id);
    expect(baseline.estimateMinutes).toBeGreaterThan(0);
    expect(baseline.actualMinutes).toBeGreaterThanOrEqual(baseline.focusMinutes);
    expect(baseline.peerCount).toBeGreaterThan(0);
    expect(baseline.peerRatio).not.toBeNull();
    expect(baseline.suggestedMin).toBeLessThan(baseline.suggestedMax);
    expect(['low', 'medium', 'high']).toContain(baseline.confidence);
  });

  it('实际时间包含学习文档写作', () => {
    const data = createSampleData('行者', NOW);
    const task = data.tasks.find((item) => item.title === 'JavaScript 核心语法');
    const actual = taskActualMinutes(data, task!);
    expect(actual.writing).toBeGreaterThan(0);
    expect(actual.total).toBe(actual.focus + actual.writing);
  });

  it('新任务没有历史样本时给出低置信度区间', () => {
    const data = createInitialData(NOW);
    const id = 't_new';
    data.tasks.push({
      id,
      title: '新任务',
      description: '',
      category: 'learning',
      status: 'active',
      priority: 'medium',
      difficulty: 3,
      estimatedMinutes: 120,
      progress: 0,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      phases: [],
      tags: [],
      level: 1,
      totalFocusSeconds: 0,
      sessionCount: 0,
      xpEarned: 0,
    });
    const baseline = estimateBaseline(data, id);
    expect(baseline.peerCount).toBe(0);
    expect(baseline.confidence).toBe('low');
    expect(baseline.suggestedMin).toBeLessThanOrEqual(120);
    expect(baseline.suggestedMax).toBeGreaterThanOrEqual(120);
    expect(baseline.factors.some((item) => item.label === '样本不足')).toBe(true);
  });
});

  it('旧数据迁移会补齐 AI 设置，且默认不启用', () => {
    const legacy = JSON.parse(JSON.stringify(createInitialData(NOW))) as Record<string, unknown>;
    delete legacy.ai;
    delete legacy.estimateReviews;
    delete legacy.assessmentSessions;
    legacy.version = 2;
    const migrated = migrateData(legacy, NOW);
    expect(migrated).toBeTruthy();
    expect(migrated!.ai.enabled).toBe(false);
    expect(migrated!.ai.allowDocs).toBe(true);
    expect(migrated!.ai.baseUrl).toBe('');
    expect(migrated!.estimateReviews).toEqual([]);
    expect(migrated!.assessmentSessions).toEqual([]);
  });
