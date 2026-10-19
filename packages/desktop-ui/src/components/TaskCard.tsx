import {
  CATEGORY_LABEL,
  formatMinutes,
  formatSecondsShort,
  phaseProgress,
  relativeDay,
  timerElapsedSeconds,
  type Task,
} from '@yolo/core';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  ScrollText,
  Target,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useNow } from '../hooks/useNow';
import { CATEGORY_ICONS } from '../lib/icons';
import { ProgressBar } from './ui/Progress';

export function TaskCard({ task, goalTitle }: { task: Task; goalTitle?: string }) {
  const openTask = useAppStore((s) => s.openTask);
  const startTimer = useAppStore((s) => s.startTimer);
  const openFocus = useAppStore((s) => s.openFocus);
  const openModal = useAppStore((s) => s.openModal);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const data = useAppStore((s) => s.data);
  const timer = data.activeTimers.find((t) => t.taskId === task.id);
  const parent = task.parentId ? data.tasks.find((item) => item.id === task.parentId) : undefined;
  const now = useNow(1000);
  const Icon = CATEGORY_ICONS[task.category] as LucideIcon;
  const nextPhase = task.phases.find((phase) => phase.status !== 'done');
  const seconds = timer ? timerElapsedSeconds(timer, now) : 0;
  const done = task.status === 'done';
  const missingReport = !task.report && !done;

  return (
    <article
      className={`task-card ${done ? 'is-done' : ''}`}
      onClick={() => openTask(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTask(task.id);
      }}
    >
      <div className="task-card-head">
        <span className={`task-card-icon category-${task.category}`}>
          <Icon size={16} />
        </span>
        <span className="task-card-category">{CATEGORY_LABEL[task.category]}</span>
        {task.level > 1 ? (
          <span className={`task-level-badge level-${task.level}`}>L{task.level}</span>
        ) : null}
        {timer && !timer.pausedAt ? (
          <span className="badge badge-live">
            <span className="live-dot" /> 专注中
          </span>
        ) : null}
        {missingReport ? <span className="badge badge-warn">需侦查</span> : null}
        {task.report ? (
          <span className="badge badge-quiet">
            <ScrollText size={11} /> {task.report.score}
          </span>
        ) : null}
        <span className="task-card-spacer" />
        {goalTitle ? (
          <span className="task-card-goal" data-i18n-skip>
            <Target size={11} /> {goalTitle}
          </span>
        ) : null}
      </div>

      <h3 data-i18n-skip>{task.title}</h3>
      {parent ? <p className="task-card-parent">↳ 上级：<span data-i18n-skip>{parent.title}</span></p> : null}
      {task.description ? <p className="task-card-desc" data-i18n-skip>{task.description}</p> : null}

      <div className="task-card-progress">
        <div className="task-card-progress-head">
          <span>{task.progress}%</span>
          <small>
            {task.phases.length > 0 ? `阶段 ${phaseProgress(task)}%` : '暂无阶段拆分'}
          </small>
        </div>
        <ProgressBar value={task.progress} height={5} tone={done ? 'var(--jade)' : 'var(--seal)'} />
      </div>

      {nextPhase ? (
        <div className="task-card-next">
          <ArrowRight size={12} />
          <span>下一步：{nextPhase.title}</span>
          <small>{formatMinutes(nextPhase.estimatedMinutes)}</small>
        </div>
      ) : null}

      <div className="task-card-meta">
        <span>
          <Clock3 size={12} /> 预计 {task.estimatedMinutes > 0 ? formatMinutes(task.estimatedMinutes) : '未估'}
        </span>
        <span>
          <Timer size={12} /> 已投 {formatSecondsShort(task.totalFocusSeconds)}
        </span>
        {task.dueDate ? (
          <span className={relativeDay(task.dueDate).startsWith('已逾期') ? 'is-overdue' : ''}>
            <CalendarDays size={12} /> {relativeDay(task.dueDate)}
          </span>
        ) : null}
      </div>

      <div className="task-card-foot" onClick={(event) => event.stopPropagation()}>
        {done ? (
          <span className="task-done-mark">
            <CheckCircle2 size={15} /> 已完成
          </span>
        ) : timer ? (
          <>
            <button
              type="button"
              className="task-card-timer"
              onClick={() => openFocus(timer.id)}
            >
              <span className="live-dot" />
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
              <em>{timer.pausedAt ? '已暂停' : '专注中'}</em>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => (timer.pausedAt ? resumeTimer(timer.id) : pauseTimer(timer.id))}
            >
              {timer.pausedAt ? <Play size={13} /> : <Pause size={13} />}
              {timer.pausedAt ? '继续' : '暂停'}
            </button>
          </>
        ) : missingReport ? (
          <button
            type="button"
            className="btn btn-soft-gold btn-small"
            onClick={() => openModal({ kind: 'report', taskId: task.id, startAfterSubmit: true })}
          >
            <ScrollText size={14} /> 写报告，再开始
          </button>
        ) : (
          <button type="button" className="btn btn-soft-gold btn-small" onClick={() => startTimer(task.id)}>
            <Play size={14} /> 开始计时
          </button>
        )}
      </div>
    </article>
  );
}

export function ActiveTimerCard({ timerId }: { timerId: string }) {
  const timer = useAppStore((s) => s.data.activeTimers.find((t) => t.id === timerId));
  const task = useAppStore((s) => (timer ? s.data.tasks.find((t) => t.id === timer.taskId) : undefined));
  const openFocus = useAppStore((s) => s.openFocus);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const now = useNow(1000);

  if (!timer || !task) return null;
  const seconds = timerElapsedSeconds(timer, now);
  const paused = Boolean(timer.pausedAt);
  const nextPhase = task.phases.find((phase) => phase.status !== 'done');

  return (
    <article className={`active-timer-card ${paused ? 'is-paused' : ''}`}>
      <div className="active-timer-main" onClick={() => openFocus(timer.id)}>
        <div className="active-timer-head">
          <span className="badge badge-live">
            <span className="live-dot" /> {paused ? '已暂停' : '专注中'}
          </span>
          <span className="active-timer-task">{task.title}</span>
        </div>
        <div className="active-timer-clock">
          {String(Math.floor(seconds / 3600)).padStart(2, '0')}:
          {String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </div>
        {nextPhase ? (
          <div className="active-timer-next">
            下一步：{nextPhase.title} · {formatMinutes(nextPhase.estimatedMinutes)}
          </div>
        ) : null}
      </div>
      <div className="active-timer-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? '继续' : '暂停'}
        </button>
        <button type="button" className="btn btn-primary btn-small" onClick={() => stopTimer(timer.id)}>
          <CheckCircle2 size={14} /> 收功
        </button>
        <button type="button" className="icon-btn" onClick={() => openFocus(timer.id)} aria-label="打开专注空间">
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
