import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  estimateBaseline,
  formatMinutes,
  makeId,
  taskActualMinutes,
  type AiAnswerQuality,
  type AiAssessmentSession,
  type AiConfidence,
  type AiInterviewQuestion,
  type AiPlanVerdict,
  type AiProvider,
  type AiSettings,
  type AiTip,
  type AiVerdict,
  type AppData,
  type EstimateFactor,
  type EstimateReview,
  type Task,
} from '@yolo/core';

export interface AiProviderPreset {
  id: AiProvider;
  label: string;
  baseUrl: string;
  model: string;
  hint: string;
}

export const AI_PROVIDERS: AiProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    hint: 'OpenAI 官方接口',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    hint: 'DeepSeek 官方接口',
  },
  {
    id: 'moonshot',
    label: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    hint: 'Kimi / Moonshot',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b',
    hint: '本机模型，无需云端 Key',
  },
  {
    id: 'custom',
    label: '自定义 / 兼容接口',
    baseUrl: '',
    model: '',
    hint: '任何 OpenAI-compatible 接口',
  },
];

export function outputLanguage(data: AppData): string {
  switch (data.settings.language) {
    case 'en':
      return 'English';
    case 'ja':
      return '日本語';
    case 'ko':
      return '한국어';
    default:
      return '中文';
  }
}

export function providerPreset(provider: AiProvider): AiProviderPreset {
  return AI_PROVIDERS.find((item) => item.id === provider) ?? AI_PROVIDERS[AI_PROVIDERS.length - 1]!;
}

export function hasAiConfig(ai: AiSettings): boolean {
  return Boolean(ai.enabled && ai.baseUrl.trim() && ai.model.trim());
}

export function chatEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('还没有填写 API Base URL');
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    // DeepSeek 官方文档的 base_url 是 https://api.deepseek.com，端点是 /chat/completions。
    if (url.hostname === 'api.deepseek.com') {
      const path = url.pathname.replace(/\/+$/, '');
      return `${url.origin}${path === '/v1' ? '/v1' : ''}/chat/completions`;
    }
  } catch {
    /* 交给下面的字符串拼接，最终由 URL 校验给出错误 */
  }
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

export function isLocalApiUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl.trim());
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function validateApiUrl(baseUrl: string): string | null {
  if (!baseUrl.trim()) return 'API Base URL 不能为空';
  try {
    const url = new URL(baseUrl.trim());
    if (!['https:', 'http:'].includes(url.protocol)) return 'API Base URL 必须使用 HTTPS';
    const local = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    if (url.protocol === 'http:' && !local.has(url.hostname)) {
      return '远程 API Base URL 必须使用 HTTPS；只有本机地址允许 HTTP';
    }
    if (url.username || url.password) return 'API Base URL 不能包含账号密码';
    return null;
  } catch {
    return 'API Base URL 格式不正确';
  }
}

function safeText(value: unknown, max = 600): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function safeStringArray(value: unknown, maxItems = 5, maxLength = 220): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLength));
}

export interface AiEstimatePayload {
  verdict: AiVerdict;
  confidence: AiConfidence;
  suggestedMinMinutes: number;
  suggestedMaxMinutes: number;
  summary: string;
  factors: EstimateFactor[];
  risks: string[];
  recommendations: string[];
}

function parseVerdict(value: unknown): AiVerdict {
  return ['reasonable', 'too_optimistic', 'too_conservative', 'uncertain'].includes(String(value))
    ? (String(value) as AiVerdict)
    : 'uncertain';
}

function parseConfidence(value: unknown): AiConfidence {
  return ['low', 'medium', 'high'].includes(String(value))
    ? (String(value) as AiConfidence)
    : 'low';
}

function parseFactors(value: unknown, fallback: EstimateFactor[]): EstimateFactor[] {
  if (!Array.isArray(value)) return fallback;
  const factors = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      label: safeText(item.label, 40),
      impact: ['up', 'down', 'neutral'].includes(String(item.impact))
        ? (String(item.impact) as EstimateFactor['impact'])
        : 'neutral',
      explanation: safeText(item.explanation, 240),
    }))
    .filter((item) => item.label && item.explanation)
    .slice(0, 6);
  return factors.length > 0 ? factors : fallback;
}

