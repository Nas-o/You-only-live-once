import { describe, expect, it } from 'vitest';
import {
  applyReportToTask,
  ACHIEVEMENTS,
  createInitialData,
  THEMES,
  createPhase,
  createReport,
  createSampleData,
  createTask,
  createTimer,
  daySeries,
  estimateCalibration,
  focusStreak,
  getLevelInfo,
  grantXp,
  heartbeatTimer,
  MAX_LEVEL,
  migrateData,
  pauseTimer,
  phaseProgress,
  recoverTimers,
  reportCompleteness,
  resumeTimer,
  settleTimer,
  syncAchievements,
  timerElapsedSeconds,
  totals,
  validateReport,
  xpToNextLevel,
  xpToReachLevel,
  type ReportInput,
} from '../src';
import { dayKey } from '../src/time';

const NOW = new Date('2026-03-10T09:00:00+08:00');

function validReportInput(): ReportInput {
  return {
    subject: 'JavaScript 作用域、闭包与异步机制的系统学习与练习',
    goal: '能够独立读懂并改写中等复杂度的 JavaScript 代码，为前端工程打下基础',
    successCriteria: '不查资料写出闭包与异步示例，完成二十道练习并复盘错题',
    prerequisites: '会基本的 HTML/CSS，理解变量、函数与循环',
    usefulScope: '作用域与闭包、原型、this、Promise、事件循环、模块化与数组方法',
    avoidScope: '暂不深挖 V8 源码与 JIT 优化，不追冷门语法糖，不写炫技代码',
    risks: '容易陷入教程循环，异步与 this 易混淆，练习量不足会眼高手低',
    path: [
      { id: 'p1', title: '语法与类型', detail: '变量、类型转换、判等', estimatedMinutes: 120 },
      { id: 'p2', title: '函数与闭包', detail: '作用域链、this、闭包', estimatedMinutes: 150 },
      { id: 'p3', title: '异步与事件循环', detail: 'Promise、async/await', estimatedMinutes: 180 },
      { id: 'p4', title: '模块化与练习', detail: 'ESM、错误处理、小项目', estimatedMinutes: 150 },
    ],
    resources: [
      { id: 'r1', title: 'MDN JavaScript 指南', type: 'docs' },
      { id: 'r2', title: 'JavaScript.info', type: 'course' },
      { id: 'r3', title: '你不知道的 JavaScript', type: 'book' },
    ],
    calibratedMinutes: 600,
    confidence: 4,
  };
}

describe('营地与攀登值', () => {
  it('从山脚开始，并按等级累积攀登值', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('山脚·初探');
    expect(info.xpForNext).toBe(xpToNextLevel(1));
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(xpToNextLevel(1));
  });

  it('等级越高，升级所需攀登值越多', () => {
    for (let level = 1; level < MAX_LEVEL - 1; level += 1) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
    expect(getLevelInfo(1_000_000).level).toBe(MAX_LEVEL);
    expect(getLevelInfo(1_000_000).isMax).toBe(true);
  });

  it('攀登值增加会提升营地', () => {
    const after = getLevelInfo(1500);
    expect(after.level).toBeGreaterThan(1);
    expect(after.zone).not.toBe('山脚');
    expect(after.progress).toBeGreaterThanOrEqual(0);
    expect(after.progress).toBeLessThanOrEqual(1);
  });
});

describe('界面主题', () => {
  it('默认主题为纸上时间，并提供四套可选主题', () => {
    const data = createInitialData(NOW);
    expect(data.settings.theme).toBe('paper');
    expect(THEMES.map((theme) => theme.id)).toEqual(['paper', 'ink', 'swiss', 'lulu']);
  });
});

describe('调查报告门禁', () => {
  it('空报告无法提交', () => {
    const result = validateReport({
      subject: '',
      goal: '',
      successCriteria: '',
      prerequisites: '',
      usefulScope: '',
      avoidScope: '',
      risks: '',
      path: [],
      resources: [],
      calibratedMinutes: 0,
      confidence: 0,
    });
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(4);
  });

  it('完整报告通过校验且评分较高', () => {
    const input = validReportInput();
    const result = validateReport(input);
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(reportCompleteness(input)).toBe(result.score);
  });

  it('学习路径少于两步会被拦下', () => {
    const input = validReportInput();
    input.path = input.path.slice(0, 1);
    expect(validateReport(input).ok).toBe(false);
  });

  it('报告可沉淀为阶段并校准预计用时', () => {
    const task = createTask({ title: 'JS 学习', estimatedMinutes: 120 });
    const report = createReport(validReportInput(), NOW);
    applyReportToTask(task, report, { phases: 'replace' }, NOW);
    expect(task.report?.score).toBeGreaterThan(0);
    expect(task.estimatedMinutes).toBe(600);
    expect(task.phases).toHaveLength(4);
    expect(task.phases[0]?.title).toBe('语法与类型');
    expect(task.status).toBe('active');
    task.phases.forEach((phase) => {
      phase.status = 'done';
    });
    expect(phaseProgress(task)).toBe(100);
  });
});

