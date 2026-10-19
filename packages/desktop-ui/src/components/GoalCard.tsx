import { goalProgress, GOAL_COLOR_HEX, formatDayKeyCN, relativeDay, type Goal } from '@yolo/core';
import type { CSSProperties } from 'react';
import { CalendarDays, CheckCircle2, Star } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { Constellation } from './charts/Constellation';
import { ProgressBar, ProgressRing } from './ui/Progress';

export function GoalCard({ goal, taskCount }: { goal: Goal; taskCount: number }) {
  const openGoal = useAppStore((s) => s.openGoal);
  const progress = goalProgress(goal);
  const color = GOAL_COLOR_HEX[goal.color];
  const completed = Boolean(goal.completedAt);

  return (
    <article
      className={`goal-card ${completed ? 'is-complete' : ''}`}
      style={{ '--goal-color': color } as CSSProperties}
      onClick={() => openGoal(goal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openGoal(goal.id);
      }}
    >
      <div className="goal-card-head">
        <div className="goal-card-title-wrap">
          <span className="goal-color-dot" />
          <div>
            <h3 data-i18n-skip>{goal.title}</h3>
            {goal.motto ? <span className="goal-motto" data-i18n-skip>「{goal.motto}」</span> : null}
          </div>
        </div>
        <ProgressRing value={progress.percent} size={52} stroke={4} tone={color}>
          <span className="goal-ring-value">{progress.percent}%</span>
        </ProgressRing>
      </div>

      {goal.description ? <p className="goal-card-desc" data-i18n-skip>{goal.description}</p> : null}

      <div className="goal-card-map">
        <Constellation points={goal.knowledgePoints} color={color} width={340} height={120} compact />
      </div>

      <div className="goal-card-progress">
        <ProgressBar value={progress.percent} height={4} tone={color} />
        <div className="goal-card-foot">
          <span>
            <Star size={12} /> {progress.lit}/{progress.total} 已点亮
          </span>
          {goal.deadline ? (
            <span className={relativeDay(goal.deadline).startsWith('已逾期') ? 'is-overdue' : ''}>
              <CalendarDays size={12} /> {formatDayKeyCN(goal.deadline)}
            </span>
          ) : (
            <span>{taskCount} 个关联任务</span>
          )}
          {completed ? (
            <span className="goal-complete-chip">
              <CheckCircle2 size={12} /> 已达成
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
