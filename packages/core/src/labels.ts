/** 跨端共享的中文文案与枚举展示。 */
import type {
  GoalColor,
  ThemeName,
  PhaseStatus,
  ResourceType,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from './types';

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: '待启程',
  active: '进行中',
  done: '已完成',
  archived: '已归档',
};

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  learning: '学习',
  practice: '练习',
  project: '项目',
  reading: '阅读',
  other: '其他',
};

export const CATEGORY_DESC: Record<TaskCategory, string> = {
  learning: '理解新知识',
  practice: '刻意练习',
  project: '交付成果',
  reading: '输入与思考',
  other: '其他事务',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const PHASE_STATUS_LABEL: Record<PhaseStatus, string> = {
  todo: '未开始',
  doing: '进行中',
  done: '已完成',
};

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  book: '书籍',
  course: '课程',
  docs: '文档',
  video: '视频',
  practice: '练习',
  other: '其他',
};

export const GOAL_COLOR_HEX: Record<GoalColor, string> = {
  gold: '#b08a4a',
  jade: '#7fa083',
  azure: '#7d9aac',
  rose: '#c07a70',
  violet: '#9a85b0',
};

export const GOAL_COLOR_LABEL: Record<GoalColor, string> = {
  gold: '鎏金',
  jade: '青玉',
  azure: '天青',
  rose: '绛纱',
  violet: '紫气',
};

export const THEMES: {
  id: ThemeName;
  name: string;
  description: string;
}[] = [
  { id: 'paper', name: '纸上时间', description: '暖纸、墨色与印章红，编辑设计' },
  { id: 'ink', name: '深墨', description: '深墨底色、骨白文字与朱砂强调' },
  { id: 'swiss', name: '瑞士网格', description: '白、黑、红，严格网格与无衬线标题' },
  { id: 'lulu', name: '噜噜', description: '奶油黄、橙橘与青叶，侧栏小兽与软纸框' },
];

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: '轻松',
  2: '较易',
  3: '适中',
  4: '较难',
  5: '硬仗',
};

/** 首页引言：与「你只活一次」呼应，但不说教 */
export const QUOTES: { text: string; source: string }[] = [
  { text: '记住你终有一死——然后，真正地活。', source: 'Memento Mori' },
  { text: '你所拥有的只有今天。别把它花在等待上。', source: '你只活一次' },
  { text: '把时间用在真正重要的事上，而不是所有事上。', source: '少即是多' },
  { text: '先看清路，再迈开步。磨刀不误砍柴工。', source: '启程侦查' },
  { text: '不积跬步，无以至千里。', source: '荀子' },
  { text: '知止而后有定，定而后能静。', source: '大学' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', source: '谚语' },
  { text: '不要用战术上的勤奋，掩盖战略上的懒惰。', source: '雷军' },
];

export function quoteOfDay(daySeed: string): { text: string; source: string } {
  let hash = 0;
  for (let i = 0; i < daySeed.length; i += 1) {
    hash = (hash * 31 + daySeed.charCodeAt(i)) >>> 0;
  }
  return QUOTES[hash % QUOTES.length] ?? QUOTES[0]!;
}
