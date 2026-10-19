import {
  formatMinutes,
  formatSecondsShort,
  relativeDay,
  isOverdue,
  CATEGORY_LABEL,
  type Task,
} from '@yolo/core';
import { AlertCircle, CheckCircle2, Clock3, Pause, Play, ScrollText, Timer } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useNow } from '../hooks/useNow';
import { timerElapsedSeconds } from '@yolo/core';
import { ProgressBar } from './ui/Progress';

interface TaskRowProps {
  task: Task;
  goalTitle?: string;
}

export function TaskRow({ task, goalTitle }: TaskRowProps) {
  const openTask = useAppStore((s) => s.openTask);
  const startTimer = useAppStore((s) => s.startTimer);
  const openModal = useAppStore((s) => s.openModal);
  const openFocus = useAppStore((s) => s.openFocus);
  const data = useAppStore((s) => s.data);
  const timer = data.activeTimers.find((t) => t.taskId === task.id);
  const parent = task.parentId ? data.tasks.find((item) => item.id === task.parentId) : undefined;
  const now = useNow(1000);
  const overdue = isOverdue(task.dueDate);
  const done = task.status === 'done';
  const missingReport = !task.report && !done && task.status !== 'archived';
  const elapsed = timer ? timerElapsedSeconds(timer, now) : 0;

  const handlePrimary = () => {
    if (done) return;
    if (missingReport) {
      openModal({ kind: 'report', taskId: task.id, startAfterSubmit: true });
      return;
    }
    startTimer(task.id);
  };

  return (
    <div
      className={`task-row ${done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`}
      onClick={() => openTask(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openTask(task.id);
      }}
    >
      <div className="task-state">
        <span className={`state-dot state-${task.status}`} />
      </div>

      <div className="task-main">
        <div className="task-title-line">
          {task.level > 1 ? (
            <span className={`task-level-badge level-${task.level}`}>L{task.level}</span>
          ) : null}
          <span className="task-title" data-i18n-skip>{task.title}</span>
          {missingReport ? (
            <span className="badge badge-warn">
              <AlertCircle size={11} /> 需侦查
            </span>
          ) : null}
          {task.report ? (
            <span className="badge badge-quiet">
              <ScrollText size={11} /> 报告 {task.report.score}
            </span>
          ) : null}
          {timer && !timer.pausedAt ? (
            <span className="badge badge-live">
              <span className="live-dot" /> 专注中
            </span>
          ) : null}
        </div>
        <div className="task-sub">
          <span className={`category-tag category-${task.category}`}>{CATEGORY_LABEL[task.category]}</span>
          {parent ? <span className="task-parent">↳ 上级：<span data-i18n-skip>{parent.title}</span></span> : null}
          {goalTitle ? <span className="task-goal" data-i18n-skip>{goalTitle}</span> : null}
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="task-tag" data-i18n-skip>
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="task-progress">
        <div className="task-progress-head">
          <span>{task.progress}%</span>
          {task.phases.length > 0 ? (
            <small>
              {task.phases.filter((p) => p.status === 'done').length}/{task.phases.length} 阶段
            </small>
          ) : null}
        </div>
        <ProgressBar value={task.progress} height={5} tone={done ? 'var(--jade)' : 'var(--seal)'} />
      </div>

      <div className="task-estimate">
        <span>{task.estimatedMinutes > 0 ? formatMinutes(task.estimatedMinutes) : '—'}</span>
      </div>

      <div className="task-actual">
        <span>{formatSecondsShort(task.totalFocusSeconds)}</span>
      </div>

      <div className={`task-due ${overdue ? 'is-overdue' : ''}`}>
        {task.dueDate ? (
          <>
            <span>{relativeDay(task.dueDate)}</span>
            <small>{task.dueDate.slice(5).replace('-', '/')}</small>
          </>
        ) : (
          <span className="muted">未设截止</span>
        )}
      </div>

      <div className="task-action" onClick={(event) => event.stopPropagation()}>
        {done ? (
          <span className="task-done-mark">
            <CheckCircle2 size={16} /> 已完成
          </span>
        ) : timer ? (
          <>
            <button
              type="button"
              className={`btn btn-small ${timer.pausedAt ? 'btn-ghost' : 'btn-jade'}`}
              onClick={() => openFocus(timer.id)}
              title="打开专注空间"
            >
              <Timer size={14} />
              <span className="timer-inline">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
                {String(elapsed % 60).padStart(2, '0')}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                timer.pausedAt
                  ? useAppStore.getState().resumeTimer(timer.id)
                  : useAppStore.getState().pauseTimer(timer.id)
              }
              title={timer.pausedAt ? '继续计时' : '暂停计时'}
              aria-label={timer.pausedAt ? '继续计时' : '暂停计时'}
            >
              {timer.pausedAt ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`btn btn-small ${missingReport ? 'btn-amber' : 'btn-ghost'}`}
            onClick={handlePrimary}
          >
            {missingReport ? <ScrollText size={14} /> : <Play size={14} />}
            {missingReport ? '先侦查' : '开始'}
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskTableHeader() {
  return (
    <div className="task-row task-row-head" aria-hidden="true">
      <div />
      <div>任务</div>
      <div>进度</div>
      <div>预计</div>
      <div>已投入</div>
      <div>
        <Clock3 size={12} /> 截止
      </div>
      <div>操作</div>
    </div>
  );
}
