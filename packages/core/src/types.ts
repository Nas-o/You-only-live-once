/**
 * 你只活一次 · 共享领域模型
 * 该文件不依赖任何 UI / 平台 API，供 Linux / Windows / Android 三端复用。
 */

export const SCHEMA_VERSION = 3;

export type TaskStatus = 'backlog' | 'active' | 'done' | 'archived';
export type TaskCategory = 'learning' | 'practice' | 'project' | 'reading' | 'other';
export type PhaseStatus = 'todo' | 'doing' | 'done';
export type KnowledgeStatus = 'locked' | 'available' | 'lit';
export type GoalColor = 'gold' | 'jade' | 'azure' | 'rose' | 'violet';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskLevel = 1 | 2 | 3;
export const MAX_TASK_LEVEL: TaskLevel = 3;
export type ResourceType = 'book' | 'course' | 'docs' | 'video' | 'practice' | 'other';

export type RewardType =
  | 'focus'
  | 'report'
  | 'revision'
  | 'phase'
  | 'task'
  | 'knowledge'
  | 'goal'
  | 'daily'
  | 'achievement'
  | 'streak'
  | 'bonus'
  | 'poker'
  | 'writing';

export interface Meta {
  createdAt: string;
  lastSavedAt: string;
  onboarded: boolean;
  installId: string;
}

export interface Profile {
  name: string;
  motto: string;
  joinedAt: string;
}

export interface Settings {
  /** 每日专注目标（分钟） */
  dailyGoalMinutes: number;
  /** 旧字段：并行计时已取消，当前固定为 1 */
  maxParallel: number;
  /** 减少动效（无障碍） */
  reduceMotion: boolean;
  /** 完成时播放提示音（预留） */
  sound: boolean;
  /** 界面主题：纸上时间 / 深墨 / 瑞士网格 / 噜噜 / 自编辑 */
  theme: ThemeName;
  /** 噜噜皮肤的亮色/暗色版本 */
  skinTone: SkinTone;
  /** 自编辑主题；未创建时为 null */
  customTheme: CustomTheme | null;
  /** 界面语言：中文 / 日本語 / 한국어 / English */
  language: Language;
}

export interface ResearchResource {
  id: string;
  title: string;
  type: ResourceType;
  url?: string;
  note?: string;
}

export interface PathStep {
  id: string;
  title: string;
  detail?: string;
  estimatedMinutes: number;
}

/**
 * 启程前的“侦查报告”：
 * 不是为了形式，而是逼自己先想清楚学什么、怎么学、不学什么。
 */
export interface ResearchReport {
  subject: string;
  goal: string;
  successCriteria: string;
  prerequisites: string;
  usefulScope: string;
  avoidScope: string;
  risks: string;
  path: PathStep[];
  resources: ResearchResource[];
  calibratedMinutes: number;
  /** 1-5，对时间估计的把握 */
  confidence: number;
  score: number;
  submittedAt: string;
  updatedAt: string;
  revisions: number;
}

export type ReportInput = Omit<
  ResearchReport,
  'score' | 'submittedAt' | 'updatedAt' | 'revisions'
>;

export interface Phase {
  id: string;
  title: string;
  note?: string;
  estimatedMinutes: number;
  status: PhaseStatus;
  /** 计划在哪个时期完成 */
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  /** 首次完成阶段已发放攀登值的时间，防止撤销后重复领取 */
  rewardedAt?: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  difficulty: number;
  /** 预计投入（分钟），提交调查报告后可被校准 */
  estimatedMinutes: number;
  /** 预计完成日期 YYYY-MM-DD */
  dueDate?: string;
  /** 0-100，用户手动填写 */
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** 首次完成任务已发放攀登值的时间，防止重开后重复领取 */
  completionRewardedAt?: string;
  goalId?: string;
  /** 任务链层级：1 为根任务，2/3 为子任务 */
  level: TaskLevel;
  /** 上级任务；level 1 时为空 */
  parentId?: string;
  phases: Phase[];
  report?: ResearchReport;
  tags: string[];
  note?: string;
  totalFocusSeconds: number;
  sessionCount: number;
  xpEarned: number;
}