export function parseAiEstimate(content: string, fallbackFactors: EstimateFactor[]): AiEstimatePayload {
  let raw = content.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI 没有返回可解析的 JSON');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error('AI 返回的 JSON 格式不正确');
  }
  let min = Number(parsed.suggestedMinMinutes);
  let max = Number(parsed.suggestedMaxMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    throw new Error('AI 没有给出有效的时间范围');
  }
  if (min > max) [min, max] = [max, min];
  min = Math.max(15, Math.round(min / 15) * 15);
  max = Math.max(min + 15, Math.round(max / 15) * 15);
  const summary = safeText(parsed.summary, 800);
  if (!summary) throw new Error('AI 没有给出评估摘要');
  return {
    verdict: parseVerdict(parsed.verdict),
    confidence: parseConfidence(parsed.confidence),
    suggestedMinMinutes: Math.min(6000, min),
    suggestedMaxMinutes: Math.min(6000, max),
    summary,
    factors: parseFactors(parsed.factors, fallbackFactors),
    risks: safeStringArray(parsed.risks),
    recommendations: safeStringArray(parsed.recommendations),
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n…（已截断）`;
}

function writingMinutes(data: AppData, task: Task): number {
  return Math.round(
    (data.writingLogs ?? [])
      .filter((log) => log.taskId === task.id)
      .reduce((sum, log) => sum + log.seconds, 0) / 60,
  );
}

export function buildTaskEstimateMessages(
  data: AppData,
  task: Task,
): { role: 'system' | 'user'; content: string }[] {
  const baseline = estimateBaseline(data, task.id);
  const actual = taskActualMinutes(data, task);
  const goal = task.goalId ? data.goals.find((item) => item.id === task.goalId) : undefined;
  const peers = baseline.peers
    .map(
      (peer) =>
        `- ${peer.title}｜预计 ${formatMinutes(peer.estimatedMinutes)}｜实际 ${formatMinutes(peer.actualMinutes)}｜偏差 ${peer.ratio.toFixed(2)}x${peer.sameGoal ? '｜同技能树' : ''}`,
    )
    .join('\n');
  const recentSessions = data.sessions
    .filter((session) => session.taskId === task.id)
    .slice(0, 5)
    .map(
      (session) =>
        `- ${session.endedAt.slice(0, 10)} · ${Math.round(session.seconds / 60)} 分钟${session.note ? ` · ${session.note}` : ''}`,
    )
    .join('\n');
  const writing = (data.writingLogs ?? [])
    .filter((log) => log.taskId === task.id)
    .slice(0, 5)
    .map((log) => `- ${log.endedAt.slice(0, 10)} · ${Math.round(log.seconds / 60)} 分钟`)
    .join('\n');
  const report = task.report
    ? `目标：${task.report.goal}
成功标准：${task.report.successCriteria}
先修：${task.report.prerequisites}
有用范围：${task.report.usefulScope}
不做范围：${task.report.avoidScope}
风险：${task.report.risks}
报告校准：${formatMinutes(task.report.calibratedMinutes)}；把握度：${task.report.confidence}/5
报告路径：
${task.report.path.map((step) => `- ${step.title}：${formatMinutes(step.estimatedMinutes)}${step.detail ? `（${step.detail}）` : ''}`).join('\n')}`
    : '这个任务还没有提交启程侦查。';

  const docs = data.ai.allowDocs && task.note?.trim()
    ? `\n学习文档（用户允许发送）：\n${truncate(task.note, 8000)}`
    : '\n学习文档：未发送或为空。';
  const writingContext = data.ai.allowWriting
    ? `\n写作记录（用户允许发送）：\n${writing || '暂无写作记录。'}`
    : '\n写作记录：未发送。';

  const system = `你是「你只活一次」的学习助理，只做时间估算评估和学习方案合理性验证。
规则：
1. 不替用户完成任务，不写学习计划正文，不出练习题。
2. 先承认数据事实，再做判断；不要把猜测写成事实。
3. 如果信息不足，verdict 用 uncertain，confidence 用 low。
4. 不要奉承，不要空泛鼓励；用具体证据解释。
5. 只输出一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字。`;

  const user = `请评估这个任务的时间估算是否合理。

## 任务
标题：${task.title}
描述：${task.description || '无'}
类型：${CATEGORY_LABEL[task.category]}；难度：${DIFFICULTY_LABEL[task.difficulty]}
状态：${task.status}
当前预计：${formatMinutes(task.estimatedMinutes)}
当前进度：${task.progress}%
所属技能树：${goal?.title ?? '未关联'}
截止日期：${task.dueDate ?? '未设置'}
阶段：
${task.phases.map((phase) => `- ${phase.title}：${formatMinutes(phase.estimatedMinutes)}，${phase.status}`).join('\n') || '无阶段'}

## 启程侦查
${report}

## 数据基线（代码计算，不可改写）
- 当前预计：${baseline.estimateMinutes} 分钟
- 已投入：专注 ${actual.focus} 分钟；写作 ${actual.writing} 分钟；合计 ${actual.total} 分钟
- 同类已完成样本：${baseline.peerCount} 个
- 历史实际/预计中位数：${baseline.peerRatio?.toFixed(2) ?? '无'}
- 代码建议区间：${baseline.suggestedMin}–${baseline.suggestedMax} 分钟
- 置信度：${baseline.confidence}
- 数据因素：
${baseline.factors.map((factor) => `  - ${factor.label}：${factor.explanation}`).join('\n')}

## 历史样本
${peers || '暂无同类已完成任务。'}

## 最近专注
${recentSessions || '暂无专注记录。'}
${writingContext}
${docs}

## 输出 JSON
{
  "verdict": "reasonable | too_optimistic | too_conservative | uncertain",
  "confidence": "low | medium | high",
  "suggestedMinMinutes": 数字,
  "suggestedMaxMinutes": 数字,
  "summary": "不超过 220 字，直接说结论和主要原因",
  "factors": [
    { "label": "因素名", "impact": "up | down | neutral", "explanation": "具体证据" }
  ],
  "risks": ["风险，最多 4 条"],
  "recommendations": ["可执行建议，最多 4 条"]
}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function runTaskEstimate(data: AppData, task: Task): Promise<EstimateReview> {
  if (!data.ai.enabled) throw new Error('学习助理还没有启用');
  const urlError = validateApiUrl(data.ai.baseUrl);
  if (urlError) throw new Error(urlError);
  const bridge = window.yolo?.ai;
  if (!bridge) throw new Error('当前平台没有接入 AI 桥');
  const baseline = estimateBaseline(data, task.id);
  const actual = taskActualMinutes(data, task);
  const response = await bridge.complete({
    endpoint: chatEndpoint(data.ai.baseUrl),
    model: data.ai.model,
    messages: buildTaskEstimateMessages(data, task),
    maxTokens: 4096,
    temperature: 0.2,
    timeoutMs: 90000,
  });
  if (!response.ok || !response.content) {
    throw new Error(response.error || 'AI 没有返回内容');
  }
  const payload = parseAiEstimate(response.content, baseline.factors);
  return {
    id: makeId('est_'),
    taskId: task.id,
    createdAt: new Date().toISOString(),
    model: data.ai.model,
    provider: data.ai.provider,
    baselineMin: baseline.suggestedMin,
    baselineMax: baseline.suggestedMax,
    suggestedMin: payload.suggestedMinMinutes,
    suggestedMax: payload.suggestedMaxMinutes,
    confidence: payload.confidence,
    verdict: payload.verdict,
    summary: payload.summary,
    factors: payload.factors,
    risks: payload.risks,
    recommendations: payload.recommendations,
    context: {
      peerCount: baseline.peerCount,
      estimateMinutes: baseline.estimateMinutes,
      focusMinutes: actual.focus,
      writingMinutes: writingMinutes(data, task),
      actualMinutes: actual.total,
      calibrationRatio: baseline.peerRatio,
      docsIncluded: Boolean(data.ai.allowDocs && task.note?.trim()),
      writingIncluded: data.ai.allowWriting,
    },
  };
}

export async function testAiConnection(ai: AiSettings): Promise<string> {
  const urlError = validateApiUrl(ai.baseUrl);
  if (urlError) throw new Error(urlError);
  if (!ai.model.trim()) throw new Error('还没有填写模型名称');
  const bridge = window.yolo?.ai;
  if (!bridge) throw new Error('当前平台没有接入 AI 桥');
  const response = await bridge.complete({
    endpoint: chatEndpoint(ai.baseUrl),
    model: ai.model,
    messages: [
      { role: 'system', content: '你是连接测试助手。' },
      { role: 'user', content: '只回复 OK。' },
    ],
    maxTokens: 8,
    temperature: 0,
    timeoutMs: 30000,
  });
  if (!response.ok) throw new Error(response.error || '连接失败');
  return response.content || 'OK';
}

// ============================================================
// 多轮背景访谈 + 用户计划评估
// ============================================================

export const CONFIDENCE_THRESHOLD = 80;

export interface InterviewTurn {
  confidence: number;
  summary: string;
  questions: AiInterviewQuestion[];
  known: string[];
  missing: string[];
  readyForPlan: boolean;
  answerQuality?: AiAnswerQuality;
  answerNote?: string;
}

export interface PlanEvaluationPayload {
  confidence: number;
  planVerdict: AiPlanVerdict;
  planScore: number;
  verdict: AiVerdict;
  suggestedMinMinutes: number;
  suggestedMaxMinutes: number;
  summary: string;
  profileSummary: string;
  tips: AiTip[];
  factors: EstimateFactor[];
  risks: string[];
  recommendations: string[];
}

function parseObject(content: string): Record<string, unknown> {
  let raw = content.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI 没有返回可解析的 JSON');
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    throw new Error('AI 返回的 JSON 格式不正确');
  }
}

