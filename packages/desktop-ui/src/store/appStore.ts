/**
 * 渲染层状态机：所有业务动作都在这里汇聚。
 * 任何改变任务数据的动作都会：
 *  1. 结算证据与成就；2. 更新界面提示；3. 触发去抖持久化。
 */
import { create } from 'zustand';
import { produce } from 'immer';
import {
  applyReportToTask,
  canAssignTaskParent,
  createGoal,
  createInitialData,
  createKnowledgePoint,
  createPhase,
  createReport,
  createSampleData,
  createTask,
  createTimer,
  dayKey,
  estimateAccuracy,
  focusXp,
  grantXp,
  growthSummary,
  heartbeatTimer,
  makeId,
  MAX_TASK_LEVEL,
  migrateData,
  nowIso,
  pauseTimer as pauseTimerCore,
  recoverTimers,
  resumeTimer as resumeTimerCore,
  reviseReport,
  settleTimer,
  syncAchievements,
  taskCompletionXp,
  taskDescendantIds,
  THEMES,
  type ThemeName,
  todayKey,
  validateReport,
  XP,
  type AchievementDef,
  type AiAssessmentSession,
  type CustomTheme,
  type AiSettings,
  type EstimateReview,
  type ActiveTimer,
  type AppData,
  type AppView,
  type Goal,
  type GoalInput,
  type Language,
  type SkinTone,
  type KnowledgePointInput,
  type PhaseInput,
  type ReportInput,
  type ReportValidation,
  type Task,
  type TaskInput,
  type TaskLevel,
  type TaskPriority,
  type WritingLog,
} from '@yolo/core';
import { applyTheme } from '../lib/theme';

export type TaskFilter = 'all' | 'active' | 'backlog' | 'done' | 'missing-report';
export type TaskSort = 'updated' | 'due' | 'progress' | 'priority';

export interface WritingLogInput {
  taskId: string;
  sessionId?: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
}

export interface GrowthStamp {
  title: string;
  detail: string;
  skill?: string;
  evidenceCount: number;
  stage: string;
  nextStage?: string;
  progress: number;
}

export type ModalState =
  | { kind: 'none' }
  | { kind: 'task-form'; taskId?: string }
  | { kind: 'report'; taskId: string; startAfterSubmit?: boolean }
  | { kind: 'goal-form'; goalId?: string }
  | { kind: 'knowledge-form'; goalId: string; pointId?: string }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      tone?: 'danger' | 'gold';
      action: () => void;
    };

export interface Toast {
  id: string;
  tone: 'xp' | 'achievement' | 'success' | 'info' | 'warn' | 'error';
  title: string;
  message?: string;
}

interface AppInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  dataPath: string;
  configDir: string;
  demo: boolean;
  isDev: boolean;
}

interface AppStore {
  data: AppData;
  ready: boolean;
  bootError: string | null;
  info: AppInfo | null;
  view: AppView;
  modal: ModalState;
  taskDetailId: string | null;
  goalDetailId: string | null;
  focusTimerId: string | null;
  growthStamp: GrowthStamp | null;
  toasts: Toast[];
  taskFilter: TaskFilter;
  taskSort: TaskSort;
  search: string;
  saving: boolean;
  lastSavedAt: string | null;

  bootstrap: () => Promise<void>;
  setView: (view: AppView) => void;
  setTaskFilter: (filter: TaskFilter) => void;
  setTaskSort: (sort: TaskSort) => void;
  setSearch: (search: string) => void;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  openGoal: (goalId: string) => void;
  closeGoal: () => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  openFocus: (timerId: string) => void;
  closeFocus: () => void;
  dismissGrowthStamp: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
  markSaving: (saving: boolean) => void;
  markSaved: (at: string) => void;

  completeOnboarding: (opts: {
    name: string;
    dailyGoalMinutes: number;
  }) => void;
  updateProfile: (patch: { name?: string; motto?: string }) => void;
  updateSettings: (patch: Partial<AppData['settings']>) => void;
  setTheme: (theme: ThemeName) => void;
  setSkinTone: (tone: SkinTone) => void;
  saveCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: () => void;
  setLanguage: (language: Language) => void;
  savePreferences: (opts: {
    name: string;
    motto: string;
    dailyGoalMinutes: number;
    reduceMotion: boolean;
    sound: boolean;
  }) => void;
  saveAiSettings: (patch: Partial<AiSettings>) => void;
  saveAssessmentSession: (session: AiAssessmentSession) => void;
  addEstimateReview: (review: EstimateReview) => void;
  applyEstimateReview: (reviewId: string) => void;

  addTask: (input: TaskInput) => Task;
  updateTask: (taskId: string, patch: Partial<TaskInput>) => void;
  updateTaskNote: (taskId: string, note: string, options?: { silent?: boolean }) => void;
  addWritingLog: (input: WritingLogInput) => void;
  deleteTask: (taskId: string) => void;
  archiveTask: (taskId: string) => void;
  reopenTask: (taskId: string) => void;
  setTaskProgress: (taskId: string, progress: number) => void;
  completeTask: (taskId: string) => void;

  addPhase: (taskId: string, input: PhaseInput) => void;
  updatePhase: (taskId: string, phaseId: string, patch: Partial<PhaseInput>) => void;
  togglePhase: (taskId: string, phaseId: string) => void;
  deletePhase: (taskId: string, phaseId: string) => void;

  submitReport: (
    taskId: string,
    input: ReportInput,
    opts?: { createPhases?: boolean; startAfterSubmit?: boolean },
  ) => ReportValidation & { submitted: boolean };

  addGoal: (input: GoalInput) => void;
  updateGoal: (goalId: string, patch: Partial<GoalInput>) => void;
  deleteGoal: (goalId: string) => void;
  addKnowledgePoint: (goalId: string, input: KnowledgePointInput) => void;
  updateKnowledgePoint: (goalId: string, pointId: string, patch: Partial<KnowledgePointInput>) => void;
  deleteKnowledgePoint: (goalId: string, pointId: string) => void;
  lightKnowledgePoint: (goalId: string, pointId: string) => void;

