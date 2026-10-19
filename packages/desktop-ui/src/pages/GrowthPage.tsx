import {
  ACHIEVEMENTS,
  GOAL_COLOR_HEX,
  GROWTH_STAGES,
  formatMinutes,
  growthSummary,
  skillStats,
  timeAgo,
  type GrowthEvidenceKind,
} from '@yolo/core';
import {
  BookOpen,
  Lock,
  CheckCircle2,
  ChevronRight,
  Flame,
  PenLine,
  ScrollText,
  Sprout,
  Star,
  Timer,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ACHIEVEMENT_ICONS } from '../lib/icons';
import { ProgressBar } from '../components/ui/Progress';

const EVIDENCE_ICON: Record<GrowthEvidenceKind, typeof Timer> = {
  focus: Timer,
  writing: PenLine,
  report: ScrollText,
  phase: CheckCircle2,
  task: Trophy,
  knowledge: Star,
  goal: Sprout,
};

const EVIDENCE_LABEL: Record<GrowthEvidenceKind, string> = {
  focus: '专注',
  writing: '文档写作',
  report: '启程侦查',
  phase: '阶段',
  task: '作品',
  knowledge: '知识点',
  goal: '技能树',
};

export function GrowthPage() {
  const data = useAppStore((s) => s.data);
  const openGoal = useAppStore((s) => s.openGoal);
  const openTask = useAppStore((s) => s.openTask);
  const setView = useAppStore((s) => s.setView);
  const openModal = useAppStore((s) => s.openModal);
  const summary = growthSummary(data);
  const stage = summary.stage;
  const skills = data.goals.map((goal) => skillStats(data, goal));
  const skillNodeTotal = skills.reduce((sum, item) => sum + item.total, 0);
  const skillNodeLit = skills.reduce((sum, item) => sum + item.lit, 0);
  const evidenceRows = summary.evidence.slice(0, 14);

  return (
    <div className="page-inner growth-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">成长</div>
          <h1>你不是在攒分，你是在留下证据</h1>
          <p className="page-lede">
            专注、报告、阶段、作品、知识点和文档写作都会成为证据。每棵大目标是一棵技能树，节点点亮，能力就被看见。
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setView('tasks')}>
          <Timer size={16} /> 去留下证据
        </button>
      </header>

      <section className="growth-hero">
        <div className="growth-stage-side">
          <div className="growth-stage-stamp" aria-hidden="true" data-i18n-skip>证</div>
          <div>
            <div className="eyebrow">当前阶段</div>
            <h2>{stage.current.name}</h2>
            <p>{stage.current.hint}</p>
          </div>
        </div>
        <div className="growth-stage-progress">
          <div className="growth-stage-progress-head">
            <span>{summary.evidenceCount} 条证据</span>
            <span>
              {stage.next ? `距「${stage.next.name}」还差 ${stage.remaining} 条` : '已走过全部阶段'}
            </span>
          </div>
          <ProgressBar value={Math.round(stage.progress * 100)} height={8} tone="var(--seal)" />
          <div className="growth-stage-stats">
            <div>
              <span>专注</span>
              <strong>{formatMinutes(summary.focusMinutes)}</strong>
            </div>
            <div>
              <span>文档写作</span>
              <strong>{formatMinutes(summary.writingMinutes)}</strong>
            </div>
            <div>
              <span>完成作品</span>
              <strong>{summary.taskCount}</strong>
            </div>
            <div>
              <span>知识点</span>
              <strong>{skillNodeLit}<small>/{skillNodeTotal}</small></strong>
            </div>
          </div>
        </div>
      </section>

      <section className="growth-section">
        <div className="growth-section-head">
          <div>
            <h2>技能树</h2>
            <p>每个大目标是一棵树。任务和专注是养料，知识点是节点。</p>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setView('goals')}>
            管理技能树 <ChevronRight size={14} />
          </button>
        </div>
        {skills.length > 0 ? (
          <div className="growth-skill-grid">
            {skills.map((skill) => {
              const nodes = skill.goal.knowledgePoints.slice(0, 6);
              return (
                <article
                  key={skill.goal.id}
                  className="growth-skill-card"
                  onClick={() => openGoal(skill.goal.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openGoal(skill.goal.id);
                  }}
                >
                  <div className="growth-skill-head">
                    <div>
                      <span className="growth-skill-dot" style={{ background: GOAL_COLOR_HEX[skill.goal.color] }} />
                      <h3 data-i18n-skip>{skill.goal.title}</h3>
                      {skill.goal.motto ? <p data-i18n-skip>「{skill.goal.motto}」</p> : null}
                    </div>
                    <strong>{skill.progress}%</strong>
                  </div>
                  <div className="skill-tree-rail">
                    {nodes.map((point) => (
                      <div
                        key={point.id}
                        className={`skill-tree-node is-${point.status}`}
                        data-i18n-skip
                      >
                        <span className="skill-tree-dot" />
                        <span className="skill-tree-label" data-i18n-skip>{point.title}</span>
                      </div>
                    ))}
                    {skill.goal.knowledgePoints.length > nodes.length ? (
                      <div className="skill-tree-more">+{skill.goal.knowledgePoints.length - nodes.length} 个节点</div>
                    ) : null}
                  </div>
                  <div className="growth-skill-foot">
                    <span>{skill.evidenceCount} 条证据</span>
                    <span>专注 {formatMinutes(skill.focusMinutes)}</span>
                    <span>写作 {formatMinutes(skill.writingMinutes)}</span>
                  </div>
                  <ProgressBar value={skill.progress} height={4} tone="var(--seal)" />
                </article>
              );
            })}
          </div>
        ) : (
          <div className="growth-empty">
            <Sprout size={26} />
            <h3>还没有技能树</h3>
            <p>先立一个大目标，再把想学会的东西拆成 5–8 个知识点。</p>
            <button type="button" className="btn btn-primary" onClick={() => openModal({ kind: 'goal-form' })}>
              立下第一棵技能树
            </button>
          </div>
        )}
      </section>

      <div className="growth-two-col">
        <section className="growth-section">
          <div className="growth-section-head">
            <div>
              <h2>证据链</h2>
              <p>不是分数，是你确实做过的事。</p>
            </div>
            <span className="growth-count">{summary.evidenceCount} 条</span>
          </div>
          {evidenceRows.length > 0 ? (
            <div className="growth-evidence-list">
              {evidenceRows.map((item) => {
                const Icon = EVIDENCE_ICON[item.kind] ?? BookOpen;
                const goal = item.goalId ? data.goals.find((entry) => entry.id === item.goalId) : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="growth-evidence-row"
                    onClick={() => {
                      if (item.taskId) openTask(item.taskId);
                      else if (item.goalId) openGoal(item.goalId);
                    }}
                  >
                    <span className={`growth-evidence-icon is-${item.kind}`}>
                      <Icon size={14} />
                    </span>
                    <span className="growth-evidence-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {item.detail ?? EVIDENCE_LABEL[item.kind]}
                        {goal ? ` · ${goal.title}` : ''}
                      </small>
                    </span>
                    <span className="growth-evidence-meta">
                      {item.minutes ? `${item.minutes} 分钟` : ''}
                      <small>{timeAgo(item.at)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="growth-muted">完成第一次专注，第一条证据就会出现。</p>
          )}
        </section>

        <section className="growth-section">
          <div className="growth-section-head">
            <div>
              <h2>成长阶段</h2>
              <p>不是等级，是你看待自己的方式。</p>
            </div>
          </div>
          <div className="growth-stage-track">
            {GROWTH_STAGES.map((item) => {
              const active = item.id === stage.current.id;
              const passed = summary.evidenceCount >= item.minEvidence;
              return (
                <div key={item.id} className={`growth-stage-row ${active ? 'is-current' : ''} ${passed ? 'is-passed' : ''}`}>
                  <span className="growth-stage-node">{passed ? <CheckCircle2 size={12} /> : <span />}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.hint}</small>
                  </div>
                  <em>{item.minEvidence} 条</em>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="growth-section">
        <div className="growth-section-head">
          <div>
            <h2>里程碑</h2>
            <p>不是分数，是你确实做过这些事的证据。</p>
          </div>
          <span className="growth-count">
            {Object.keys(data.rewards.unlocked).length} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((achievement) => {
            const unlockedAt = data.rewards.unlocked[achievement.id];
            const unlocked = Boolean(unlockedAt);
            const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Trophy;
            return (
              <article key={achievement.id} className={`achievement ${unlocked ? 'is-unlocked' : 'is-locked'}`}>
                <div className="achievement-icon">
                  <Icon size={20} />
                  {!unlocked ? (
                    <span className="achievement-lock">
                      <Lock size={9} />
                    </span>
                  ) : null}
                </div>
                <div className="achievement-copy">
                  <strong>{achievement.name}</strong>
                  <p>{unlocked ? achievement.description : achievement.hint}</p>
                  {unlocked && unlockedAt ? (
                    <small>
                      <CheckCircle2 size={11} /> {timeAgo(unlockedAt)}
                    </small>
                  ) : (
                    <small className="is-locked-hint">未解锁</small>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="growth-foot">
        <span><Flame size={13} /> 连续专注</span>
        <span><Sprout size={13} /> {summary.goalCount} 棵技能树完成</span>
        <span><ScrollText size={13} /> {summary.reportCount} 份启程侦查</span>
      </div>
    </div>
  );
}
