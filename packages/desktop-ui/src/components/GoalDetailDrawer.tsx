import { useEffect, useState, type CSSProperties } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Lock,
  Plus,
  Sparkles,
  Star,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  GOAL_COLOR_HEX,
  TASK_STATUS_LABEL,
  formatDayKeyCN,
  formatFullDateCN,
  formatMinutes,
  goalProgress,
  relativeDay,
  type KnowledgePoint,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Drawer } from './ui/Modal';
import { ProgressRing } from './ui/Progress';
import { Constellation } from './charts/Constellation';

export function GoalDetailDrawer() {
  const goalId = useAppStore((s) => s.goalDetailId);
  const data = useAppStore((s) => s.data);
  const closeGoal = useAppStore((s) => s.closeGoal);
  const openModal = useAppStore((s) => s.openModal);
  const openTask = useAppStore((s) => s.openTask);
  const lightKnowledgePoint = useAppStore((s) => s.lightKnowledgePoint);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const goal = goalId ? data.goals.find((g) => g.id === goalId) : undefined;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [goalId]);

  if (!goal) return null;

  const progress = goalProgress(goal);
  const color = GOAL_COLOR_HEX[goal.color];
  const linkedTasks = data.tasks.filter((task) => task.goalId === goal.id && task.status !== 'archived');
  const selected = goal.knowledgePoints.find((point) => point.id === selectedId) ?? null;
  const completed = Boolean(goal.completedAt);

  const pointAction = (point: KnowledgePoint) => {
    if (point.status === 'lit') return;
    lightKnowledgePoint(goal.id, point.id);
  };

  return (
    <Drawer open onClose={closeGoal} width={700}>
      <div className="drawer-scroll goal-detail" style={{ '--goal-color': color } as CSSProperties}>
        <button type="button" className="icon-btn detail-close" onClick={closeGoal} aria-label="关闭">
          <X size={18} />
        </button>

        <header className="goal-detail-head">
          <div className="eyebrow">大目标</div>
          <div className="goal-title-line">
            <h2 data-i18n-skip>{goal.title}</h2>
            <ProgressRing value={progress.percent} size={64} stroke={5} tone={color}>
              <strong>{progress.percent}%</strong>
            </ProgressRing>
          </div>
          {goal.motto ? <blockquote data-i18n-skip>「{goal.motto}」</blockquote> : null}
          {goal.description ? <p className="goal-description" data-i18n-skip>{goal.description}</p> : null}
          <div className="goal-meta-row">
            <span>
              <Star size={13} /> {progress.lit} / {progress.total} 颗星已点亮
            </span>
            {goal.deadline ? (
              <span className={relativeDay(goal.deadline).startsWith('已逾期') ? 'is-overdue' : ''}>
                <CalendarDays size={13} /> {formatDayKeyCN(goal.deadline)} · {relativeDay(goal.deadline)}
              </span>
            ) : null}
            <span>立下于 {formatFullDateCN(goal.createdAt)}</span>
          </div>
        </header>

        {completed ? (
          <div className="goal-complete-banner">
            <Sparkles size={18} />
            <div>
              <strong>大目标已达成</strong>
              <p>所有知识点都亮了。这不是终点，是你下一段旅程的起点。</p>
            </div>
          </div>
        ) : null}

        <section className="goal-map">
          <Constellation
            points={goal.knowledgePoints}
            color={color}
            width={620}
            height={280}
            showLabels={false}
            interactive
            selectedId={selectedId ?? undefined}
            onSelect={(point) => setSelectedId(point.id)}
          />
          <p className="goal-map-hint">点击星点查看知识点，再点亮它。</p>
        </section>

        <section className="detail-section">
          <div className="section-head">
            <div>
              <h3>知识点</h3>
              <p>{selected ? `已选中「${selected.title}」` : '每一次点亮，都是一次真实的理解。'}</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => openModal({ kind: 'knowledge-form', goalId: goal.id })}
            >
              <Plus size={14} /> 添加
            </button>
          </div>

          <div className="point-list">
            {goal.knowledgePoints.length === 0 ? (
              <p className="muted">还没有知识点。把大目标拆成 5-8 颗可以点亮的星。</p>
            ) : null}
            {goal.knowledgePoints.map((point, index) => {
              const lit = point.status === 'lit';
              const locked = point.status === 'locked';
              const isSelected = selectedId === point.id;
              const linkedTask = point.taskId ? data.tasks.find((task) => task.id === point.taskId) : undefined;
              return (
                <div
                  key={point.id}
                  className={`point-row ${lit ? 'is-lit' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(point.id)}
                >
                  <span className="point-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`point-marker ${lit ? 'is-lit' : locked ? 'is-locked' : ''}`}>
                    {lit ? <CheckCircle2 size={15} /> : locked ? <Lock size={13} /> : <Star size={14} />}
                  </span>
                  <div className="point-copy">
                    <strong data-i18n-skip>{point.title}</strong>
                    {point.note ? <small>{point.note}</small> : null}
                    <div className="point-meta">
                      <span>证据节点</span>
                      {point.estimatedMinutes ? <span>{formatMinutes(point.estimatedMinutes)}</span> : null}
                      {linkedTask ? (
                        <button
                          type="button"
                          className="point-task-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            openTask(linkedTask.id);
                          }}
                        >
                          <ExternalLink size={11} /> {linkedTask.title}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {lit ? (
                    <span className="point-lit-at">
                      已点亮
                      {point.litAt ? <small>{formatDayKeyCN(point.litAt.slice(0, 10))}</small> : null}
                    </span>
                  ) : (
                    <button type="button" className="btn btn-small btn-primary" onClick={() => pointAction(point)}>
                      <Sparkles size={13} /> 点亮
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal({ kind: 'knowledge-form', goalId: goal.id, pointId: point.id });
                    }}
                    aria-label="编辑知识点"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal({
                        kind: 'confirm',
                        title: '删除这个知识点？',
                        message: `「${point.title}」会从星图上移除。已获得的证据不会回收。`,
                        confirmLabel: '删除',
                        tone: 'danger',
                        action: () => useAppStore.getState().deleteKnowledgePoint(goal.id, point.id),
                      });
                    }}
                    aria-label="删除知识点"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {linkedTasks.length > 0 ? (
          <section className="detail-section">
            <div className="section-head">
              <div>
                <h3>关联任务</h3>
                <p>把这些任务做完，知识点就有了落地的证据。</p>
              </div>
            </div>
            <div className="linked-task-list">
              {linkedTasks.map((task) => (
                <button key={task.id} type="button" className="linked-task" onClick={() => openTask(task.id)}>
                  <span className={`state-dot state-${task.status}`} />
                  <span className="linked-task-title" data-i18n-skip>{task.title}</span>
                  <span className="linked-task-progress">{task.progress}%</span>
                  <span className={`status-chip status-${task.status}`}>{TASK_STATUS_LABEL[task.status]}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="detail-section">
          <div className="section-head">
            <div>
              <h3>整理目标</h3>
              <p>修改星图名称与截止日期，或结束这段旅程。</p>
            </div>
          </div>
          <div className="danger-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => openModal({ kind: 'goal-form', goalId: goal.id })}
            >
              <Edit3 size={15} /> 编辑目标
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '删除这个大目标？',
                  message: `「${goal.title}」及其知识点会被删除，关联任务会保留。`,
                  confirmLabel: '永久删除',
                  tone: 'danger',
                  action: () => deleteGoal(goal.id),
                })
              }
            >
              <Trash2 size={15} /> 删除目标
            </button>
          </div>
        </section>

        <footer className="detail-foot">
          <span>
            <Target size={13} /> {progress.total} 个知识点 · {linkedTasks.length} 个关联任务
          </span>
          <span>
            <Sparkles size={13} /> 完整点亮后归档为技能树证据
          </span>
        </footer>
      </div>
    </Drawer>
  );
}
