import { useEffect } from 'react';
import type { Language } from '@yolo/core';
import rawTranslations from './translations.json';
import { MANUAL_TRANSLATIONS } from './manualTranslations';

type UiLanguage = Exclude<Language, 'zh'>;
type Translation = Partial<Record<UiLanguage, string>>;
type TranslationMap = Record<string, Translation>;

const dictionary = { ...(rawTranslations as TranslationMap), ...MANUAL_TRANSLATIONS } as TranslationMap;

const LANGUAGE_KEY = 'yolo-language';
const SKIP_SELECTOR =
  '[data-i18n-skip], [translate="no"], textarea, pre, code, script, style, svg title, .md-doc, .md-editor, .md-preview';
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'] as const;

const sourceText = new Map<Text, string>();
const lastText = new Map<Text, string>();
const sourceAttrs = new Map<Element, Record<string, string>>();
const sourceElementText = new Map<Element, string>();
const lastElementText = new Map<Element, string>();
const lastAttrs = new Map<Element, Record<string, string>>();
let observer: MutationObserver | null = null;
let currentLanguage: Language = 'zh';
let scheduled = false;

export function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'ja' || value === 'ko' || value === 'en';
}

export function languageLabel(language: Language): string {
  switch (language) {
    case 'ja':
      return '日本語';
    case 'ko':
      return '한국어';
    case 'en':
      return 'English';
    default:
      return '中文';
  }
}

export function languageTag(language: Language): string {
  switch (language) {
    case 'ja':
      return 'ja';
    case 'ko':
      return 'ko';
    case 'en':
      return 'en';
    default:
      return 'zh-CN';
  }
}

export function applyCachedLanguage(): void {
  let cached: string | null = null;
  try {
    cached = window.localStorage.getItem(LANGUAGE_KEY);
  } catch {
    cached = null;
  }
  currentLanguage = isLanguage(cached) ? cached : 'zh';
  document.documentElement.lang = languageTag(currentLanguage);
}

function cacheLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    /* 缓存失败不影响本次切换 */
  }
}

function lookup(source: string, language: Language): string | null {
  if (language === 'zh') return null;
  const normalized = source.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return dictionary[normalized]?.[language] ?? dictionary[source.trim()]?.[language] ?? null;
}

const WEEKDAYS: Record<string, Record<UiLanguage, string>> = {
  星期一: { en: 'Monday', ja: '月曜日', ko: '월요일' },
  星期二: { en: 'Tuesday', ja: '火曜日', ko: '화요일' },
  星期三: { en: 'Wednesday', ja: '水曜日', ko: '수요일' },
  星期四: { en: 'Thursday', ja: '木曜日', ko: '목요일' },
  星期五: { en: 'Friday', ja: '金曜日', ko: '금요일' },
  星期六: { en: 'Saturday', ja: '土曜日', ko: '토요일' },
  星期日: { en: 'Sunday', ja: '日曜日', ko: '일요일' },
  星期天: { en: 'Sunday', ja: '日曜日', ko: '일요일' },
};

