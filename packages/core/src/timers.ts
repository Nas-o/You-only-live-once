/** 计时器纯函数：单计时、暂停恢复、应用关闭后的安全恢复。 */
import { makeId } from './ids';
import { focusXp } from './rewards';
import { nowIso } from './time';
import type { ActiveTimer, TimerSettlement } from './types';

export function createTimer(taskId: string, now: Date = new Date()): ActiveTimer {
  const at = nowIso(now);
  return {
    id: makeId('tm_'),
    taskId,
    startedAt: at,
    heartbeatAt: at,
    accumulatedSeconds: 0,
  };
}

/** 当前累计秒数（含本段运行时间） */
export function timerElapsedSeconds(timer: ActiveTimer, nowMs: number = Date.now()): number {
  if (timer.pausedAt) return Math.floor(timer.accumulatedSeconds);
  const sinceHeartbeat = Math.max(0, (nowMs - new Date(timer.heartbeatAt).getTime()) / 1000);
  return Math.floor(timer.accumulatedSeconds + sinceHeartbeat);
}

/** 心跳：把本段运行时间沉淀进 accumulatedSeconds，崩溃时最多损失一个心跳周期 */
export function heartbeatTimer(timer: ActiveTimer, now: Date = new Date()): ActiveTimer {
  if (timer.pausedAt) return timer;
  const seconds = Math.max(0, (now.getTime() - new Date(timer.heartbeatAt).getTime()) / 1000);
  return {
    ...timer,
    accumulatedSeconds: timer.accumulatedSeconds + seconds,
    heartbeatAt: nowIso(now),
  };
}

export function pauseTimer(timer: ActiveTimer, now: Date = new Date()): ActiveTimer {
  if (timer.pausedAt) return timer;
  return {
    ...heartbeatTimer(timer, now),
    pausedAt: nowIso(now),
  };
}

export function resumeTimer(timer: ActiveTimer, now: Date = new Date()): ActiveTimer {
  if (!timer.pausedAt) return timer;
  return {
    ...timer,
    pausedAt: undefined,
    heartbeatAt: nowIso(now),
  };
}

export function settleTimer(
  timer: ActiveTimer,
  parallel: number,
  now: Date = new Date(),
): TimerSettlement {
  const seconds = timerElapsedSeconds(timer, now.getTime());
  const endedAt = nowIso(now);
  return {
    seconds,
    startedAt: timer.startedAt,
    endedAt,
    xp: focusXp(seconds),
    parallel,
  };
}

/**
 * 应用重新加载时恢复计时：
 * 运行中的计时器只信任最后一次心跳沉淀的累计值，
 * 应用关闭期间不计时、不虚增，并自动转为暂停。
 */
export function recoverTimers(timers: ActiveTimer[]): {
  timers: ActiveTimer[];
  recovered: number;
  pausedCount: number;
} {
  let recovered = 0;
  let pausedCount = 0;
  const next = timers.map((timer) => {
    if (timer.pausedAt) return timer;
    pausedCount += 1;
    recovered += Math.max(0, timer.accumulatedSeconds);
    return { ...timer, pausedAt: timer.heartbeatAt };
  });
  return { timers: next, recovered, pausedCount };
}

export function formatTimer(timer: ActiveTimer, nowMs: number = Date.now()): string {
  const total = timerElapsedSeconds(timer, nowMs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
