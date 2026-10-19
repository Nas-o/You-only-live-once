import { Palette } from 'lucide-react';
import { THEMES } from '@yolo/core';
import { useAppStore } from '../store/appStore';

/** 顶栏主题按钮：每次点击按 纸上时间 → 深墨 → 瑞士网格 循环 */
export function ThemeSwitcher() {
  const theme = useAppStore((s) => s.data.settings.theme);
  const custom = useAppStore((s) => s.data.settings.customTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const options = [
    ...THEMES,
    ...(custom ? [{ id: 'custom' as const, name: custom.name || '自定义主题', description: '自编辑主题' }] : []),
  ];
  const index = Math.max(
    0,
    options.findIndex((item) => item.id === theme),
  );
  const current = options[index] ?? options[0]!;
  const next = options[(index + 1) % options.length] ?? options[0]!;

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={() => setTheme(next.id)}
      title={`切换主题 · 当前：${current.name}（下一站：${next.name}）`}
      aria-label={`切换主题，当前 ${current.name}，下一站 ${next.name}`}
    >
      <Palette size={16} />
      <span className="theme-toggle-label">主题</span>
    </button>
  );
}