  startTimer: (taskId: string) => void;
  pauseTimer: (timerId: string) => void;
  resumeTimer: (timerId: string) => void;
  stopTimer: (timerId: string, note?: string) => void;
  discardTimer: (timerId: string) => void;
  heartbeat: () => void;
  pauseTimersAt: (atIso: string, reason?: 'suspend' | 'lock-screen') => void;

  exportData: () => Promise<void>;
  importData: () => Promise<void>;
  resetData: (mode: 'empty' | 'sample') => void;
  saveNow: () => Promise<void>;
}

const STORAGE_KEY = 'yolo-data-v1';

function isDesktop(): boolean {
  return typeof window !== 'undefined' && Boolean(window.yolo);
}

function readBrowserData(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeBrowserData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* 忽略浏览器预览存储异常 */
  }
}

function sortPhases(phases: Task['phases']): Task['phases'] {
  return [...phases].sort((a, b) => a.order - b.order);
}

function findTask(data: AppData, taskId: string): Task | undefined {
  return data.tasks.find((t) => t.id === taskId);
}

const emptyData = createInitialData();

export const useAppStore = create<AppStore>((set, get) => {
  const pushToast = (toast: Omit<Toast, 'id'>) => {
    const id = makeId('toast_');
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-4) }));
  };

  /**
   * 统一提交：immer 变更 -> 结算成就 -> 比较成长阶段 -> 提示。
   * recipe 内部可以安全地调用 grantXp 等 core 纯函数。
   */
  const commit = (
    recipe: (draft: AppData) => void,
    opts: { xpLabel?: string; silent?: boolean; notifyXp?: boolean } = {},
  ): { xpDelta: number; unlocked: AchievementDef[] } => {
    const prev = get().data;
    const prevXp = prev.rewards.xp;
    let next = produce(prev, (draft) => {
      recipe(draft);
      draft.meta.lastSavedAt = nowIso();
    });
    let unlocked: AchievementDef[] = [];
    next = produce(next, (draft) => {
      unlocked = syncAchievements(draft);
    });
    const xpDelta = next.rewards.xp - prevXp;
    set({ data: next });

    if (!opts.silent) {
      for (const achievement of unlocked) {
        pushToast({
          tone: 'achievement',
          title: `里程碑解锁 · ${achievement.name}`,
          message: achievement.description,
        });
      }
    }
    return { xpDelta, unlocked };
  };

  return {
    data: emptyData,
    ready: false,
    bootError: null,
    info: null,
    view: 'today',
    modal: { kind: 'none' },
    taskDetailId: null,
    goalDetailId: null,
    focusTimerId: null,
    growthStamp: null,
    toasts: [],
    taskFilter: 'all',
    taskSort: 'updated',
    search: '',
    saving: false,
    lastSavedAt: null,

    bootstrap: async () => {
      if (get().ready) return;
      let info: AppInfo | null = null;
      let raw: unknown = null;
      let recoveryNote: string | undefined;
      try {
        if (isDesktop() && window.yolo) {
          info = await window.yolo.appInfo();
          const result = await window.yolo.loadData();
          raw = result.data;
          if (result.recoveredFromBackup) {
            recoveryNote = '主数据文件损坏，已从备份恢复。';
          }
        } else {
          raw = readBrowserData();
        }
      } catch (error) {
        set({ bootError: String(error) });
      }
      let data = migrateData(raw);
      if (!data) {
        data = info?.demo ? createSampleData('行者') : createInitialData();
      }
      const recovered = recoverTimers(data.activeTimers);
      if (recovered.pausedCount > 0) {
        data = { ...data, activeTimers: recovered.timers };
        recoveryNote = `检测到 ${recovered.pausedCount} 个未结束的计时，已自动暂停并保留专注记录。`;
      }
      applyTheme(data.settings.theme, data.settings.customTheme, data.settings.skinTone);
      set({
        data,
        ready: true,
        info,
        lastSavedAt: data.meta.lastSavedAt,
        view: 'today',
      });
      if (recoveryNote) {
        pushToast({ tone: 'info', title: '数据已恢复', message: recoveryNote });
      }
      if (data.meta.onboarded) {
        const before = data.rewards.xp;
        const unlocked = syncAchievements(data);
        if (unlocked.length > 0 || data.rewards.xp !== before) {
          set({ data: { ...data } });
          for (const achievement of unlocked) {
            pushToast({
              tone: 'achievement',
              title: `成就解锁 · ${achievement.name}`,
              message: achievement.description,
            });
          }
        }
      }
    },

    setView: (view) => set({ view }),
    setTaskFilter: (taskFilter) => set({ taskFilter }),
    setTaskSort: (taskSort) => set({ taskSort }),
    setSearch: (search) => set({ search }),
    openTask: (taskDetailId) => set({ taskDetailId, goalDetailId: null }),
    closeTask: () => set({ taskDetailId: null }),
    openGoal: (goalDetailId) => set({ goalDetailId, taskDetailId: null }),
    closeGoal: () => set({ goalDetailId: null }),
    openModal: (modal) => set({ modal }),
    closeModal: () => set({ modal: { kind: 'none' } }),
    openFocus: (focusTimerId) => set({ focusTimerId }),
    closeFocus: () => set({ focusTimerId: null }),
    dismissGrowthStamp: () => set({ growthStamp: null }),
    pushToast,
    dismissToast: (toastId) =>
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== toastId) })),
    markSaving: (saving) => set({ saving }),
    markSaved: (lastSavedAt) => set({ saving: false, lastSavedAt }),

    completeOnboarding: ({ name, dailyGoalMinutes }) => {
      const cleanName = name.trim() || '行者';
      // 首次进入始终是一张白纸：任务、目标、阶段与专注记录都留空。
      const data = produce(createInitialData(), (draft) => {
        draft.profile.name = cleanName;
        draft.profile.joinedAt = nowIso();
        draft.settings.dailyGoalMinutes = dailyGoalMinutes;
        draft.settings.maxParallel = 1;
        draft.meta.onboarded = true;
      });
      applyTheme(data.settings.theme, data.settings.customTheme, data.settings.skinTone);
      set({ data, ready: true, view: 'today' });
      pushToast({
        tone: 'success',
        title: `欢迎，${cleanName}`,
        message: '旅程已开启。先立一个目标，或直接创建第一个任务。',
      });
    },

    updateProfile: (patch) => {
      commit((draft) => {
        if (patch.name !== undefined) draft.profile.name = patch.name.trim();
        if (patch.motto !== undefined) draft.profile.motto = patch.motto.trim();
      });
      pushToast({ tone: 'success', title: '个人资料已更新' });
    },

    updateSettings: (patch) => {
      commit((draft) => {
        if (patch.dailyGoalMinutes !== undefined) {
          draft.settings.dailyGoalMinutes = Math.min(600, Math.max(15, Math.round(patch.dailyGoalMinutes)));
        }
        if (patch.reduceMotion !== undefined) draft.settings.reduceMotion = patch.reduceMotion;
        if (patch.sound !== undefined) draft.settings.sound = patch.sound;
      });
      pushToast({ tone: 'success', title: '设置已保存' });
    },

    setLanguage: (language) => {
      commit((draft) => {
        draft.settings.language = language;
      }, { silent: true });
    },

    setTheme: (theme) => {
      const custom = get().data.settings.customTheme;
      commit(
        (draft) => {
          draft.settings.theme = theme;
        },
        { silent: true },
      );
      applyTheme(theme, custom, get().data.settings.skinTone);
      const option = THEMES.find((item) => item.id === theme);
      pushToast({
        tone: 'info',
        title: `主题 · ${theme === 'custom' ? custom?.name || '自定义主题' : option?.name ?? theme}`,
        message: theme === 'custom' ? '自编辑主题' : option?.description,
      });
    },

    setSkinTone: (skinTone) => {
      commit((draft) => {
        draft.settings.skinTone = skinTone;
      }, { silent: true });
      applyTheme(get().data.settings.theme, get().data.settings.customTheme, skinTone);
    },

    saveCustomTheme: (customTheme) => {
      commit((draft) => {
        draft.settings.customTheme = customTheme;
        draft.settings.theme = 'custom';
      }, { silent: true });
      applyTheme('custom', customTheme, get().data.settings.skinTone);
      pushToast({
        tone: 'success',
        title: `主题 · ${customTheme.name || '自定义主题'}`,
        message: '已保存并应用。',
      });
    },

    deleteCustomTheme: () => {
      commit((draft) => {
        draft.settings.customTheme = null;
        if (draft.settings.theme === 'custom') draft.settings.theme = 'paper';
      }, { silent: true });
      applyTheme(get().data.settings.theme, get().data.settings.customTheme, get().data.settings.skinTone);
      pushToast({ tone: 'info', title: '已删除自定义主题', message: '已回到纸上时间。' });
    },

    savePreferences: ({ name, motto, dailyGoalMinutes, reduceMotion, sound }) => {
      commit((draft) => {
        draft.profile.name = name.trim() || '行者';
        draft.profile.motto = motto.trim();
        draft.settings.dailyGoalMinutes = Math.min(600, Math.max(15, Math.round(dailyGoalMinutes)));
        draft.settings.maxParallel = 1;
        draft.settings.reduceMotion = reduceMotion;
        draft.settings.sound = sound;
      });
      pushToast({ tone: 'success', title: '设置已保存' });
    },

    saveAiSettings: (patch) => {
      commit((draft) => {
        draft.ai = { ...draft.ai, ...patch };
      });
      pushToast({ tone: 'success', title: '学习助理设置已保存' });
    },

    saveAssessmentSession: (session) => {
      commit((draft) => {
        const index = draft.assessmentSessions.findIndex((item) => item.id === session.id);
        if (index >= 0) draft.assessmentSessions[index] = session;
        else draft.assessmentSessions = [session, ...draft.assessmentSessions].slice(0, 30);
      }, { silent: true });
      void get().saveNow();
    },

    addEstimateReview: (review) => {
      commit((draft) => {
        draft.estimateReviews = [review, ...draft.estimateReviews].slice(0, 80);
      }, { silent: true });
      void get().saveNow();
    },

    applyEstimateReview: (reviewId) => {
      const review = get().data.estimateReviews.find((item) => item.id === reviewId);
      if (!review) return;
      const midpoint = Math.round((review.suggestedMin + review.suggestedMax) / 2);
      commit((draft) => {
        const task = findTask(draft, review.taskId);
        if (task) {
          task.estimatedMinutes = midpoint;
          task.updatedAt = nowIso();
        }
        const target = draft.estimateReviews.find((item) => item.id === reviewId);
        if (target) target.acceptedAt = nowIso();
      });
      pushToast({
        tone: 'success',
        title: '已采用时间建议',
        message: `任务预计时间更新为 ${midpoint} 分钟。`,
      });
    },

    addTask: (input) => {
      const task = createTask(input);
      if (input.goalId) task.goalId = input.goalId;
      if (task.level > 1 && !canAssignTaskParent(get().data.tasks, task.id, task.parentId, task.level)) {
        task.level = 1;
        task.parentId = undefined;
      }
      commit((draft) => {
        draft.tasks.unshift(task);
      }, { silent: true });
      pushToast({
        tone: 'success',
        title: '任务已创建',
        message: '开始计时前，需要先完成一份启程侦查。',
      });
      set({ taskDetailId: task.id, modal: { kind: 'none' } });
      return task;
    },

    updateTask: (taskId, patch) => {
      const data = get().data;
      const existing = findTask(data, taskId);
      const nextLevel = (patch.level ?? existing?.level ?? 1) as TaskLevel;
      const nextParent =
        nextLevel === 1
          ? undefined
          : patch.parentId !== undefined
            ? patch.parentId || undefined
            : existing?.parentId;
      if (
        existing &&
        (patch.level !== undefined || patch.parentId !== undefined) &&
        !canAssignTaskParent(data.tasks, taskId, nextParent, nextLevel)
      ) {
        pushToast({ tone: 'warn', title: '任务层级不合法', message: '上级任务必须比当前任务高一级，且不能形成循环。' });
        return;
      }
      if (existing && patch.level !== undefined && existing.level !== nextLevel) {
        const delta = nextLevel - existing.level;
        const descendants = taskDescendantIds(data.tasks, taskId);
        const maxLevel = Math.max(
          nextLevel,
          ...descendants.map((id) => (findTask(data, id)?.level ?? nextLevel) + delta),
        );
        if (maxLevel > MAX_TASK_LEVEL) {
          pushToast({ tone: 'warn', title: '子任务层级会超过限制', message: `任务链最多 ${MAX_TASK_LEVEL} 级。` });
          return;
        }
      }
      commit((draft) => {
        const task = findTask(draft, taskId);
        if (!task) return;
        if (patch.level !== undefined) {
          const delta = nextLevel - task.level;
          task.level = nextLevel;
          task.parentId = nextParent;
          for (const id of taskDescendantIds(draft.tasks, taskId)) {
            const child = findTask(draft, id);
            if (child) child.level = Math.min(MAX_TASK_LEVEL, Math.max(1, child.level + delta)) as TaskLevel;
          }
        } else if (patch.parentId !== undefined) {
          task.parentId = nextParent;
        }
        if (patch.title !== undefined && patch.title.trim()) task.title = patch.title.trim();
        if (patch.description !== undefined) task.description = patch.description.trim();
        if (patch.category !== undefined) task.category = patch.category;
        if (patch.priority !== undefined) task.priority = patch.priority;
        if (patch.difficulty !== undefined) {
          task.difficulty = Math.min(5, Math.max(1, Math.round(patch.difficulty)));
        }
        if (patch.estimatedMinutes !== undefined) {
          task.estimatedMinutes = Math.max(0, Math.round(patch.estimatedMinutes));
        }
        if (patch.dueDate !== undefined) task.dueDate = patch.dueDate || undefined;
        if (patch.goalId !== undefined) task.goalId = patch.goalId || undefined;
        if (patch.tags !== undefined) task.tags = patch.tags.map((t) => t.trim()).filter(Boolean);
        task.updatedAt = nowIso();
      });
      pushToast({ tone: 'success', title: '任务已更新' });
      set({ modal: { kind: 'none' } });
    },

    updateTaskNote: (taskId, note, options) => {
      commit(
        (draft) => {
          const task = findTask(draft, taskId);
          if (!task) return;
          task.note = note.trim() || undefined;
          task.updatedAt = nowIso();
        },
        { silent: true },
      );
      if (!options?.silent) pushToast({ tone: 'success', title: '学习文档已保存' });
    },

    addWritingLog: ({ taskId, sessionId, startedAt, endedAt, seconds }) => {
      const duration = Math.max(0, Math.round(seconds));
      if (duration < 5) return;
      const task = findTask(get().data, taskId);
      if (!task) return;
      const minutes = Math.max(1, Math.round(duration / 60));
      const previousStage = growthSummary(get().data).stage.current.id;
      const log: WritingLog = {
        id: makeId('w_'),
        taskId,
        sessionId,
        startedAt,
        endedAt,
        seconds: duration,
      };
      commit((draft) => {
        draft.writingLogs.push(log);
        const current = findTask(draft, taskId);
        if (current) current.updatedAt = nowIso();
      }, { silent: true });
      void get().saveNow();
      const summary = growthSummary(get().data);
      if (summary.stage.current.id !== previousStage) {
        set({
          growthStamp: {
            title: '成长阶段已推进',
            detail: `写作 ${minutes} 分钟`,
            skill: task.goalId ? get().data.goals.find((goal) => goal.id === task.goalId)?.title : undefined,
            evidenceCount: summary.evidenceCount,
            stage: summary.stage.current.name,
            nextStage: summary.stage.next?.name,
            progress: summary.stage.progress,
          },
        });
      } else {
        pushToast({
          tone: 'xp',
          title: `写作证据已归档 · 第 ${summary.evidenceCount} 条`,
          message: `${minutes} 分钟${sessionId ? ' · 已关联到本次学习' : ' · 独立写作'}`,
        });
      }
    },

    deleteTask: (taskId) => {
      commit((draft) => {
        draft.tasks = draft.tasks.filter((t) => t.id !== taskId);
        draft.activeTimers = draft.activeTimers.filter((t) => t.taskId !== taskId);
        for (const task of draft.tasks) {
          if (task.parentId === taskId) {
            const delta = 1 - task.level;
            task.parentId = undefined;
            task.level = 1;
            for (const id of taskDescendantIds(draft.tasks, task.id)) {
              const child = findTask(draft, id);
              if (child) child.level = Math.min(MAX_TASK_LEVEL, Math.max(1, child.level + delta)) as TaskLevel;
            }
          }
        }
        for (const goal of draft.goals) {
          for (const point of goal.knowledgePoints) {
            if (point.taskId === taskId) point.taskId = undefined;
          }
        }
      });
      set({ taskDetailId: null, modal: { kind: 'none' }, focusTimerId: null });
      pushToast({ tone: 'info', title: '任务已删除', message: '历史专注记录仍保留在统计中。' });
    },

    archiveTask: (taskId) => {
      commit((draft) => {
        const task = findTask(draft, taskId);
        if (!task) return;
        task.status = 'archived';
        task.updatedAt = nowIso();
        draft.activeTimers = draft.activeTimers.filter((t) => t.taskId !== taskId);
      });
      set({ taskDetailId: null });
      pushToast({ tone: 'info', title: '任务已归档' });
    },

    reopenTask: (taskId) => {
      commit((draft) => {
        const task = findTask(draft, taskId);
        if (!task) return;
        task.status = 'active';
        task.completedAt = undefined;
        if (task.progress >= 100) task.progress = 99;
        task.updatedAt = nowIso();
      });
      pushToast({ tone: 'success', title: '任务已重新开启' });
    },

    setTaskProgress: (taskId, progress) => {
      const task = findTask(get().data, taskId);
      if (!task) return;
      const value = Math.min(100, Math.max(0, Math.round(progress)));
      if (value >= 100 && task.status !== 'done') {
        get().completeTask(taskId);
        return;
      }
      commit((draft) => {
        const current = findTask(draft, taskId);
        if (!current || current.status === 'done') return;
        current.progress = value;
        current.updatedAt = nowIso();
      }, { silent: true });
    },

    completeTask: (taskId) => {
      const data = get().data;
      const task = findTask(data, taskId);
      if (!task || task.status === 'done') return;
      if (data.activeTimers.some((t) => t.taskId === taskId)) {
        pushToast({
          tone: 'warn',
          title: '请先收功',
          message: '这个任务还有计时正在进行，收功后再标记完成。',
        });
        return;
      }
      const xp = taskCompletionXp(task);
      const firstReward = !task.completionRewardedAt;
      const previousStage = growthSummary(data).stage.current.id;
      const goal = task.goalId ? data.goals.find((item) => item.id === task.goalId) : undefined;
      commit((draft) => {
        const current = findTask(draft, taskId);
        if (!current) return;
        current.status = 'done';
        current.progress = 100;
        current.completedAt = nowIso();
        current.updatedAt = nowIso();
        if (!current.completionRewardedAt) {
          current.completionRewardedAt = current.completedAt;
          current.xpEarned += xp;
          grantXp(draft, xp, `任务完成 · ${current.title}`, 'task', { taskId });
        }
      }, { notifyXp: false });
      if (firstReward) {
        const summary = growthSummary(get().data);
        set({
          growthStamp: {
            title: '能力证据已归档',
            detail: task.title,
            skill: goal?.title,
            evidenceCount: summary.evidenceCount,
            stage: summary.stage.current.name,
            nextStage: summary.stage.next?.name,
            progress: summary.stage.progress,
          },
        });
      }
      pushToast({
        tone: 'success',
        title: '任务完成',
        message: firstReward
          ? `「${task.title}」已归档为能力证据${previousStage !== growthSummary(get().data).stage.current.id ? ' · 成长阶段已推进' : ''}`
          : `「${task.title}」已完成`,
      });
    },

    addPhase: (taskId, input) => {
      commit((draft) => {
        const task = findTask(draft, taskId);
        if (!task) return;
        task.phases.push(createPhase(input, task.phases.length));
        task.phases = sortPhases(task.phases);
        task.updatedAt = nowIso();
      });
      pushToast({ tone: 'success', title: '阶段已添加' });
    },

    updatePhase: (taskId, phaseId, patch) => {
      commit((draft) => {
        const task = findTask(draft, taskId);
        const phase = task?.phases.find((p) => p.id === phaseId);
        if (!task || !phase) return;
        if (patch.title !== undefined && patch.title.trim()) phase.title = patch.title.trim();
        if (patch.note !== undefined) phase.note = patch.note.trim() || undefined;
        if (patch.estimatedMinutes !== undefined) {
          phase.estimatedMinutes = Math.max(0, Math.round(patch.estimatedMinutes));
        }
        if (patch.dueDate !== undefined) phase.dueDate = patch.dueDate || undefined;
        task.updatedAt = nowIso();
      });
      pushToast({ tone: 'success', title: '阶段已更新' });
    },

    togglePhase: (taskId, phaseId) => {
      const task = findTask(get().data, taskId);
      const phase = task?.phases.find((p) => p.id === phaseId);
      if (!task || !phase) return;
      const completing = phase.status !== 'done';
      const firstReward = completing && !phase.rewardedAt;
      commit((draft) => {
        const current = findTask(draft, taskId);
        const target = current?.phases.find((p) => p.id === phaseId);
        if (!current || !target) return;
        if (completing) {
          target.status = 'done';
          target.completedAt = nowIso();
          if (!target.startedAt) target.startedAt = nowIso();
          if (!target.rewardedAt) {
            target.rewardedAt = target.completedAt;
            current.xpEarned += XP.phase;
            grantXp(draft, XP.phase, `阶段完成 · ${target.title}`, 'phase', { taskId });
          }
        } else {
          target.status = 'todo';
          target.completedAt = undefined;
        }
        current.updatedAt = nowIso();
      }, { notifyXp: false });
      if (completing) {
        pushToast({
          tone: 'success',
          title: '阶段完成',
          message: firstReward ? '阶段证据已归档' : '这个阶段此前已经归档过',
        });
        const fresh = findTask(get().data, taskId);
        if (fresh && fresh.phases.length > 0 && fresh.phases.every((p) => p.status === 'done')) {
          pushToast({
            tone: 'info',
            title: '所有阶段都完成了',
            message: '如果任务已经交付，现在可以把它标记为完成。',
          });
        }
      }
    },

    deletePhase: (taskId, phaseId) => {
      commit((draft) => {
        const task = findTask(draft, taskId);
        if (!task) return;
        task.phases = task.phases.filter((p) => p.id !== phaseId).map((p, i) => ({ ...p, order: i }));
        task.updatedAt = nowIso();
      });
      pushToast({ tone: 'info', title: '阶段已删除' });
    },

    submitReport: (taskId, input, opts = {}) => {
      const validation = validateReport(input);
      if (!validation.ok) return { ...validation, submitted: false };
      const data = get().data;
      const task = findTask(data, taskId);
      if (!task) return { ...validation, ok: false, submitted: false };
      const existing = task.report;
      const report = existing ? reviseReport(existing, input) : createReport(input);
      commit((draft) => {
        const current = findTask(draft, taskId);
        if (!current) return;
        applyReportToTask(
          current,
          report,
          { phases: opts.createPhases ? (current.phases.length > 0 ? 'append' : 'replace') : 'none' },
        );
        current.report = report;
        current.estimatedMinutes = report.calibratedMinutes;
        current.updatedAt = nowIso();
        if (!existing) {
          current.xpEarned += XP.report;
          grantXp(draft, XP.report, `调查报告 · ${current.title}`, 'report', { taskId });
        }
      }, { notifyXp: false });
      set({ modal: { kind: 'none' } });
      pushToast({
        tone: 'success',
        title: existing ? '侦查报告已修订' : '侦查报告已归档',
        message: existing
          ? `评分 ${report.score} · 预计用时已校准为 ${report.calibratedMinutes} 分钟`
          : `评分 ${report.score} · 启程证据已归档`,
      });
      if (opts.createPhases) {
        pushToast({
          tone: 'info',
          title: '学习路径已沉淀为阶段',
          message: '可以在任务详情里调整顺序与预计时间。',
        });
      }
      if (opts.startAfterSubmit) {
        get().startTimer(taskId);
      }
      return { ...validation, submitted: true };
    },

    addGoal: (input) => {
      const goal = createGoal(input);
      commit((draft) => {
        draft.goals.unshift(goal);
      });
      set({ goalDetailId: goal.id, modal: { kind: 'none' } });
      pushToast({ tone: 'success', title: '大目标已立下', message: '接下来，把知识点一颗颗点亮。' });
    },

    updateGoal: (goalId, patch) => {
      commit((draft) => {
        const goal = draft.goals.find((g) => g.id === goalId);
        if (!goal) return;
        if (patch.title !== undefined && patch.title.trim()) goal.title = patch.title.trim();
        if (patch.description !== undefined) goal.description = patch.description.trim();
        if (patch.motto !== undefined) goal.motto = patch.motto.trim() || undefined;
        if (patch.color !== undefined) goal.color = patch.color;
        if (patch.deadline !== undefined) goal.deadline = patch.deadline || undefined;
      });
      set({ modal: { kind: 'none' } });
      pushToast({ tone: 'success', title: '大目标已更新' });
    },

    deleteGoal: (goalId) => {
      commit((draft) => {
        draft.goals = draft.goals.filter((g) => g.id !== goalId);
        for (const task of draft.tasks) {
          if (task.goalId === goalId) task.goalId = undefined;
        }
      });
      set({ goalDetailId: null, modal: { kind: 'none' } });
      pushToast({ tone: 'info', title: '大目标已删除', message: '关联任务已保留。' });
    },

    addKnowledgePoint: (goalId, input) => {
      const point = createKnowledgePoint(input);
      commit((draft) => {
        const goal = draft.goals.find((g) => g.id === goalId);
        if (!goal) return;
        goal.knowledgePoints.push(point);
      });
      set({ modal: { kind: 'none' } });
      pushToast({ tone: 'success', title: '知识点已添加', message: '去星图里点亮它。' });
    },

    updateKnowledgePoint: (goalId, pointId, patch) => {
      commit((draft) => {
        const goal = draft.goals.find((g) => g.id === goalId);
        const point = goal?.knowledgePoints.find((p) => p.id === pointId);
        if (!goal || !point) return;
        if (patch.title !== undefined && patch.title.trim()) point.title = patch.title.trim();
        if (patch.note !== undefined) point.note = patch.note.trim() || undefined;
        if (patch.estimatedMinutes !== undefined) {
          point.estimatedMinutes = Math.max(0, Math.round(patch.estimatedMinutes)) || undefined;
        }
        if (patch.taskId !== undefined) point.taskId = patch.taskId || undefined;
      });
      set({ modal: { kind: 'none' } });
      pushToast({ tone: 'success', title: '知识点已更新' });
    },

    deleteKnowledgePoint: (goalId, pointId) => {
      commit((draft) => {
        const goal = draft.goals.find((g) => g.id === goalId);
        if (!goal) return;
        goal.knowledgePoints = goal.knowledgePoints.filter((p) => p.id !== pointId);
      });
      set({ modal: { kind: 'none' } });
      pushToast({ tone: 'info', title: '知识点已删除' });
    },

    lightKnowledgePoint: (goalId, pointId) => {
      const data = get().data;
      const goal = data.goals.find((g) => g.id === goalId);
      const point = goal?.knowledgePoints.find((p) => p.id === pointId);
      if (!goal || !point || point.status === 'lit') return;
      let goalCompleted = false;
      commit((draft) => {
        const current = draft.goals.find((g) => g.id === goalId);
        const target = current?.knowledgePoints.find((p) => p.id === pointId);
        if (!current || !target) return;
        target.status = 'lit';
        target.litAt = nowIso();
        grantXp(draft, target.xp, `点亮 · ${target.title}`, 'knowledge');
        const allLit = current.knowledgePoints.every((p) => p.status === 'lit');
        if (allLit && !current.completedAt) {
          current.completedAt = nowIso();
          grantXp(draft, XP.goal, `大目标达成 · ${current.title}`, 'goal');
          goalCompleted = true;
        }
      }, { notifyXp: false });
      if (goalCompleted) {
        const summary = growthSummary(get().data);
        set({
          growthStamp: {
            title: '技能树完成',
            detail: goal.title,
            skill: goal.title,
            evidenceCount: summary.evidenceCount,
            stage: summary.stage.current.name,
            nextStage: summary.stage.next?.name,
            progress: summary.stage.progress,
          },
        });
      }
      pushToast({
        tone: 'achievement',
        title: `知识点证据 · ${point.title}`,
        message: goalCompleted ? '整棵技能树已经点亮。' : '又一条证据留在了技能树上。',
      });
    },

    startTimer: (taskId) => {
      const data = get().data;
      const task = findTask(data, taskId);
      if (!task) return;
      if (task.status === 'done' || task.status === 'archived') {
        pushToast({ tone: 'warn', title: '这个任务已经结束了', message: '重新开启后才能继续计时。' });
        return;
      }
      if (!task.report || task.report.score <= 0) {
        set({ modal: { kind: 'report', taskId, startAfterSubmit: true } });
        pushToast({
          tone: 'warn',
          title: '先侦查，再启程',
          message: '开始计时前，请提交一份调查报告：学什么、怎么学、不学什么。',
        });
        return;
      }
      const existing = data.activeTimers.find((t) => t.taskId === taskId);
      if (existing) {
        if (existing.pausedAt) get().resumeTimer(existing.id);
        else set({ focusTimerId: existing.id });
        return;
      }
      const otherTimer = data.activeTimers.find((t) => t.taskId !== taskId);
      if (otherTimer) {
        const otherTask = findTask(data, otherTimer.taskId);
        pushToast({
          tone: 'warn',
          title: '人不能一心二用',
          message: `「${otherTask?.title ?? '另一个任务'}」的计时还在。先收功或继续它，再开始新的专注。`,
        });
        return;
      }
      const timer = createTimer(taskId);
      commit((draft) => {
        const current = findTask(draft, taskId);
        if (!current) return;
        draft.activeTimers.push(timer);
        if (current.status === 'backlog') current.status = 'active';
        current.updatedAt = nowIso();
      }, { silent: true });
      set({ focusTimerId: timer.id });
      void get().saveNow();
    },

    pauseTimer: (timerId) => {
      commit((draft) => {
        const index = draft.activeTimers.findIndex((t) => t.id === timerId);
        if (index < 0) return;
        const timer = draft.activeTimers[index]!;
        draft.activeTimers[index] = pauseTimerCore(timer);
      }, { silent: true });
      void get().saveNow();
      pushToast({ tone: 'info', title: '已暂停', message: '计时保留，随时继续。' });
    },

    resumeTimer: (timerId) => {
      const data = get().data;
      const timer = data.activeTimers.find((t) => t.id === timerId);
      if (!timer) return;
      const otherTimer = data.activeTimers.find((t) => t.id !== timerId);
      if (otherTimer) {
        pushToast({
          tone: 'warn',
          title: '人不能一心二用',
          message: '已经有一个任务在计时。先收功它，再继续这个任务。',
        });
        return;
      }
      commit((draft) => {
        const index = draft.activeTimers.findIndex((t) => t.id === timerId);
        if (index < 0) return;
        const current = draft.activeTimers[index]!;
        draft.activeTimers[index] = resumeTimerCore(current);
      }, { silent: true });
      set({ focusTimerId: timerId });
      void get().saveNow();
    },

    stopTimer: (timerId, note) => {
      const data = get().data;
      const timer = data.activeTimers.find((t) => t.id === timerId);
      if (!timer) return;
      const task = findTask(data, timer.taskId);
      const parallel = 1;
      const settlement = settleTimer(timer, parallel);
      if (settlement.seconds < 5) {
        commit((draft) => {
          draft.activeTimers = draft.activeTimers.filter((t) => t.id !== timerId);
        }, { silent: true });
        set((state) => ({ focusTimerId: state.focusTimerId === timerId ? null : state.focusTimerId }));
        pushToast({ tone: 'info', title: '时间太短，未记录', message: '至少专注 5 秒才会留下记录。' });
        return;
      }
      const xp = focusXp(settlement.seconds);
      const previousStage = growthSummary(data).stage.current.id;
      let dailyGoalHit = false;
      commit((draft) => {
        draft.activeTimers = draft.activeTimers.filter((t) => t.id !== timerId);
        const current = findTask(draft, timer.taskId);
        if (current) {
          draft.sessions.push({
            id: makeId('s_'),
            taskId: current.id,
            taskTitle: current.title,
            startedAt: settlement.startedAt,
            endedAt: settlement.endedAt,
            seconds: settlement.seconds,
            parallel,
            xp,
            note: note?.trim() || timer.note,
          });
          current.totalFocusSeconds += settlement.seconds;
          current.sessionCount += 1;
          current.xpEarned += xp;
          current.updatedAt = nowIso();
          if (current.status === 'backlog') current.status = 'active';
        }
        grantXp(draft, xp, `专注 · ${task?.title ?? '任务'}`, 'focus', {
          taskId: timer.taskId,
        });
        const day = todayKey();
        if (!draft.rewards.dailyGoalAwards.includes(day)) {
          const secondsToday = draft.sessions
            .filter((s) => dayKey(s.endedAt) === day)
            .reduce((sum, s) => sum + s.seconds, 0);
          if (secondsToday >= draft.settings.dailyGoalMinutes * 60) {
            draft.rewards.dailyGoalAwards.push(day);
            grantXp(draft, XP.dailyGoal, '每日目标达成', 'daily');
            dailyGoalHit = true;
          }
        }
      }, { notifyXp: false });
      set((state) => ({ focusTimerId: state.focusTimerId === timerId ? null : state.focusTimerId }));
      void get().saveNow();
      const summary = growthSummary(get().data);
      const minutes = Math.max(1, Math.round(settlement.seconds / 60));
      if (summary.stage.current.id !== previousStage) {
        set({
          growthStamp: {
            title: '成长阶段已推进',
            detail: `专注 ${minutes} 分钟 · ${task?.title ?? '任务'}`,
            skill: task?.goalId ? get().data.goals.find((goal) => goal.id === task.goalId)?.title : undefined,
            evidenceCount: summary.evidenceCount,
            stage: summary.stage.current.name,
            nextStage: summary.stage.next?.name,
            progress: summary.stage.progress,
          },
        });
      } else {
        pushToast({
          tone: 'xp',
          title: `证据已归档 · 第 ${summary.evidenceCount} 条`,
          message: `专注 ${minutes} 分钟 · ${task?.title ?? '任务'}`,
        });
      }
      if (dailyGoalHit) {
        pushToast({
          tone: 'achievement',
          title: '今日目标达成',
          message: '今天的时间没有白过。证据链继续延伸。',
        });
      }
    },

    discardTimer: (timerId) => {
      commit((draft) => {
        draft.activeTimers = draft.activeTimers.filter((t) => t.id !== timerId);
      }, { silent: true });
      set((state) => ({ focusTimerId: state.focusTimerId === timerId ? null : state.focusTimerId }));
      pushToast({ tone: 'info', title: '已放弃本次计时' });
    },

    pauseTimersAt: (atIso, reason = 'suspend') => {
      const when = new Date(atIso);
      if (Number.isNaN(when.getTime())) return;
      const hasRunning = get().data.activeTimers.some((timer) => !timer.pausedAt);
      if (!hasRunning) return;
      commit(
        (draft) => {
          draft.activeTimers = draft.activeTimers.map((timer) =>
            timer.pausedAt ? timer : pauseTimerCore(timer, when),
          );
        },
        { silent: true },
      );
      set({ focusTimerId: null });
      void get().saveNow();
      pushToast({
        tone: 'info',
        title: '计时已自动暂停',
        message:
          reason === 'lock-screen'
            ? '检测到系统锁屏，断开的时间不会计入专注。回来后点击继续即可。'
            : '检测到系统休眠，断开的时间不会计入专注。回来后点击继续即可。',
      });
    },

    heartbeat: () => {
      if (!get().ready) return;
      const now = new Date();
      set((state) => {
        if (!state.data.activeTimers.some((t) => !t.pausedAt)) return {};
        const data = produce(state.data, (draft) => {
          draft.activeTimers = draft.activeTimers.map((timer) =>
            timer.pausedAt ? timer : heartbeatTimer(timer, now),
          );
          draft.meta.lastSavedAt = nowIso(now);
        });
        return { data };
      });
    },

    exportData: async () => {
      const data = get().data;
      if (isDesktop() && window.yolo) {
        const result = await window.yolo.exportData(data);
        if (result.ok) {
          pushToast({ tone: 'success', title: '数据已导出', message: result.path });
        } else if (!result.canceled) {
          pushToast({ tone: 'error', title: '导出失败', message: result.error });
        }
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `yolo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast({ tone: 'success', title: '数据已导出' });
    },

    importData: async () => {
      if (!isDesktop() || !window.yolo) {
        pushToast({ tone: 'warn', title: '浏览器预览不支持导入', message: '请在 Linux 桌面端使用。' });
        return;
      }
      const result = await window.yolo.importData();
      if (!result.ok) {
        if (!result.canceled) {
          pushToast({ tone: 'error', title: '导入失败', message: result.error });
        }
        return;
      }
      const migrated = migrateData(result.data);
      if (!migrated) {
        pushToast({ tone: 'error', title: '无法识别的数据文件' });
        return;
      }
      const recovered = recoverTimers(migrated.activeTimers);
      migrated.activeTimers = recovered.timers;
      applyTheme(migrated.settings.theme, migrated.settings.customTheme, migrated.settings.skinTone);
      set({
        data: migrated,
        ready: true,
        modal: { kind: 'none' },
        taskDetailId: null,
        goalDetailId: null,
        focusTimerId: null,
        view: 'today',
      });
      pushToast({
        tone: 'success',
        title: '数据已导入',
        message: `${migrated.tasks.length} 个任务 · ${migrated.sessions.length} 条专注记录`,
      });
    },

    resetData: (mode) => {
      const name = get().data.profile.name;
      const previousAi = get().data.ai;
      const previousLanguage = get().data.settings.language;
      const fresh = mode === 'sample' ? createSampleData(name || '行者') : createInitialData();
      fresh.ai = { ...previousAi };
      fresh.settings.language = previousLanguage;
      if (mode === 'empty') fresh.meta.onboarded = false;
      applyTheme(fresh.settings.theme, fresh.settings.customTheme, fresh.settings.skinTone);
      set({
        data: fresh,
        modal: { kind: 'none' },
        taskDetailId: null,
        goalDetailId: null,
        focusTimerId: null,
            growthStamp: null,
        view: 'today',
      });
      pushToast({
        tone: 'info',
        title: mode === 'sample' ? '示例数据已重新载入' : '已清空，重新开始',
        message: mode === 'sample' ? '可以随意练习。' : '这一次，只留下真正重要的事。',
      });
    },

    saveNow: async () => {
      const data = get().data;
      set({ saving: true });
      try {
        if (isDesktop() && window.yolo) {
          const result = await window.yolo.saveData(data);
          if (!result.ok) throw new Error(result.error ?? '保存失败');
        } else {
          writeBrowserData(data);
        }
        set({ saving: false, lastSavedAt: nowIso() });
      } catch (error) {
        set({ saving: false });
        pushToast({ tone: 'error', title: '保存失败', message: String(error) });
      }
    },
  };
});

/** 去抖持久化：订阅数据变化，避免每个心跳都同步写盘 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistenceStarted = false;

export function startPersistence(): void {
  if (persistenceStarted) return;
  persistenceStarted = true;
  useAppStore.subscribe((state, previous) => {
    if (!state.ready || state.data === previous.data) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void useAppStore.getState().saveNow();
    }, 450);
  });
}

/** 关闭窗口前尽力同步一次 */
export function flushPersistence(): void {
  const data = useAppStore.getState().data;
  if (isDesktop() && window.yolo) {
    void window.yolo.saveData(data);
  } else {
    writeBrowserData(data);
  }
}

export function useTaskById(taskId: string | null | undefined): Task | undefined {
  return useAppStore((state) => (taskId ? state.data.tasks.find((t) => t.id === taskId) : undefined));
}

export function useGoalById(goalId: string | null | undefined): Goal | undefined {
  return useAppStore((state) => (goalId ? state.data.goals.find((g) => g.id === goalId) : undefined));
}

export function priorityWeight(priority: TaskPriority): number {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

export function activeTimerForTask(timers: ActiveTimer[], taskId: string): ActiveTimer | undefined {
  return timers.find((t) => t.taskId === taskId);
}

export function accuracyOf(task: Task): number | null {
  return estimateAccuracy(task);
}