export interface KnowledgePoint {
  id: string;
  title: string;
  note?: string;
  status: KnowledgeStatus;
  xp: number;
  estimatedMinutes?: number;
  taskId?: string;
  createdAt: string;
  litAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  motto?: string;
  color: GoalColor;
  deadline?: string;
  createdAt: string;
  completedAt?: string;
  knowledgePoints: KnowledgePoint[];
}

export interface FocusSession {
  id: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
  /** 结束时同时进行中的计时数量（含自己） */
  parallel: number;
  xp: number;
  note?: string;
}

/** 文档写作记录：可关联到某次专注，让写作时间也成为学习证据。 */
export interface WritingLog {
  id: string;
  taskId: string;
  /** 关联的专注记录；为空时表示独立写作 */
  sessionId?: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
}

export type CardSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds';

/** rank 使用 2-14，14 为 A。 */
export interface PlayingCard {
  suit: CardSuit;
  rank: number;
}

export type PokerHandName =
  | '皇家同花顺'
  | '同花顺'
  | '四条'
  | '葫芦'
  | '同花'
  | '顺子'
  | '三条'
  | '两对'
  | '一对'
  | '高牌';

export interface PokerHandResult {
  name: PokerHandName;
  multiplier: number;
  /** 1 为高牌，10 为皇家同花顺 */
  rank: number;
  high: number;
}

export interface PokerHandRecord {
  id: string;
  at: string;
  cards: PlayingCard[];
  hand: PokerHandName;
  multiplier: number;
  pot: number;
  payout: number;
}

export interface PokerState {
  /** 当前牌靴中剩余的牌 */
  deck: PlayingCard[];
  /** 当前手牌，满 5 张时摊牌 */
  hand: PlayingCard[];
  /** 本局底池，摊牌后按手牌倍率结算 */
  pot: number;
  /** 已经见过的牌，用于牌册收集 */
  seen: string[];
  history: PokerHandRecord[];
  bestHand?: PokerHandName;
}

export interface ActiveTimer {
  id: string;
  taskId: string;
  startedAt: string;
  /** 最近一次心跳（用于崩溃/关闭后恢复） */
  heartbeatAt: string;
  accumulatedSeconds: number;
  pausedAt?: string;
  note?: string;
}

export interface RewardEvent {
  id: string;
  at: string;
  type: RewardType;
  label: string;
  xp: number;
  taskId?: string;
}

export interface RewardState {
  /** 可用筹码，也是累计获得量（当前版本不回收） */
  xp: number;
  events: RewardEvent[];
  /** achievementId -> 解锁时间 ISO */
  unlocked: Record<string, string>;
  /** 已发放每日目标奖励的日期 */
  dailyGoalAwards: string[];
  poker: PokerState;
}

export type AiProvider = 'openai' | 'deepseek' | 'moonshot' | 'ollama' | 'custom';
export type AiVerdict = 'reasonable' | 'too_optimistic' | 'too_conservative' | 'uncertain';
export type AiConfidence = 'low' | 'medium' | 'high';
export type AiPlanVerdict = 'reasonable' | 'conditional' | 'unreasonable' | 'uncertain';
export type AiAnswerQuality = 'valid' | 'vague' | 'irrelevant' | 'contradictory';

/** AI 配置。API Key 永远不放在这里，也不进导出文件。 */
export interface AiSettings {
  enabled: boolean;
  provider: AiProvider;
  /** OpenAI-compatible base URL，例如 https://api.deepseek.com/v1 */
  baseUrl: string;
  model: string;
  /** 允许把学习文档发送给模型 */
  allowDocs: boolean;
  /** 允许把写作记录发送给模型 */
  allowWriting: boolean;
}

export interface EstimateFactor {
  label: string;
  impact: 'up' | 'down' | 'neutral';
  explanation: string;
}

export interface AiTip {
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  evidence?: string;
}

export type AiExperienceLevel = 'beginner' | 'some' | 'experienced' | 'unknown';

