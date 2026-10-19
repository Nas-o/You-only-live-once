import { useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  Palette,
  Database,
  Download,
  FolderOpen,
  HardDriveDownload,
  Info,
  Laptop,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { THEMES, formatFullDateCN, growthSummary, timeAgo } from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { AiSettingsCard } from '../components/AiSettingsCard';
import { ThemeEditorModal } from '../components/ThemeEditorModal';

export function SettingsPage() {
  const data = useAppStore((s) => s.data);
  const growth = growthSummary(data);
  const info = useAppStore((s) => s.info);
  const saving = useAppStore((s) => s.saving);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);
  const savePreferences = useAppStore((s) => s.savePreferences);
  const setTheme = useAppStore((s) => s.setTheme);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const resetData = useAppStore((s) => s.resetData);
  const saveNow = useAppStore((s) => s.saveNow);
  const openModal = useAppStore((s) => s.openModal);
  const customTheme = data.settings.customTheme;
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);

  const [name, setName] = useState(data.profile.name);
  const [motto, setMotto] = useState(data.profile.motto);
  const [dailyGoal, setDailyGoal] = useState(data.settings.dailyGoalMinutes);
  const [reduceMotion, setReduceMotion] = useState(data.settings.reduceMotion);
  const [sound, setSound] = useState(data.settings.sound);

  const platformName =
    info?.platform === 'android'
      ? 'Android 移动端'
      : info?.platform === 'win32'
        ? 'Windows 桌面端'
        : info?.platform
          ? 'Linux 桌面端'
          : '浏览器预览';
  const platformLine =
    info?.platform === 'android'
      ? 'Android'
      : info?.platform === 'win32'
        ? 'Windows x64'
        : 'Linux x64';
  const runtimeName = info?.electronVersion
    ? `Electron ${info.electronVersion}`
    : info?.platform === 'android'
      ? 'Capacitor'
      : '浏览器预览';

  const dirty =
    name !== data.profile.name ||
    motto !== data.profile.motto ||
    dailyGoal !== data.settings.dailyGoalMinutes ||
    reduceMotion !== data.settings.reduceMotion ||
    sound !== data.settings.sound;

  const submit = () => {
    savePreferences({
      name,
      motto,
      dailyGoalMinutes: dailyGoal,
      reduceMotion,
      sound,
    });
  };

  return (
    <div className="page-inner settings-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">设置</div>
          <h1>把这里调成适合你的样子</h1>
          <p className="page-lede">
            所有数据都保存在本地。你可以随时导出备份，或重新开始一段更清醒的旅程。
          </p>
        </div>
        {dirty && (
          <button type="button" className="btn btn-primary" onClick={submit}>
            <Save size={16} /> 保存设置
          </button>
        )}
      </header>

      <div className="settings-grid">
        <section className="settings-card settings-card-wide">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Palette size={18} />
            </div>
            <div>
              <h2>界面主题</h2>
              <p>三套内置视觉语言，随时切换；也可以自编辑一套自己的主题。</p>
            </div>
          </div>
          <div className="theme-picker" role="radiogroup" aria-label="界面主题">
            {THEMES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={data.settings.theme === option.id}
                className={`theme-option theme-${option.id} ${
                  data.settings.theme === option.id ? 'is-active' : ''
                }`}
                onClick={() => setTheme(option.id)}
              >
                <span className="theme-preview" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="theme-option-copy">
                  <strong>{option.name}</strong>
                  <small>{option.description}</small>
                </span>
                {data.settings.theme === option.id ? (
                  <span className="theme-option-current">当前</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className={`custom-theme-row ${data.settings.theme === 'custom' ? 'is-active' : ''}`}>
            {customTheme ? (
              <>
                <button
                  type="button"
                  className="custom-theme-main"
                  role="radio"
                  aria-checked={data.settings.theme === 'custom'}
                  onClick={() => setTheme('custom')}
                >
                  <span className="custom-theme-swatches" aria-hidden="true">
                    {[customTheme.colors.paper, customTheme.colors.seal, customTheme.colors.gold, customTheme.colors.jade, customTheme.colors.azure].map(
                      (color) => (
                        <span key={color} style={{ background: color }} />
                      ),
                    )}
                  </span>
                  <span className="custom-theme-copy">
                    <strong data-i18n-skip>{customTheme.name || '自定义主题'}</strong>
                    <small>自编辑主题 · {customTheme.base === 'paper' ? '纸上时间' : customTheme.base === 'ink' ? '深墨' : '瑞士网格'}</small>
                  </span>
                  {data.settings.theme === 'custom' ? <span className="theme-option-current">当前</span> : null}
                </button>
                <button type="button" className="btn btn-ghost btn-small custom-theme-edit" onClick={() => setThemeEditorOpen(true)}>
                  编辑
                </button>
              </>
            ) : (
              <>
                <div className="custom-theme-main is-empty">
                  <span className="custom-theme-swatches" aria-hidden="true">
                    <span style={{ background: 'var(--seal)' }} />
                    <span style={{ background: 'var(--gold)' }} />
                    <span style={{ background: 'var(--jade)' }} />
                    <span style={{ background: 'var(--azure)' }} />
                    <span style={{ background: 'var(--violet)' }} />
                  </span>
                  <span className="custom-theme-copy">
                    <strong>自编辑主题</strong>
                    <small>给这套界面起一个名字，比如「噜噜」。</small>
                  </span>
                </div>
                <button type="button" className="btn btn-ghost btn-small custom-theme-edit" onClick={() => setThemeEditorOpen(true)}>
                  创建
                </button>
              </>
            )}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h2>个人资料</h2>
              <p>显示在首页与侧栏。</p>
            </div>
          </div>
          <div className="task-form">
            <label className="field">
              <span className="field-label">称呼</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={24}
                placeholder="行者"
              />
            </label>
            <label className="field">
              <span className="field-label">箴言</span>
              <textarea
                rows={2}
                value={motto}
                onChange={(event) => setMotto(event.target.value)}
                maxLength={120}
                placeholder="提醒自己为什么出发"
              />
            </label>
            <div className="settings-meta-line">
              <span>加入于 {formatFullDateCN(data.profile.joinedAt)}</span>
              <span>{growth.evidenceCount} 条证据</span>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Laptop size={18} />
            </div>
            <div>
              <h2>专注</h2>
              <p>让目标适应你的节奏，而不是反过来。</p>
            </div>
          </div>
          <div className="task-form">
            <div className="field">
              <span className="field-label">
                每日专注目标 <em>{dailyGoal} 分钟</em>
              </span>
              <input
                type="range"
                min={15}
                max={300}
                step={15}
                value={dailyGoal}
                onChange={(event) => setDailyGoal(Number(event.target.value))}
                className="progress-slider"
                style={{ '--range': ((dailyGoal - 15) / (300 - 15)) * 100 } as CSSProperties}
              />
              <span className="field-hint">只用来计算今日进度与每日奖励，不设上限。</span>
            </div>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
              <span>减少动效（适合低性能设备或对动画敏感者）</span>
            </label>
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={sound}
                onChange={(event) => setSound(event.target.checked)}
              />
              <span>完成提示音（预留能力，当前版本静音）</span>
            </label>
          </div>
        </section>

        <AiSettingsCard />

        <section className="settings-card settings-card-wide">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Database size={18} />
            </div>
            <div>
              <h2>数据与备份</h2>
              <p>JSON 本地存储，不经过任何服务器。</p>
            </div>
            <span className={`save-indicator ${saving ? 'is-saving' : ''}`}>
              <span className="live-dot" />
              {saving ? '保存中' : lastSavedAt ? `已保存 · ${timeAgo(lastSavedAt)}` : '等待保存'}
            </span>
          </div>

          <div className="storage-path">
            <HardDriveDownload size={16} />
            <div>
              <span>数据文件</span>
              <code>{info?.dataPath ?? '浏览器 localStorage（预览模式）'}</code>
            </div>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => void saveNow()}>
              <Save size={14} /> 立即保存
            </button>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void exportData()}>
              <Download size={15} /> 导出 JSON
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void importData()}>
              <Upload size={15} /> 导入 JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void window.yolo?.openDataFolder()}
              disabled={!window.yolo}
            >
              <FolderOpen size={15} /> 打开数据目录
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '重新载入示例数据？',
                  message: '当前数据会被示例数据替换。建议先导出备份。',
                  confirmLabel: '载入示例',
                  tone: 'danger',
                  action: () => resetData('sample'),
                })
              }
            >
              <RotateCcw size={15} /> 载入示例
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() =>
                openModal({
                  kind: 'confirm',
                  title: '清空所有数据，重新开始？',
                  message:
                    '任务、报告、专注记录、星图与证据都会被清空，且无法撤销。请先导出备份。',
                  confirmLabel: '清空一切',
                  tone: 'danger',
                  action: () => resetData('empty'),
                })
              }
            >
              <Trash2 size={15} /> 清空重来
            </button>
          </div>

          <div className="settings-warning">
            <AlertTriangle size={15} />
            <p>
              这个应用刻意不提供账号与云同步。你的时间记录属于你自己，不应该成为别人的数据。
            </p>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Info size={18} />
            </div>
            <div>
              <h2>关于</h2>
              <p>你只活一次 · {platformName}</p>
            </div>
          </div>
          <dl className="about-list">
            <div>
              <dt>版本</dt>
              <dd>v{info?.appVersion ?? '0.1.0'}</dd>
            </div>
            <div>
              <dt>平台</dt>
              <dd>
                {platformLine} {info?.arch ?? ''}
              </dd>
            </div>
            <div>
              <dt>运行时</dt>
              <dd>{runtimeName}</dd>
            </div>
            <div>
              <dt>Chromium</dt>
              <dd>{info?.chromeVersion ?? '—'}</dd>
            </div>
            <div>
              <dt>存储</dt>
              <dd>
                <ShieldCheck size={12} /> 本地优先
              </dd>
            </div>
          </dl>
          <blockquote className="about-quote">
            “人生不能重来，但今天还可以重新安排。”
          </blockquote>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <Laptop size={18} />
            </div>
            <div>
              <h2>平台路线</h2>
              <p>一套共享核心，三个平台外壳。</p>
            </div>
          </div>
          <ul className="platform-list">
            <li className={info?.platform === 'win32' || info?.platform === 'android' ? '' : 'is-current'}>
              <span className="platform-dot" />
              <div>
                <strong>Linux x64</strong>
                <small>Electron + React · AppImage / deb</small>
              </div>
              <span className="platform-status">可用</span>
            </li>
            <li className={info?.platform === 'win32' ? 'is-current' : ''}>
              <span className="platform-dot" />
              <div>
                <strong>Windows x64</strong>
                <small>Electron + React · 便携版 / NSIS</small>
              </div>
              <span className="platform-status">可用</span>
            </li>
            <li className={info?.platform === 'android' ? 'is-current' : ''}>
              <span className="platform-dot" />
              <div>
                <strong>Android</strong>
                <small>Capacitor · 竖屏布局与前台计时</small>
              </div>
              <span className="platform-status">{info?.platform === 'android' ? '当前' : '可用'}</span>
            </li>
          </ul>
          <p className="platform-note">
            三端共享 <code>packages/core</code> 与 <code>packages/desktop-ui</code> 的领域模型与界面，平台外壳只负责窗口、存储与系统集成。
          </p>
        </section>
      </div>
      <ThemeEditorModal open={themeEditorOpen} onClose={() => setThemeEditorOpen(false)} />
    </div>
  );
}
