import { useMemo } from 'react';
import { Filter, Plus, Search, ArrowUpDown, Layers } from 'lucide-react';
import { PRIORITY_LABEL, TASK_STATUS_LABEL, type Task } from '@yolo/core';
import { useAppStore, type TaskFilter, type TaskSort } from '../store/appStore';
import { TaskRow, TaskTableHeader } from '../components/TaskRow';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'backlog', label: '待启程' },
  { value: 'done', label: '已完成' },
  { value: 'missing-report', label: '需侦查' },
];

const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'updated', label: '最近更新' },
  { value: 'due', label: '截止日期' },
  { value: 'progress', label: '进度' },
  { value: 'priority', label: '优先级' },
];

const PRIORITY_WEIGHT: Record<Task['priority'], number> = { high: 3, medium: 2, low: 1 };

export function TasksPage() {
  const data = useAppStore((s) => s.data);
  const filter = useAppStore((s) => s.taskFilter);
  const sort = useAppStore((s) => s.taskSort);
  const search = useAppStore((s) => s.search);
  const setFilter = useAppStore((s) => s.setTaskFilter);
  const setSort = useAppStore((s) => s.setTaskSort);
  const setSearch = useAppStore((s) => s.setSearch);
  const openModal = useAppStore((s) => s.openModal);

  const scoped = useMemo(
    () => data.tasks.filter((task) => task.status !== 'archived'),
    [data.tasks],
  );

  const counts = useMemo(() => {
    return {
      all: scoped.length,
      active: scoped.filter((task) => task.status === 'active').length,
      backlog: scoped.filter((task) => task.status === 'backlog').length,
      done: scoped.filter((task) => task.status === 'done').length,
      'missing-report': scoped.filter(
        (task) => !task.report && task.status !== 'done' && task.status !== 'archived',
      ).length,
    } satisfies Record<TaskFilter, number>;
  }, [scoped]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = scoped;
    if (filter === 'missing-report') {
      list = list.filter((task) => !task.report && task.status !== 'done');
    } else if (filter !== 'all') {
      list = list.filter((task) => task.status === filter);
    }
    if (query) {
      list = list.filter((task) => {
        const haystack = [task.title, task.description, task.note ?? '', ...task.tags]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'due': {
          if (!a.dueDate && !b.dueDate) return b.updatedAt.localeCompare(a.updatedAt);
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'progress':
          return b.progress - a.progress;
        case 'priority':
          return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        case 'updated':
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return sorted;
  }, [scoped, filter, search, sort]);

  const goalTitle = (task: Task) => data.goals.find((goal) => goal.id === task.goalId)?.title;

  return (
    <div className="page-inner tasks-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">任务表</div>
          <h1>你要去哪儿，就从哪件事开始</h1>
          <p className="page-lede">
            每项任务都有预计投入、阶段拆分与进度。开始计时前，先写一份启程侦查。
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'task-form' })}>
          <Plus size={16} /> 新建任务
        </button>
      </header>

      <div className="tasks-toolbar">
        <div className="filter-group">
          <Filter size={14} className="toolbar-icon" />
          <div className="segmented">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={filter === item.value ? 'is-active' : ''}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span className="seg-count">{counts[item.value]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-right">
          <label className="search-box">
            <Search size={14} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索任务、标签或文档"
            />
          </label>
          <label className="sort-select">
            <ArrowUpDown size={13} />
            <select value={sort} onChange={(event) => setSort(event.target.value as TaskSort)}>
              {SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="task-table">
          <TaskTableHeader />
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} goalTitle={goalTitle(task)} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Layers size={26} />
          </div>
          <h2>{search ? '没有找到匹配的任务' : '这里空着'}</h2>
          <p>
            {search
              ? '换一个关键词，或者清空搜索。'
              : filter === 'missing-report'
                ? '所有任务都已经完成侦查。很好，路已经看清了。'
                : filter === 'done'
                  ? '还没有完成的任务。第一件，从现在开始。'
                  : '创建一项任务，写下它为什么重要，再为它做一次启程侦查。'}
          </p>
          <div className="empty-state-actions">
            {search ? (
              <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>
                清空搜索
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'task-form' })}>
              <Plus size={16} /> 新建任务
            </button>
          </div>
        </div>
      )}

      <div className="table-legend">
        <span>
          <span className="state-dot state-active" /> 进行中
        </span>
        <span>
          <span className="state-dot state-backlog" /> 待启程
        </span>
        <span>
          <span className="state-dot state-done" /> 已完成
        </span>
        <span>
          优先级：{Object.values(PRIORITY_LABEL).join(' / ')} · 状态：{TASK_STATUS_LABEL.active}的任务会出现在「今日」
        </span>
      </div>
    </div>
  );
}
