import { formatDateCN, greeting, weekdayCN } from '@yolo/core';
import { Plus, Settings } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { useAppStore } from '../store/appStore';
import { ActiveTimersBar } from './TimerChip';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';

export function TopBar() {
  const data = useAppStore((s) => s.data);
  const openModal = useAppStore((s) => s.openModal);
  const setView = useAppStore((s) => s.setView);
  const now = useNow(30_000);
  const date = new Date(now);
  const name = data.profile.name || '行者';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-date">
          {formatDateCN(date)} · {weekdayCN(date)}
        </div>
        <div className="topbar-greeting">
          {greeting(date)}，<span data-i18n-skip>{name}</span>
        </div>
      </div>

      <div className="topbar-center">
        <ActiveTimersBar />
      </div>

      <div className="topbar-right">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <button
          type="button"
          className="icon-btn mobile-only"
          onClick={() => setView('settings')}
          aria-label="设置"
          title="设置"
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          className="btn btn-primary topbar-new-task"
          onClick={() => openModal({ kind: 'task-form' })}
        >
          <Plus size={16} /> <span className="btn-label">新建任务</span>
        </button>
      </div>
    </header>
  );
}