function localizeDate(text: string, language: UiLanguage): string {
  return text
    .replace(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (_, y, m, d) => {
      if (language === 'en') {
        return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      if (language === 'ko') return `${y}년 ${m}월 ${d}일`;
      return `${y}年${m}月${d}日`;
    })
    .replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (_, m, d) => {
      if (language === 'en') {
        return new Date(2026, Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
      if (language === 'ko') return `${m}월 ${d}일`;
      return `${m}月${d}日`;
    })
    .replace(/星期[一二三四五六日天]/g, (match) => WEEKDAYS[match]?.[language] ?? match);
}

function localizeUnits(text: string, language: UiLanguage): string {
  if (language === 'en') {
    return text
      .replace(/(\d+)\s*分钟/g, '$1 min')
      .replace(/(\d+)\s*小时/g, '$1 hr')
      .replace(/(\d+)\s*秒钟?/g, '$1 sec')
      .replace(/(\d+)\s*天/g, '$1 days')
      .replace(/还有\s*(\d+)\s*days/g, '$1 days left')
      .replace(/已逾期\s*(\d+)\s*days/g, '$1 days overdue')
      .replace(/(\d+)\s*次/g, '$1 times')
      .replace(/(\d+)\s*条/g, '$1 items')
      .replace(/(\d+)\s*项/g, '$1')
      .replace(/(\d+)\s*个/g, '$1')
      .replace(/(\d+)\s*分(?![钟])/g, '$1 min')
      .replace(/第\s*(\d+)\s*轮/g, 'Round $1')
      .replace(/连续\s*(\d+)\s*days/g, '$1-day streak')
      .replace(/(\d+)\/(\d+)\s*阶段/g, '$1/$2 phases')
      .replace(/写作\s*\+?(\d+)\s*min/g, 'Writing +$1 min')
      .replace(/共\s*(\d+)\s*times，最近优先/g, '$1 sessions, latest first');
  }
  if (language === 'ja') {
    return text
      .replace(/(\d+)\s*分钟/g, '$1分')
      .replace(/(\d+)\s*小时/g, '$1時間')
      .replace(/(\d+)\s*秒钟?/g, '$1秒')
      .replace(/(\d+)\s*天/g, '$1日')
      .replace(/还有\s*(\d+)\s*日/g, 'あと$1日')
      .replace(/已逾期\s*(\d+)\s*日/g, '$1日超過')
      .replace(/(\d+)\s*次/g, '$1回')
      .replace(/(\d+)\s*条/g, '$1件')
      .replace(/(\d+)\s*項/g, '$1件')
      .replace(/(\d+)\s*个/g, '$1個')
      .replace(/(\d+)\s*分(?![钟])/g, '$1分')
      .replace(/第\s*(\d+)\s*轮/g, '第$1ラウンド')
      .replace(/连续\s*(\d+)\s*日/g, '$1日連続')
      .replace(/(\d+)\/(\d+)\s*阶段/g, '$1/$2フェーズ')
      .replace(/共\s*(\d+)\s*回，最近优先/g, '全$1回・新しい順');
  }
  return text
    .replace(/(\d+)\s*分钟/g, '$1분')
    .replace(/(\d+)\s*小时/g, '$1시간')
    .replace(/(\d+)\s*秒钟?/g, '$1초')
    .replace(/(\d+)\s*天/g, '$1일')
    .replace(/还有\s*(\d+)\s*일/g, '$1일 남음')
    .replace(/已逾期\s*(\d+)\s*일/g, '$1일 초과')
    .replace(/(\d+)\s*次/g, '$1회')
    .replace(/(\d+)\s*条/g, '$1개')
    .replace(/(\d+)\s*项/g, '$1개')
    .replace(/(\d+)\s*个/g, '$1개')
    .replace(/(\d+)\s*分(?![钟])/g, '$1분')
    .replace(/第\s*(\d+)\s*轮/g, '$1라운드')
    .replace(/连续\s*(\d+)\s*일/g, '$1일 연속')
    .replace(/(\d+)\/(\d+)\s*阶段/g, '$1/$2단계')
    .replace(/共\s*(\d+)\s*회，最近优先/g, '총 $1회 · 최신순');
}

function localizeDynamic(source: string, language: UiLanguage): string | null {
  let out = localizeDate(source, language);
  out = out.replace(/连续\s*(\d+)\s*天/g, language === 'en' ? '$1-day streak' : language === 'ja' ? '$1日連続' : '$1일 연속');
  out = out.replace(/(\d+)\s*条\s*证据/g, language === 'en' ? '$1 items of evidence' : language === 'ja' ? '$1件の証拠' : '$1개의 증거');
  out = out.replace(/加入于/g, language === 'en' ? 'Joined' : language === 'ja' ? '参加' : '가입');
  out = out.replace(/阶段\s*(\d+)%/g, language === 'en' ? 'Stage $1%' : language === 'ja' ? '段階$1%' : '단계 $1%');
  out = out.replace(/优先级：(.+?) · 状态：(.+?)的任务会出现在「今日」/g, language === 'en' ? 'Priority: $1 · $2 tasks appear on Today' : language === 'ja' ? '優先度：$1 · $2のタスクは「今日」に表示' : '우선순위: $1 · $2 작업은 오늘에 표시');
  out = out.replace(/成就 · /g, language === 'en' ? 'Achievement · ' : language === 'ja' ? '実績 · ' : '업적 · ');
  out = out.replace(/距「([^」]+)」还差\s*(\d+)\s*条/g, language === 'en' ? '$2 more to reach “$1”' : language === 'ja' ? '「$1」まであと$2件' : '“$1”까지 $2개 남음');
  out = out.replace(/\+?(\d+)\s*个?节点/g, language === 'en' ? '+$1 nodes' : language === 'ja' ? '+$1ノード' : '+$1개 노드');
  out = out.replace(/专注\s*(\d+)\s*h/g, language === 'en' ? 'Focus $1h' : language === 'ja' ? '集中$1h' : '집중 $1h');
  out = out.replace(/(\d+)\s*(?:小时|hr|時間|시간)\s*前/g, language === 'en' ? '$1 hr ago' : language === 'ja' ? '$1時間前' : '$1시간 전');
  out = out.replace(/(\d+)\s*(?:天|days?|日|일)\s*前/g, language === 'en' ? '$1 days ago' : language === 'ja' ? '$1日前' : '$1일 전');
  out = out.replace(/(\d+)\s*(?:分钟|min|分|분)\s*前/g, language === 'en' ? '$1 min ago' : language === 'ja' ? '$1分前' : '$1분 전');
  out = out.replace(/共\s*(\d+)\s*次\s*·\s*平均\s*(\d+)\s*分钟/g, language === 'en' ? '$1 sessions · avg $2 min' : language === 'ja' ? '$1回 · 平均$2分' : '$1회 · 평균 $2분');
  out = out.replace(/每日目标\s*(\d+)\s*分钟/g, language === 'en' ? 'Daily goal $1 min' : language === 'ja' ? '1日の目標$1分' : '일일 목표 $1분');
  out = out.replace(/完成率\s*(\d+)%/g, language === 'en' ? 'Completion $1%' : language === 'ja' ? '完了率$1%' : '완료율 $1%');
  out = out.replace(/(\d+)\s*份启程侦查/g, language === 'en' ? '$1 recons' : language === 'ja' ? '偵察$1件' : '정찰 $1건');
  out = out.replace(/(\d+)\s*个任务可对比/g, language === 'en' ? '$1 tasks comparable' : language === 'ja' ? '比較可能なタスク$1件' : '비교 가능한 작업 $1개');
  out = out.replace(/(\d+)\s*天合计/g, language === 'en' ? '$1-day total' : language === 'ja' ? '直近$1日 合計' : '최근 $1일 합계');
  out = out.replace(/(\d+)\/(\d+)\s*颗星已点亮/g, language === 'en' ? '$1/$2 stars lit' : language === 'ja' ? '$1/$2個の星が点灯' : '$1/$2개 별 점등');
  out = out.replace(/(\d+)\s*关联任务/g, language === 'en' ? '$1 linked task' : language === 'ja' ? '関連タスク$1件' : '연결 작업 $1개');
  out = out.replace(/立下于/g, language === 'en' ? 'Set' : language === 'ja' ? '制定' : '설정');
  out = out.replace(/(\d+)\s*字/g, language === 'en' ? '$1 chars' : language === 'ja' ? '$1文字' : '$1자');
  out = out.replace(/(\d+)\s*次专注/g, language === 'en' ? '$1 focus sessions' : language === 'ja' ? '$1回の集中' : '$1회 집중');
  out = out.replace(/(\d+\/\d+)\s*·\s*(\d+)\s*次专注[：:]\s*(\d+)\s*分钟/g, language === 'en' ? '$1 · $2 focus sessions: $3 min' : language === 'ja' ? '$1 · $2回の集中：$3分' : '$1 · $2회 집중: $3분');
  out = out.replace(/阶段进度\s*(\d+)%/g, language === 'en' ? 'Phase progress $1%' : language === 'ja' ? 'フェーズ進捗$1%' : '단계 진행 $1%');
  out = out.replace(/阶段\s*·\s*(\d+)\/(\d+)/g, language === 'en' ? 'Phase · $1/$2' : language === 'ja' ? 'フェーズ · $1/$2' : '단계 · $1/$2');
  out = out.replace(/切换主题 · 当前：(.*?)（下一站：(.*?)）/g, language === 'en' ? 'Switch theme · Current: $1 (Next: $2)' : language === 'ja' ? 'テーマ切替 · 現在：$1（次：$2）' : '테마 전환 · 현재: $1 (다음: $2)');
  out = out.replace(/切换主题，当前 (.*?)，下一站 (.*?)/g, language === 'en' ? 'Switch theme, current $1, next $2' : language === 'ja' ? 'テーマ切替、現在 $1、次 $2' : '테마 전환, 현재 $1, 다음 $2');
  out = out.replace(/^提交于\s*/g, language === 'en' ? 'Submitted ' : language === 'ja' ? '提出日 ' : '제출일 ');
  out = out.replace(/评分\s*(\d+)/g, language === 'en' ? 'Score $1' : language === 'ja' ? 'スコア$1' : '점수 $1');
  out = out.replace(/已修订\s*(\d+)\s*次/g, language === 'en' ? '$1 revisions' : language === 'ja' ? '$1回改訂' : '$1회 수정');
  out = out.replace(/用阶段进度（(\d+)%）同步任务进度/g, language === 'en' ? 'Sync progress from phases ($1%)' : language === 'ja' ? 'フェーズ進捗（$1%）で同期' : '단계 진행($1%)으로 동기화');
  out = out.replace(/Writing记录\s*(\d+)\s*次\s*·\s*共\s*(\d+)\s*(?:min|分钟)/g, language === 'en' ? 'Writing log $1 sessions · $2 min total' : language === 'ja' ? '執筆記録$1回 · 合計$2分' : '작성 기록 $1회 · 총 $2분');
  out = out.replace(/共\s*(\d+)\s*min/g, language === 'en' ? '$1 min total' : language === 'ja' ? '合計$1分' : '총 $1분');
  out = out.replace(/(\d+)\s*times/g, language === 'en' ? '$1 sessions' : language === 'ja' ? '$1回' : '$1회');
  out = out.replace(/与预计总用时相差\s*(\d+)%/g, language === 'en' ? '$1% off estimate' : language === 'ja' ? '予想との差$1%' : '예상과 $1% 차이');
  out = out.replace(/还有\s*(\d+)\s*项必答内容未完成/g, language === 'en' ? '$1 required fields left' : language === 'ja' ? '必須項目があと$1件' : '필수 항목 $1개 남음');
  out = out.replace(/^启程侦查\s*·\s*(.+)$/g, language === 'en' ? 'Departure recon · $1' : language === 'ja' ? '出発偵察 · $1' : '출발 정찰 · $1');
  out = out.replace(/^修订调查报告\s*·\s*(.+)$/g, language === 'en' ? 'Revised recon · $1' : language === 'ja' ? '改訂偵察 · $1' : '수정 정찰 · $1');
  out = out.replace(/(.+?)\s*·\s*已点亮/g, language === 'en' ? '$1 · Lit' : language === 'ja' ? '$1 · 点灯済み' : '$1 · 점등됨');
  out = out.replace(/(.+?)\s*·\s*可点亮/g, language === 'en' ? '$1 · Ready' : language === 'ja' ? '$1 · 点灯可能' : '$1 · 점등 가능');
  out = out.replace(/(.+?)\s*·\s*未解锁/g, language === 'en' ? '$1 · Locked' : language === 'ja' ? '$1 · 未解放' : '$1 · 잠김');
  out = out.replace(/(\d+)\s*关联(?:Task|任务)/g, language === 'en' ? '$1 linked task' : language === 'ja' ? '関連タスク$1件' : '연결 작업 $1개');
  out = out.replace(/到目前为止[，,]?\s*你在\s*(.+?)\s*投入最多[：:]\s*(\d+)\s*(?:min|分钟)/g, language === 'en' ? 'So far, your biggest day is $1: $2 min' : language === 'ja' ? '今のところ最も多い日は$1：$2分' : '지금까지 가장 많이 투입한 날은 $1: $2분');
  out = localizeUnits(out, language);
  out = out.replace(/今天/g, language === 'en' ? 'Today' : language === 'ja' ? '今日' : '오늘');
  out = out.replace(/昨天/g, language === 'en' ? 'Yesterday' : language === 'ja' ? '昨日' : '어제');
  out = out.replace(/明天/g, language === 'en' ? 'Tomorrow' : language === 'ja' ? '明日' : '내일');
  out = out.replace(/后天/g, language === 'en' ? 'In two days' : language === 'ja' ? '明後日' : '모레');
  const hero = source.match(/今天是你余生中最年轻的一天。[\s\S]*?有\s*(\d+)\s*件事正在进行，挑一件，把注意力交还给它。/);
  if (hero) {
    const n = hero[1];
    out = language === 'en'
      ? `Today is the youngest day of the rest of your life. ${n} tasks are in motion. Pick one and give it your attention.`
      : language === 'ja'
        ? `今日は残りの人生でいちばん若い日。進行中のタスクは${n}件。一つ選んで、集中を返そう。`
        : `오늘은 남은 인생에서 가장 젊은 날입니다. 진행 중인 작업이 ${n}개 있습니다. 하나를 골라 집중하세요.`;
  }
  out = out.replace(/(\d+)\s*个计时/g, language === 'en' ? '$1 timers' : language === 'ja' ? '$1タイマー' : '$1개 타이머');
  out = out.replace(/(\d+)\s*计时中\s*·\s*今日完成\s*(\d+)/g, language === 'en' ? '$1 timers · $2 done today' : language === 'ja' ? '$1タイマー · 本日$2件完了' : '$1개 타이머 · 오늘 $2개 완료');
  out = out.replace(/今日完成\s*(\d+)\s*个/g, language === 'en' ? '$1 done today' : language === 'ja' ? '本日$1件完了' : '오늘 $1개 완료');
  out = out.replace(/今天是你余生中最年轻的一天。?/g, language === 'en' ? 'Today is the youngest day of the rest of your life.' : language === 'ja' ? '今日は残りの人生でいちばん若い日。' : '오늘은 남은 인생에서 가장 젊은 날입니다.');
  out = out.replace(/有\s*(\d+)\s*件事正在进行/g, language === 'en' ? '$1 tasks are in motion' : language === 'ja' ? '進行中のタスクは$1件' : '진행 중인 작업 $1개');
  out = out.replace(/挑一件，把注意力交还给它。?/g, language === 'en' ? 'Pick one and give it your attention.' : language === 'ja' ? '一つ選んで、集中を返そう。' : '하나를 골라 집중하세요.');
  out = out.replace(/报告\s*(\d+)/g, language === 'en' ? 'Report $1' : language === 'ja' ? 'レポート$1' : '보고서 $1');
  out = out.replace(/(\d+)\/(\d+)\s*阶段/g, language === 'en' ? '$1/$2 phases' : language === 'ja' ? '$1/$2フェーズ' : '$1/$2단계');
  out = out.replace(/目标\s*(\d+)\s*min/g, language === 'en' ? 'Goal $1 min' : language === 'ja' ? '目標$1分' : '목표 $1분');
  out = out.replace(/完成\s*(\d+)%/g, language === 'en' ? 'Complete $1%' : language === 'ja' ? '完了$1%' : '완료 $1%');
  out = out.replace(/专注\s*(\d+)\s*hr\s*(\d+)\s*min/g, language === 'en' ? 'Focus $1 hr $2 min' : language === 'ja' ? '集中$1時間$2分' : '집중 $1시간 $2분');
  return out !== source ? out : null;
}

const PHRASES: [string, Record<UiLanguage, string>][] = [
  ['连续', { en: 'Streak', ja: '連続', ko: '연속' }],
  ['目标', { en: 'Goal', ja: '目標', ko: '목표' }],
  ['完成', { en: 'Complete', ja: '完了', ko: '완료' }],
  ['专注', { en: 'Focus', ja: '集中', ko: '집중' }],
  ['今日', { en: 'Today', ja: '今日', ko: '오늘' }],
  ['计时中', { en: 'timers', ja: 'タイマー', ko: '타이머' }],
  ['写作', { en: 'Writing', ja: '執筆', ko: '작성' }],
  ['阶段', { en: 'phases', ja: 'フェーズ', ko: '단계' }],
  ['证据', { en: 'evidence', ja: '証拠', ko: '증거' }],
  ['学习', { en: 'Learning', ja: '学習', ko: '학습' }],
  ['任务', { en: 'Task', ja: 'タスク', ko: '작업' }],
  ['分钟', { en: 'min', ja: '分', ko: '분' }],
  ['小时', { en: 'hr', ja: '時間', ko: '시간' }],
  ['天', { en: 'days', ja: '日', ko: '일' }],
  ['条', { en: 'items', ja: '件', ko: '개' }],
  ['项', { en: 'items', ja: '件', ko: '개' }],
  ['次', { en: 'times', ja: '回', ko: '회' }],
  ['旅程', { en: 'Journey', ja: '旅', ko: '여정' }],
];

function phraseTranslate(text: string, language: UiLanguage): string {
  let out = text.replace(/，/g, language === 'en' ? ', ' : '，');
  for (const [source, values] of PHRASES) {
    if (!out.includes(source)) continue;
    out = out.split(source).join(values[language]);
  }
  return out;
}

function translateValue(source: string, language: Language): string | null {
  if (language === 'zh') return null;
  const exact = lookup(source, language);
  if (exact) return exact;
  const dynamic = localizeDynamic(source, language);
  if (dynamic) return phraseTranslate(dynamic, language);
  return null;
}

function shouldSkip(node: Node | null): boolean {
  if (!node) return false;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function translateTextNode(node: Text): void {
  if (currentLanguage === 'zh' || shouldSkip(node)) return;
  const raw = node.nodeValue ?? '';
  if (!raw.trim()) return;
  if (lastText.get(node) === raw) return;
  if (!sourceText.has(node)) sourceText.set(node, raw);
  const core = raw.trim();
  const translated = translateValue(core, currentLanguage);
  if (!translated || translated === core) return;
  const leading = raw.match(/^\s*/)?.[0] ?? '';
  const trailing = raw.match(/\s*$/)?.[0] ?? '';
  const value = `${leading}${translated}${trailing}`;
  lastText.set(node, value);
  node.nodeValue = value;
}

function shouldSkipAttribute(element: Element): boolean {
  return Boolean(element.closest('[data-i18n-skip], [translate="no"], script, style'));
}

function translateAttribute(element: Element, attr: (typeof ATTRIBUTES)[number]): void {
  if (currentLanguage === 'zh' || shouldSkipAttribute(element)) return;
  const raw = element.getAttribute(attr);
  if (!raw?.trim()) return;
  const previous = lastAttrs.get(element)?.[attr];
  if (previous === raw) return;
  const store = sourceAttrs.get(element) ?? {};
  if (!(attr in store)) store[attr] = raw;
  sourceAttrs.set(element, store);
  const translated = translateValue(raw.trim(), currentLanguage);
  if (!translated || translated === raw.trim()) return;
  lastAttrs.set(element, { ...(lastAttrs.get(element) ?? {}), [attr]: translated });
  element.setAttribute(attr, translated);
}

function translateCombinedText(element: Element): boolean {
  if (currentLanguage === 'zh' || shouldSkip(element)) return false;
  if (element.childElementCount > 0) return false;
  const raw = element.textContent ?? '';
  if (!raw.trim()) return false;
  if (lastElementText.get(element) === raw) return true;
  if (!sourceElementText.has(element)) sourceElementText.set(element, raw);
  const translated = translateValue(raw.trim(), currentLanguage);
  if (!translated || translated === raw.trim()) return false;
  const leading = raw.match(/^\s*/)?.[0] ?? '';
  const trailing = raw.match(/\s*$/)?.[0] ?? '';
  const value = `${leading}${translated}${trailing}`;
  lastElementText.set(element, value);
  element.textContent = value;
  return true;
}

function translateTree(root: ParentNode): void {
  if (currentLanguage === 'zh') return;
  const candidates = (root as Element).querySelectorAll?.('*') ?? [];
  for (const element of candidates) translateCombinedText(element);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateTextNode(node as Text);
    node = walker.nextNode();
  }
  const elements = (root as Element).querySelectorAll?.('*') ?? [];
  for (const element of elements) {
    for (const attr of ATTRIBUTES) translateAttribute(element, attr);
  }
}

function restore(): void {
  for (const [node, source] of sourceText) node.nodeValue = source;
  for (const [element, source] of sourceElementText) element.textContent = source;
  for (const [element, attrs] of sourceAttrs) {
    for (const [attr, source] of Object.entries(attrs)) element.setAttribute(attr, source);
  }
  sourceText.clear();
  lastText.clear();
  sourceElementText.clear();
  lastElementText.clear();
  sourceAttrs.clear();
  lastAttrs.clear();
}

function scheduleTranslate(): void {
  if (scheduled || currentLanguage === 'zh') return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    translateTree(document.body);
  });
}

function observe(): void {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (currentLanguage === 'zh') return;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        translateTextNode(mutation.target as Text);
      } else {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
          else if (node.nodeType === Node.ELEMENT_NODE) {
            translateCombinedText(node as Element);
            translateTree(node as Element);
          }
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRIBUTES],
  });
}

export function applyLanguage(language: Language): void {
  if (language === currentLanguage && (language === 'zh' || sourceText.size > 0)) return;
  currentLanguage = language;
  document.documentElement.lang = languageTag(language);
  cacheLanguage(language);
  restore();
  if (language === 'zh') return;
  observe();
  translateTree(document.body);
  scheduleTranslate();
}

/** React 根组件在语言变化时调用。 */
export function useLanguageRuntime(language: Language): void {
  useEffect(() => {
    applyLanguage(language);
  }, [language]);
}
