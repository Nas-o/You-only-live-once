import { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Loader2,
  MessageCircleQuestion,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  formatMinutes,
  makeId,
  timeAgo,
  type AiAssessmentSession,
  type AiPlanVerdict,
  type EstimateReview,
  type Task,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import {
  CONFIDENCE_THRESHOLD,
  MAX_INTERVIEW_ROUNDS,
  hasAiConfig,
  isLocalApiUrl,
  planReviewToRecord,
  runInterview,
  runPlanAssessment,
} from '../lib/ai';

const PLAN_LABEL: Record<AiPlanVerdict, string> = {
  reasonable: '计划合理',
  conditional: '有条件可行',
  unreasonable: '计划有明显风险',
  uncertain: '信息不足',
};



function PlanResult({
  review,
  progress,
  onApply,
  onRestart,
}: {
  review: EstimateReview;
  progress: number;
  onApply: () => void;
  onRestart: () => void;
}) {
  const verdict = review.planVerdict ?? 'uncertain';
  const highTips = (review.tips ?? []).filter((tip) => tip.severity === 'high');
  return (
    <article className={`ai-plan-result is-${verdict}`}>
      <div className="ai-plan-result-top">
        <span className={`ai-plan-verdict is-${verdict}`}>{PLAN_LABEL[verdict]}</span>
        <span className="ai-plan-score">方案分 {review.planScore ?? '—'}</span>
        <span className="ai-review-time">{timeAgo(review.createdAt)}</span>
      </div>

      {highTips.length > 0 || verdict === 'unreasonable' ? (
        <div className="ai-plan-warning">
          <ShieldAlert size={18} />
          <div>
            <strong>先看这些风险</strong>
            {(highTips.length > 0 ? highTips : []).map((tip) => (
              <div key={tip.title} className="ai-plan-warning-item">
                <b data-i18n-skip>{tip.title}</b>
                <p data-i18n-skip>{tip.detail}</p>
                {tip.evidence ? <small>依据：{tip.evidence}</small> : null}
              </div>
            ))}
            {highTips.length === 0 ? <p>AI 认为这份计划存在明显风险，请结合下面的风险清单核对。</p> : null}
          </div>
        </div>
      ) : null}

      <p className="ai-plan-summary" data-i18n-skip>{review.summary}</p>

      {review.profileSummary ? (
        <p className="ai-profile-line">
          <CircleDot size={13} /> 判断依据：{review.profileSummary}
        </p>
      ) : null}

      <div className="ai-review-range">
        <div>
          <span className="eyebrow">最终时间建议</span>
          <strong>
            {formatMinutes(review.suggestedMin)} – {formatMinutes(review.suggestedMax)}
          </strong>
        </div>
        <div className="ai-baseline">
          <span>数据基线</span>
          <em>
            {formatMinutes(review.baselineMin)} – {formatMinutes(review.baselineMax)}
          </em>
        </div>
      </div>
      <div className="ai-result-meta">
        <span>任务进度 {progress}%</span>
        <span>实际投入 {review.context.actualMinutes} 分钟</span>
        <span>历史样本 {review.context.peerCount}</span>
      </div>

      {review.suggestedMax > review.baselineMax * 1.5 ||
      review.suggestedMin < review.baselineMin * 0.5 ? (
        <p className="ai-divergence">AI 建议与历史数据基线分歧较大。先核对计划范围，再决定是否采用。</p>
      ) : null}

      {(review.tips ?? []).filter((tip) => tip.severity !== 'high').length > 0 ? (
        <div className="ai-review-block">
          <span className="ai-block-label">其他需要留意</span>
          <ul>
            {(review.tips ?? [])
              .filter((tip) => tip.severity !== 'high')
              .map((tip) => (
                <li key={tip.title}>
                  <b data-i18n-skip>{tip.title}</b>：{tip.detail}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {review.factors.length > 0 ? (
        <div className="ai-factor-list">
          {review.factors.slice(0, 5).map((factor, index) => (
            <div key={`${factor.label}-${index}`} className="ai-factor">
              <span className={`ai-factor-impact is-${factor.impact}`} />
              <strong>{factor.label}</strong>
              <p data-i18n-skip>{factor.explanation}</p>
            </div>
          ))}
        </div>
      ) : null}

      {review.risks.length > 0 ? (
        <div className="ai-review-block">
          <span className="ai-block-label">风险</span>
          <ul>
            {review.risks.map((risk) => (
              <li key={risk} data-i18n-skip>{risk}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.recommendations.length > 0 ? (
        <div className="ai-review-block">
          <span className="ai-block-label">建议</span>
          <ul>
            {review.recommendations.map((item) => (
              <li key={item} data-i18n-skip>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="ai-review-foot">
        <span>{review.model}</span>
        <span>{review.userPlan ? '已评估你的原始计划' : '基于访谈与当前进度'}</span>
      </div>

      <div className="ai-review-actions">
        {review.acceptedAt ? (
          <span className="ai-accepted">
            <CheckCircle2 size={14} /> 已采用这个时间建议
          </span>
        ) : (
          <button type="button" className="btn btn-primary btn-small" onClick={onApply}>
            <CheckCircle2 size={14} /> 采用中值 {Math.round((review.suggestedMin + review.suggestedMax) / 2)} 分钟
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-small" onClick={onRestart}>
          <RefreshCw size={13} /> 重新评估
        </button>
      </div>
    </article>
  );
}

export function TaskAiPanel({ task }: { task: Task }) {
  const data = useAppStore((s) => s.data);
  const saveAssessmentSession = useAppStore((s) => s.saveAssessmentSession);
  const saveEstimateReview = useAppStore((s) => s.addEstimateReview);
  const applyEstimateReview = useAppStore((s) => s.applyEstimateReview);
  const setView = useAppStore((s) => s.setView);
  const closeTask = useAppStore((s) => s.closeTask);
  const session = data.assessmentSessions
    .filter((item) => item.taskId === task.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [planDraft, setPlanDraft] = useState(session?.plan ?? '');
  const [busy, setBusy] = useState<'start' | 'answer' | 'plan' | 'restart' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    let active = true;
    const bridge = window.yolo?.ai;
    if (!bridge) {
      setHasKey(false);
      return;
    }
    void bridge.secureGetKey().then((result) => {
      if (active) setHasKey(Boolean(result.ok && result.value));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPlanDraft(session?.plan ?? '');
    setError(null);
  }, [session?.id]);

  useEffect(() => {
    setDraftAnswers({});
  }, [session?.questions.map((question) => question.id).join('|')]);

  const configured = hasAiConfig(data.ai);
  const localApi = isLocalApiUrl(data.ai.baseUrl);
  const keyMissing = hasKey === false && !localApi;
  const latestReview = session?.resultId
    ? data.estimateReviews.find((review) => review.id === session.resultId)
    : undefined;
  const canFinish = session ? session.confidence >= session.threshold : false;
  const maxRoundReached = session ? session.round >= MAX_INTERVIEW_ROUNDS && !canFinish : false;

  const goSettings = () => {
    closeTask();
    setView('settings');
  };

  const start = async () => {
    setBusy('start');
    setError(null);
    setDraftAnswers({});
    setShowAnswers(false);
    try {
      const now = new Date().toISOString();
      const fresh: AiAssessmentSession = {
        id: makeId('as_'),
        taskId: task.id,
        createdAt: now,
        updatedAt: now,
        stage: 'interview',
        confidence: 0,
        threshold: CONFIDENCE_THRESHOLD,
        round: 0,
        questions: [],
        answers: [],
        plan: '',
      };
      const turn = await runInterview(data, task, fresh);
      const next: AiAssessmentSession = {
        ...fresh,
        confidence: turn.confidence,
        level: turn.level,
        coverage: turn.coverage,
        questions: turn.questions,
        stage: turn.readyForPlan ? 'plan' : 'interview',
        profileSummary: turn.summary,
        updatedAt: new Date().toISOString(),
      };
      saveAssessmentSession(next);
    } catch (reason) {
      setError(String((reason as Error).message || reason));
    } finally {
      setBusy(null);
    }
  };

  const answer = async () => {
    if (!session) return;
    const missing = session.questions.filter((question) => !(draftAnswers[question.id] ?? '').trim());
    if (missing.length > 0) {
      setError('请先把这一轮的问题回答完。');
      return;
    }
    setBusy('answer');
    setError(null);
    try {
      const at = new Date().toISOString();
      const nextAnswers = session.questions.map((question) => ({
        questionId: question.id,
        question: question.question,
        answer: (draftAnswers[question.id] ?? '').trim(),
        at,
      }));
      const answered: AiAssessmentSession = {
        ...session,
        answers: [...session.answers, ...nextAnswers],
        round: session.round + 1,
        questions: [],
        updatedAt: at,
      };
      const turn = await runInterview(data, task, answered);
      const next: AiAssessmentSession = {
        ...answered,
        confidence: turn.confidence,
        level: turn.level,
        coverage: turn.coverage,
        questions: turn.questions,
        profileSummary: turn.summary || answered.profileSummary,
        stage: turn.readyForPlan ? 'plan' : 'interview',
        lastAnswerQuality: turn.answerQuality,
        lastAnswerNote: turn.answerNote,
        updatedAt: new Date().toISOString(),
      };
      saveAssessmentSession(next);
      setDraftAnswers({});
      if (next.stage === 'plan') setPlanDraft('');
    } catch (reason) {
      setError(String((reason as Error).message || reason));
    } finally {
      setBusy(null);
    }
  };

  const evaluatePlan = async () => {
    if (!session) return;
    if (planDraft.trim().length < 20) {
      setError('先写下你自己的计划，至少写清楚顺序、时间或完成标准中的两项。');
      return;
    }
    setBusy('plan');
    setError(null);
    try {
      const next: AiAssessmentSession = {
        ...session,
        plan: planDraft.trim(),
        updatedAt: new Date().toISOString(),
      };
      saveAssessmentSession(next);
      const { payload, baseline } = await runPlanAssessment(data, task, next);
      if (payload.confidence < CONFIDENCE_THRESHOLD) {
        saveAssessmentSession({
          ...next,
          confidence: payload.confidence,
          profileSummary: payload.profileSummary || next.profileSummary,
          updatedAt: new Date().toISOString(),
        });
        setError('当前信息还不足以形成可靠的最终判断。请在计划里补充顺序、时间预算或完成标准后重试。');
        return;
      }
      const review = planReviewToRecord(data, task, next, payload, baseline);
      saveEstimateReview(review);
      saveAssessmentSession({
        ...next,
        stage: 'result',
        confidence: payload.confidence,
        resultId: review.id,
        profileSummary: payload.profileSummary || next.profileSummary,
        updatedAt: new Date().toISOString(),
      });
    } catch (reason) {
      setError(String((reason as Error).message || reason));
    } finally {
      setBusy(null);
    }
  };

  const restart = () => {
    setBusy('restart');
    void start().finally(() => setBusy(null));
  };

  return (
    <section className="detail-section ai-estimate-panel">
      <div className="section-head">
        <div>
          <h3>
            <Bot size={16} /> 学习助理
          </h3>
          <p>先问清楚你的基础与目标，再由你自己写计划；只有信息足够时才给结论。</p>
        </div>
        <span className="ai-panel-badge">多轮评估</span>
      </div>

      {!configured || keyMissing ? (
        <div className="ai-setup-callout">
          <CircleAlert size={18} />
          <div>
            <strong>{!configured ? '学习助理还没配置' : '还缺一个 API Key'}</strong>
            <p>
              {!configured
                ? '在设置里选择服务商，填写 Key、API Base URL 和模型。'
                : 'Key 只保存在本机安全存储中，保存后即可评估。'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={goSettings}>
            去设置 <ChevronRight size={13} />
          </button>
        </div>
      ) : null}

      {configured && !keyMissing && !session ? (
        <div className="ai-start">
          <div>
            <Sparkles size={18} />
            <p>
              问题数量根据你的回答动态变化：可能 1 轮就够，也可能超过 6 轮，最多 10 轮。
              <small>只有信息足够后，才会进入“你来写计划”的下一步。不出练习题，不替你写计划。</small>
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={busy !== null}>
            {busy === 'start' ? <Loader2 size={15} className="spin" /> : <MessageCircleQuestion size={15} />}
            {busy === 'start' ? '正在准备问题…' : '开始背景访谈'}
          </button>
        </div>
      ) : null}

      {session && session.stage === 'interview' ? (
        <div className="ai-interview">
          <div className="ai-stage-head">
            <span className="ai-stage-label">
              {maxRoundReached ? `已问满 ${MAX_INTERVIEW_ROUNDS} 轮` : `第 ${session.round + 1} 轮 · 背景访谈`}
            </span>
            <span className="ai-stage-note">{maxRoundReached ? '等待重新开始' : `第 ${session.round + 1} 轮`}</span>
          </div>
          {session.profileSummary ? <p className="ai-interview-summary" data-i18n-skip>{session.profileSummary}</p> : null}
          {session.questions.length > 0 ? (
            <div className="ai-question-list">
              {session.questions.map((question, index) => {
                const answer = draftAnswers[question.id] ?? '';
                const isCustom = answer.trim().length > 0 && !(question.options ?? []).includes(answer);
                return (
                  <div key={question.id} className="ai-question">
                    <span className="ai-question-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="ai-question-copy">
                      <strong data-i18n-skip>{question.question}</strong>
                      {question.options && question.options.length > 0 ? (
                        <span className="ai-answer-options" role="group" aria-label="可选回答">
                          {question.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`ai-answer-option ${answer === option ? 'is-selected' : ''}`}
                              aria-pressed={answer === option}
                              data-i18n-skip
                              onClick={() =>
                                setDraftAnswers((current) => ({ ...current, [question.id]: option }))
                              }
                            >
                              {option}
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`ai-answer-option is-custom ${isCustom ? 'is-selected' : ''}`}
                            aria-pressed={isCustom}
                            onClick={() => {
                              setDraftAnswers((current) => ({ ...current, [question.id]: '' }));
                              requestAnimationFrame(() =>
                                document.getElementById(`ai-answer-${question.id}`)?.focus(),
                              );
                            }}
                          >
                            其他（自己回答）
                          </button>
                        </span>
                      ) : null}
                      <textarea
                        id={`ai-answer-${question.id}`}
                        rows={2}
                        value={answer}
                        onChange={(event) =>
                          setDraftAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                        }
                        placeholder={question.options?.length ? '也可以在这里补充自己的回答…' : '按你的真实情况回答，不用写得漂亮。'}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="ai-interview-foot">
            <span>
              已回答 {session.answers.length} 个问题
              {maxRoundReached ? ' · 已达到轮次上限' : ''}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => void restart()}
              disabled={busy !== null}
            >
              {busy === 'restart' || busy === 'start' ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
              重新开始访谈
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void answer()}
              disabled={busy !== null || session.questions.length === 0 || maxRoundReached}
            >
              {busy === 'answer' ? <Loader2 size={14} className="spin" /> : <CircleCheck size={14} />}
              {busy === 'answer' ? '正在判断信息是否足够…' : '提交回答'}
            </button>
          </div>
          {maxRoundReached ? (
            <p className="ai-error">
              <CircleAlert size={14} /> 当前信息仍不足，暂时不生成结论。可以点「重新开始访谈」，从新的起点补充背景。
            </p>
          ) : null}
        </div>
      ) : null}

      {session && session.stage === 'plan' ? (
        <div className="ai-plan-stage">
          <div className="ai-stage-head">
            <span className="ai-stage-label">信息足够 · 现在轮到你了</span>
            <span className="ai-stage-note">信息已足够</span>
          </div>
          <div className="ai-plan-prompt">
            <Wand2 size={18} />
            <div>
              <strong>先写你自己的学习计划</strong>
              <p>AI 不会先替你写。请写清楚：先学什么、按什么顺序、每周投入多少、什么算完成。</p>
            </div>
          </div>
          {session.answers.length > 0 ? (
            <button type="button" className="ai-plan-answers-toggle" onClick={() => setShowAnswers((value) => !value)}>
              <CircleDot size={13} /> {showAnswers ? '收起' : '查看'}已确认的 {session.answers.length} 条背景
            </button>
          ) : null}
          {showAnswers ? (
            <div className="ai-answer-summary">
              {session.answers.map((answer) => (
                <p key={`${answer.questionId}-${answer.at}`}>
                  <strong>{answer.question}</strong>
                  <span data-i18n-skip>{answer.answer}</span>
                </p>
              ))}
            </div>
          ) : null}
          <textarea
            className="ai-plan-textarea"
            rows={8}
            value={planDraft}
            onChange={(event) => setPlanDraft(event.target.value)}
            onBlur={() => {
              if (!session || planDraft === session.plan) return;
              saveAssessmentSession({
                ...session,
                plan: planDraft,
                updatedAt: new Date().toISOString(),
              });
            }}
            placeholder={'例如：\n第 1 周：先补 Rust 所有权与借用，每天 1 小时，配合官方书前 6 章。\n第 2–3 周：写一个命令行小工具，完成后再读错误处理与测试。\n完成标准：能独立解释所有权错误，并交付一个可运行的 CLI。'}
          />
          <div className="ai-plan-actions">
            <span>{planDraft.trim().length} 字</span>
            <button type="button" className="btn btn-primary" onClick={() => void evaluatePlan()} disabled={busy !== null}>
              {busy === 'plan' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              {busy === 'plan' ? '正在审阅你的计划…' : '评估我的计划'}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="ai-error">
          <CircleAlert size={14} /> {error}
        </p>
      ) : null}

      {session && session.stage === 'result' && latestReview ? (
        <PlanResult
          review={latestReview}
          progress={task.progress}
          onApply={() => applyEstimateReview(latestReview.id)}
          onRestart={restart}
        />
      ) : null}
    </section>
  );
}
