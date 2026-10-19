import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Modal } from './ui/Modal';

export function KnowledgePointModal() {
  const modal = useAppStore((s) => s.modal);
  const data = useAppStore((s) => s.data);
  const closeModal = useAppStore((s) => s.closeModal);
  const addKnowledgePoint = useAppStore((s) => s.addKnowledgePoint);
  const updateKnowledgePoint = useAppStore((s) => s.updateKnowledgePoint);

  const open = modal.kind === 'knowledge-form';
  const goalId = modal.kind === 'knowledge-form' ? modal.goalId : '';
  const pointId = modal.kind === 'knowledge-form' ? modal.pointId : undefined;
  const goal = goalId ? data.goals.find((g) => g.id === goalId) : undefined;
  const point = pointId ? goal?.knowledgePoints.find((p) => p.id === pointId) : undefined;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [taskId, setTaskId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(point?.title ?? '');
    setNote(point?.note ?? '');
    setMinutes(point?.estimatedMinutes ?? 60);
    setTaskId(point?.taskId ?? '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goalId, pointId]);

  if (!open || !goal) return null;

  const submit = () => {
    if (!title.trim()) {
      setError('给这个知识点起一个名字。');
      return;
    }
    const payload = {
      title: title.trim(),
      note: note.trim() || undefined,
      estimatedMinutes: Math.max(0, Math.round(minutes)) || undefined,
      taskId: taskId || undefined,
    };
    if (point) updateKnowledgePoint(goal.id, point.id, payload);
    else addKnowledgePoint(goal.id, payload);
  };

  return (
    <Modal
      open
      onClose={closeModal}
      size="sm"
      eyebrow={point ? '编辑知识点' : '添加知识点'}
      title={point ? '编辑知识点' : '添加知识点'}
      subtitle={`目标：${goal.title}`}
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={closeModal}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {point ? '保存' : '添加到星图'}
          </button>
        </div>
      }
    >
      <div className="task-form">
        <label className={`field ${error ? 'has-error' : ''}`}>
          <span className="field-label">知识点名称</span>
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="例如：React 组件化"
            autoFocus
            maxLength={60}
          />
          {error ? <span className="field-error">{error}</span> : null}
        </label>
        <label className="field">
          <span className="field-label">备注（可选）</span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="点亮它的标准是什么？"
            maxLength={160}
          />
        </label>
        <div className="field-grid two-col">
          <label className="field">
            <span className="field-label">预计投入（分钟）</span>
            <input
              type="number"
              min={0}
              step={15}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span className="field-label">关联任务（可选）</span>
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">不关联</option>
              {data.tasks
                .filter((task) => task.status !== 'archived')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="form-note">
          <p>点亮一个知识点会获得证据。当所有知识点都亮起，这个目标就完成了。</p>
        </div>
      </div>
    </Modal>
  );
}
