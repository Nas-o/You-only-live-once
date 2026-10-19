import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Link2,
  Loader2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Trash2,
} from 'lucide-react';
import type { AiProvider } from '@yolo/core';
import { useAppStore } from '../store/appStore';
import {
  AI_PROVIDERS,
  hasAiConfig,
  isLocalApiUrl,
  providerPreset,
  testAiConnection,
  validateApiUrl,
} from '../lib/ai';

type Status = { tone: 'ok' | 'error' | 'info'; message: string } | null;

export function AiSettingsCard() {
  const data = useAppStore((s) => s.data);
  const saveAiSettings = useAppStore((s) => s.saveAiSettings);
  const [enabled, setEnabled] = useState(data.ai.enabled);
  const [provider, setProvider] = useState<AiProvider>(data.ai.provider);
  const [baseUrl, setBaseUrl] = useState(data.ai.baseUrl);
  const [model, setModel] = useState(data.ai.model);
  const [allowDocs, setAllowDocs] = useState(data.ai.allowDocs);
  const [allowWriting, setAllowWriting] = useState(data.ai.allowWriting);
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState(false);
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const bridge = window.yolo?.ai;

  useEffect(() => {
    let active = true;
    if (!bridge) {
      setStatus({ tone: 'error', message: '当前平台没有接入 AI 桥。' });
      return;
    }
    void bridge.secureGetKey().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setStatus({ tone: 'error', message: result.error ?? '无法读取安全存储。' });
        return;
      }
      setSavedKey(Boolean(result.value));
      setSecure(result.secure);
    });
    return () => {
      active = false;
    };
  }, [bridge]);

  const current = { ...data.ai, enabled, provider, baseUrl, model, allowDocs, allowWriting };

  const saveKeyIfNeeded = async (): Promise<boolean> => {
    if (!apiKey.trim()) return true;
    if (!bridge) {
      setStatus({ tone: 'error', message: '当前平台没有接入 AI 桥。' });
      return false;
    }
    const result = await bridge.secureSetKey(apiKey);
    if (!result.ok) {
      setStatus({ tone: 'error', message: result.error ?? '保存 Key 失败。' });
      return false;
    }
    setSavedKey(true);
    setSecure(result.secure);
    setApiKey('');
    return true;
  };

  const save = async () => {
    setBusy('save');
    setStatus(null);
    try {
      const urlError = baseUrl.trim() ? validateApiUrl(baseUrl) : enabled ? '启用学习助理前需要填写 API Base URL' : null;
      if (urlError) {
        setStatus({ tone: 'error', message: urlError });
        return;
      }
      if (enabled && !model.trim()) {
        setStatus({ tone: 'error', message: '启用学习助理前需要填写模型名称。' });
        return;
      }
      if (!(await saveKeyIfNeeded())) return;
      saveAiSettings({ enabled, provider, baseUrl: baseUrl.trim(), model: model.trim(), allowDocs, allowWriting });
      setStatus({ tone: 'ok', message: '设置已保存。' });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    setStatus(null);
    try {
      const urlError = validateApiUrl(baseUrl);
      if (urlError) {
        setStatus({ tone: 'error', message: urlError });
        return;
      }
      if (!model.trim()) {
        setStatus({ tone: 'error', message: '请先填写模型名称。' });
        return;
      }
      if (!savedKey && !apiKey.trim() && !isLocalApiUrl(baseUrl)) {
        setStatus({ tone: 'error', message: '请先填写并保存 API Key。' });
        return;
      }
      if (!(await saveKeyIfNeeded())) return;
      const content = await testAiConnection({ ...current, baseUrl: baseUrl.trim(), model: model.trim() });
      setStatus({ tone: 'ok', message: `连接成功 · 模型返回「${content.trim().slice(0, 40)}」` });
    } catch (error) {
      setStatus({ tone: 'error', message: String((error as Error).message || error) });
    } finally {
      setBusy(null);
    }
  };

  const clearKey = async () => {
    setBusy('clear');
    setStatus(null);
    try {
      const result = await bridge?.secureDeleteKey();
      if (result && !result.ok) {
        setStatus({ tone: 'error', message: result.error ?? '清除 Key 失败。' });
        return;
      }
      setSavedKey(false);
      setApiKey('');
      setStatus({ tone: 'info', message: 'API Key 已从本机清除。' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="settings-card settings-card-wide ai-settings-card">
      <div className="settings-card-head">
        <div className="settings-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <h2>AI 学习助理</h2>
          <p>只评估学习方案、完成标准和时间估算，不出练习题，也不替你完成任务。</p>
        </div>
        <span className={`save-indicator ${enabled && hasAiConfig(current) ? 'is-on' : ''}`}>
          <span className="live-dot" />
          {enabled ? '已启用' : '未启用'}
        </span>
      </div>

      <div className="ai-settings-body">
        <label className="toggle-line ai-enable-line">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          <span>启用学习助理（只有你点评估时才会发送请求）</span>
        </label>

        <div className="ai-form-grid">
          <label className="field">
            <span className="field-label">
              <Cpu size={13} /> API 服务商
            </span>
            <select
              value={provider}
              onChange={(event) => {
                const next = event.target.value as AiProvider;
                setProvider(next);
                const preset = providerPreset(next);
                if (next !== 'custom') {
                  setBaseUrl(preset.baseUrl);
                  setModel(preset.model);
                }
              }}
            >
              {AI_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} · {item.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">
              <KeyRound size={13} /> API Key
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={savedKey ? '已安全保存；输入新 Key 可替换' : 'sk-...'}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="field-hint">
              {savedKey ? '本机已保存 Key。' : 'Key 不会写进导出的 JSON。'}
            </span>
          </label>

          <label className="field ai-field-wide">
            <span className="field-label">
              <Link2 size={13} /> API Base URL
            </span>
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.deepseek.com"
              spellCheck={false}
            />
            <span className="field-hint">
              填到 /v1 为止，应用会自动补 /chat/completions；也兼容完整地址。远程必须 HTTPS，本机 Ollama 可用 http://127.0.0.1。
            </span>
          </label>

          <label className="field">
            <span className="field-label">模型</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="deepseek-flash"
              spellCheck={false}
            />
            <span className="field-hint">
              DeepSeek 建议使用 deepseek-flash；评估时会自动关闭思考模式，避免推理占满输出预算。
            </span>
          </label>
        </div>

        <div className="ai-permissions">
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={allowDocs}
              onChange={(event) => setAllowDocs(event.target.checked)}
            />
            <span>允许发送学习文档，用于评估理解深度与缺口</span>
          </label>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={allowWriting}
              onChange={(event) => setAllowWriting(event.target.checked)}
            />
            <span>允许发送写作记录，用于校准实际投入</span>
          </label>
        </div>

        <div className="ai-settings-actions">
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy !== null || !bridge}>
            {busy === 'save' ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
            保存设置
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void test()} disabled={busy !== null || !bridge}>
            {busy === 'test' ? <Loader2 size={15} className="spin" /> : <TestTube2 size={15} />}
            测试连接
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={() => void clearKey()}
            disabled={busy !== null || !savedKey || !bridge}
          >
            {busy === 'clear' ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
            清除 Key
          </button>
        </div>

        {!secure && savedKey ? (
          <p className="ai-security-warning">
            当前平台没有系统级钥匙串，Key 只做了本地保存。请仅在可信设备上使用。
          </p>
        ) : (
          <p className="ai-security-note">
            <ShieldCheck size={13} /> Key 只保存在本机安全存储中，不进入导出文件，也不会被写入日志。
          </p>
        )}

        {status ? (
          <p className={`ai-status is-${status.tone}`}>
            {status.tone === 'ok' ? <CheckCircle2 size={14} /> : null}
            {status.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
