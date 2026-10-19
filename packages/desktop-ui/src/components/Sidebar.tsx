import {
  BarChart3,
  Flame,
  Layers,
  Settings,
  Sprout,
  Star,
  Sun,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { focusStreak, growthSummary, type AppView } from '@yolo/core';

const NAV: { id: AppView; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'today', label: '今日', icon: Sun, hint: '今天最重要的事' },
  { id: 'tasks', label: '任务表', icon: Layers, hint: '全部任务与阶段' },
  { id: 'goals', label: '大目标', icon: Star, hint: '点亮知识星图' },
  { id: 'cultivation', label: '成长', icon: Sprout, hint: '技能树、证据链与成长阶段' },
  { id: 'stats', label: '统计', icon: BarChart3, hint: '时间投向何处' },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const data = useAppStore((s) => s.data);
  const info = useAppStore((s) => s.info);
  const streak = focusStreak(data.sessions);
  const growth = growthSummary(data);
  const activeCount = data.tasks.filter((t) => t.status === 'active').length;
  const missingReports = data.tasks.filter(
    (t) => t.status !== 'done' && t.status !== 'archived' && !t.report,
  ).length;
  const openGoalCount = data.goals.filter((g) => !g.completedAt).length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-seal" aria-hidden="true">
          <Timer size={20} strokeWidth={1.6} />
        </div>
        <div className="brand-copy" data-i18n-skip>
          <strong>你只活一次</strong>
          <span>YOU ONLY LIVE ONCE</span>
        </div>
      </div>

      <nav className="nav" aria-label="主导航">
        <div className="nav-eyebrow">旅程</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          const badge =
            item.id === 'tasks'
              ? activeCount
              : item.id === 'goals'
                ? openGoalCount
                : item.id === 'today' && missingReports > 0
                  ? missingReports
                  : 0;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? 'is-active' : ''}`}
              onClick={() => setView(item.id)}
              title={item.hint}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span className="nav-label">{item.label}</span>
              {badge > 0 ? <span className="nav-badge">{badge}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <button type="button" className="growth-side-card" onClick={() => setView('cultivation')}>
        <div className="growth-side-head">
          <span className="eyebrow">成长档案</span>
          <span className="growth-side-stage">{growth.stage.current.name}</span>
        </div>
        <div className="growth-side-value">
          <strong>{growth.evidenceCount}</strong>
          <span>条证据</span>
        </div>
        <div className="growth-side-meta">
          <span>专注 {Math.round(growth.focusMinutes / 60)}h</span>
          <span className={streak > 0 ? 'streak is-on' : 'streak'}>
            <Flame size={12} /> {streak} 天
          </span>
        </div>
        <div className="growth-side-bar">
          <span style={{ width: `${Math.round(growth.stage.progress * 100)}%` }} />
        </div>
      </button>

      <button
        type="button"
        className={`nav-item nav-settings ${view === 'settings' ? 'is-active' : ''}`}
        onClick={() => setView('settings')}
      >
        <Settings size={18} strokeWidth={1.7} />
        <span className="nav-label">设置</span>
      </button>

      <div className="sidebar-foot">
        <span>
          {info?.platform === 'win32'
            ? 'Windows x64'
            : info?.platform === 'android'
              ? 'Android'
              : 'Linux x64'}{' '}
          · v{info?.appVersion ?? '0.1.0'}
        </span>
        <span className="sidebar-dot" title="本地优先，数据只保存在这台机器上" />
      </div>
    </aside>
  );
}