function clampConfidence(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parseQuestions(value: unknown): AiInterviewQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: safeText(item.id, 60) || `q_${index + 1}`,
      question: safeText(item.question, 240),
      why: safeText(item.why, 160),
    }))
    .filter((item) => item.question.length > 0)
    // 用户明确不需要“每天/每周能学几个小时”这类执行约束问题。
    .filter((item) => !/(每天|每周|一周|一天).{0,12}(小时|时间|学)|每周.{0,8}投入|可投入.{0,8}时间/.test(item.question))
    .slice(0, 3);
}

function parseTips(value: unknown): AiTip[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      severity: item.severity === 'high' ? ('high' as const) : ('medium' as const),
      title: safeText(item.title, 80),
      detail: safeText(item.detail, 360),
      evidence: safeText(item.evidence, 200),
    }))
    .filter((item) => item.title && item.detail)
    .slice(0, 6);
}

export function buildTaskContext(data: AppData, task: Task): string {
  const baseline = estimateBaseline(data, task.id);
  const actual = taskActualMinutes(data, task);
  const goal = task.goalId ? data.goals.find((item) => item.id === task.goalId) : undefined;
  const peers = baseline.peers
    .map(
      (peer) =>
        `- ${peer.title}｜预计 ${formatMinutes(peer.estimatedMinutes)}｜实际 ${formatMinutes(peer.actualMinutes)}｜偏差 ${peer.ratio.toFixed(2)}x${peer.sameGoal ? '｜同技能树' : ''}`,
    )
    .join('\n');
  const recentSessions = data.sessions
    .filter((session) => session.taskId === task.id)
    .slice(0, 5)
    .map(
      (session) =>
        `- ${session.endedAt.slice(0, 10)} · ${Math.round(session.seconds / 60)} 分钟${session.note ? ` · ${session.note}` : ''}`,
    )
    .join('\n');
  const writing = (data.writingLogs ?? [])
    .filter((log) => log.taskId === task.id)
    .slice(0, 5)
    .map((log) => `- ${log.endedAt.slice(0, 10)} · ${Math.round(log.seconds / 60)} 分钟`)
    .join('\n');
  const report = task.report
    ? `目标：${task.report.goal}
成功标准：${task.report.successCriteria}
先修：${task.report.prerequisites}
有用范围：${task.report.usefulScope}
不做范围：${task.report.avoidScope}
风险：${task.report.risks}
报告校准：${formatMinutes(task.report.calibratedMinutes)}；把握度：${task.report.confidence}/5
报告路径：
${task.report.path.map((step) => `- ${step.title}：${formatMinutes(step.estimatedMinutes)}${step.detail ? `（${step.detail}）` : ''}`).join('\n')}`
    : '这个任务还没有提交启程侦查。';
  const docs = data.ai.allowDocs && task.note?.trim()
    ? `\n学习文档（用户允许发送）：\n${truncate(task.note, 6000)}`
    : '\n学习文档：未发送或为空。';
  const writingContext = data.ai.allowWriting
    ? `\n写作记录（用户允许发送）：\n${writing || '暂无写作记录。'}`
    : '\n写作记录：未发送。';
  return `## 任务
标题：${task.title}
描述：${task.description || '无'}
类型：${CATEGORY_LABEL[task.category]}；难度：${DIFFICULTY_LABEL[task.difficulty]}
当前进度：${task.progress}%
当前预计：${formatMinutes(task.estimatedMinutes)}
截止日期：${task.dueDate ?? '未设置'}
所属技能树：${goal?.title ?? '未关联'}
阶段：
${task.phases.map((phase) => `- ${phase.title}：${formatMinutes(phase.estimatedMinutes)}，${phase.status}`).join('\n') || '无阶段'}

## 启程侦查
${report}

## 数据基线（代码计算，不可改写）
- 当前预计：${baseline.estimateMinutes} 分钟
- 已投入：专注 ${actual.focus} 分钟；写作 ${actual.writing} 分钟；合计 ${actual.total} 分钟
- 同类已完成样本：${baseline.peerCount} 个
- 历史实际/预计中位数：${baseline.peerRatio?.toFixed(2) ?? '无'}
- 代码建议区间：${baseline.suggestedMin}–${baseline.suggestedMax} 分钟
- 历史样本：
${peers || '暂无同类已完成任务。'}

## 最近专注
${recentSessions || '暂无专注记录。'}
${writingContext}
${docs}`;
}

