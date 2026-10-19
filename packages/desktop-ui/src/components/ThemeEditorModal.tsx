import { useEffect, useState } from 'react';
import { Palette, RotateCcw, Trash2 } from 'lucide-react';
import {
  DEFAULT_CUSTOM_THEME,
  type CustomTheme,
  type CustomThemeColors,
  type ThemeBase,
} from '@yolo/core';
import { useAppStore } from '../store/appStore';
import { Modal } from './ui/Modal';

const BASE_LABELS: { id: ThemeBase; label: string; hint: string }[] = [
  { id: 'paper', label: '纸上时间', hint: '暖纸与编辑排版' },
  { id: 'ink', label: '深墨', hint: '深色底与衬线' },
  { id: 'swiss', label: '瑞士网格', hint: '无衬线与严格网格' },
];

const BASE_PRESETS: Record<ThemeBase, CustomThemeColors> = {
  paper: { ...DEFAULT_CUSTOM_THEME.colors },
  ink: {
    paper: '#141311',
    paperRaised: '#1b1916',
    paperSunken: '#0f0e0c',
    ink: '#ece7db',
    seal: '#c25b48',
    gold: '#c09a63',
    jade: '#8ea88b',
    azure: '#88a7b8',
    violet: '#a491b5',
  },
  swiss: {
    paper: '#f6f6f2',
    paperRaised: '#ffffff',
    paperSunken: '#ecece6',
    ink: '#111111',
    seal: '#e0342a',
    gold: '#8a5a1f',
    jade: '#2f5a44',
    azure: '#2f5670',
    violet: '#5a4770',
  },
};

const COLOR_FIELDS: { key: keyof CustomThemeColors; label: string }[] = [
  { key: 'paper', label: '页面底色' },
  { key: 'paperRaised', label: '卡片纸面' },
  { key: 'paperSunken', label: '凹陷底色' },
  { key: 'ink', label: '文字墨色' },
  { key: 'seal', label: '印章强调' },
  { key: 'gold', label: '金色' },
  { key: 'jade', label: '青玉' },
  { key: 'azure', label: '天青' },
  { key: 'violet', label: '紫气' },
];

function cloneTheme(theme: CustomTheme): CustomTheme {
  return { ...theme, colors: { ...theme.colors } };
}

export function ThemeEditorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const custom = useAppStore((s) => s.data.settings.customTheme);
  const saveCustomTheme = useAppStore((s) => s.saveCustomTheme);
  const deleteCustomTheme = useAppStore((s) => s.deleteCustomTheme);
  const [draft, setDraft] = useState<CustomTheme>(() => cloneTheme(DEFAULT_CUSTOM_THEME));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(cloneTheme(custom ?? DEFAULT_CUSTOM_THEME));
    setError('');
  }, [open, custom]);

  const updateColor = (key: keyof CustomThemeColors, value: string) => {
    setDraft((current) => ({
      ...current,
      colors: { ...current.colors, [key]: value },
    }));
  };

  const reset = () => {
    setDraft(cloneTheme(DEFAULT_CUSTOM_THEME));
    setError('');
  };

  const save = () => {
    const name = draft.name.trim() || '我的主题';
    if (name.length > 24) {
      setError('主题名最多 24 个字符。');
      return;
    }
    saveCustomTheme({ ...draft, name });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="THEME STUDIO"
      title="自编辑主题"
      subtitle="选一套底子，再调自己的颜色。它会像内置主题一样出现在顶栏和设置里。"
      footer={
        <>
          {custom ? (
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => {
                deleteCustomTheme();
                onClose();
              }}
            >
              <Trash2 size={14} /> 删除主题
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={14} /> 恢复默认
            </button>
          )}
          <span className="modal-foot-spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            <Palette size={15} /> 保存并应用
          </button>
        </>
      }
    >
      <div className="theme-editor">
        <div className="theme-editor-form">
          <label className="field">
            <span>主题名称</span>
            <input
              type="text"
              value={draft.name}
              maxLength={24}
              placeholder="例如：噜噜"
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              autoFocus
            />
          </label>

          <div className="field">
            <span>底子</span>
            <div className="theme-base-grid" role="radiogroup" aria-label="主题底子">
              {BASE_LABELS.map((base) => (
                <button
                  key={base.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.base === base.id}
                  className={draft.base === base.id ? 'is-active' : ''}
                  onClick={() =>
                    setDraft((current) =>
                      current.base === base.id
                        ? current
                        : { ...current, base: base.id, colors: { ...BASE_PRESETS[base.id] } },
                    )
                  }
                >
                  <strong>{base.label}</strong>
                  <small>{base.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>颜色</span>
            <div className="theme-color-grid">
              {COLOR_FIELDS.map((field) => (
                <label key={field.key} className="theme-color-field">
                  <span>{field.label}</span>
                  <span className="theme-color-control">
                    <input
                      type="color"
                      value={draft.colors[field.key]}
                      onChange={(event) => updateColor(field.key, event.target.value)}
                      aria-label={field.label}
                    />
                    <code>{draft.colors[field.key]}</code>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <aside
          className="theme-editor-preview"
          style={{
            background: draft.colors.paper,
            color: draft.colors.ink,
            borderColor: draft.colors.ink,
          }}
        >
          <div className="theme-preview-rule" style={{ background: draft.colors.ink }} />
          <div className="theme-preview-kicker" style={{ color: draft.colors.ink }}>
            MEMENTO MORI
          </div>
          <strong data-i18n-skip>{draft.name.trim() || '我的主题'}</strong>
          <p style={{ color: draft.colors.ink }}>把时间用在真正重要的事上。</p>
          <div className="theme-preview-swatches">
            {[draft.colors.seal, draft.colors.gold, draft.colors.jade, draft.colors.azure, draft.colors.violet].map(
              (color) => (
                <span key={color} style={{ background: color }} />
              ),
            )}
          </div>
          <div className="theme-preview-card" style={{ background: draft.colors.paperRaised }}>
            <span style={{ background: draft.colors.seal }} />
            <span style={{ background: draft.colors.ink }} />
            <span style={{ background: draft.colors.ink, opacity: 0.35 }} />
          </div>
        </aside>
      </div>
    </Modal>
  );
}
