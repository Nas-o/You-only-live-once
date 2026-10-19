import { useEffect, useState, type CSSProperties } from 'react';
import { GOAL_COLOR_HEX, GOAL_COLOR_LABEL, addDays, todayKey, type GoalColor } from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Modal } from './ui/Modal';

const COLORS: GoalColor[] = ['gold', 'jade', 'azure', 'rose', 'violet'];

export function GoalFormModal() {
  const modal = useAppStore((s) => s.modal);
  const data = useAppStore((s) => s.data);
  const closeModal = useAppStore((s) => s.closeModal);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);

  const open = modal.kind === 'goal-form';
  const editingId = modal.kind === 'goal-form' ? modal.goalId : undefined;
  const editingGoal = editingId ? data.goals.find((g) => g.id === editingId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [motto, setMotto] = useState('');
  const [color, setColor] = useState<GoalColor>('gold');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingGoal) {
      setTitle(editingGoal.title);
      setDescription(editingGoal.description);
      setMotto(editingGoal.motto ?? '');
      setColor(editingGoal.color);
      setDeadline(editingGoal.deadline ?? '');
    } else {
      setTitle('');
      setDescription('');
      setMotto('');
      setColor('gold');
      setDeadline(addDays(todayKey(), 90));
    }
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  if (!open) return null;

  const submit = () => {
    if (!title.trim()) {
      setError('大目标需要一个名字。');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      motto: motto.trim() || undefined,
      color,
      deadline: deadline || undefined,
    };
    if (editingGoal) updateGoal(editingGoal.id, payload);
    else addGoal(payload);
  };

  return (
    <Modal
      open
      onClose={closeModal}
      size="md"
      eyebrow={editingGoal ? '编辑目标' : '新建目标'}
      title={editingGoal ? '编辑大目标' : '立下大目标'}
      subtitle="大目标不是愿望，而是一张可以逐颗点亮的星图。先立框架，知识点之后慢慢补。"
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={closeModal}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            {editingGoal ? '保存修改' : '立下目标'}
          </button>
        </div>
      }
    >
      <div className="task-form">
        <label className={`field ${error ? 'has-error' : ''}`}>
          <span className="field-label">目标名称</span>
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="例如：独立开发者之路"
            autoFocus
            maxLength={80}
          />
          {error ? <span className="field-error">{error}</span> : null}
        </label>

        <label className="field">
          <span className="field-label">为什么是这个目标</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="它对你意味着什么？实现之后，你的生活会有什么不同？"
            maxLength={300}
          />
        </label>

        <label className="field">
          <span className="field-label">一句箴言（可选）</span>
          <input
            type="text"
            value={motto}
            onChange={(event) => setMotto(event.target.value)}
            placeholder="例如：用作品说话"
            maxLength={40}
          />
        </label>

        <div className="field-grid two-col">
          <div className="field">
            <span className="field-label">星图颜色</span>
            <div className="color-picker">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`color-swatch ${color === value ? 'is-active' : ''}`}
                  style={{ '--swatch': GOAL_COLOR_HEX[value] } as CSSProperties}
                  onClick={() => setColor(value)}
                  title={GOAL_COLOR_LABEL[value]}
                  aria-label={GOAL_COLOR_LABEL[value]}
                />
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">期望完成日期（可选）</span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
        </div>

        <div className="form-note">
          <p>
            建议先写 5-8 个知识点，既能看到全貌，又不会因为太多而瘫痪。之后随时可以增删。
          </p>
        </div>
      </div>
    </Modal>
  );
}