function buildAnswerBlock(session: AiAssessmentSession): string {
  if (session.answers.length === 0) return '尚无已回答的背景问题。';
  return session.answers
    .map((answer, index) => `${index + 1}. 问：${answer.question}\n   答：${answer.answer}`)
    .join('\n\n');
}

export function buildInterviewMessages(
  data: AppData,
  task: Task,
  session: AiAssessmentSession,
): { role: 'system' | 'user'; content: string }[] {
  const system = `你是「你只活一次」的学习方案审计员。现在处于“背景访谈”阶段：先问清楚，不急着下结论。
规则：
1. 根据这个任务的领域、用户写的启程侦查、学习文档和已有回答，动态决定下一轮问题；不要使用固定题库。
2. **每轮只问一个问题**，不要一次给多个问题。一次只问一个，等用户回答后再决定下一问。
3. 问题必须切合实际、可核对、能形成证据。优先问具体经历、具体项目、具体概念、具体产出；不要问“每天/每周能学几个小时”这类时间安排问题，那只是执行约束，不是能力证据。
4. 不要重复已经回答过的问题；不要问用户已经在任务/报告/文档里写清楚的内容。
5. 先判断上一轮回答的真实质量：valid（直接、具体、可核对）、vague（太泛）、irrelevant（答非所问）、contradictory（与目标/已有回答矛盾）。如果回答无效，下一问必须换一种更具体的方式追问同一主题，并且**不得提高 confidence**。
6. 不要被自述欺骗：例如目标是“能自己写项目”却声称“已经学完所有内容”，或问编程经历却回答“学过英语”，都属于无效回答，不能当作有效证据。必要时要求具体作品、代码、错误排查记录或可验证的产出。
7. confidence 是你对“已经足够做可靠判断”的置信度，0-100，必须保守。只有 confidence >= ${CONFIDENCE_THRESHOLD} 时，才把 readyForPlan 设为 true 且 questions 返回空数组。
8. 不替用户写计划，不出练习题，不修改任务；不要在问题下方写解释。
9. 输出语言：${outputLanguage(data)}。所有面向用户的文字都使用这个语言。
10. 只输出一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字。`;

  const user = `${buildTaskContext(data, task)}

## 已完成的访谈
轮次：${session.round}
当前置信度：${session.confidence}
${buildAnswerBlock(session)}

## 输出 JSON
{
  "confidence": 0-100 的数字,
  "summary": "一两句话说明你现在还缺什么，或为什么已经足够",
  "answerQuality": { "status": "valid | vague | irrelevant | contradictory", "note": "对上一轮回答的判断；首轮没有回答时留空" },
  "questions": [
    { "id": "q1", "question": "只问一个具体问题，不要附解释" }
  ],
  "known": ["已经从上下文确认的事实"],
  "missing": ["仍然缺少的信息"],
  "readyForPlan": false
}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function parseInterview(content: string, previousConfidence = 0, hadAnswer = false): InterviewTurn {
  const parsed = parseObject(content);
  let questions = parseQuestions(parsed.questions).slice(0, 1);
  let confidence = clampConfidence(parsed.confidence);
  const rawQuality = parsed.answerQuality;
  const qualityStatus =
    typeof rawQuality === 'string'
      ? rawQuality
      : rawQuality && typeof rawQuality === 'object'
        ? (rawQuality as { status?: unknown }).status
        : undefined;
  const quality =
    typeof qualityStatus === 'string' &&
    ['valid', 'vague', 'irrelevant', 'contradictory'].includes(qualityStatus)
      ? (qualityStatus as AiAnswerQuality)
      : undefined;
  const qualityNote =
    rawQuality && typeof rawQuality === 'object'
      ? safeText((rawQuality as { note?: unknown }).note, 300)
      : '';
  // 无效回答不能增加置信度；这是硬约束，不依赖模型自觉。
  if (hadAnswer && (!quality || quality !== 'valid')) {
    confidence = Math.min(confidence, previousConfidence);
  }
  // 置信度是硬门槛；readyForPlan 不能绕过它。
  const ready = confidence >= CONFIDENCE_THRESHOLD;
  if (ready) {
    questions = [];
  } else if (questions.length === 0) {
    throw new Error('AI 认为信息还不够，但没有给出下一轮问题');
  }
  return {
    confidence,
    summary: safeText(parsed.summary, 500),
    questions,
    known: safeStringArray(parsed.known, 8, 160),
    missing: safeStringArray(parsed.missing, 8, 160),
    readyForPlan: ready,
    answerQuality: quality,
    answerNote: qualityNote,
  };
}

export function buildPlanReviewMessages(
  data: AppData,
  task: Task,
  session: AiAssessmentSession,
): { role: 'system' | 'user'; content: string }[] {
  const system = `你是「你只活一次」的学习方案审计员。现在用户已经写完自己的学习计划，请评估计划本身，而不是替用户重写。
规则：
1. 先判断用户计划是否合理：目标是否清楚、顺序是否有先修依据、颗粒度是否可执行、时间是否可行、完成标准是否可验证、是否有反馈与缓冲。
2. 必须结合用户当前进度、已投入时间、访谈中暴露的基础水平，以及历史实际/预计偏差，下最终判断。
3. 如果计划有明显风险，tips 必须具体、醒目，指出风险发生在哪一步，不要只写“建议优化”。
4. 不出练习题，不替用户写计划，不修改任务。
5. confidence 0-100；只有 confidence >= ${CONFIDENCE_THRESHOLD} 才能被视为可输出的结论。若信息仍不足，confidence 必须低于阈值。
6. 输出语言：${outputLanguage(data)}。所有面向用户的文字都使用这个语言。
7. 只输出一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字。`;

  const user = `${buildTaskContext(data, task)}

## 访谈记录
${buildAnswerBlock(session)}

## 用户自己写的计划
${session.plan}

## 输出 JSON
{
  "confidence": 0-100 的数字,
  "planVerdict": "reasonable | conditional | unreasonable | uncertain",
  "planScore": 0-100 的数字,
  "verdict": "reasonable | too_optimistic | too_conservative | uncertain",
  "suggestedMinMinutes": 数字,
  "suggestedMaxMinutes": 数字,
  "summary": "不超过 240 字，直接说计划的主要问题或为什么合理",
  "profileSummary": "根据访谈总结的当前水平与约束，不超过 120 字",
  "tips": [
    { "severity": "high | medium", "title": "短标题", "detail": "具体风险与后果", "evidence": "引用计划或数据中的依据" }
  ],
  "factors": [
    { "label": "因素名", "impact": "up | down | neutral", "explanation": "具体证据" }
  ],
  "risks": ["风险，最多 4 条"],
  "recommendations": ["可执行建议，最多 4 条"]
}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export function parsePlanEvaluation(content: string, fallbackFactors: EstimateFactor[]): PlanEvaluationPayload {
  const parsed = parseObject(content);
  let min = Number(parsed.suggestedMinMinutes);
  let max = Number(parsed.suggestedMaxMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
    throw new Error('AI 没有给出有效的时间范围');
  }
  if (min > max) [min, max] = [max, min];
  min = Math.max(15, Math.round(min / 15) * 15);
  max = Math.max(min + 15, Math.round(max / 15) * 15);
  const planVerdict = ['reasonable', 'conditional', 'unreasonable', 'uncertain'].includes(String(parsed.planVerdict))
    ? (String(parsed.planVerdict) as AiPlanVerdict)
    : 'uncertain';
  const planScore = Math.max(0, Math.min(100, Math.round(Number(parsed.planScore) || 0)));
  const confidence = clampConfidence(parsed.confidence);
  return {
    confidence,
    planVerdict,
    planScore,
    verdict: parseVerdict(parsed.verdict),
    suggestedMinMinutes: Math.min(6000, min),
    suggestedMaxMinutes: Math.min(6000, max),
    summary: safeText(parsed.summary, 800),
    profileSummary: safeText(parsed.profileSummary, 300),
    tips: parseTips(parsed.tips),
    factors: parseFactors(parsed.factors, fallbackFactors),
    risks: safeStringArray(parsed.risks),
    recommendations: safeStringArray(parsed.recommendations),
  };
}

async function completeJson(
  data: AppData,
  messages: { role: 'system' | 'user'; content: string }[],
  maxTokens: number,
): Promise<string> {
  if (!data.ai.enabled) throw new Error('学习助理还没有启用');
  const urlError = validateApiUrl(data.ai.baseUrl);
  if (urlError) throw new Error(urlError);
  const bridge = window.yolo?.ai;
  if (!bridge) throw new Error('当前平台没有接入 AI 桥');
  const response = await bridge.complete({
    endpoint: chatEndpoint(data.ai.baseUrl),
    model: data.ai.model,
    messages,
    maxTokens,
    temperature: 0.2,
    timeoutMs: 90000,
  });
  if (!response.ok || !response.content) throw new Error(response.error || 'AI 没有返回内容');
  return response.content;
}

export async function runInterview(
  data: AppData,
  task: Task,
  session: AiAssessmentSession,
): Promise<InterviewTurn> {
  const content = await completeJson(data, buildInterviewMessages(data, task, session), 1400);
  return parseInterview(content, session.confidence, session.answers.length > 0);
}

export async function runPlanAssessment(
  data: AppData,
  task: Task,
  session: AiAssessmentSession,
): Promise<{ payload: PlanEvaluationPayload; baseline: ReturnType<typeof estimateBaseline> }> {
  const baseline = estimateBaseline(data, task.id);
  const content = await completeJson(data, buildPlanReviewMessages(data, task, session), 2800);
  return { payload: parsePlanEvaluation(content, baseline.factors), baseline };
}

export function planReviewToRecord(
  data: AppData,
  task: Task,
  session: AiAssessmentSession,
  payload: PlanEvaluationPayload,
  baseline: ReturnType<typeof estimateBaseline>,
): EstimateReview {
  const actual = taskActualMinutes(data, task);
  const confidence: AiConfidence =
    payload.confidence >= 80 ? 'high' : payload.confidence >= 60 ? 'medium' : 'low';
  return {
    id: makeId('est_'),
    taskId: task.id,
    createdAt: new Date().toISOString(),
    model: data.ai.model,
    provider: data.ai.provider,
    baselineMin: baseline.suggestedMin,
    baselineMax: baseline.suggestedMax,
    suggestedMin: payload.suggestedMinMinutes,
    suggestedMax: payload.suggestedMaxMinutes,
    confidence,
    verdict: payload.verdict,
    summary: payload.summary,
    factors: payload.factors,
    risks: payload.risks,
    recommendations: payload.recommendations,
    context: {
      peerCount: baseline.peerCount,
      estimateMinutes: baseline.estimateMinutes,
      focusMinutes: actual.focus,
      writingMinutes: writingMinutes(data, task),
      actualMinutes: actual.total,
      calibrationRatio: baseline.peerRatio,
      docsIncluded: Boolean(data.ai.allowDocs && task.note?.trim()),
      writingIncluded: data.ai.allowWriting,
    },
    sessionId: session.id,
    confidenceScore: payload.confidence,
    planVerdict: payload.planVerdict,
    planScore: payload.planScore,
    tips: payload.tips,
    userPlan: session.plan,
    profileSummary: payload.profileSummary,
  };
}
