import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  bodyClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  bodyClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-layer" role="presentation">
      <div
        className="modal-backdrop"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
      />
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true">
        {title ? (
          <header className="modal-head">
            <div>
              {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
              <h2>{title}</h2>
              {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </header>
        ) : null}
        <div className={`modal-body ${bodyClassName ?? ''}`}>{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, children, width = 580 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="drawer-layer" role="presentation">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" style={{ width }} role="dialog" aria-modal="true">
        {children}
      </aside>
    </div>,
    document.body,
  );
}