export type AiInterviewDimension = 'level' | 'goal' | 'baseline' | 'scope' | 'blocker' | 'success';
export type AiCoverageStatus = 'known' | 'partial' | 'missing';
export type AiInterviewCoverage = Record<AiInterviewDimension, AiCoverageStatus>;

export interface AiInterviewQuestion {
  id: string;
  question: string;
  why?: string;
  /** 前三项是 AI 推测的最可能回答；界面会追加“其他（自己回答）”。 */
  options?: string[];
  /** 这道题主要补齐的置信度维度，用于动态选题。 */
  target?: AiInterviewDimension;
}

export interface AiInterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
  at: string;
}

export type AiAssessmentStage = 'interview' | 'plan' | 'result';

/** 一次“先问清楚，再让用户写计划，再评估”的完整会话。 */
export interface AiAssessmentSession {
  id: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
  stage: AiAssessmentStage;
  confidence: number;
  threshold: number;
  round: number;
  questions: AiInterviewQuestion[];
  answers: AiInterviewAnswer[];
  plan: string;
  profileSummary?: string;
  level?: AiExperienceLevel;
  coverage?: AiInterviewCoverage;
  resultId?: string;
  lastAnswerQuality?: AiAnswerQuality;
  lastAnswerNote?: string;
}

/** 一次任务时间评估。baseline 是确定性计算，suggested 是 AI 在基线之上给出的判断。 */
export interface EstimateReview {
  id: string;
  taskId: string;
  createdAt: string;
  model: string;
  provider: AiProvider;
  baselineMin: number;
  baselineMax: number;
  suggestedMin: number;
  suggestedMax: number;
  confidence: AiConfidence;
  verdict: AiVerdict;
  summary: string;
  factors: EstimateFactor[];
  risks: string[];
  recommendations: string[];
  context: {
    peerCount: number;
    estimateMinutes: number;
    focusMinutes: number;
    writingMinutes: number;
    actualMinutes: number;
    calibrationRatio: number | null;
    docsIncluded: boolean;
    writingIncluded: boolean;
  };
  acceptedAt?: string;
  sessionId?: string;
  confidenceScore?: number;
  planVerdict?: AiPlanVerdict;
  planScore?: number;
  tips?: AiTip[];
  userPlan?: string;
  profileSummary?: string;
}

export interface AppData {
  version: number;
  meta: Meta;
  profile: Profile;
  settings: Settings;
  tasks: Task[];
  goals: Goal[];
  sessions: FocusSession[];
  writingLogs: WritingLog[];
  activeTimers: ActiveTimer[];
  rewards: RewardState;
  ai: AiSettings;
  estimateReviews: EstimateReview[];
  assessmentSessions: AiAssessmentSession[];
}

export interface TaskInput {
  title: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  difficulty?: number;
  estimatedMinutes?: number;
  dueDate?: string;
  goalId?: string;
  level?: TaskLevel;
  parentId?: string;
  tags?: string[];
}

export interface PhaseInput {
  title: string;
  note?: string;
  estimatedMinutes?: number;
  dueDate?: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  motto?: string;
  color?: GoalColor;
  deadline?: string;
}

export interface KnowledgePointInput {
  title: string;
  note?: string;
  estimatedMinutes?: number;
  taskId?: string;
}

export interface TimerSettlement {
  seconds: number;
  startedAt: string;
  endedAt: string;
  xp: number;
  parallel: number;
}

export type AppView = 'today' | 'tasks' | 'goals' | 'cultivation' | 'stats' | 'settings';

export type ThemeBase = 'paper' | 'ink' | 'swiss';
export type ThemeName = ThemeBase | 'lulu' | 'custom';
export type SkinTone = 'light' | 'dark';

export interface CustomThemeColors {
  paper: string;
  paperRaised: string;
  paperSunken: string;
  ink: string;
  seal: string;
  gold: string;
  jade: string;
  azure: string;
  violet: string;
}

export interface CustomTheme {
  name: string;
  base: ThemeBase;
  colors: CustomThemeColors;
}
export type Language = 'zh' | 'ja' | 'ko' | 'en';
