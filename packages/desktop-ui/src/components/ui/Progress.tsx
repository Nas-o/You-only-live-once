import type { ReactNode } from 'react';

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
  /** 圆环起始角度，默认从 12 点方向开始 */
  rounded?: boolean;
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 5,
  tone = 'var(--seal)',
  track = 'var(--ring-track)',
  children,
  className,
  rounded = true,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div className={`progress-ring ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap={rounded ? 'round' : 'butt'}
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 500ms ease' }}
        />
      </svg>
      <div className="progress-ring-content">{children}</div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  tone?: string;
  height?: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ value, tone, height = 6, className, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`progress-bar ${className ?? ''}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${clamped}%`, background: tone ?? 'var(--seal)' }} />
    </div>
  );
}
