import type { AppView } from '@yolo/core';
import { BarChart3, Layers, Sprout, Star, Sun, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: '今日', icon: Sun },
  { id: 'tasks', label: '任务', icon: Layers },
  { id: 'goals', label: '星图', icon: Star },
  { id: 'cultivation', label: '成长', icon: Sprout },
  { id: 'stats', label: '统计', icon: BarChart3 },
];

export function MobileNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  return (
    <nav className="mobile-nav" aria-label="移动端主导航">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'is-active' : ''}
            onClick={() => setView(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
