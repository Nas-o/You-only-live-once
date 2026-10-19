import { goalProgress, type AppData, type Goal } from '@yolo/core';
import { Layers, Plus, Sparkles, Star, Target } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { GoalCard } from '../components/GoalCard';
import { ProgressBar } from '../components/ui/Progress';

export function GoalsPage() {
  const data = useAppStore((s) => s.data);
  const openModal = useAppStore((s) => s.openModal);

  const totalPoints = data.goals.reduce((sum, goal) => sum + goal.knowledgePoints.length, 0);
  const litPoints = data.goals.reduce(
    (sum, goal) => sum + goal.knowledgePoints.filter((point) => point.status === 'lit').length,
    0,
  );
  const overall = totalPoints > 0 ? Math.round((litPoints / totalPoints) * 100) : 0;
  const activeGoals = data.goals.filter((goal) => !goal.completedAt);
  const completedGoals = data.goals.filter((goal) => goal.completedAt);

  return (
    <div className="page-inner goals-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">大目标</div>
          <h1>把远方，拆成可以点亮的星</h1>
          <p className="page-lede">
            大目标负责方向，知识点负责落地。每点亮一颗星，都是一次真实的理解。
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'goal-form' })}>
          <Plus size={16} /> 立下大目标
        </button>
      </header>

      {data.goals.length > 0 ? (
      <section className="goals-overview">
        <div className="goals-overview-main">
          <div className="goals-overview-number">
            <strong>{goalsCount(data.goals.length)}</strong>
            <span>个大目标</span>
          </div>
          <div className="goals-overview-stats">
            <span>
              <Star size={13} /> {litPoints} / {totalPoints} 颗星已点亮
            </span>
            <span>
              <Target size={13} /> {completedGoals.length} 个已达成
            </span>
          </div>
          <div className="goals-overview-bar">
            <ProgressBar value={overall} tone="var(--seal)" height={6} />
            <span>{overall}%</span>
          </div>
        </div>
        <div className="goals-overview-orbit" aria-hidden="true">
          <span className="orbit-ring orbit-ring-a" />
          <span className="orbit-ring orbit-ring-b" />
          <span className="orbit-star orbit-star-a" />
          <span className="orbit-star orbit-star-b" />
          <span className="orbit-star orbit-star-c" />
        </div>
      </section>

      ) : null}

      {data.goals.length > 0 ? (
        <>
          <div className="goals-grid">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                taskCount={data.tasks.filter((task) => task.goalId === goal.id && task.status !== 'archived').length}
              />
            ))}
          </div>
          {completedGoals.length > 0 ? (
            <>
              <div className="goals-section-title">
                <h2>已达成的目标</h2>
                <span>共 {completedGoals.length} 个</span>
              </div>
              <div className="goals-grid goals-grid-done">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    taskCount={data.tasks.filter((task) => task.goalId === goal.id && task.status !== 'archived').length}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Star size={26} />
          </div>
          <h2>还没有大目标</h2>
          <p>大目标不是愿望清单，而是一张可以逐颗点亮的星图。先立一个，再拆出 5-8 个知识点。</p>
          <div className="empty-state-actions">
            <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'goal-form' })}>
              <Plus size={16} /> 立下第一个大目标
            </button>
          </div>
        </div>
      )}

      <section className="goal-how">
        <div className="goal-how-step">
          <span>01</span>
          <Target size={18} />
          <div>
            <strong>立下方向</strong>
            <p>写清楚为什么这个目标值得你投入有限的时间。</p>
          </div>
        </div>
        <div className="goal-how-step">
          <span>02</span>
          <Layers size={18} />
          <div>
            <strong>拆成知识点</strong>
            <p>5-8 个可验证的小节点，比一整块模糊的“学会”更可靠。</p>
          </div>
        </div>
        <div className="goal-how-step">
          <span>03</span>
          <Sparkles size={18} />
          <div>
            <strong>亲手点亮</strong>
            <p>每颗星都对应一次理解、一次练习或一件作品。</p>
          </div>
        </div>
      </section>

      {data.goals.length > 0 ? (
        <div className="goals-footnote">
          <span>
            {activeGoals.length > 0
              ? `最近一个待点亮的目标：${bestNextGoal(activeGoals, data)}`
              : '所有目标都已点亮。去立下一个吧。'}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function goalsCount(count: number): string {
  return count.toLocaleString();
}

function bestNextGoal(goals: Goal[], data: AppData): string {
  const sorted = [...goals].sort((a, b) => goalProgress(b).percent - goalProgress(a).percent);
  const goal = sorted[0];
  if (!goal) return '';
  const point = goal.knowledgePoints.find((item) => item.status !== 'lit');
  const linkedTask = point?.taskId ? data.tasks.find((task) => task.id === point.taskId) : undefined;
  return linkedTask ? `${goal.title} · ${linkedTask.title}` : `${goal.title} · ${point?.title ?? '下一颗星'}`;
}
