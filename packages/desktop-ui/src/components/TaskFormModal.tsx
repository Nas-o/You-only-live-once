import { useEffect, useState } from 'react';
import {
  BookOpen,
  FolderKanban,
  Layers,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  CATEGORY_DESC,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  MAX_TASK_LEVEL,
  addDays,
  canAssignTaskParent,
  taskDescendantIds,
  todayKey,
  type TaskCategory,
  type TaskPriority,
  type TaskLevel,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Modal } from './ui/Modal';

const CATEGORIES: { value: TaskCategory; icon: typeof BookOpen }[] = [
  { value: 'learning', icon: BookOpen },
  { value: 'practice', icon: Sparkles },
  { value: 'project', icon: FolderKanban },
  { value: 'reading', icon: Layers },
  { value: 'other', icon: Target },
];

const PRIORITIES: { value: TaskPriority; label: string; hint: string }[] = [
  { value: 'low', label: '低', hint: '有空再做' },
  { value: 'medium', label: '中', hint: '按计划推进' },
  { value: 'high', label: '高', hint: '优先保障' },
];

export function TaskFormModal() {
  const modal = useAppStore((s) => s.modal);
  const data = useAppStore((s) => s.data);
  const closeModal = useAppStore((s) => s.closeModal);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);

  const open = modal.kind === 'task-form';
  const editingId = modal.kind === 'task-form' ? modal.taskId : undefined;
  const editingTask = editingId ? data.tasks.find((t) => t.id === editingId) : undefined;
  const editing = Boolean(editingTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('learning');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState(3);
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [goalId, setGoalId] = useState('');
  const [level, setLevel] = useState<TaskLevel>(1);
  const [parentId, setParentId] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setDifficulty(editingTask.difficulty);
      setHours(Math.floor(editingTask.estimatedMinutes / 60));
      setMinutes(editingTask.estimatedMinutes % 60);
      setDueDate(editingTask.dueDate ?? '');
      setGoalId(editingTask.goalId ?? '');
      setLevel(editingTask.level ?? 1);
      setParentId(editingTask.parentId ?? '');
      setTags(editingTask.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setCategory('learning');
      setPriority('medium');
      setDifficulty(3);
      setHours(2);
      setMinutes(0);
      setDueDate(addDays(todayKey(), 14));
      setGoalId('');
      setLevel(1);
      setParentId('');
      setTags('');
    }
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  if (!open) return null;

  const totalMinutes = Math.max(0, Math.round(hours) * 60 + Math.round(minutes));
  const descendants = editingTask ? taskDescendantIds(data.tasks, editingTask.id) : [];
  const parentOptions = data.tasks.filter(
    (task) =>
      task.level === level - 1 &&
      task.status !== 'archived' &&
      task.id !== editingId &&
      !descendants.includes(task.id),
  );

  const submit = () => {
    if (!title.trim()) {
      setError('给任务起一个名字，哪怕只是临时的。');
      return;
    }
    if (totalMinutes <= 0) {
      setError('预计投入需要大于 0 分钟。');
      return;
    }
    if (level > 1 && !parentId) {
      setError('子任务必须选择一个上级任务。');
      return;
    }
    if (level > 1 && !canAssignTaskParent(data.tasks, editingTask?.id ?? '', parentId, level)) {
      setError('上级任务必须比当前任务高一级，且不能形成循环。');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      difficulty,
      estimatedMinutes: totalMinutes,
      dueDate: dueDate || undefined,
      goalId: goalId || undefined,
      level,
      parentId: level > 1 ? parentId : undefined,
      tags: tags
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    if (editingTask) {
      updateTask(editingTask.id, payload);
    } else {
      addTask(payload);
    }
  };

  return (
    <Modal
      open
      onClose={closeModal}
      size="md"
      eyebrow={editing ? '编辑任务' : '新建任务'}
      title={editing ? '编辑任务' : '新建任务'}
      subtitle={
        editing
          ? '调整任务本身。学习路径与调查报告在任务详情里维护。'
          : '先写下一个想完成的事。开始计时前，应用会要求你先做一次启程侦查。'
      }
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={closeModal}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            <Plus size={16} />
            {editing ? '保存修改' : '创建任务'}
          </button>
        </div>
      }
    >
      <div className="task-form">
        <label className={`field ${error ? 'has-error' : ''}`}>
          <span className="field-label">任务名称</span>
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            placeholder="例如：JavaScript 核心语法"
            autoFocus
            maxLength={80}
          />
          {error ? <span className="field-error">{error}</span> : null}
        </label>

        <label className="field">
          <span className="field-label">一句话说明</span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="为什么做这件事？完成后会得到什么？"
            maxLength={240}
          />
        </label>

        <div className="field">
          <span className="field-label">任务类型</span>
          <div className="category-picker">
            {CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  className={`category-option ${category === item.value ? 'is-active' : ''}`}
                  onClick={() => setCategory(item.value)}
                >
                  <Icon size={17} />
                  <span>{CATEGORY_LABEL[item.value]}</span>
                  <small>{CATEGORY_DESC[item.value]}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="task-chain-form">
          <div className="field">
            <span className="field-label">任务层级</span>
            <div className="segmented task-level-picker">
              {([1, 2, 3] as TaskLevel[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={level === value ? 'is-active' : ''}
                  onClick={() => {
                    setLevel(value);
                    if (value === 1) setParentId('');
                    else {
                      const stillValid = parentOptions.some((task) => task.id === parentId && task.level === value - 1);
                      if (!stillValid) setParentId('');
                    }
                  }}
                >
                  {value === 1 ? '一级 · 根任务' : value === 2 ? '二级 · 子任务' : '三级 · 子任务'}
                </button>
              ))}
            </div>
            <span className="field-hint">任务链最多 {MAX_TASK_LEVEL} 级；父任务必须比当前任务高一级。</span>
          </div>
          {level > 1 ? (
            <div className="field">
              <span className="field-label">上级任务</span>
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} data-i18n-skip>
                <option value="">选择上级任务</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.level === 1 ? 'L1' : 'L2'} · {task.title}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {parentOptions.length === 0
                  ? '还没有可用的上一级任务，请先创建上级任务。'
                  : '选择一个上级任务，形成清晰的任务链。'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="field-grid two-col">
          <div className="field">
            <span className="field-label">优先级</span>
            <div className="segmented">
              {PRIORITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={priority === item.value ? 'is-active' : ''}
                  onClick={() => setPriority(item.value)}
                  title={item.hint}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">难度</span>
            <div className="difficulty-picker">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={difficulty >= value ? 'is-active' : ''}
                  onClick={() => setDifficulty(value)}
                  title={DIFFICULTY_LABEL[value]}
                  aria-label={`难度 ${value}`}
                >
                  <span />
                </button>
              ))}
              <em>{DIFFICULTY_LABEL[difficulty]}</em>
            </div>
          </div>
        </div>

        <div className="field-grid two-col">
          <div className="field">
            <span className="field-label">预计投入</span>
            <div className="duration-input">
              <input
                type="number"
                min={0}
                max={999}
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                aria-label="预计小时"
              />
              <span>小时</span>
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
                aria-label="预计分钟"
              />
              <span>分钟</span>
            </div>
          </div>
          <div className="field">
            <span className="field-label">预计完成日期</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>

        <div className="field-grid two-col">
          <div className="field">
            <span className="field-label">关联大目标</span>
            <select value={goalId} onChange={(event) => setGoalId(event.target.value)} data-i18n-skip>
              <option value="">不关联</option>
              {data.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">标签</span>
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="前端, 基础（用逗号分隔）"
            />
          </div>
        </div>

        {!editing ? (
          <div className="form-note">
            <Sparkles size={15} />
            <p>
              创建后，在任务表里点击「开始计时」会先要求提交一份调查报告：
              学什么、怎么学、不学什么。这不是门槛，是帮你少走弯路的护栏。
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
