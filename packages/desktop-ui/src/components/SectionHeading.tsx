import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionHeadingProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  extra?: ReactNode;
}

export function SectionHeading({ title, hint, actionLabel, onAction, extra }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </div>
      <div className="section-heading-right">
        {extra}
        {actionLabel && onAction ? (
          <button type="button" className="link-btn" onClick={onAction}>
            {actionLabel} <ChevronRight size={13} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
