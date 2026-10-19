import { useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Info,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { useAppStore, type Toast } from '../../store/appStore';

const TONE_ICON = {
  xp: Sparkles,
  achievement: Award,
  success: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useAppStore((s) => s.dismissToast);
  const Icon = TONE_ICON[toast.tone];
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), toast.tone === 'achievement' ? 6000 : 4200);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.tone, dismiss]);

  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <span className="toast-icon">
        <Icon size={17} />
      </span>
      <div className="toast-copy">
        <strong>{toast.title}</strong>
        {toast.message ? <span>{toast.message}</span> : null}
      </div>
      <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="关闭提示">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useAppStore((s) => s.toasts);
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
