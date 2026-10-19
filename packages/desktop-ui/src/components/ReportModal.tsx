import { useEffect, useState, type ReactNode } from 'react';
import {
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import {
  emptyReportInput,
  formatMinutes,
  makeId,
  reportGrade,
  validateReport,
  type ReportInput,
  type ResearchReport,
  type ResourceType,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Modal } from './ui/Modal';
import { ProgressRing } from './ui/Progress';

const RESOURCE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'book', label: '书籍' },
  { value: 'course', label: '课程' },
  { value: 'docs', label: '文档' },
  { value: 'video', label: '视频' },
  { value: 'practice', label: '练习' },
  { value: 'other', label: '其他' },
];

const CONFIDENCE_LABELS = ['完全没底', '有点模糊', '大致有数', '比较有把握', '很有把握'];

function toInput(report: ResearchReport): ReportInput {
  return {
    subject: report.subject,
    goal: report.goal,
    successCriteria: report.successCriteria,
    prerequisites: report.prerequisites,
    usefulScope: report.usefulScope,
    avoidScope: report.avoidScope,
    risks: report.risks,
    path: report.path.map((step) => ({ ...step })),
    resources: report.resources.map((resource) => ({ ...resource })),
    calibratedMinutes: report.calibratedMinutes,
    confidence: report.confidence,
  };
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: ReactNode;
  wide?: boolean;
}

function Field({ label, hint, error, counter, children, wide }: FieldProps) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''} ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label}
        {counter ? <em>{counter}</em> : null}
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
      {error ? (
        <span className="field-error">
          <AlertCircle size={12} /> {error}
        </span>
      ) : null}
    </label>
  );
}

