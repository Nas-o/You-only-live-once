/// <reference path="./types/yolo.d.ts" />

import { useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { useAppStore, startPersistence, flushPersistence } from './store/appStore';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { TopBar } from './components/TopBar';
import { TodayPage } from './pages/TodayPage';
import { TasksPage } from './pages/TasksPage';
import { GoalsPage } from './pages/GoalsPage';
import { GrowthPage } from './pages/GrowthPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Onboarding } from './components/Onboarding';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { GoalDetailDrawer } from './components/GoalDetailDrawer';
import { ReportModal } from './components/ReportModal';
import { TaskFormModal } from './components/TaskFormModal';
import { GoalFormModal } from './components/GoalFormModal';
import { KnowledgePointModal } from './components/KnowledgePointModal';
import { FocusOverlay } from './components/FocusOverlay';
import { GrowthStampOverlay } from './components/GrowthStampOverlay';
import { useLanguageRuntime } from './lib/i18n';
import { ToastHost } from './components/ui/ToastHost';
import { GlobalConfirm } from './components/ui/ConfirmDialog';
import { UpdatePrompt } from './components/UpdatePrompt';

function BootScreen({ error }: { error: string | null }) {
  return (
    <div className="boot-screen">
      <div className="boot-mark">
        <Flame size={26} />
      </div>
      <div className="boot-brand" data-i18n-skip>你只活一次</div>
      <div className="boot-sub">YOU ONLY LIVE ONCE</div>
      {error ? (
        <div className="boot-error">
          <strong>启动时遇到问题</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      ) : (
        <div className="boot-bar">
          <span />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const language = useAppStore((s) => s.data.settings.language);
  useLanguageRuntime(language);
  const ready = useAppStore((s) => s.ready);
  const bootError = useAppStore((s) => s.bootError);
  const onboarded = useAppStore((s) => s.data.meta.onboarded);
  const view = useAppStore((s) => s.view);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const heartbeat = useAppStore((s) => s.heartbeat);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startPersistence();
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const heartbeatId = window.setInterval(() => heartbeat(), 15_000);
    return () => window.clearInterval(heartbeatId);
  }, [heartbeat]);

  useEffect(() => {
    window.yolo?.onPowerSuspend?.((payload) => {
      useAppStore.getState().pauseTimersAt(payload.at, payload.reason);
    });
  }, []);

  useEffect(() => {
    const flush = () => flushPersistence();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!ready) return <BootScreen error={bootError} />;
  if (!onboarded) {
    return (
      <>
        <Onboarding />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content" key={view}>
          {view === 'today' ? <TodayPage /> : null}
          {view === 'tasks' ? <TasksPage /> : null}
          {view === 'goals' ? <GoalsPage /> : null}
          {view === 'cultivation' ? <GrowthPage /> : null}
          {view === 'stats' ? <StatsPage /> : null}
          {view === 'settings' ? <SettingsPage /> : null}
        </main>
      </div>

      <MobileNav />
      <TaskDetailDrawer />
      <GoalDetailDrawer />
      <TaskFormModal />
      <ReportModal />
      <GoalFormModal />
      <KnowledgePointModal />
      <FocusOverlay />
      <GlobalConfirm />
      <UpdatePrompt />
      <GrowthStampOverlay />
      <ToastHost />
    </div>
  );
}
