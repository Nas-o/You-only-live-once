import {
  dayKey,
  focusStreak,
  formatMinutes,
  goalProgress,
  growthSummary,
  quoteOfDay,
  timeAgo,
  todayFocusMinutes,
  todayKey,
  todayTasks,
} from '@yolo/core';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Layers,
  Play,
  Plus,
  ScrollText,
  Sparkles,
  Star,
  Timer,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useNow } from '../hooks/useNow';
import { StatCard } from '../components/StatCard';
import { SectionHeading } from '../components/SectionHeading';
import { TaskCard, ActiveTimerCard } from '../components/TaskCard';
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
import { GOAL_COLOR_HEX } from '@yolo/core';

export function TodayPage() {
  const data = useAppStore((s) => s.data);
  const setView = useAppStore((s) => s.setView);
  const setTaskFilter = useAppStore((s) => s.setTaskFilter);
  const openModal = useAppStore((s) => s.openModal);
  const openFocus = useAppStore((s) => s.openFocus);
  const startTimer = useAppStore((s) => s.startTimer);
  const openGoal = useAppStore((s) => s.openGoal);
  const now = useNow(30_000);
  const date = new Date(now);

  const focusMinutes = todayFocusMinutes(data.sessions, date);
  const goal = data.settings.dailyGoalMinutes;
  const percent = goal > 0 ? Math.min(100, Math.round((focusMinutes / goal) * 100)) : 0;
  const streak = focusStreak(data.sessions, date);
  const growth = growthSummary(data);
  const activeTasks = todayTasks(data, date);
  const timers = data.activeTimers;
  const doneToday = data.tasks.filter(
    (task) => task.status === 'done' && task.completedAt && dayKey(task.completedAt) === todayKey(date),
  ).length;
  const missingReport = activeTasks.filter((task) => !task.report).length;
  const quote = quoteOfDay(todayKey(date));
  const readyTask = data.tasks.find(
    (task) => task.status !== 'done' && task.status !== 'archived' && task.report,
  );
  const topGoals = [...data.goals]
    .sort((a, b) => {
      if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
      return goalProgress(a).percent - goalProgress(b).percent;
    })
    .slice(0, 3);
  const events = data.rewards.events.slice(0, 7);
  const activeCount = data.tasks.filter((task) => task.status === 'active').length;

  const goMissingReports = () => {
    setView('tasks');
    setTaskFilter('missing-report');
  };

  return (
    <div className="page-inner today-page">
      <section className="today-hero">
        <div className="lulu-hero-art" aria-hidden="true" />
        <div className="today-hero-copy">
          <div className="eyebrow">MEMENTO MORI</div>
          <blockquote className="hero-quote">
            “{quote.text}”
            <cite>— {quote.source}</cite>
          </blockquote>
          <p className="hero-sub">
            今天是你余生中最年轻的一天。
            {activeCount > 0
              ? ` 有 ${activeCount} 件事正在进行，挑一件，把注意力交还给它。`
              : ' 写下一件真正重要的事，然后开始。'}
          </p>
          <div className="hero-actions">
            {timers.length > 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => openFocus(timers[0]!.id)}>
                <Timer size={16} /> 回到专注空间
              </button>
            ) : readyTask ? (
              <button type="button" className="btn btn-primary" onClick={() => startTimer(readyTask.id)}>
                <Play size={16} /> 开始下一次专注
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'task-form' })}>
                <Plus size={16} /> 创建第一个任务
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setView('tasks')}>
              查看任务表 <ArrowRight size={15} />
            </button>
          </div>
          <div className="hero-realm">
            <span className="hero-realm-dot" style={{ background: 'var(--seal)' }} />
            当前成长 <strong style={{ color: 'var(--seal)' }}>{growth.stage.current.name}</strong>
            <span className="hero-realm-sep">·</span>
            {growth.evidenceCount} 条证据
            {streak > 0 ? (
              <>
                <span className="hero-realm-sep">·</span>
                <span className="hero-streak">
                  <Flame size={13} /> 连续 {streak} 天
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="today-hero-ring">
          <ProgressRing value={percent} size={178} stroke={8} tone="var(--seal)">
            <div className="hero-ring-center">
              <strong>{focusMinutes}</strong>
              <span>分钟</span>
              <small>今日已专注</small>
            </div>
          </ProgressRing>
          <div className="hero-ring-meta">
            <span>目标 {formatMinutes(goal)}</span>
            <span className={percent >= 100 ? 'is-reached' : ''}>
              {percent >= 100 ? (
                <>
                  <CheckCircle2 size={12} /> 今日目标已达成
                </>
              ) : (
                `还差 ${Math.max(0, goal - focusMinutes)} 分钟`
              )}
            </span>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <StatCard
          icon={Timer}
          label="今日专注"
          value={`${focusMinutes} 分钟`}
          hint={`目标 ${goal} 分钟 · 完成 ${percent}%`}
          tone="var(--seal)"
          trend={focusMinutes > 0 ? `${percent}%` : undefined}
        />
        <StatCard
          icon={Flame}
          label="连续专注"
          value={`${streak} 天`}
          hint={streak >= 7 ? '节奏已经建立，别断' : streak > 0 ? '继续保持这个节奏' : '今天开始第一天'}
          tone="var(--gold)"
        />
        <StatCard
          icon={Sparkles}
          label="成长证据"
          value={`${growth.evidenceCount} 条`}
          hint={`专注 ${formatMinutes(growth.focusMinutes)} · 写作 ${formatMinutes(growth.writingMinutes)}`}
          tone="var(--violet)"
        />
        <StatCard
          icon={Layers}
          label="进行中的任务"
          value={`${activeCount} 个`}
          hint={`${timers.length} 个计时中 · 今日完成 ${doneToday} 个`}
          tone="var(--azure)"
        />
      </div>

      <section className="lulu-mobile-scene" aria-hidden="true">
        <div className="lulu-mobile-scene-art" />
        <div>
          <span className="eyebrow" data-i18n-skip>LULU</span>
          <p>慢一点，也是在向前。</p>
          <small>softly forward</small>
        </div>
      </section>

      {missingReport > 0 ? (
        <button type="button" className="warning-callout" onClick={goMissingReports}>
          <span className="warning-callout-icon">
            <ScrollText size={18} />
          </span>
          <span>
            <strong>{missingReport} 个任务还没有启程侦查</strong>
            <small>没有调查报告，就无法开始计时。先花十分钟看清路，再出发。</small>
          </span>
          <span className="warning-callout-action">
            去补报告 <ArrowRight size={14} />
          </span>
        </button>
      ) : null}

      <div className="today-grid">
        <div className="today-main">
          <SectionHeading
            title="正在专注"
            hint={timers.length > 0 ? '一次只做一件事，注意力才会留下痕迹' : '计时会记录你的每一分钟专注'}
            actionLabel={timers.length > 0 ? '全部任务' : undefined}
            onAction={() => setView('tasks')}
            extra={
              timers.length > 0 ? (
                <span className="heading-badge">
                  <span className="live-dot" /> {timers.filter((t) => !t.pausedAt).length} 个进行中
                </span>
              ) : undefined
            }
          />
          <div className="active-timer-list">
            {timers.length > 0 ? (
              timers.map((timer) => <ActiveTimerCard key={timer.id} timerId={timer.id} />)
            ) : (
              <div className="empty-card empty-timer">
                <div className="empty-icon">
                  <Timer size={22} />
                </div>
                <div>
                  <strong>此刻没有计时</strong>
                  <p>挑一个任务，点击「开始计时」。计时前需要先提交调查报告。</p>
                </div>
                {readyTask ? (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => startTimer(readyTask.id)}>
                    <Play size={14} /> 开始
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => openModal({ kind: 'task-form' })}
                  >
                    <Plus size={14} /> 新建任务
                  </button>
                )}
              </div>
            )}
          </div>

          <SectionHeading
            title="今日任务"
            hint="进行中的任务会出现在这里"
            actionLabel="任务表"
            onAction={() => setView('tasks')}
          />
          <div className="task-card-list">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  goalTitle={data.goals.find((goalItem) => goalItem.id === task.goalId)?.title}
                />
              ))
            ) : (
              <div className="empty-card">
                <div className="empty-icon">
                  <Layers size={22} />
                </div>
                <div>
                  <strong>还没有进行中的任务</strong>
                  <p>从任务表启动一个，或创建新的任务。先写报告，再启程。</p>
                </div>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setView('tasks')}>
                  去任务表 <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="today-side">
          <section className="side-panel">
            <SectionHeading
              title="大目标"
              hint="每一颗星，都是一次真实的理解"
              actionLabel="全部星图"
              onAction={() => setView('goals')}
            />
            <div className="goal-mini-list">
              {topGoals.length > 0 ? (
                topGoals.map((goalItem) => {
                  const progress = goalProgress(goalItem);
                  const color = GOAL_COLOR_HEX[goalItem.color];
                  return (
                    <button
                      key={goalItem.id}
                      type="button"
                      className="goal-mini"
                      onClick={() => openGoal(goalItem.id)}
                    >
                      <span className="goal-mini-dot" style={{ background: color }} />
                      <div className="goal-mini-copy">
                        <strong data-i18n-skip>{goalItem.title}</strong>
                        <small>
                          {progress.lit}/{progress.total} 颗星
                          {goalItem.completedAt ? ' · 已达成' : ''}
                        </small>
                      </div>
                      <span className="goal-mini-percent">{progress.percent}%</span>
                      <ProgressBar value={progress.percent} height={3} tone={color} />
                    </button>
                  );
                })
              ) : (
                <div className="side-empty">
                  <Star size={18} />
                  <p>还没有大目标。立一个，然后把知识点一颗颗点亮。</p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => openModal({ kind: 'goal-form' })}
                  >
                    <Plus size={14} /> 立下大目标
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="side-panel">
            <SectionHeading
              title="最近足迹"
              hint="你的每一步都被记录"
              actionLabel="成长"
              onAction={() => setView('cultivation')}
            />
            <div className="event-feed">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className={`event-row event-${event.type}`}>
                    <span className="event-icon">
                      {event.type === 'achievement' ? (
                        <Trophy size={13} />
                      ) : event.type === 'task' ? (
                        <CheckCircle2 size={13} />
                      ) : event.type === 'focus' ? (
                        <Timer size={13} />
                      ) : (
                        <Sparkles size={13} />
                      )}
                    </span>
                    <div className="event-copy">
                      <span>{event.label}</span>
                      <small>{timeAgo(event.at, date)}</small>
                    </div>
                    <span className="event-xp">+{event.xp}</span>
                  </div>
                ))
              ) : (
                <div className="side-empty">
                  <Sparkles size={18} />
                  <p>完成一次专注或提交一份报告，足迹就会开始记录。</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
