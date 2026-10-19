import { useEffect, type CSSProperties } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Circle,
  Coffee,
  Flame,
  Layers,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  Timer as TimerIcon,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABEL,
  dayKey,
  formatClock,
  formatMinutes,
  quoteOfDay,
  timerElapsedSeconds,
  type ActiveTimer,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { useNow } from '../hooks/useNow';
import { ProgressBar } from './ui/Progress';

function FocusBody({ timer }: { timer: ActiveTimer }) {
  const data = useAppStore((s) => s.data);
  const now = useNow(1000);
  const closeFocus = useAppStore((s) => s.closeFocus);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const openModal = useAppStore((s) => s.openModal);
  const togglePhase = useAppStore((s) => s.togglePhase);
  const setTaskProgress = useAppStore((s) => s.setTaskProgress);

  const task = data.tasks.find((t) => t.id === timer.taskId);
  const goal = task?.goalId ? data.goals.find((g) => g.id === task.goalId) : undefined;
  const seconds = timerElapsedSeconds(timer, now);
  const paused = Boolean(timer.pausedAt);
  const report = task?.report;
  const nextPhase = task?.phases.find((phase) => phase.status !== 'done');
  const donePhases = task?.phases.filter((phase) => phase.status === 'done').length ?? 0;
  const completion = task?.phases.length
    ? Math.round((donePhases / task.phases.length) * 100)
    : 0;
  const today = dayKey(new Date(now));
  const quote = quoteOfDay(today);
  const todaySeconds = data.sessions
    .filter((session) => dayKey(session.endedAt) === today)
    .reduce((sum, session) => sum + session.seconds, 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFocus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeFocus]);

  if (!task) return null;

  return (
    <div className="focus-layer">
      <div className="focus-bg" aria-hidden="true" />
      <header className="focus-top">
        <div className="focus-brand">
          <span className="focus-brand-mark">
            <Flame size={18} />
          </span>
          <div>
            <strong>专注空间</strong>
            <small>FOCUS · 你只活一次</small>
          </div>
        </div>
        <div className="focus-top-right">
          <span className="focus-today">
            <Coffee size={13} /> 今日累计 {formatMinutes(Math.round(todaySeconds / 60) + Math.round(seconds / 60))}
          </span>
          <button type="button" className="btn btn-ghost btn-small focus-collapse" onClick={closeFocus}>
            <ArrowDownToLine size={14} /> 收起，后台继续
          </button>
        </div>
      </header>

      <main className="focus-main">
        <section className="focus-stage">
          <div className="focus-eyebrow">
            {CATEGORY_LABEL[task.category]} {goal ? `· ${goal.title}` : ''}
          </div>
          <h1 data-i18n-skip>{task.title}</h1>
          <div className={`focus-orb ${paused ? 'is-paused' : ''}`}>
            <span className="focus-ring ring-a" />
            <span className="focus-ring ring-b" />
            <span className="focus-ring ring-c" />
            <div className="focus-clock">{formatClock(seconds)}</div>
            <div className="focus-orb-label">
              {paused ? (
                <>
                  <Pause size={13} /> 已暂停
                </>
              ) : (
                <>
                  <span className="live-dot" /> 正在专注
                </>
              )}
            </div>
          </div>

          <div className="focus-xp">
            <Sparkles size={15} /> 收功后，本次专注会归档为一条证据
            {todaySeconds > 0 ? (
              <span className="focus-xp-sub">
                · 今日已完成 {formatMinutes(Math.round(todaySeconds / 60))}
              </span>
            ) : null}
          </div>

          <div className="focus-controls">
            <button
              type="button"
              className={`btn btn-large ${paused ? 'btn-jade' : 'btn-ghost'}`}
              onClick={() => (paused ? resumeTimer(timer.id) : pauseTimer(timer.id))}
            >
              {paused ? <Play size={20} /> : <Pause size={20} />}
              {paused ? '继续' : '暂停'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={() => {
                stopTimer(timer.id);
                closeFocus();
              }}
            >
              <Square size={17} /> 收功
            </button>
            {seconds < 30 ? (
              <button
                type="button"
                className="btn btn-ghost btn-small focus-discard"
                onClick={() =>
                  openModal({
                    kind: 'confirm',
                    title: '放弃本次计时？',
                    message: '这一次的专注不会被记录，也不会有证据。',
                    confirmLabel: '放弃',
                    tone: 'danger',
                    action: () => {
                      useAppStore.getState().discardTimer(timer.id);
                      closeFocus();
                    },
                  })
                }
              >
                放弃
              </button>
            ) : null}
          </div>

          <blockquote className="focus-quote">
            “{quote.text}”
            <cite>— {quote.source}</cite>
          </blockquote>
        </section>

        <aside className="focus-side">
          {report ? (
            <div className="focus-card">
              <div className="focus-card-head">
                <span>
                  <ShieldCheck size={14} /> 启程侦查 · {report.score}
                </span>
                <span className="focus-card-tag">已归档</span>
              </div>
              <p className="focus-report-goal">{report.goal}</p>
              <div className="focus-report-path">
                {report.path.slice(0, 4).map((step, index) => (
                  <div key={step.id} className="focus-path-step">
                    <span>{index + 1}</span>
                    <em>{step.title}</em>
                    <small>{formatMinutes(step.estimatedMinutes)}</small>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="focus-card">
            <div className="focus-card-head">
              <span>
                <Layers size={14} /> 阶段 · {donePhases}/{task.phases.length}
              </span>
              {nextPhase ? <span className="focus-card-tag">{formatMinutes(nextPhase.estimatedMinutes)}</span> : null}
            </div>
            <ProgressBar value={completion} tone="var(--jade)" height={4} />
            <div className="focus-phases">
              {task.phases.length === 0 ? (
                <p className="muted">这个任务还没有拆阶段。</p>
              ) : null}
              {task.phases.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  className={`focus-phase ${phase.status === 'done' ? 'is-done' : ''} ${
                    nextPhase?.id === phase.id ? 'is-next' : ''
                  }`}
                  onClick={() => togglePhase(task.id, phase.id)}
                >
                  {phase.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  <span>{phase.title}</span>
                  <small>{formatMinutes(phase.estimatedMinutes)}</small>
                </button>
              ))}
            </div>
            {nextPhase ? (
              <p className="focus-next-hint">
                <TimerIcon size={13} /> 下一步：{nextPhase.title}
              </p>
            ) : null}
          </div>

          <div className="focus-card">
            <div className="focus-card-head">
              <span>
                <Sparkles size={14} /> 记录进度
              </span>
              <strong className="focus-progress-value">{task.progress}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={task.progress}
              onChange={(event) => setTaskProgress(task.id, Number(event.target.value))}
              className="progress-slider"
              style={{ '--range': task.progress } as CSSProperties}
              aria-label="任务进度"
            />
            <div className="focus-quick-progress">
              {[5, 10, 20].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setTaskProgress(task.id, Math.min(100, task.progress + delta))}
                >
                  +{delta}%
                </button>
              ))}
              {task.phases.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setTaskProgress(task.id, completion)}
                >
                  同步阶段
                </button>
              ) : null}
            </div>
          </div>

        </aside>
      </main>

      <button type="button" className="focus-close" onClick={closeFocus} aria-label="收起专注空间">
        <X size={18} />
      </button>
    </div>
  );
}

export function FocusOverlay() {
  const focusTimerId = useAppStore((s) => s.focusTimerId);
  const timer = useAppStore((s) =>
    focusTimerId ? s.data.activeTimers.find((t) => t.id === focusTimerId) : undefined,
  );
  if (!focusTimerId || !timer) return null;
  return <FocusBody timer={timer} />;
}
