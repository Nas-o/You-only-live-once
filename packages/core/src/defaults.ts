/**
 * 初始数据、示例数据与旧数据迁移。
 * 示例数据不是“假数据”，而是一份可操作的使用示范：
 * 有已点亮的星、正在进行的任务、尚未写报告的门禁任务。
 */
import { makeId } from './ids';
import { createReport } from './report';
import { cardKey, createDeck, createPokerState, shuffleCards } from './poker';
import {
  createGoal,
  createKnowledgePoint,
  createTask,
  applyReportToTask,
} from './tasks';
import {
  focusXp,
  grantXp,
  syncAchievements,
  taskCompletionXp,
  XP,
} from './rewards';
import { addDays, dayKey, formatMinutes, nowIso, todayKey } from './time';
import {
  SCHEMA_VERSION,
  type AiProvider,
  type AiSettings,
  type AppData,
  type CustomTheme,
  type Settings,
  type AiAssessmentSession,
  type EstimateReview,
  type FocusSession,
  type Goal,
  type KnowledgePoint,
  type ReportInput,
  type ResearchReport,
  type Task,
  type TaskLevel,
  type WritingLog,
} from './types';

export const DEFAULT_DAILY_GOAL = 90;
export const DEFAULT_MAX_PARALLEL = 1;

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  name: '',
  base: 'paper',
  colors: {
    paper: '#f3eee4',
    paperRaised: '#fbf7ee',
    paperSunken: '#e9e2d4',
    ink: '#1d1a15',
    seal: '#a63d2d',
    gold: '#8a6528',
    jade: '#4f6b52',
    azure: '#486474',
    violet: '#67536f',
  },
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function normalizeCustomTheme(value: unknown): CustomTheme | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<CustomTheme>;
  if (!raw.colors || typeof raw.colors !== 'object') return null;
  const source = raw.colors as Partial<CustomTheme['colors']>;
  const keys: (keyof CustomTheme['colors'])[] = [
    'paper',
    'paperRaised',
    'paperSunken',
    'ink',
    'seal',
    'gold',
    'jade',
    'azure',
    'violet',
  ];
  const colors = { ...DEFAULT_CUSTOM_THEME.colors };
  for (const key of keys) {
    const color = source[key];
    if (typeof color === 'string' && HEX_COLOR.test(color)) colors[key] = color;
  }
  const base: CustomTheme['base'] =
    raw.base === 'ink' || raw.base === 'swiss' ? raw.base : 'paper';
  return {
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 24) : '',
    base,
    colors,
  };
}
export const DEFAULT_MOTTO = '把有限的时间，用在真正重要的事上。';

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'openai',
  baseUrl: '',
  model: '',
  allowDocs: true,
  allowWriting: true,
};

export function createInitialData(now: Date = new Date()): AppData {
  const at = nowIso(now);
  return {
    version: SCHEMA_VERSION,
    meta: {
      createdAt: at,
      lastSavedAt: at,
      onboarded: false,
      installId: makeId('inst_'),
    },
    profile: {
      name: '',
      motto: DEFAULT_MOTTO,
      joinedAt: at,
    },
    settings: {
      dailyGoalMinutes: DEFAULT_DAILY_GOAL,
      maxParallel: DEFAULT_MAX_PARALLEL,
      reduceMotion: false,
      sound: true,
      theme: 'paper',
      skinTone: 'light',
      customTheme: null,
      language: 'zh',
    },
    tasks: [],
    goals: [],
    sessions: [],
    writingLogs: [],
    activeTimers: [],
    rewards: {
      xp: 0,
      events: [],
      unlocked: {},
      dailyGoalAwards: [],
      poker: createPokerState(),
    },
    ai: { ...DEFAULT_AI_SETTINGS },
    estimateReviews: [],
    assessmentSessions: [],
  };
}

