/// <reference path="../../../packages/desktop-ui/src/types/yolo.d.ts" />

/**
 * Android / Web 平台桥：
 * 实现与桌面端相同的 window.yolo 契约，让共享 UI 无需区分平台。
 * - 原生：Capacitor Preferences 存储、Share/Filesystem 导出、系统文件选择器导入
 * - Web：localStorage + 浏览器下载（方便 Vite 预览与 Playwright 验收）
 */
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';

const DATA_KEY = 'yolo-data-v1';
const AI_KEY = 'yolo-ai-key';
const BACKUP_KEY = 'yolo-data-backup-v1';
const native = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();
const ios = platform === 'ios';
const isDemo =
  new URLSearchParams(window.location.search).get('demo') === '1' ||
  window.localStorage.getItem('yolo-demo') === '1';

interface SecureKeyPlugin {
  get: () => Promise<{ value: string | null }>;
  set: (options: { value: string }) => Promise<{ ok: boolean }>;
  remove: () => Promise<{ ok: boolean }>;
}

const SecureKey = registerPlugin<SecureKeyPlugin>('SecureKey');

function validateEndpoint(raw: string): string {
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('API Base URL 必须使用 HTTPS');
  const local = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (url.protocol === 'http:' && !local.has(url.hostname)) {
    throw new Error('远程 API Base URL 必须使用 HTTPS；只有本机地址允许 HTTP');
  }
  if (url.username || url.password) throw new Error('API Base URL 不能包含账号密码');
  return url.toString();
}

async function secureGetKey(): Promise<YoloAiKeyResult> {
  try {
    if (native && !ios) {
      const result = await SecureKey.get();
      return { ok: true, value: result.value ?? null, secure: true };
    }
    if (ios) {
      const result = await Preferences.get({ key: AI_KEY });
      return { ok: true, value: result.value ?? null, secure: false };
    }
    return { ok: true, value: window.localStorage.getItem(AI_KEY), secure: false };
  } catch (error) {
    return { ok: false, value: null, secure: native, error: String(error) };
  }
}

async function secureSetKey(value: string): Promise<{ ok: boolean; secure: boolean; error?: string }> {
  const key = value.trim();
  if (!key) return secureDeleteKey();
  try {
    if (native && !ios) {
      await SecureKey.set({ value: key });
      return { ok: true, secure: true };
    }
    if (ios) {
      await Preferences.set({ key: AI_KEY, value: key });
      return { ok: true, secure: false };
    }
    window.localStorage.setItem(AI_KEY, key);
    return { ok: true, secure: false };
  } catch (error) {
    return { ok: false, secure: false, error: String(error) };
  }
}

async function secureDeleteKey(): Promise<{ ok: boolean; secure: boolean; error?: string }> {
  try {
    if (native && !ios) {
      await SecureKey.remove();
      return { ok: true, secure: true };
    }
    if (ios) {
      await Preferences.remove({ key: AI_KEY });
      return { ok: true, secure: false };
    }
    window.localStorage.removeItem(AI_KEY);
    return { ok: true, secure: false };
  } catch (error) {
    return { ok: false, secure: false, error: String(error) };
  }
}

function extractContent(data: unknown): string {
  const json = data as {
    choices?: { message?: { content?: unknown; reasoning_content?: unknown }; text?: string; finish_reason?: string }[];
    content?: { text?: string }[];
    output_text?: string;
    response?: string;
    error?: { message?: string };
  };
  const choice = json?.choices?.[0];
  const message = choice?.message;
  const content = message?.content;
  if (typeof content === 'string' && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part === 'string' ? part : typeof (part as { text?: string })?.text === 'string' ? (part as { text: string }).text : ''))
      .join('');
    if (joined.trim()) return joined;
  }
  if (typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()) {
    return message.reasoning_content;
  }
  if (typeof choice?.text === 'string' && choice.text.trim()) return choice.text;
  if (Array.isArray(json?.content)) {
    const joined = json.content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
    if (joined.trim()) return joined;
  }
  if (typeof json?.output_text === 'string' && json.output_text.trim()) return json.output_text;
  if (typeof json?.response === 'string' && json.response.trim()) return json.response;
  return '';
}

function emptyReason(data: unknown): string {
  const json = data as {
    error?: { message?: string };
    choices?: { message?: Record<string, unknown>; finish_reason?: string }[];
  };
  if (json?.error?.message) return `API 错误：${String(json.error.message).slice(0, 240)}`;
  const choice = json?.choices?.[0];
  if (!choice) return '响应里没有 choices 字段，可能不是 OpenAI-compatible 的 chat/completions 接口';
  const messageKeys = choice.message && typeof choice.message === 'object' ? Object.keys(choice.message) : [];
  if (choice.finish_reason === 'length') {
    return '输出被 max_tokens 截断，模型没有留下最终文本；可换用非推理模型或提高 max_tokens';
  }
  if (messageKeys.includes('reasoning_content') && !choice.message?.content) {
    return '模型只返回了 reasoning_content，没有最终 content；请换用非推理模型，或检查该接口是否兼容 chat/completions';
  }
  return `choices[0].message.content 为空（finish_reason=${choice.finish_reason ?? 'unknown'}，字段=${messageKeys.join(',') || 'none'}）`;
}