export function ReportModal() {
  const modal = useAppStore((s) => s.modal);
  const data = useAppStore((s) => s.data);
  const closeModal = useAppStore((s) => s.closeModal);
  const submitReport = useAppStore((s) => s.submitReport);
  const pushToast = useAppStore((s) => s.pushToast);

  const task = modal.kind === 'report' ? data.tasks.find((t) => t.id === modal.taskId) : undefined;
  const open = modal.kind === 'report' && Boolean(task);

  const [form, setForm] = useState<ReportInput>(() =>
    task?.report ? toInput(task.report) : emptyReportInput(task ?? undefined),
  );
  const [attempted, setAttempted] = useState(false);
  const [createPhases, setCreatePhases] = useState(true);

  useEffect(() => {
    if (!open || !task) return;
    setForm(task.report ? toInput(task.report) : emptyReportInput({ title: task.title, estimatedMinutes: task.estimatedMinutes }));
    setAttempted(false);
    setCreatePhases(task.phases.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  if (!open || !task || modal.kind !== 'report') return null;

  const validation = validateReport(form);
  const grade = reportGrade(validation.score);
  const missing = Object.keys(validation.errors).length;
  const pathTotal = form.path.reduce((sum, step) => sum + (Number(step.estimatedMinutes) || 0), 0);
  const drift = pathTotal > 0 ? Math.round(((pathTotal - form.calibratedMinutes) / Math.max(1, form.calibratedMinutes)) * 100) : 0;
  const isRevision = Boolean(task.report);

  const patch = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const errorFor = (key: keyof ReportInput) => (attempted ? validation.errors[key] : undefined);

  const addPathStep = () => {
    setForm((previous) => ({
      ...previous,
      path: [
        ...previous.path,
        { id: makeId('p_'), title: '', detail: '', estimatedMinutes: 30 },
      ],
    }));
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!validation.ok) {
      pushToast({
        tone: 'warn',
        title: '侦查报告还未完成',
        message: `还有 ${missing} 项必答内容。补齐后即可开始计时。`,
      });
      return;
    }
    submitReport(task.id, form, {
      createPhases,
      startAfterSubmit: modal.startAfterSubmit,
    });
  };

  const checklist = [
    { label: '说明这项知识/任务是什么', done: !validation.errors.subject && !validation.errors.goal },
    { label: '定义可验收的成功标准', done: !validation.errors.successCriteria },
    { label: '拆出至少两步学习路径', done: !validation.errors.path },
    { label: '列出具体的信息来源', done: !validation.errors.resources },
    { label: '划出「学」与「不学」的边界', done: !validation.errors.usefulScope && !validation.errors.avoidScope },
    { label: '写下风险并校准时间', done: !validation.errors.risks && !validation.errors.calibratedMinutes },
  ];

  return (
    <Modal
      open
      onClose={closeModal}
      size="xl"
      eyebrow="启程侦查"
      title={isRevision ? `修订调查报告 · ${task.title}` : `启程侦查 · ${task.title}`}
      subtitle="这不是作业，而是你为自己节省时间的第一次行动。写清楚要学什么、怎么学、明确不学什么，再开始计时。"
      bodyClassName="report-body"
      footer={
        <div className="report-footer">
          <div className="report-footer-hint">
            {validation.ok ? (
              <span className="ok-line">
                <CheckCircle2 size={14} /> 可以启程 · 评分 {validation.score}
              </span>
            ) : (
              <span className="warn-line">
                <AlertCircle size={14} /> 还有 {missing} 项必答内容未完成
              </span>
            )}
          </div>
          <div className="report-footer-actions">
            <button type="button" className="btn btn-ghost" onClick={closeModal}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              title={validation.ok ? '提交报告' : '点击查看还缺哪些内容'}
            >
              <ShieldCheck size={16} />
              {isRevision ? '保存修订' : modal.startAfterSubmit ? '提交并开始计时' : '提交报告'}
            </button>
          </div>
        </div>
      }
    >
      <div className="report-layout">
        <div className="report-form">
          <div className="report-banner">
            <Sparkles size={16} />
            <p>
              花 10 分钟做一次侦查，可能替你省下 10 个小时的弯路。提交后，学习路径可以一键沉淀为任务阶段。
            </p>
          </div>

          <section className="report-section">
            <header>
              <span className="report-step">01</span>
              <div>
                <h3>侦察对象</h3>
                <p>你要攻克的到底是什么？用自己的话讲清楚。</p>
              </div>
            </header>
            <div className="field-grid">
              <Field
                label="这项知识 / 任务是什么"
                hint="核心概念、范围、关键难点"
                error={errorFor('subject')}
                counter={`${form.subject.trim().length} 字`}
                wide
              >
                <textarea
                  rows={3}
                  value={form.subject}
                  onChange={(event) => patch('subject', event.target.value)}
                  placeholder="例如：JavaScript 的作用域、闭包与异步机制，难点在事件循环和 this 绑定。"
                />
              </Field>
              <Field
                label="最终要达成什么"
                hint="用结果描述，而不是“看完某本书”"
                error={errorFor('goal')}
                counter={`${form.goal.trim().length} 字`}
                wide
              >
                <textarea
                  rows={2}
                  value={form.goal}
                  onChange={(event) => patch('goal', event.target.value)}
                  placeholder="例如：能独立读懂并改写中等复杂度的 JS 代码，为 React 和 Node 打地基。"
                />
              </Field>
            </div>
          </section>

          <section className="report-section">
            <header>
              <span className="report-step">02</span>
              <div>
                <h3>验收标准</h3>
                <p>怎样才算“学会”？先定义终点，避免无限期地学下去。</p>
              </div>
            </header>
            <div className="field-grid">
              <Field
                label="成功标准"
                hint="可观察、可验收，最好能产出作品或通过测试"
                error={errorFor('successCriteria')}
                wide
              >
                <textarea
                  rows={2}
                  value={form.successCriteria}
                  onChange={(event) => patch('successCriteria', event.target.value)}
                  placeholder="例如：不查资料写出闭包与异步示例；完成 20 道练习；能讲清事件循环。"
                />
              </Field>
              <Field
                label="前置条件"
                hint="你已经具备什么，还缺什么"
                error={errorFor('prerequisites')}
                wide
              >
                <textarea
                  rows={2}
                  value={form.prerequisites}
                  onChange={(event) => patch('prerequisites', event.target.value)}
                  placeholder="例如：会 HTML/CSS 和基础函数；需要一个能跑 Node 的环境。"
                />
              </Field>
            </div>
          </section>

          <section className="report-section">
            <header>
              <span className="report-step">03</span>
              <div>
                <h3>学习路径</h3>
                <p>至少拆成两步。每一步都要有时间预算，完成后可以沉淀为阶段。</p>
              </div>
            </header>
            <div className="path-list">
              {form.path.map((step, index) => (
                <div className="path-row" key={step.id}>
                  <span className="path-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="path-fields">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(event) =>
                        patch(
                          'path',
                          form.path.map((s) =>
                            s.id === step.id ? { ...s, title: event.target.value } : s,
                          ),
                        )
                      }
                      placeholder={index === 0 ? '从哪一步开始？' : '下一步做什么？'}
                      aria-label={`第 ${index + 1} 步名称`}
                    />
                    <input
                      type="text"
                      value={step.detail ?? ''}
                      onChange={(event) =>
                        patch(
                          'path',
                          form.path.map((s) =>
                            s.id === step.id ? { ...s, detail: event.target.value } : s,
                          ),
                        )
                      }
                      placeholder="这一步的具体动作 / 检验方式（可选）"
                      aria-label={`第 ${index + 1} 步说明`}
                    />
                  </div>
                  <div className="path-minutes">
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={step.estimatedMinutes}
                      onChange={(event) =>
                        patch(
                          'path',
                          form.path.map((s) =>
                            s.id === step.id
                              ? { ...s, estimatedMinutes: Number(event.target.value) }
                              : s,
                          ),
                        )
                      }
                      aria-label={`第 ${index + 1} 步预计分钟`}
                    />
                    <span>分钟</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    onClick={() =>
                      patch(
                        'path',
                        form.path.filter((s) => s.id !== step.id),
                      )
                    }
                    disabled={form.path.length <= 1}
                    aria-label="删除这一步"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="path-footer">
              <button type="button" className="btn btn-ghost btn-small" onClick={addPathStep}>
                <Plus size={14} /> 增加一步
              </button>
              <span className="path-total">
                路径合计 <strong>{formatMinutes(pathTotal)}</strong>
                {Math.abs(drift) >= 20 ? (
                  <em className={drift > 0 ? 'is-over' : 'is-under'}>
                    与预计总用时相差 {Math.abs(drift)}%
                  </em>
                ) : null}
              </span>
            </div>
            {errorFor('path') ? (
              <span className="field-error">
                <AlertCircle size={12} /> {errorFor('path')}
              </span>
            ) : null}
          </section>

          <section className="report-section">
            <header>
              <span className="report-step">04</span>
              <div>
                <h3>资料与取舍</h3>
                <p>信息源要具体。更重要的是：明确哪些内容现在不学。</p>
              </div>
            </header>
            <div className="resource-list">
              {form.resources.map((resource, index) => (
                <div className="resource-row" key={resource.id}>
                  <input
                    type="text"
                    value={resource.title}
                    onChange={(event) =>
                      patch(
                        'resources',
                        form.resources.map((r) =>
                          r.id === resource.id ? { ...r, title: event.target.value } : r,
                        ),
                      )
                    }
                    placeholder={`资料 ${index + 1}：书名 / 课程 / 文档`}
                    aria-label={`资料 ${index + 1}`}
                  />
                  <select
                    value={resource.type}
                    onChange={(event) =>
                      patch(
                        'resources',
                        form.resources.map((r) =>
                          r.id === resource.id
                            ? { ...r, type: event.target.value as ResourceType }
                            : r,
                        ),
                      )
                    }
                    aria-label="资料类型"
                  >
                    {RESOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={resource.url ?? ''}
                    onChange={(event) =>
                      patch(
                        'resources',
                        form.resources.map((r) =>
                          r.id === resource.id ? { ...r, url: event.target.value } : r,
                        ),
                      )
                    }
                    placeholder="链接（可选）"
                    aria-label="资料链接"
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn-quiet"
                    onClick={() =>
                      patch(
                        'resources',
                        form.resources.filter((r) => r.id !== resource.id),
                      )
                    }
                    aria-label="删除资料"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() =>
                  patch('resources', [
                    ...form.resources,
                    { id: makeId('r_'), title: '', type: 'docs' },
                  ])
                }
              >
                <Plus size={14} /> 添加资料
              </button>
            </div>
            {errorFor('resources') ? (
              <span className="field-error">
                <AlertCircle size={12} /> {errorFor('resources')}
              </span>
            ) : null}

            <div className="field-grid two-col">
              <Field
                label="真正要学的"
                hint="只写对达成目标有帮助的部分"
                error={errorFor('usefulScope')}
              >
                <textarea
                  rows={3}
                  value={form.usefulScope}
                  onChange={(event) => patch('usefulScope', event.target.value)}
                  placeholder="例如：闭包、原型、Promise、事件循环、模块化。"
                />
              </Field>
              <Field
                label="明确不学的"
                hint="写下边界，抵抗「什么都想学」的冲动"
                error={errorFor('avoidScope')}
              >
                <textarea
                  rows={3}
                  value={form.avoidScope}
                  onChange={(event) => patch('avoidScope', event.target.value)}
                  placeholder="例如：暂不深挖 V8 源码，不追冷门语法糖。"
                />
              </Field>
            </div>
          </section>

          <section className="report-section">
            <header>
              <span className="report-step">05</span>
              <div>
                <h3>风险与时间校准</h3>
                <p>预判会卡在哪里，然后给一个诚实的预计用时。</p>
              </div>
            </header>
            <Field
              label="可能踩的坑"
              hint="写下来，卡住时就不会轻易怀疑自己"
              error={errorFor('risks')}
              wide
            >
              <textarea
                rows={2}
                value={form.risks}
                onChange={(event) => patch('risks', event.target.value)}
                placeholder="例如：容易陷入教程循环；异步与 this 易混淆；练习量不足会眼高手低。"
              />
            </Field>

            <div className="calibration-row">
              <div className="calibration-field">
                <span className="field-label">预计总用时</span>
                <div className="duration-input">
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={form.calibratedMinutes}
                    onChange={(event) => patch('calibratedMinutes', Number(event.target.value))}
                    aria-label="预计总用时（分钟）"
                  />
                  <span>分钟</span>
                  <em>{formatMinutes(form.calibratedMinutes)}</em>
                </div>
                {errorFor('calibratedMinutes') ? (
                  <span className="field-error">
                    <AlertCircle size={12} /> {errorFor('calibratedMinutes')}
                  </span>
                ) : null}
              </div>
              <div className="confidence-field">
                <span className="field-label">对估计的把握</span>
                <div className="confidence-options">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`confidence-pill ${form.confidence === value ? 'is-active' : ''}`}
                      onClick={() => patch('confidence', value)}
                      title={CONFIDENCE_LABELS[value - 1]}
                    >
                      {value}
                    </button>
                  ))}
                  <em>{CONFIDENCE_LABELS[form.confidence - 1]}</em>
                </div>
              </div>
            </div>

            <label className="toggle-line">
              <input
                type="checkbox"
                checked={createPhases}
                onChange={(event) => setCreatePhases(event.target.checked)}
              />
              <span>
                把学习路径写入任务阶段
                {task.phases.length > 0 ? '（追加到现有阶段）' : '（替换空的阶段列表）'}
              </span>
            </label>
          </section>
        </div>

        <aside className="report-aside">
          <div className="score-card">
            <ProgressRing value={validation.score} size={108} stroke={7} tone="var(--seal)">
              <strong>{validation.score}</strong>
              <small>侦查分</small>
            </ProgressRing>
            <div className={`score-grade tone-${grade.tone}`}>{grade.grade}</div>
            <p>分数只衡量“想清楚的程度”，不衡量你的能力。</p>
          </div>

          <div className="aside-block">
            <h4>
              <ListChecks size={15} /> 启程检查
            </h4>
            <ul className="checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? 'is-done' : ''}>
                  {item.done ? <CheckCircle2 size={14} /> : <span className="check-empty" />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="aside-block">
            <h4>时间预估</h4>
            <dl className="aside-facts">
              <div>
                <dt>预计投入</dt>
                <dd>{formatMinutes(form.calibratedMinutes)}</dd>
              </div>
              <div>
                <dt>路径拆分</dt>
                <dd>{formatMinutes(pathTotal)}</dd>
              </div>
              <div>
                <dt>把握程度</dt>
                <dd>{CONFIDENCE_LABELS[form.confidence - 1]}</dd>
              </div>
            </dl>
            <p className="aside-note">
              估计不准也没关系。完成任务后，应用会把「预计 vs 实际」记入统计，帮你越来越准。
            </p>
          </div>

          {modal.startAfterSubmit ? (
            <div className="aside-gate">
              <ShieldCheck size={16} />
              <div>
                <strong>提交后立即开始计时</strong>
                <p>计时期间随时可以回到这里补充思路。</p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </Modal>
  );
}
