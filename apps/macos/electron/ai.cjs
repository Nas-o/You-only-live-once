/**
 * 学习助理的安全边界：
 * - API Key 只存在主进程，不进入渲染层；
 * - 优先使用 safeStorage；系统没有钥匙串时退化为仅本地编码，并在 UI 明确提示；
 * - 网络请求由主进程发出，避免 CORS，也不把 Key 暴露给页面脚本。
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

function createAiBridge({ configRoot, safeStorage, ipcMain }) {
  const secretFile = path.join(configRoot, 'ai-secret.json');

  async function writeSecret(payload) {
    await fsp.mkdir(configRoot, { recursive: true });
    const tmp = `${secretFile}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(payload), { mode: 0o600 });
    await fsp.rename(tmp, secretFile);
  }

  function readSecretFile() {
    try {
      return JSON.parse(fs.readFileSync(secretFile, 'utf8'));
    } catch {
      return null;
    }
  }

  function encryptionAvailable() {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  function strongBackend() {
    if (!encryptionAvailable()) return false;
    try {
      const backend = safeStorage.getSelectedStorageBackend?.();
      // Linux 没有钥匙串时 Electron 会退化为 basic_text，这不算安全存储。
      return backend !== 'basic_text' && backend !== 'unknown';
    } catch {
      return false;
    }
  }

  async function setKey(value) {
    const key = typeof value === 'string' ? value.trim() : '';
    if (!key) return deleteKey();
    if (key.length > 8192) return { ok: false, secure: false, error: 'API Key 过长' };
    try {
      if (encryptionAvailable()) {
        try {
          const encrypted = safeStorage.encryptString(key).toString('base64');
          await writeSecret({ version: 1, mode: 'safeStorage', data: encrypted });
          return { ok: true, secure: strongBackend() };
        } catch {
          /* 钥匙串存在但加解密失败时退回本地模式，并在 UI 提示 */
        }
      }
      // 没有系统钥匙串时仍允许本地使用，但明确标记不安全。
      await writeSecret({ version: 1, mode: 'local', data: Buffer.from(key, 'utf8').toString('base64') });
      return { ok: true, secure: false, error: '系统安全存储不可用，Key 仅做了本地编码' };
    } catch (error) {
      return { ok: false, secure: false, error: `保存 Key 失败：${String(error)}` };
    }
  }

  function getKey() {
    const secret = readSecretFile();
    if (!secret || typeof secret.data !== 'string') {
      return { ok: true, value: null, secure: strongBackend() };
    }
    try {
      if (secret.mode === 'safeStorage') {
        const value = safeStorage.decryptString(Buffer.from(secret.data, 'base64'));
        return { ok: true, value, secure: strongBackend() };
      }
      if (secret.mode === 'local') {
        const value = Buffer.from(secret.data, 'base64').toString('utf8');
        return { ok: true, value, secure: false };
      }
      return { ok: false, value: null, secure: false, error: '未知的 Key 存储格式' };
    } catch (error) {
      return { ok: false, value: null, secure: false, error: `读取 Key 失败：${String(error)}` };
    }
  }

  async function deleteKey() {
    try {
      await fsp.rm(secretFile, { force: true });
      return { ok: true, secure: strongBackend() };
    } catch (error) {
      return { ok: false, secure: false, error: `删除 Key 失败：${String(error)}` };
    }
  }

  function validateEndpoint(raw) {
    let url;
    try {
      url = new URL(String(raw || ''));
    } catch {
      throw new Error('API Base URL 格式不正确');
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('API Base URL 必须使用 HTTPS；本机地址可以使用 HTTP');
    }
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    if (url.protocol === 'http:' && !localHosts.has(url.hostname)) {
      throw new Error('远程 API Base URL 必须使用 HTTPS；只有本机地址允许 HTTP');
    }
    if (url.username || url.password) throw new Error('API Base URL 不能包含账号密码');
    return url.toString();
  }

  function extractContent(json) {
    const choice = json?.choices?.[0];
    const message = choice?.message;
    const content = message?.content;
    if (typeof content === 'string' && content.trim()) return content;
    if (Array.isArray(content)) {
      const joined = content
        .map((part) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''))
        .join('');
      if (joined.trim()) return joined;
    }
    // 一些推理模型把最终答案放在 reasoning_content；先取出，交给 JSON 解析器判断。
    if (typeof message?.reasoning_content === 'string' && message.reasoning_content.trim()) {
      return message.reasoning_content;
    }
    if (typeof choice?.text === 'string' && choice.text.trim()) return choice.text;
    // 兼容 Anthropic 风格的 content 数组；请求体仍然是 OpenAI-compatible。
    if (Array.isArray(json?.content)) {
      const joined = json.content
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('');
      if (joined.trim()) return joined;
    }
    if (typeof json?.output_text === 'string' && json.output_text.trim()) return json.output_text;
    if (typeof json?.response === 'string' && json.response.trim()) return json.response;
    return '';
  }

  function extractSse(raw) {
    const chunks = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const content = extractContent(json);
        if (content) chunks.push(content);
      } catch {
        /* 忽略非 JSON 的 SSE 行 */
      }
    }
    return chunks.join('');
  }

  function emptyReason(json) {
    if (json?.error?.message) return `API 错误：${String(json.error.message).slice(0, 240)}`;
    const choice = json?.choices?.[0];
    if (!choice) {
      return '响应里没有 choices 字段，可能不是 OpenAI-compatible 的 chat/completions 接口';
    }
    const messageKeys = choice.message && typeof choice.message === 'object' ? Object.keys(choice.message) : [];
    if (choice.finish_reason === 'length') {
      return '输出被 max_tokens 截断，模型没有留下最终文本；可换用非推理模型或提高 max_tokens';
    }
    if (messageKeys.includes('reasoning_content') && !choice.message.content) {
      return '模型只返回了 reasoning_content，没有最终 content；请换用非推理模型，或检查该接口是否兼容 chat/completions';
    }
    return `choices[0].message.content 为空（finish_reason=${choice.finish_reason ?? 'unknown'}，字段=${messageKeys.join(',') || 'none'}）`;
  }

  async function complete(input) {
    if (!input || typeof input !== 'object') return { ok: false, error: '请求格式无效' };
    let endpoint;
    try {
      endpoint = validateEndpoint(input.endpoint);
    } catch (error) {
      return { ok: false, error: String(error.message || error) };
    }
    const secret = getKey();
    const isLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(endpoint).hostname);
    if (!secret.ok) return { ok: false, error: secret.error || '读取 API Key 失败' };
    if (!secret.value && !isLocal) {
      return { ok: false, error: '还没有填写 API Key' };
    }
    if (!String(input.model || '').trim()) return { ok: false, error: '还没有填写模型名称' };
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      return { ok: false, error: '请求缺少上下文' };
    }
    const timeoutMs = Math.min(120000, Math.max(10000, Number(input.timeoutMs) || 90000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body = {
        model: String(input.model).trim(),
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
        body.thinking = { type: 'disabled' };
        body.reasoning_effort = 'none';
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret.value ? { Authorization: `Bearer ${secret.value}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let json = null;
      try {
        json = JSON.parse(raw);
      } catch {
        /* 错误响应可能不是 JSON */
      }
      if (!response.ok) {
        const message =
          typeof json?.error?.message === 'string'
            ? json.error.message
            : raw.slice(0, 240) || `HTTP ${response.status}`;
        return {
          ok: false,
          status: response.status,
          error: `API 返回 ${response.status}：${message}`,
        };
      }
      let content = extractContent(json);
      if (!content && raw.includes('data:')) content = extractSse(raw);
      if (!content) {
        return { ok: false, status: response.status, error: `API 返回 ${response.status}，但没有文本内容：${emptyReason(json)}` };
      }
      return { ok: true, status: response.status, content };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { ok: false, error: `请求超时（${Math.round(timeoutMs / 1000)} 秒）` };
      }
      return { ok: false, error: `网络请求失败：${String(error?.message || error)}` };
    } finally {
      clearTimeout(timer);
    }
  }

  ipcMain.handle('ai:secure-get', () => getKey());
  ipcMain.handle('ai:secure-set', (_event, value) => setKey(value));
  ipcMain.handle('ai:secure-delete', () => deleteKey());
  ipcMain.handle('ai:complete', (_event, input) => complete(input));

  return { complete, getKey };
}

module.exports = { createAiBridge };