function extractSse(raw: string): string {
  const chunks: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const content = extractContent(JSON.parse(payload));
      if (content) chunks.push(content);
    } catch {
      /* 忽略非 JSON 的 SSE 行 */
    }
  }
  return chunks.join('');
}

async function aiComplete(input: YoloAiCompleteInput): Promise<YoloAiCompleteResult> {
  const keyResult = await secureGetKey();
  if (!keyResult.ok) return { ok: false, error: keyResult.error || '读取 API Key 失败' };
  let endpoint: string;
  try {
    endpoint = validateEndpoint(input.endpoint);
  } catch (error) {
    return { ok: false, error: String((error as Error).message || error) };
  }
  const isLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(endpoint).hostname);
  if (!keyResult.value && !isLocal) {
    return { ok: false, error: '还没有填写 API Key' };
  }
  if (!input.model?.trim()) return { ok: false, error: '还没有填写模型名称' };
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    return { ok: false, error: '请求缺少上下文' };
  }
  const timeout = Math.min(120000, Math.max(10000, Number(input.timeoutMs) || 90000));
  const body = {
    model: input.model.trim(),
    messages: input.messages.slice(0, 20).map((message) => ({
      role: message.role,
      content: String(message.content ?? '').slice(0, 30000),
    })),
    temperature: Number.isFinite(input.temperature) ? input.temperature : 0.2,
    max_tokens: Math.min(8192, Math.max(16, Number(input.maxTokens) || 4096)),
    stream: false,
  };
  // DeepSeek 默认开启思考模式；结构化评估必须关掉，否则推理 token 会吃光 max_tokens。
  if (/^deepseek-/i.test(body.model)) {
    (body as Record<string, unknown>).thinking = { type: 'disabled' };
    (body as Record<string, unknown>).reasoning_effort = 'none';
  }
  try {
    if (native) {
      const response = await CapacitorHttp.post({
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...(keyResult.value ? { Authorization: `Bearer ${keyResult.value}` } : {}),
        },
        data: body,
        connectTimeout: 15000,
        readTimeout: timeout,
      });
      const data =
        typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      if (response.status < 200 || response.status >= 300) {
        const message = data?.error?.message ?? `HTTP ${response.status}`;
        return { ok: false, status: response.status, error: `API 返回 ${response.status}：${message}` };
      }
      let content = extractContent(data);
      if (!content && typeof response.data === 'string' && response.data.includes('data:')) {
        content = extractSse(response.data);
      }
      return content
        ? { ok: true, status: response.status, content }
        : { ok: false, status: response.status, error: `API 返回 ${response.status}，但没有文本内容：${emptyReason(data)}` };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(keyResult.value ? { Authorization: `Bearer ${keyResult.value}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        /* 非 JSON 错误响应 */
      }
      if (!response.ok) {
        const message = data?.error?.message ?? raw.slice(0, 240) ?? `HTTP ${response.status}`;
        return { ok: false, status: response.status, error: `API 返回 ${response.status}：${message}` };
      }
      let content = extractContent(data);
      if (!content && raw.includes('data:')) content = extractSse(raw);
      return content
        ? { ok: true, status: response.status, content }
        : { ok: false, status: response.status, error: `API 返回 ${response.status}，但没有文本内容：${emptyReason(data)}` };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return { ok: false, error: `请求超时（${Math.round(timeout / 1000)} 秒）` };
    }
    return { ok: false, error: `网络请求失败：${String((error as Error)?.message || error)}` };
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  return JSON.parse(raw);
}

function downloadInBrowser(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `yolo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadData(): Promise<YoloLoadResult> {
  if (!native) {
    try {
      const main = window.localStorage.getItem(DATA_KEY);
      if (main) return { ok: true, data: parseJson(main), path: 'localStorage' };
      const backup = window.localStorage.getItem(BACKUP_KEY);
      return {
        ok: true,
        data: parseJson(backup),
        path: 'localStorage',
        recoveredFromBackup: Boolean(backup),
      };
    } catch (error) {
      return { ok: false, data: null, path: 'localStorage', error: String(error) };
    }
  }
  try {
    const main = await Preferences.get({ key: DATA_KEY });
    if (main.value) {
      try {
        return { ok: true, data: parseJson(main.value), path: 'Preferences' };
      } catch (error) {
        const backup = await Preferences.get({ key: BACKUP_KEY });
        return {
          ok: true,
          data: parseJson(backup.value),
          path: 'Preferences',
          recoveredFromBackup: Boolean(backup.value),
          error: String(error),
        };
      }
    }
    const backup = await Preferences.get({ key: BACKUP_KEY });
    return {
      ok: true,
      data: parseJson(backup.value),
      path: 'Preferences',
      recoveredFromBackup: Boolean(backup.value),
    };
  } catch (error) {
    return { ok: false, data: null, path: 'Preferences', error: String(error) };
  }
}

async function saveData(data: unknown): Promise<{
  ok: boolean;
  path?: string;
  savedAt?: string;
  error?: string;
}> {
  const text = JSON.stringify(data);
  try {
    if (native) {
      const previous = await Preferences.get({ key: DATA_KEY });
      if (previous.value) await Preferences.set({ key: BACKUP_KEY, value: previous.value });
      await Preferences.set({ key: DATA_KEY, value: text });
      return { ok: true, path: 'Preferences', savedAt: new Date().toISOString() };
    }
    const previous = window.localStorage.getItem(DATA_KEY);
    if (previous) window.localStorage.setItem(BACKUP_KEY, previous);
    window.localStorage.setItem(DATA_KEY, text);
    return { ok: true, path: 'localStorage', savedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function exportData(data: unknown): Promise<YoloExportResult> {
  const fileName = `yolo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (!native) {
    downloadInBrowser(data);
    return { ok: true, path: fileName };
  }
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: JSON.stringify(data, null, 2),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: '导出「你只活一次」备份',
      text: '备份文件包含任务、报告、专注记录与攀登值。',
      files: [result.uri],
      dialogTitle: '导出备份',
    });
    return { ok: true, path: fileName };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function exportText(fileName: string, content: string): Promise<YoloExportResult> {
  if (!native) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true, path: fileName };
  }
  try {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: fileName,
      text: 'YOLO 学习计划',
      files: [result.uri],
      dialogTitle: '导出学习计划',
    });
    return { ok: true, path: fileName };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function importData(): Promise<YoloImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        input.remove();
        resolve({ ok: false, canceled: true });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve({ ok: true, data: parseJson(String(reader.result)), path: file.name });
        } catch (error) {
          resolve({ ok: false, error: String(error) });
        } finally {
          input.remove();
        }
      };
      reader.onerror = () => {
        resolve({ ok: false, error: String(reader.error) });
        input.remove();
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

async function appInfo(): Promise<YoloAppInfo> {
  let version = '0.1.0';
  try {
    const info = await CapacitorApp.getInfo();
    version = info.version || version;
  } catch {
    /* 浏览器预览没有原生 App 信息 */
  }
  const chrome = navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? '';
  return {
    appVersion: version,
    electronVersion: '',
    chromeVersion: chrome,
    nodeVersion: '',
    platform,
    arch: '',
    dataPath: native ? '应用私有存储 · Preferences' : 'localStorage（Web 预览）',
    configDir: '',
    demo: isDemo,
    isDev: !native,
  };
}

export function installMobileBridge(): void {
  window.yolo = {
    isDesktop: false,
    platform,
    loadData,
    saveData,
    dataPath: async () => (native ? 'Preferences: yolo-data-v1' : 'localStorage: yolo-data-v1'),
    exportData,
    exportText,
    importData,
    appInfo,
    openExternal: async (url) => {
      if (!/^https?:\/\//i.test(url)) return { ok: false };
      if (native) {
        await Browser.open({ url });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return { ok: true };
    },
    openDataFolder: async () => {
      if (native) {
        await Share.share({
          title: '数据位置',
          text: '数据保存在应用私有存储（Preferences）中。可在设置中导出 JSON 备份，再保存到文件或分享给其他设备。',
          dialogTitle: '数据位置',
        });
      } else {
        window.alert('Web 预览的数据保存在浏览器 localStorage 中。');
      }
      return { ok: true };
    },
    quit: async () => {
      await CapacitorApp.exitApp();
      return { ok: true };
    },
    minimize: async () => {
      await CapacitorApp.minimizeApp();
      return { ok: true };
    },
    ai: {
      secureGetKey,
      secureSetKey,
      secureDeleteKey,
      complete: aiComplete,
    },
    onPowerSuspend: (callback) => {
      // Android：锁屏/切到后台是专注的常态，计时按真实时间继续。
      // 前台服务/常驻通知接入前，应用进程存活期间由 JavaScript 计时；
      // 进程被系统杀死时，重启后恢复到最后一个心跳，不虚增。
      if (!native) {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            callback({ at: new Date().toISOString(), reason: 'suspend' });
          }
        });
      }
    },
  };
}
