import { useEffect, useState, type CSSProperties } from 'react';
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Flag,
  Layers,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Sparkles,
  Target,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  PHASE_STATUS_LABEL,
  PRIORITY_LABEL,
  RESOURCE_TYPE_LABEL,
  formatDayKeyCN,
  formatFullDateCN,
  formatMinutes,
  formatSecondsShort,
  growthEvidence,
  phaseProgress,
  taskAncestors,
  relativeDay,
  estimateAccuracy,
  type Phase,
  type Task,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Drawer } from './ui/Modal';
import { ProgressBar } from './ui/Progress';
import { openExternalUrl } from '../lib/links';
import { MarkdownNoteEditor } from './MarkdownNoteEditor';
import { TaskAiPanel } from './TaskAiPanel';

function ReportBlock({ task }: { task: Task }) {
  const openModal = useAppStore((s) => s.openModal);
  const report = task.report;

  if (!report) {
    return (
      <section className="detail-section report-missing">
        <div className="section-head">
          <div>
            <h3>启程侦查</h3>
            <p>开始计时前，必须先写清楚这项任务的学习路径。</p>
          </div>
        </div>
        <button
          type="button"
          className="report-missing-card"
          onClick={() => openModal({ kind: 'report', taskId: task.id })}
        >
          <span className="report-missing-icon">
            <ScrollText size={22} />
          </span>
          <span>
            <strong>写下第一份调查报告</strong>
            <small>学什么 · 怎么学 · 不学什么 · 预计多久</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </section>
    );
  }

  return (
    <section className="detail-section">
      <div className="section-head">
        <div>
          <h3>启程侦查</h3>
          <p>
            提交于 {formatFullDateCN(report.submittedAt)}
            {report.revisions > 0 ? ` · 已修订 ${report.revisions} 次` : ''}
          </p>
        </div>
        <div className="section-head-actions">
          <span className="report-score-badge">评分 {report.score}</span>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => openModal({ kind: 'report', taskId: task.id })}
          >
            <Edit3 size={14} /> 修订
          </button>
        </div>
      </div>

      <div className="report-summary">
        <div className="report-summary-row">
          <span>对象</span>
          <p data-i18n-skip>{report.subject}</p>
        </div>
        <div className="report-summary-row">
          <span>目标</span>
          <p data-i18n-skip>{report.goal}</p>
        </div>
        <div className="report-summary-row">
          <span>验收</span>
          <p data-i18n-skip>{report.successCriteria}</p>
        </div>
      </div>

      <div className="report-path">
        <h4>
          <Layers size={14} /> 学习路径
        </h4>
        <ol>
          {report.path.map((step, index) => (
            <li key={step.id}>
              <span className="path-dot">{index + 1}</span>
              <div>
                <strong data-i18n-skip>{step.title}</strong>
                {step.detail ? <small data-i18n-skip>{step.detail}</small> : null}
              </div>
              <em>{formatMinutes(step.estimatedMinutes)}</em>
            </li>
          ))}
        </ol>
      </div>

      <div className="report-split">
        <div>
          <span className="mini-label">真正要学的</span>
          <p data-i18n-skip>{report.usefulScope}</p>
        </div>
        <div>
          <span className="mini-label">明确不学的</span>
          <p data-i18n-skip>{report.avoidScope}</p>
        </div>
      </div>

      <div className="report-split">
        <div>
          <span className="mini-label">风险预判</span>
          <p data-i18n-skip>{report.risks}</p>
        </div>
        <div>
          <span className="mini-label">前置条件</span>
          <p data-i18n-skip>{report.prerequisites}</p>
        </div>
      </div>

      {report.resources.length > 0 ? (
        <div className="report-resources">
          <h4>
            <FileText size={14} /> 资料
          </h4>
          <div className="resource-chips">
            {report.resources.map((resource) => (
              <button
                key={resource.id}
                type="button"
                className="resource-chip"
                onClick={() => void openExternalUrl(resource.url)}
                disabled={!resource.url}
                title={resource.url ?? resource.title}
              >
                <span>{RESOURCE_TYPE_LABEL[resource.type]}</span>
                <span data-i18n-skip>{resource.title}</span>
                {resource.url ? <ExternalLink size={11} /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PhaseComposer({ taskId }: { taskId: string }) {
  const addPhase = useAppStore((s) => s.addPhase);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(45);
  const [dueDate, setDueDate] = useState('');

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-small phase-add" onClick={() => setOpen(true)}>
        <Plus size={14} /> 添加阶段
      </button>
    );
  }

  return (
    <div className="phase-composer">
      <input
        type="text"
        placeholder="阶段名称，例如：完成第一轮练习"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoFocus
      />
      <input
        type="number"
        min={5}
        step={5}
        value={minutes}
        onChange={(event) => setMinutes(Number(event.target.value))}
        aria-label="预计分钟"
      />
      <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      <button
        type="button"
        className="btn btn-primary btn-small"
        onClick={() => {
          if (!title.trim()) return;
          addPhase(taskId, {
            title: title.trim(),
            estimatedMinutes: Math.max(5, minutes),
            dueDate: dueDate || undefined,
          });
          setTitle('');
          setOpen(false);
        }}
      >
        添加
      </button>
      <button type="button" className="icon-btn icon-btn-quiet" onClick={() => setOpen(false)} aria-label="取消">
        <X size={14} />
      </button>
    </div>
  );
}

function PhaseEditor({
  taskId,
  phase,
  onClose,
}: {
  taskId: string;
  phase: Phase;
  onClose: () => void;
}) {
  const updatePhase = useAppStore((s) => s.updatePhase);
  const [title, setTitle] = useState(phase.title);
  const [minutes, setMinutes] = useState(phase.estimatedMinutes);
  const [note, setNote] = useState(phase.note ?? '');
  const [dueDate, setDueDate] = useState(phase.dueDate ?? '');

  return (
    <div className="phase-editor">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="阶段名称"
        aria-label="阶段名称"
        autoFocus
      />
      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="备注（可选）"
        aria-label="阶段备注"
      />
      <div className="phase-editor-meta">
        <label>
          <span>预计</span>
          <input
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            aria-label="阶段预计分钟"
          />
          <em>分钟</em>
        </label>
        <label>
          <span>计划日期</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-label="阶段计划日期"
          />
        </label>
      </div>
      <div className="phase-editor-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          disabled={!title.trim()}
          onClick={() => {
            updatePhase(taskId, phase.id, {
              title,
              note,
              estimatedMinutes: Math.max(5, Number(minutes) || 5),
              dueDate: dueDate || undefined,
            });
            onClose();
          }}
        >
          <Check size={13} /> 保存
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  );
}

function PhaseList({ task }: { task: Task }) {
  const togglePhase = useAppStore((s) => s.togglePhase);
  const openModal = useAppStore((s) => s.openModal);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="detail-section">
      <div className="section-head">
        <div>
          <h3>阶段拆分</h3>
          <p>
            把任务拆成不同时期的小目标 · 已完成 {task.phases.filter((p) => p.status === 'done').length}/
            {task.phases.length}
          </p>
        </div>
        <span className="phase-progress-num">{phaseProgress(task)}%</span>
      </div>
      <ProgressBar value={phaseProgress(task)} tone="var(--jade)" height={4} />
      <div className="phase-list">
        {task.phases.length === 0 ? (
          <p className="muted phase-empty">还没有阶段。可以从调查报告的学习路径自动生成，或手动添加。</p>
        ) : null}
        {task.phases.map((phase, index) => (
          <div key={phase.id} className={`phase-item ${phase.status === 'done' ? 'is-done' : ''}`}>
            <button
              type="button"
              className="phase-check"
              onClick={() => togglePhase(task.id, phase.id)}
              aria-label={phase.status === 'done' ? '标记为未完成' : '标记为完成'}
            >
              {phase.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            {editingId === phase.id ? (
              <PhaseEditor taskId={task.id} phase={phase} onClose={() => setEditingId(null)} />
            ) : (
              <div className="phase-body">
                <div className="phase-title">
                  <span className="phase-order">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{phase.title}</strong>
                  <span className={`phase-status phase-${phase.status}`}>
                    {PHASE_STATUS_LABEL[phase.status]}
                  </span>
                </div>
                {phase.note ? <p>{phase.note}</p> : null}
                <div className="phase-meta">
                  <span>
                    <Clock3 size={12} /> {formatMinutes(phase.estimatedMinutes)}
                  </span>
                  {phase.dueDate ? (
                    <span className={relativeDay(phase.dueDate).startsWith('已逾期') ? 'is-overdue' : ''}>
                      <CalendarDays size={12} /> {formatDayKeyCN(phase.dueDate)} · {relativeDay(phase.dueDate)}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            <button
              type="button"
              className="icon-btn icon-btn-quiet"
              onClick={() => setEditingId(phase.id)}
              aria-label="编辑阶段"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-quiet"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '删除这个阶段？',
                  message: `「${phase.title}」将从任务中移除。已获得的证据不会回收。`,
                  confirmLabel: '删除',
                  tone: 'danger',
                  action: () => useAppStore.getState().deletePhase(task.id, phase.id),
                })
              }
              aria-label="删除阶段"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <PhaseComposer taskId={task.id} />
    </section>
  );
}

export function TaskDetailDrawer() {
  const taskId = useAppStore((s) => s.taskDetailId);
  const data = useAppStore((s) => s.data);
  const closeTask = useAppStore((s) => s.closeTask);
  const openModal = useAppStore((s) => s.openModal);
  const startTimer = useAppStore((s) => s.startTimer);
  const openFocus = useAppStore((s) => s.openFocus);
  const pauseTimer = useAppStore((s) => s.pauseTimer);
  const resumeTimer = useAppStore((s) => s.resumeTimer);
  const completeTask = useAppStore((s) => s.completeTask);
  const reopenTask = useAppStore((s) => s.reopenTask);
  const setTaskProgress = useAppStore((s) => s.setTaskProgress);
  const updateTaskNote = useAppStore((s) => s.updateTaskNote);
  const addWritingLog = useAppStore((s) => s.addWritingLog);
  const saving = useAppStore((s) => s.saving);
  const archiveTask = useAppStore((s) => s.archiveTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const task = taskId ? data.tasks.find((t) => t.id === taskId) : undefined;
  const goal = task?.goalId ? data.goals.find((g) => g.id === task.goalId) : undefined;
  const parent = task?.parentId ? data.tasks.find((item) => item.id === task.parentId) : undefined;
  const children = task ? data.tasks.filter((item) => item.parentId === task.id) : [];
  const chain = task ? taskAncestors(data.tasks, task.id) : [];
  const timer = task ? data.activeTimers.find((t) => t.taskId === task.id) : undefined;
  const [noteDraft, setNoteDraft] = useState('');
  const noteDirty = Boolean(task) && noteDraft.trim() !== (task?.note ?? '');

  useEffect(() => {
    if (!task) return;
    setNoteDraft(task.note ?? '');
    // 仅在切换任务时同步，避免覆盖正在输入的内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // 学习文档边写边存：停顿 1 秒后静默落盘，避免长文丢失。
  useEffect(() => {
    if (!task || !noteDirty) return;
    const timer = window.setTimeout(() => {
      updateTaskNote(task.id, noteDraft, { silent: true });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [noteDraft, noteDirty, task, updateTaskNote]);

  if (!task) return null;

  const closeWithDocument = () => {
    if (noteDirty) updateTaskNote(task.id, noteDraft, { silent: true });
    closeTask();
  };

  const accuracy = estimateAccuracy(task);
  const done = task.status === 'done';
  const phasePct = phaseProgress(task);
  const sessions = data.sessions
    .filter((session) => session.taskId === task.id)
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const writingLogs = (data.writingLogs ?? []).filter((log) => log.taskId === task.id);
  const taskEvidenceCount = growthEvidence(data).filter((item) => item.taskId === task.id).length;
  const writingBySession = new Map<string, number>();
  for (const log of writingLogs) {
    if (!log.sessionId) continue;
    writingBySession.set(log.sessionId, (writingBySession.get(log.sessionId) ?? 0) + log.seconds);
  }

  const handleStart = () => {
    if (timer) {
      if (timer.pausedAt) resumeTimer(timer.id);
      else openFocus(timer.id);
    } else {
      startTimer(task.id);
    }
  };

  return (
    <Drawer open onClose={closeWithDocument} width={620}>
      <div className="drawer-scroll">
        <header className="detail-head">
          <button type="button" className="icon-btn detail-close" onClick={closeTask} aria-label="关闭">
            <X size={18} />
          </button>
          <div className="eyebrow">
            任务 · {CATEGORY_LABEL[task.category]} · {DIFFICULTY_LABEL[task.difficulty]}
          </div>
          <h2 data-i18n-skip>{task.title}</h2>
          <div className="detail-chips">
            <span className={`status-chip status-${task.status}`}>
              {done ? '已完成' : task.status === 'active' ? '进行中' : task.status === 'archived' ? '已归档' : '待启程'}
            </span>
            <span className={`priority-chip priority-${task.priority}`}>优先级 {PRIORITY_LABEL[task.priority]}</span>
            {goal ? (
              <button type="button" className="goal-chip" onClick={() => useAppStore.getState().openGoal(goal.id)}>
                <Target size={12} /> <span data-i18n-skip>{goal.title}</span>
              </button>
            ) : null}
            {task.dueDate ? (
              <span className="due-chip">
                <CalendarDays size={12} /> {relativeDay(task.dueDate)}
              </span>
            ) : null}
          </div>
          {(task.level > 1 || parent || children.length > 0) ? (
            <div className="task-chain">
              {task.level > 1 ? (
                <span className={`task-level-badge level-${task.level}`}>L{task.level}</span>
              ) : null}
              {chain.length > 1 ? (
                <span className="task-chain-path">
                  {chain.slice(0, -1).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => useAppStore.getState().openTask(item.id)}
                      data-i18n-skip
                    >
                      {item.title}
                    </button>
                  ))}
                  <span>→ 当前</span>
                </span>
              ) : null}
              {parent ? (
                <span className="task-chain-parent">
                  上级任务：
                  <button type="button" onClick={() => useAppStore.getState().openTask(parent.id)} data-i18n-skip>
                    {parent.title}
                  </button>
                </span>
              ) : null}
              {children.length > 0 ? (
                <button
                  type="button"
                  className="task-chain-children"
                  onClick={() => useAppStore.getState().setView('tasks')}
                >
                  子任务 {children.length} 个
                </button>
              ) : null}
            </div>
          ) : null}

          {task.description ? <p className="detail-desc" data-i18n-skip>{task.description}</p> : null}

          <div className="detail-actions">
            {done ? (
              <button type="button" className="btn btn-ghost" onClick={() => reopenTask(task.id)}>
                <RotateCcw size={15} /> 重新开启
              </button>
            ) : (
              <button type="button" className={`btn ${timer && !timer.pausedAt ? 'btn-jade' : 'btn-primary'}`} onClick={handleStart}>
                {timer ? (
                  timer.pausedAt ? (
                    <>
                      <Play size={16} /> 继续专注
                    </>
                  ) : (
                    <>
                      <Timer size={16} /> 打开专注空间
                    </>
                  )
                ) : (
                  <>
                    <Play size={16} /> 开始计时
                  </>
                )}
              </button>
            )}
            {!done ? (
              <button type="button" className="btn btn-ghost" onClick={() => completeTask(task.id)}>
                <Check size={16} /> 标记完成
              </button>
            ) : null}
            {timer ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => (timer.pausedAt ? resumeTimer(timer.id) : pauseTimer(timer.id))}
              >
                {timer.pausedAt ? <Play size={15} /> : <Pause size={15} />}
                {timer.pausedAt ? '继续' : '暂停'}
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn"
              onClick={() => openModal({ kind: 'task-form', taskId: task.id })}
              aria-label="编辑任务"
              title="编辑任务"
            >
              <Edit3 size={16} />
            </button>
          </div>
        </header>

        <div className="detail-stats">
          <div>
            <span>进度</span>
            <strong>{task.progress}%</strong>
            <small>{phasePct > 0 ? `阶段进度 ${phasePct}%` : '手动填写'}</small>
          </div>
          <div>
            <span>预计</span>
            <strong>{formatMinutes(task.estimatedMinutes)}</strong>
            <small>报告校准后</small>
          </div>
          <div>
            <span>已投入</span>
            <strong>{formatSecondsShort(task.totalFocusSeconds)}</strong>
            <small>{task.sessionCount} 次专注</small>
          </div>
          <div>
            <span>估计准确度</span>
            <strong>{accuracy === null ? '—' : `${accuracy}%`}</strong>
            <small>{accuracy === null ? '开始后可见' : accuracy >= 80 ? '相当靠谱' : '继续校准'}</small>
          </div>
        </div>

        <section className="detail-section">
          <div className="section-head">
            <div>
              <h3>我的进度</h3>
              <p>诚实地记录走到哪了。到 100% 时任务会自动完成。</p>
            </div>
            <span className="progress-big">{task.progress}%</span>
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
            disabled={done}
          />
          <div className="progress-scale">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          {task.progress < 100 && task.phases.length > 0 ? (
            <button
              type="button"
              className="link-btn"
              onClick={() => setTaskProgress(task.id, phasePct)}
            >
              用阶段进度（{phasePct}%）同步任务进度 <ChevronRight size={13} />
            </button>
          ) : null}
        </section>

        <ReportBlock task={task} />
        <PhaseList task={task} />

        <MarkdownNoteEditor
          taskTitle={task.title}
          value={noteDraft}
          dirty={noteDirty}
          saving={saving}
          sessions={sessions}
          writingLogs={writingLogs}
          onChange={setNoteDraft}
          onSave={() => updateTaskNote(task.id, noteDraft)}
          onLogWriting={(input) => addWritingLog({ taskId: task.id, ...input })}
        />

        <TaskAiPanel task={task} />

        <section className="detail-section">
          <div className="section-head">
            <div>
              <h3>专注记录</h3>
              <p>{sessions.length > 0 ? `共 ${sessions.length} 次，最近优先` : '还没有专注记录'}</p>
            </div>
          </div>
          {sessions.length > 0 ? (
            <div className="session-list">
              {sessions.slice(0, 8).map((session) => (
                <div key={session.id} className="session-row">
                  <span className="session-date">
                    {formatDayKeyCN(session.endedAt.slice(0, 10))}
                    <small>{new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </span>
                  <span className="session-duration">{Math.max(1, Math.round(session.seconds / 60))} 分钟</span>
                  {writingBySession.has(session.id) ? (
                    <span className="session-writing">
                      写作 +{Math.max(1, Math.round((writingBySession.get(session.id) ?? 0) / 60))} 分
                    </span>
                  ) : null}
                  {session.note ? <p data-i18n-skip>{session.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              第一次开始计时后，这里会留下你的专注轨迹。
            </p>
          )}
        </section>

        <section className="detail-section detail-danger">
          <div className="section-head">
            <div>
              <h3>整理</h3>
              <p>归档会保留历史专注记录；删除会移除任务本身。</p>
            </div>
          </div>
          <div className="danger-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '归档这个任务？',
                  message: '任务会从任务表中隐藏，但专注记录仍保留在统计里。',
                  confirmLabel: '归档',
                  action: () => archiveTask(task.id),
                })
              }
            >
              <Archive size={15} /> 归档
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '永久删除这个任务？',
                  message: `「${task.title}」将被删除。历史专注记录会保留，但此操作无法撤销。`,
                  confirmLabel: '永久删除',
                  tone: 'danger',
                  action: () => deleteTask(task.id),
                })
              }
            >
              <Trash2 size={15} /> 删除
            </button>
          </div>
        </section>

        <footer className="detail-foot">
          <span>
            <Sparkles size={13} /> 已为这个任务留下 {taskEvidenceCount} 条证据
          </span>
          <span>
            <Flag size={13} /> 创建于 {formatFullDateCN(task.createdAt)}
          </span>
        </footer>
      </div>
    </Drawer>
  );
}
