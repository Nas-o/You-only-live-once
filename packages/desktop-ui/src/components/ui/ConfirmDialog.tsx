import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'gold';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  tone = 'gold',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return createPortal(
    <div className="modal-layer" role="presentation">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal modal-sm confirm-dialog" role="alertdialog" aria-modal="true">
        <div className="confirm-mark">
          <span className={tone === 'danger' ? 'is-danger' : ''}>!</span>
        </div>
        <h3>{title}</h3>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 全局确认弹窗入口：读取 store.modal 中的 confirm 状态 */
export function GlobalConfirm() {
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  if (modal.kind !== 'confirm') return null;
  return (
    <ConfirmDialog
      open
      title={modal.title}
      message={modal.message}
      confirmLabel={modal.confirmLabel}
      tone={modal.tone}
      onConfirm={() => {
        modal.action();
        closeModal();
      }}
      onCancel={closeModal}
    />
  );
}