function atDaysAgo(days: number, hour: number, minute = 0, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function reportInput(partial: Partial<ReportInput> & { pathTitles: [string, number, string][] }): ReportInput {
  const path = partial.pathTitles.map(([title, estimatedMinutes, detail]) => ({
    id: makeId('p_'),
    title,
    estimatedMinutes,
    detail,
  }));
  return {
    subject: partial.subject ?? '',
    goal: partial.goal ?? '',
    successCriteria: partial.successCriteria ?? '',
    prerequisites: partial.prerequisites ?? '',
    usefulScope: partial.usefulScope ?? '',
    avoidScope: partial.avoidScope ?? '',
    risks: partial.risks ?? '',
    path,
    resources: partial.resources ?? [],
    calibratedMinutes: partial.calibratedMinutes ?? 120,
    confidence: partial.confidence ?? 3,
  };
}

interface SampleTaskSpec {
  task: Task;
  report?: { report: ResearchReport; submittedAt: Date };
  phasesDone?: number;
  phasesDoing?: number;
  completedAt?: Date;
}

export function createSampleData(profileName = '行者', now: Date = new Date()): AppData {
  const data = createInitialData(now);
  data.meta.onboarded = true;
  data.profile.name = profileName;
  data.profile.joinedAt = atDaysAgo(14, 9, 0, now).toISOString();
  data.rewards.dailyGoalAwards = [];
  data.sessions = [];
  data.tasks = [];
  data.goals = [];

  const goalDeveloper = createGoal(
    {
      title: '独立开发者之路',
      description: '不依赖单一雇主，用代码与产品换取自由。',
      motto: '用作品说话',
      color: 'gold',
      deadline: addDays(todayKey(now), 180),
    },
    atDaysAgo(14, 9, 0, now),
  );
  goalDeveloper.createdAt = atDaysAgo(14, 9, 0, now).toISOString();

  const pointSpecs: {
    title: string;
    status: KnowledgePoint['status'];
    xp: number;
    litDaysAgo?: number;
    taskId?: string;
    note?: string;
  }[] = [
    { title: 'HTML / CSS 基础', status: 'lit', xp: 50, litDaysAgo: 10, note: '能还原常见页面布局' },
    { title: 'JavaScript 核心', status: 'lit', xp: 60, litDaysAgo: 2, note: '闭包、原型、异步' },
    { title: 'React 组件化', status: 'available', xp: 60, note: '正在攀登' },
    { title: 'Node.js 与 API', status: 'locked', xp: 70 },
    { title: '数据库设计', status: 'locked', xp: 70 },
    { title: '部署与运维', status: 'locked', xp: 60 },
    { title: '产品思维', status: 'available', xp: 50 },
    { title: '英语技术阅读', status: 'available', xp: 40 },
  ];
  goalDeveloper.knowledgePoints = pointSpecs.map((spec, index) => {
    const point = createKnowledgePoint(
      { title: spec.title, note: spec.note, estimatedMinutes: 120 + index * 30 },
      atDaysAgo(14, 9, 5, now),
    );
    point.id = `k_dev_${index}`;
    point.status = spec.status;
    point.xp = spec.xp;
    if (spec.status === 'lit' && spec.litDaysAgo !== undefined) {
      point.litAt = atDaysAgo(spec.litDaysAgo, 21, 0, now).toISOString();
    }
    return point;
  });
  goalDeveloper.knowledgePoints[0]!.taskId = 't_portfolio';
  goalDeveloper.knowledgePoints[1]!.taskId = 't_js';
  goalDeveloper.knowledgePoints[2]!.taskId = 't_react';

  const goalBody = createGoal(
    {
      title: '身心调养',
      description: '身体是革命的本钱，也是修行的道场。',
      motto: '身安则道隆',
      color: 'jade',
    },
    atDaysAgo(12, 8, 0, now),
  );
  goalBody.createdAt = atDaysAgo(12, 8, 0, now).toISOString();
  const bodySpecs: { title: string; status: KnowledgePoint['status']; litDaysAgo?: number; note: string }[] = [
    { title: '规律睡眠', status: 'lit', litDaysAgo: 6, note: '23:30 前入睡' },
    { title: '晨间冥想', status: 'lit', litDaysAgo: 1, note: '每天 10 分钟' },
    { title: '每周三次运动', status: 'available', note: '跑步或力量训练' },
    { title: '饮食记录', status: 'locked', note: '减少精制糖' },
    { title: '情绪日记', status: 'locked', note: '给情绪命名' },
  ];
  goalBody.knowledgePoints = bodySpecs.map((spec, index) => {
    const point = createKnowledgePoint({ title: spec.title, note: spec.note }, atDaysAgo(12, 8, 5, now));
    point.id = `k_body_${index}`;
    point.status = spec.status;
    point.xp = 40;
    if (spec.litDaysAgo !== undefined) {
      point.litAt = atDaysAgo(spec.litDaysAgo, 7, 30, now).toISOString();
    }
    if (index === 1) point.taskId = 't_meditate';
    return point;
  });

  const goalBrand = createGoal(
    {
      title: '建立个人品牌',
      description: '让作品被看见，让机会主动找上门。',
      motto: '被看见，才有连接',
      color: 'azure',
      deadline: addDays(todayKey(now), 90),
    },
    atDaysAgo(10, 10, 0, now),
  );
  goalBrand.createdAt = atDaysAgo(10, 10, 0, now).toISOString();
  const brandSpecs: { title: string; status: KnowledgePoint['status']; note: string }[] = [
    { title: '作品集网站', status: 'available', note: '三个完整案例' },
    { title: '技术写作', status: 'locked', note: '每月两篇' },
    { title: '社区分享', status: 'locked', note: '从一次小分享开始' },
    { title: '个人品牌定位', status: 'available', note: '一句话说清你是谁' },
    { title: '摄影与视觉', status: 'locked', note: '够用就好' },
  ];
  goalBrand.knowledgePoints = brandSpecs.map((spec, index) => {
    const point = createKnowledgePoint({ title: spec.title, note: spec.note }, atDaysAgo(10, 10, 5, now));
    point.id = `k_brand_${index}`;
    point.status = spec.status;
    point.xp = 45;
    return point;
  });

  const goalReading = createGoal(
    {
      title: '读书破万卷',
      description: '用阅读搭建自己的认知坐标系。',
      motto: '读以致用',
      color: 'rose',
    },
    atDaysAgo(9, 21, 0, now),
  );
  goalReading.createdAt = atDaysAgo(9, 21, 0, now).toISOString();
  goalReading.knowledgePoints = ([
    { title: '认知科学', status: 'lit', note: '《认知觉醒》', litDaysAgo: 8 },
    { title: '心理学', status: 'available', note: '下一步' },
    { title: '写作表达', status: 'locked' },
  ] as { title: string; status: KnowledgePoint['status']; note?: string; litDaysAgo?: number }[]).map(
    (spec, index) => {
    const point = createKnowledgePoint({ title: spec.title, note: spec.note }, atDaysAgo(9, 21, 5, now));
    point.id = `k_read_${index}`;
    point.status = spec.status;
    point.xp = 40;
    if (spec.litDaysAgo !== undefined) point.litAt = atDaysAgo(spec.litDaysAgo, 22, 0, now).toISOString();
    return point;
  });

  data.goals = [goalDeveloper, goalBody, goalBrand, goalReading];

  const taskSpecs: SampleTaskSpec[] = [];

  const jsTask = createTask(
    {
      title: 'JavaScript 核心语法',
      description: '把 JS 的地基打牢：作用域、原型、异步与模块化。之后 React 与 Node 都会更轻松。',
      category: 'learning',
      priority: 'high',
      difficulty: 3,
      estimatedMinutes: 600,
      dueDate: addDays(todayKey(now), 12),
      goalId: goalDeveloper.id,
      tags: ['JavaScript', '基础', '前端'],
    },
    atDaysAgo(12, 20, 0, now),
  );
  jsTask.id = 't_js';
  jsTask.status = 'active';
  jsTask.progress = 62;
  jsTask.createdAt = atDaysAgo(12, 20, 0, now).toISOString();
  jsTask.updatedAt = atDaysAgo(0, 9, 30, now).toISOString();
  jsTask.note = [
    '## 今天搞清楚了什么',
    '',
    '`this` 的绑定规则比想象中清楚，尤其是箭头函数不创建自己的 `this`。',
    '',
    '- [x] 画出事件循环的调用栈',
    '- [ ] 用最小示例验证微任务顺序',
    '',
    '```js',
    'console.log(this);',
    '```',
    '',
    '> 下一步：把宏任务与微任务的执行顺序讲给一个没学过的人听。',
  ].join('\n');
  const jsReport = createReport(
    reportInput({
      subject:
        'JavaScript 核心语法与运行机制：作用域链、闭包、原型、this、事件循环、Promise 与模块化。',
      goal: '能独立读懂并改写中等复杂度的 JavaScript 代码，为 React 与 Node.js 打牢地基。',
      successCriteria:
        '不查资料写出闭包、原型继承与异步流程控制示例；能讲清事件循环；完成 20 道配套练习并复盘。',
      prerequisites: '会基本的 HTML/CSS；理解变量、函数、条件与循环。',
      usefulScope:
        '作用域与闭包、原型链、this 绑定、Promise/async、事件循环、模块化、常用数组方法。',
      avoidScope:
        '暂不深挖 V8 源码与 JIT 优化；不追冷门语法糖；不为了炫技写难懂的一行代码。',
      risks:
        '最容易陷入“教程循环”：看得懂但写不出。异步与 this 容易混淆，练习量不足会眼高手低。',
      pathTitles: [
        ['语法与类型系统', 120, '变量、类型转换、判等、数组与对象常用方法'],
        ['函数、作用域与闭包', 150, '执行上下文、闭包、this、call/apply/bind'],
        ['异步与事件循环', 180, '回调、Promise、async/await、微任务与宏任务'],
        ['模块化与工程习惯', 150, 'ESM、错误处理、调试、小型练习项目'],
      ],
      resources: [
        { id: makeId('r_'), title: 'MDN JavaScript 指南', type: 'docs', url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript' },
        { id: makeId('r_'), title: 'JavaScript.info', type: 'course', url: 'https://zh.javascript.info/' },
        { id: makeId('r_'), title: '《你不知道的 JavaScript》', type: 'book' },
      ],
      calibratedMinutes: 600,
      confidence: 4,
    }),
    atDaysAgo(12, 20, 30, now),
  );
  jsTask.report = jsReport;
  applyReportToTask(jsTask, jsReport, { phases: 'replace' }, atDaysAgo(12, 20, 30, now));
  jsTask.estimatedMinutes = 600;
  jsTask.phases[0]!.status = 'done';
  jsTask.phases[0]!.completedAt = atDaysAgo(9, 21, 0, now).toISOString();
  jsTask.phases[0]!.rewardedAt = jsTask.phases[0]!.completedAt;
  jsTask.phases[1]!.status = 'done';
  jsTask.phases[1]!.completedAt = atDaysAgo(5, 21, 0, now).toISOString();
  jsTask.phases[1]!.rewardedAt = jsTask.phases[1]!.completedAt;
  jsTask.phases[2]!.status = 'doing';
  jsTask.phases[2]!.startedAt = atDaysAgo(2, 20, 0, now).toISOString();
  jsTask.phases.forEach((p, i) => {
    p.dueDate = addDays(todayKey(now), (i - 2) * 5);
  });
  taskSpecs.push({ task: jsTask, report: { report: jsReport, submittedAt: atDaysAgo(12, 20, 30, now) }, phasesDone: 2, phasesDoing: 1 });

  const reactTask = createTask(
    {
      title: 'React 组件与状态管理',
      description: '从组件拆分到状态设计，做出可维护的中型页面。',
      category: 'learning',
      priority: 'high',
      difficulty: 4,
      estimatedMinutes: 900,
      dueDate: addDays(todayKey(now), 25),
      goalId: goalDeveloper.id,
      tags: ['React', 'Hooks', '前端'],
    },
    atDaysAgo(10, 20, 0, now),
  );
  reactTask.id = 't_react';
  reactTask.status = 'active';
  reactTask.progress = 30;
  reactTask.note = '## 下一步\n\n先把表单抽成受控组件，再考虑状态库。';
  const reactReport = createReport(
    reportInput({
      subject: 'React 组件化、Hooks 与状态管理：从组件拆分到数据流设计。',
      goal: '独立构建可维护的中型 React 应用，并能判断何时真的需要状态管理库。',
      successCriteria:
        '完成带路由、表单、异步数据的作品集页面；能解释重渲染原因与 key 的作用。',
      prerequisites: '掌握 JavaScript 基础、ES 模块与基本 DOM 操作。',
      usefulScope: '组件拆分、Hooks、状态提升、路由、异步数据、列表 key、性能基础。',
      avoidScope: '暂不深入 Fiber 源码；不急着引入 Redux；不做服务端渲染。',
      risks: '过早引入复杂状态库；副作用清理不当；抄代码而不理解数据流。',
      pathTitles: [
        ['组件与 JSX', 200, '组件树、props、条件与列表渲染'],
        ['Hooks 与副作用', 250, 'useState/useEffect/useMemo/自定义 Hook'],
        ['状态设计与路由', 250, '状态提升、Context、路由与表单'],
        ['异步数据与性能', 200, '请求竞态、加载态、渲染优化'],
      ],
      resources: [
        { id: makeId('r_'), title: 'React 官方文档（中文）', type: 'docs', url: 'https://zh-hans.react.dev/' },
        { id: makeId('r_'), title: 'useHooks 案例集', type: 'practice', url: 'https://usehooks.com/' },
      ],
      calibratedMinutes: 900,
      confidence: 3,
    }),
    atDaysAgo(10, 20, 30, now),
  );
  reactTask.report = reactReport;
  applyReportToTask(reactTask, reactReport, { phases: 'replace' }, atDaysAgo(10, 20, 30, now));
  reactTask.estimatedMinutes = 900;
  reactTask.phases[0]!.status = 'done';
  reactTask.phases[0]!.completedAt = atDaysAgo(6, 21, 0, now).toISOString();
  reactTask.phases[0]!.rewardedAt = reactTask.phases[0]!.completedAt;
  reactTask.phases[1]!.status = 'doing';
  reactTask.phases[1]!.startedAt = atDaysAgo(3, 20, 0, now).toISOString();
  taskSpecs.push({ task: reactTask, report: { report: reactReport, submittedAt: atDaysAgo(10, 20, 30, now) }, phasesDone: 1, phasesDoing: 1 });

  const portfolioTask = createTask(
    {
      title: '个人作品集网站',
      description: '把三个案例讲清楚，然后上线。完美主义是上线最大的敌人。',
      category: 'project',
      priority: 'medium',
      difficulty: 4,
      estimatedMinutes: 1500,
      dueDate: addDays(todayKey(now), 40),
      goalId: goalBrand.id,
      tags: ['作品集', '设计', '上线'],
    },
    atDaysAgo(8, 19, 0, now),
  );
  portfolioTask.id = 't_portfolio';
  portfolioTask.status = 'active';
  portfolioTask.progress = 15;
  const portfolioReport = createReport(
    reportInput({
      subject: '个人作品集网站：信息架构、案例叙事、视觉呈现与上线部署。',
      goal: '上线一个可用于求职与社交展示的作品集网站，包含三个完整案例。',
      successCriteria: '移动端可用、首屏 2 秒内、含案例详情与联系方式、可被搜索引擎收录。',
      prerequisites: 'HTML/CSS/JS 基础；会用 Git；准备三个项目素材。',
      usefulScope: '信息架构、案例叙事、响应式布局、部署、性能与 SEO 基础。',
      avoidScope: '暂不做后台系统；不追求炫技动画；不堆砌无关技术。',
      risks: '完美主义导致迟迟不上线；案例没有过程与结果；移动端遗漏。',
      pathTitles: [
        ['内容梳理与线框', 240, '确定目标访客、案例结构与页面线框'],
        ['视觉与响应式', 420, '版式、色彩、断点与组件'],
        ['案例页面与动效', 480, '三个案例详情、交互与细节'],
        ['部署与性能', 360, '域名、部署、压缩与检查'],
      ],
      resources: [
        { id: makeId('r_'), title: 'Awwwards 参考库', type: 'other', url: 'https://www.awwwards.com/' },
        { id: makeId('r_'), title: 'Web.dev 性能指南', type: 'docs', url: 'https://web.dev/learn/' },
      ],
      calibratedMinutes: 1500,
      confidence: 3,
    }),
    atDaysAgo(8, 19, 30, now),
  );
  portfolioTask.report = portfolioReport;
  applyReportToTask(portfolioTask, portfolioReport, { phases: 'replace' }, atDaysAgo(8, 19, 30, now));
  portfolioTask.estimatedMinutes = 1500;
  portfolioTask.phases[0]!.status = 'doing';
  portfolioTask.phases[0]!.startedAt = atDaysAgo(2, 19, 0, now).toISOString();
  taskSpecs.push({ task: portfolioTask, report: { report: portfolioReport, submittedAt: atDaysAgo(8, 19, 30, now) }, phasesDoing: 1 });

  const linuxTask = createTask(
    {
      title: 'Linux 命令行基础',
      description: '为了部署与排查问题，补上命令行这一课。',
      category: 'learning',
      priority: 'low',
      difficulty: 2,
      estimatedMinutes: 300,
      dueDate: addDays(todayKey(now), 20),
      goalId: goalDeveloper.id,
      tags: ['Linux', '命令行'],
    },
    atDaysAgo(3, 21, 0, now),
  );
  linuxTask.id = 't_linux';
  linuxTask.status = 'backlog';
  linuxTask.progress = 0;
  taskSpecs.push({ task: linuxTask });

  const readingTask = createTask(
    {
      title: '《认知觉醒》精读与践行',
      description: '不追求读完，追求用上。每章输出一张行动卡。',
      category: 'reading',
      priority: 'medium',
      difficulty: 2,
      estimatedMinutes: 480,
      dueDate: addDays(todayKey(now), 15),
      goalId: goalReading.id,
      tags: ['阅读', '认知科学'],
    },
    atDaysAgo(11, 22, 0, now),
  );
  readingTask.id = 't_reading';
  readingTask.status = 'active';
  readingTask.progress = 55;
  const readingReport = createReport(
    reportInput({
      subject: '《认知觉醒》精读与践行：元认知、舒适区边缘、关联与反馈。',
      goal: '把书中方法转成三个可坚持的日常习惯，并留下可复用的践行笔记。',
      successCriteria: '输出 6 张行动卡；建立每日复盘模板；连续践行 21 天。',
      prerequisites: '每天有 30 分钟不被打扰的阅读时间。',
      usefulScope: '元认知、舒适区边缘、关联、反馈闭环、每日反思。',
      avoidScope: '不追求阅读速度；不摘抄全书；不同时读多本同类书。',
      risks: '读完就忘；只输入不输出；计划过满导致中断。',
      pathTitles: [
        ['通读并标注', 180, '快速通读，标记有触动的段落'],
        ['精读核心章节', 180, '围绕元认知与舒适区边缘做笔记'],
        ['输出行动卡与复盘模板', 120, '把方法变成每天可执行的动作'],
      ],
      resources: [
        { id: makeId('r_'), title: '《认知觉醒》周岭', type: 'book' },
        { id: makeId('r_'), title: '费曼学习法笔记', type: 'other' },
      ],
      calibratedMinutes: 480,
      confidence: 4,
    }),
    atDaysAgo(11, 22, 30, now),
  );
  readingTask.report = readingReport;
  applyReportToTask(readingTask, readingReport, { phases: 'replace' }, atDaysAgo(11, 22, 30, now));
  readingTask.estimatedMinutes = 480;
  readingTask.phases[0]!.status = 'done';
  readingTask.phases[0]!.completedAt = atDaysAgo(7, 21, 0, now).toISOString();
  readingTask.phases[0]!.rewardedAt = readingTask.phases[0]!.completedAt;
  readingTask.phases[1]!.status = 'doing';
  readingTask.phases[1]!.startedAt = atDaysAgo(3, 21, 0, now).toISOString();
  taskSpecs.push({ task: readingTask, report: { report: readingReport, submittedAt: atDaysAgo(11, 22, 30, now) }, phasesDone: 1, phasesDoing: 1 });

  const meditateTask = createTask(
    {
      title: '晨间冥想 21 天',
      description: '每天 10 分钟，训练把注意力带回来的能力。',
      category: 'practice',
      priority: 'medium',
      difficulty: 2,
      estimatedMinutes: 240,
      goalId: goalBody.id,
      tags: ['冥想', '习惯'],
    },
    atDaysAgo(13, 7, 0, now),
  );
  meditateTask.id = 't_meditate';
  meditateTask.status = 'done';
  meditateTask.progress = 100;
  meditateTask.completedAt = atDaysAgo(1, 8, 0, now).toISOString();
  const meditateReport = createReport(
    reportInput({
      subject: '晨间冥想 21 天：呼吸锚定、身体扫描与注意力训练。',
      goal: '建立每天 10 分钟的晨间冥想习惯，提升专注与情绪稳定。',
      successCriteria: '连续 21 天打卡；能完成 10 分钟不中断的呼吸观察；记录情绪变化。',
      prerequisites: '每天起床后有 10 分钟独处时间。',
      usefulScope: '呼吸观察、身体扫描、情绪标记、短时高频。',
      avoidScope: '不追求神秘体验；不久坐导致疲劳；不频繁更换方法。',
      risks: '前期容易走神并自责；时间安排不稳定；期待过高。',
      pathTitles: [
        ['入门引导', 60, '跟随引导完成 5 分钟呼吸练习'],
        ['稳定 10 分钟', 120, '固定时间、固定地点，逐步延长'],
        ['复盘与习惯固化', 60, '记录情绪与注意力变化'],
      ],
      resources: [
        { id: makeId('r_'), title: 'Headspace 入门课程', type: 'course' },
        { id: makeId('r_'), title: '《十分钟冥想》', type: 'book' },
      ],
      calibratedMinutes: 240,
      confidence: 5,
    }),
    atDaysAgo(13, 7, 30, now),
  );
  meditateTask.report = meditateReport;
  applyReportToTask(meditateTask, meditateReport, { phases: 'replace' }, atDaysAgo(13, 7, 30, now));
  meditateTask.estimatedMinutes = 240;
  meditateTask.phases.forEach((p, i) => {
    p.status = 'done';
    p.completedAt = atDaysAgo(12 - i * 5, 8, 0, now).toISOString();
    p.rewardedAt = p.completedAt;
  });
  meditateTask.completionRewardedAt = atDaysAgo(1, 8, 0, now).toISOString();
  taskSpecs.push({ task: meditateTask, report: { report: meditateReport, submittedAt: atDaysAgo(13, 7, 30, now) }, phasesDone: 3, completedAt: atDaysAgo(1, 8, 0, now) });

  data.tasks = taskSpecs.map((s) => s.task);

  const rawSessions: { taskId: string; daysAgo: number; hour: number; minutes: number; parallel?: number }[] = [
    { taskId: 't_js', daysAgo: 11, hour: 20, minutes: 50 },
    { taskId: 't_js', daysAgo: 9, hour: 21, minutes: 65 },
    { taskId: 't_js', daysAgo: 7, hour: 20, minutes: 45 },
    { taskId: 't_js', daysAgo: 5, hour: 21, minutes: 60 },
    { taskId: 't_js', daysAgo: 3, hour: 20, minutes: 55 },
    { taskId: 't_js', daysAgo: 1, hour: 21, minutes: 45 },
    { taskId: 't_js', daysAgo: 0, hour: 9, minutes: 50, parallel: 1 },
    { taskId: 't_react', daysAgo: 8, hour: 21, minutes: 40 },
    { taskId: 't_react', daysAgo: 6, hour: 20, minutes: 50 },
    { taskId: 't_react', daysAgo: 4, hour: 21, minutes: 35 },
    { taskId: 't_react', daysAgo: 2, hour: 20, minutes: 45 },
    { taskId: 't_react', daysAgo: 0, hour: 9, minutes: 30, parallel: 1 },
    { taskId: 't_portfolio', daysAgo: 6, hour: 22, minutes: 45 },
    { taskId: 't_portfolio', daysAgo: 2, hour: 22, minutes: 40 },
    { taskId: 't_portfolio', daysAgo: 0, hour: 21, minutes: 35, parallel: 1 },
    { taskId: 't_reading', daysAgo: 10, hour: 22, minutes: 60 },
    { taskId: 't_reading', daysAgo: 8, hour: 22, minutes: 45 },
    { taskId: 't_reading', daysAgo: 4, hour: 22, minutes: 55 },
    { taskId: 't_reading', daysAgo: 1, hour: 22, minutes: 50 },
    { taskId: 't_reading', daysAgo: 0, hour: 21, minutes: 40, parallel: 1 },
    { taskId: 't_meditate', daysAgo: 9, hour: 8, minutes: 30 },
    { taskId: 't_meditate', daysAgo: 7, hour: 8, minutes: 25 },
    { taskId: 't_meditate', daysAgo: 5, hour: 8, minutes: 30 },
    { taskId: 't_meditate', daysAgo: 3, hour: 8, minutes: 30 },
    { taskId: 't_meditate', daysAgo: 1, hour: 8, minutes: 30 },
  ];

  const taskById = new Map(data.tasks.map((t) => [t.id, t]));
  const sessions: FocusSession[] = rawSessions.map((raw) => {
    const task = taskById.get(raw.taskId)!;
    const ended = atDaysAgo(raw.daysAgo, raw.hour, 0, now);
    const started = new Date(ended.getTime() - raw.minutes * 60000);
    return {
      id: makeId('s_'),
      taskId: raw.taskId,
      taskTitle: task.title,
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      seconds: raw.minutes * 60,
      parallel: raw.parallel ?? 1,
      xp: focusXp(raw.minutes * 60),
      note: raw.minutes >= 50 ? '状态不错，完成了一个完整小节。' : undefined,
    };
  });
  data.sessions = sessions.sort((a, b) => a.endedAt.localeCompare(b.endedAt));

  for (const task of data.tasks) {
    const own = sessions.filter((s) => s.taskId === task.id);
    task.totalFocusSeconds = own.reduce((sum, s) => sum + s.seconds, 0);
    task.sessionCount = own.length;
  }

  // 统计任务自身产生的攀登值：专注 + 首次报告 + 已完成阶段 + 任务完成
  for (const spec of taskSpecs) {
    const own = sessions.filter((s) => s.taskId === spec.task.id);
    const phaseXp = spec.task.phases.filter((p) => p.status === 'done').length * XP.phase;
    const reportXp = spec.report ? XP.report : 0;
    const doneXp = spec.completedAt ? taskCompletionXp(spec.task) : 0;
    spec.task.xpEarned = own.reduce((sum, s) => sum + s.xp, 0) + phaseXp + reportXp + doneXp;
  }

  // 回放历史奖励，保证示例数据的攀登值、事件与成就是自洽的
  for (const session of data.sessions) {
    grantXp(data, session.xp, `专注 · ${session.taskTitle}`, 'focus', {
      at: session.endedAt,
      taskId: session.taskId,
    });
  }
  for (const spec of taskSpecs) {
    if (spec.report) {
      grantXp(data, XP.report, `调查报告 · ${spec.task.title}`, 'report', {
        at: spec.report.submittedAt.toISOString(),
        taskId: spec.task.id,
      });
    }
    const donePhases = spec.task.phases.filter((p) => p.status === 'done');
    for (const phase of donePhases) {
      grantXp(data, XP.phase, `阶段完成 · ${phase.title}`, 'phase', {
        at: phase.completedAt ?? atDaysAgo(6, 20, 0, now).toISOString(),
        taskId: spec.task.id,
      });
    }
    if (spec.completedAt) {
      grantXp(
        data,
        taskCompletionXp(spec.task),
        `任务完成 · ${spec.task.title}`,
        'task',
        { at: spec.completedAt.toISOString(), taskId: spec.task.id },
      );
    }
  }

  for (const goal of data.goals) {
    for (const point of goal.knowledgePoints) {
      if (point.status === 'lit' && point.litAt) {
        grantXp(data, point.xp, `点亮 · ${point.title}`, 'knowledge', { at: point.litAt });
      }
    }
  }

  // 每日目标奖励：示例中按每日实际专注 >= 90 分钟补发
  const perDay = new Map<string, number>();
  for (const session of data.sessions) {
    const key = dayKey(session.endedAt);
    perDay.set(key, (perDay.get(key) ?? 0) + session.seconds / 60);
  }
  for (const [key, minutes] of perDay) {
    if (minutes >= data.settings.dailyGoalMinutes) {
      data.rewards.dailyGoalAwards.push(key);
      grantXp(data, XP.dailyGoal, `每日目标达成 · ${formatMinutes(minutes)}`, 'daily', {
        at: new Date(`${key}T23:00:00`).toISOString(),
      });
    }
  }

  syncAchievements(data, now);

  // 示例数据中让“今日目标”有一点进度，但不直接完成
  data.rewards.events.sort((a, b) => b.at.localeCompare(a.at));

  // 示例牌桌：给演示数据一副进行中的手牌与两局摊牌，便于查看新反馈。
  const sampleHand = [
    { suit: 'spades' as const, rank: 14 },
    { suit: 'spades' as const, rank: 13 },
    { suit: 'spades' as const, rank: 12 },
  ];
  const fullHouse = [
    { suit: 'hearts' as const, rank: 8 },
    { suit: 'diamonds' as const, rank: 8 },
    { suit: 'clubs' as const, rank: 8 },
    { suit: 'spades' as const, rank: 2 },
    { suit: 'hearts' as const, rank: 2 },
  ];
  const flush = [
    { suit: 'diamonds' as const, rank: 4 },
    { suit: 'diamonds' as const, rank: 7 },
    { suit: 'diamonds' as const, rank: 9 },
    { suit: 'diamonds' as const, rank: 11 },
    { suit: 'diamonds' as const, rank: 13 },
  ];
  const samplePoker = createPokerState();
  samplePoker.hand = sampleHand;
  samplePoker.pot = 32;
  samplePoker.seen = [...new Set([...sampleHand, ...fullHouse, ...flush].map(cardKey))];
  samplePoker.bestHand = '葫芦';
  samplePoker.history = [
    {
      id: makeId('ph_'),
      at: atDaysAgo(1, 21, 10, now).toISOString(),
      cards: fullHouse,
      hand: '葫芦',
      multiplier: 8,
      pot: 70,
      payout: 560,
    },
    {
      id: makeId('ph_'),
      at: atDaysAgo(3, 20, 5, now).toISOString(),
      cards: flush,
      hand: '同花',
      multiplier: 5,
      pot: 55,
      payout: 275,
    },
  ];
  samplePoker.deck = shuffleCards(
    createDeck().filter((card) => !samplePoker.seen.includes(cardKey(card))),
  );
  data.rewards.poker = samplePoker;

  const linkedWritingSession = [...data.sessions]
    .filter((session) => session.taskId === 't_js')
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];
  if (linkedWritingSession) {
    data.writingLogs.push({
      id: makeId('w_'),
      taskId: 't_js',
      sessionId: linkedWritingSession.id,
      startedAt: atDaysAgo(0, 10, 20, now).toISOString(),
      endedAt: atDaysAgo(0, 10, 42, now).toISOString(),
      seconds: 22 * 60,
    });
  }
  data.meta.createdAt = atDaysAgo(14, 9, 0, now).toISOString();
  data.meta.lastSavedAt = nowIso(now);
  return data;
}

/** 读取旧数据并补齐字段；无法识别时返回 null，由 UI 决定新建。 */
export function migrateData(raw: unknown, now: Date = new Date()): AppData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Partial<AppData>;
  if (!Array.isArray(obj.tasks) || !Array.isArray(obj.sessions)) return null;
  const base = createInitialData(now);
  const tasks = obj.tasks
    .filter((t): t is Task => Boolean(t) && typeof (t as Task).id === 'string')
    .map((t) => {
      const phases = (Array.isArray(t.phases) ? t.phases : []).map((phase) => ({
        ...phase,
        rewardedAt:
          phase.rewardedAt ?? (phase.status === 'done' ? phase.completedAt : undefined),
      }));
      return {
        ...t,
        description: t.description ?? '',
        category: t.category ?? 'learning',
        status: t.status ?? 'backlog',
        priority: t.priority ?? 'medium',
        difficulty: t.difficulty ?? 3,
        estimatedMinutes: t.estimatedMinutes ?? 0,
        level: (t.level === 2 || t.level === 3 ? t.level : 1) as TaskLevel,
        progress: t.progress ?? 0,
        phases,
        tags: Array.isArray(t.tags) ? t.tags : [],
        totalFocusSeconds: t.totalFocusSeconds ?? 0,
        sessionCount: t.sessionCount ?? 0,
        xpEarned: t.xpEarned ?? 0,
        createdAt: t.createdAt ?? base.meta.createdAt,
        updatedAt: t.updatedAt ?? base.meta.createdAt,
        completionRewardedAt:
          t.completionRewardedAt ?? (t.status === 'done' ? t.completedAt : undefined),
      };
    });
  const goals = (Array.isArray(obj.goals) ? obj.goals : [])
    .filter((g): g is Goal => Boolean(g) && typeof (g as Goal).id === 'string')
    .map((g) => ({
      ...g,
      description: g.description ?? '',
      color: g.color ?? 'gold',
      createdAt: g.createdAt ?? base.meta.createdAt,
      knowledgePoints: Array.isArray(g.knowledgePoints) ? g.knowledgePoints : [],
    }));
  const sessions = obj.sessions.filter(
    (s): s is FocusSession =>
      Boolean(s) && typeof s.taskId === 'string' && Number.isFinite(s.seconds) && s.seconds >= 0,
  );
  const writingLogs = (Array.isArray(obj.writingLogs) ? obj.writingLogs : []).filter(
    (log): log is WritingLog =>
      Boolean(log) &&
      typeof log.id === 'string' &&
      typeof log.taskId === 'string' &&
      Number.isFinite(log.seconds) &&
      log.seconds >= 0,
  );
  const settings = { ...base.settings, ...(obj.settings ?? {}) };
  if (!['paper', 'ink', 'swiss', 'lulu', 'custom'].includes(settings.theme)) settings.theme = 'paper';
  if (!['light', 'dark'].includes(settings.skinTone)) settings.skinTone = 'light';
  settings.customTheme = normalizeCustomTheme((obj.settings as Partial<Settings> | undefined)?.customTheme);
  if (settings.theme === 'custom' && !settings.customTheme) settings.theme = 'paper';
  if (!['zh', 'ja', 'ko', 'en'].includes(settings.language)) settings.language = 'zh';
  // 并行计时已取消：旧数据统一收敛为单计时。
  settings.maxParallel = 1;
  const ai: AiSettings = {
    ...base.ai,
    ...(obj.ai ?? {}),
    enabled: Boolean(obj.ai?.enabled ?? base.ai.enabled),
    allowDocs: Boolean(obj.ai?.allowDocs ?? base.ai.allowDocs),
    allowWriting: Boolean(obj.ai?.allowWriting ?? base.ai.allowWriting),
  };
  const validProviders: AiProvider[] = ['openai', 'deepseek', 'moonshot', 'ollama', 'custom'];
  if (!validProviders.includes(ai.provider)) ai.provider = 'openai';
  if (typeof ai.baseUrl !== 'string') ai.baseUrl = '';
  if (typeof ai.model !== 'string') ai.model = '';
  const assessmentSessions = (Array.isArray(obj.assessmentSessions) ? obj.assessmentSessions : []).filter(
    (session): session is AiAssessmentSession =>
      Boolean(session) &&
      typeof session.id === 'string' &&
      typeof session.taskId === 'string' &&
      ['interview', 'plan', 'result'].includes(session.stage) &&
      Number.isFinite(session.confidence),
  );
  const estimateReviews = (Array.isArray(obj.estimateReviews) ? obj.estimateReviews : []).filter(
    (review): review is EstimateReview =>
      Boolean(review) &&
      typeof review.id === 'string' &&
      typeof review.taskId === 'string' &&
      typeof review.createdAt === 'string' &&
      Number.isFinite(review.baselineMin) &&
      Number.isFinite(review.baselineMax) &&
      Number.isFinite(review.suggestedMin) &&
      Number.isFinite(review.suggestedMax),
  );
  return {
    version: SCHEMA_VERSION,
    meta: { ...base.meta, ...(obj.meta ?? {}) },
    profile: { ...base.profile, ...(obj.profile ?? {}) },
    settings,
    tasks,
    goals,
    sessions,
    writingLogs,
    activeTimers: Array.isArray(obj.activeTimers) ? obj.activeTimers : [],
    ai,
    estimateReviews,
    assessmentSessions,
    rewards: {
      ...base.rewards,
      ...(obj.rewards ?? {}),
      events: Array.isArray(obj.rewards?.events) ? obj.rewards.events : [],
      unlocked: obj.rewards?.unlocked ?? {},
      dailyGoalAwards: Array.isArray(obj.rewards?.dailyGoalAwards)
        ? obj.rewards.dailyGoalAwards
        : [],
      poker: {
        ...base.rewards.poker,
        ...(obj.rewards?.poker ?? {}),
        deck: Array.isArray(obj.rewards?.poker?.deck)
          ? obj.rewards.poker.deck
          : base.rewards.poker.deck,
        hand: Array.isArray(obj.rewards?.poker?.hand)
          ? obj.rewards.poker.hand
          : [],
        seen: Array.isArray(obj.rewards?.poker?.seen) ? obj.rewards.poker.seen : [],
        history: Array.isArray(obj.rewards?.poker?.history)
          ? obj.rewards.poker.history
          : [],
      },
    },
  };
}
