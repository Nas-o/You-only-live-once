import { useNow } from '../hooks/useNow';
import { timerElapsedSeconds, type ActiveTimer } from '@yolo/core';
import { Pause, Play, Timer as TimerIcon } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function TimerChip({ timer, compact = false }: { timer: ActiveTimer; compact?: boolean }) {
  const now = useNow(1000);
  const task = useAppStore((s) => s.data.tasks.find((t) => t.id === timer.taskId));
  const openFocus = useAppStore((s) => s.openFocus);
  const paused = Boolean(timer.pausedAt);
  const seconds = timerElapsedSeconds(timer, now);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const clock = `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <button
      type="button"
      className={`timer-chip ${paused ? 'is-paused' : 'is-running'} ${compact ? 'is-compact' : ''}`}
      onClick={() => openFocus(timer.id)}
      title={paused ? '已暂停，点击继续' : '专注中，点击打开专注空间'}
    >
      <span className="timer-chip-icon">
        {paused ? <Pause size={12} /> : <Play size={12} />}
      </span>
      <span className="timer-chip-title">{task?.title ?? '任务'}</span>
      <span className="timer-chip-clock">{clock}</span>
      {!compact && !paused ? <span className="timer-chip-pulse" /> : null}
    </button>
  );
}

export function ActiveTimersBar() {
  const timers = useAppStore((s) => s.data.activeTimers);
  if (timers.length === 0) return null;
  return (
    <div className="active-timers-bar">
      <span className="active-timers-label">
        <TimerIcon size={13} /> 专注中
      </span>
      {timers.map((timer) => (
        <TimerChip key={timer.id} timer={timer} compact />
      ))}
    </div>
  );
}