describe('计时与并行', () => {
  it('计时器累计时间并可暂停恢复', () => {
    const t0 = new Date('2026-03-10T09:00:00Z');
    let timer = createTimer('t1', t0);
    expect(timerElapsedSeconds(timer, t0.getTime())).toBe(0);

    const t1 = new Date(t0.getTime() + 60_000);
    timer = heartbeatTimer(timer, t1);
    expect(timerElapsedSeconds(timer, t1.getTime())).toBe(60);

    const paused = pauseTimer(timer, new Date(t1.getTime() + 5_000));
    expect(timerElapsedSeconds(paused, t1.getTime() + 120_000)).toBe(65);

    const resumed = resumeTimer(paused, new Date(t1.getTime() + 120_000));
    expect(timerElapsedSeconds(resumed, t1.getTime() + 180_000)).toBe(125);

    const settlement = settleTimer(
      { ...resumed, accumulatedSeconds: 120, pausedAt: t1.toISOString() },
      2,
      new Date(t1.getTime() + 180_000),
    );
    expect(settlement.seconds).toBe(120);
    expect(settlement.xp).toBe(2);
    expect(settlement.parallel).toBe(2);
  });

  it('异常退出后只恢复到心跳时刻，不虚增时间', () => {
    const t0 = new Date('2026-03-10T09:00:00Z');
    const timer = { ...createTimer('t1', t0), accumulatedSeconds: 300, heartbeatAt: t0.toISOString() };
    const result = recoverTimers([timer]);
    expect(result.pausedCount).toBe(1);
    expect(result.timers[0]?.pausedAt).toBe(t0.toISOString());
    expect(timerElapsedSeconds(result.timers[0]!, t0.getTime() + 3_600_000)).toBe(300);
  });
});

describe('示例数据', () => {
  const data = createSampleData('测试者', NOW);

  it('已进入引导完成状态且包含报告门禁示例', () => {
    expect(data.meta.onboarded).toBe(true);
    expect(data.tasks.length).toBeGreaterThanOrEqual(5);
    expect(data.tasks.some((t) => !t.report)).toBe(true);
    expect(data.sessions.length).toBeGreaterThan(10);
  });

  it('任务投入与专注记录自洽', () => {
    for (const task of data.tasks) {
      const seconds = data.sessions
        .filter((s) => s.taskId === task.id)
        .reduce((sum, s) => sum + s.seconds, 0);
      expect(task.totalFocusSeconds).toBe(seconds);
    }
  });

  it('攀登值、成就与报告评分自洽', () => {
    expect(data.rewards.xp).toBeGreaterThan(1000);
    expect(Object.keys(data.rewards.unlocked).length).toBeGreaterThan(5);
    expect(data.rewards.events.length).toBeGreaterThan(20);
    const reports = data.tasks.flatMap((t) => (t.report ? [t.report] : []));
    expect(reports.length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...reports.map((r) => r.score))).toBeGreaterThanOrEqual(90);
  });

  it('示例数据有连续专注与今日数据', () => {
    expect(focusStreak(data.sessions, NOW)).toBeGreaterThanOrEqual(7);
    const series = daySeries(data.sessions, 14, NOW);
    expect(series).toHaveLength(14);
    expect(series.at(-1)?.seconds).toBeGreaterThan(0);
    expect(series.at(-1)?.key).toBe(dayKey(NOW));
  });

  it('统计包含预估校准与总览', () => {
    const summary = totals(data);
    expect(summary.focusMinutes).toBeGreaterThan(500);
    expect(summary.reportCount).toBeGreaterThanOrEqual(4);
    const calibration = estimateCalibration(data.tasks);
    expect(calibration.length).toBeGreaterThan(0);
    expect(calibration.every((row) => row.accuracy >= 0 && row.accuracy <= 100)).toBe(true);
  });
});

describe('成就与迁移', () => {
  it('解锁成就并发放攀登值', () => {
    const data = createInitialData(NOW);
    const task = createTask({ title: '测试任务' }, NOW);
    const report = createReport(validReportInput(), NOW);
    task.report = report;
    data.tasks.push(task);
    const unlocked = syncAchievements(data, NOW);
    expect(unlocked.map((a) => a.id)).toContain('first-step');
    expect(data.rewards.xp).toBeGreaterThanOrEqual(50);
    expect(Object.keys(data.rewards.unlocked).length).toBe(unlocked.length);
  });

  it('成就定义唯一且都有检查函数', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const achievement of ACHIEVEMENTS) {
      expect(typeof achievement.check).toBe('function');
      expect(achievement.xp).toBeGreaterThan(0);
    }
  });

  it('旧数据迁移可补齐缺失字段', () => {
    const data = createSampleData('迁移', NOW);
    const migrated = migrateData(JSON.parse(JSON.stringify(data)), NOW);
    expect(migrated).not.toBeNull();
    expect(migrated?.tasks.length).toBe(data.tasks.length);
    expect(migrated?.settings.dailyGoalMinutes).toBe(data.settings.dailyGoalMinutes);
    expect(migrateData(null)).toBeNull();
    expect(migrateData({ hello: 'world' })).toBeNull();
  });

  it('授予攀登值会记录事件', () => {
    const data = createInitialData(NOW);
    grantXp(data, 25, '测试奖励', 'bonus');
    expect(data.rewards.xp).toBe(25);
    expect(data.rewards.events[0]?.label).toBe('测试奖励');
  });

  it('阶段构造有稳定顺序与默认值', () => {
    const phase = createPhase({ title: '第一步' }, 3);
    expect(phase.order).toBe(3);
    expect(phase.estimatedMinutes).toBe(30);
    expect(phase.status).toBe('todo');
  });
});
