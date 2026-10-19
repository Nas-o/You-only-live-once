import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  trend?: string;
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'var(--gold)', trend }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon" style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}>
          <Icon size={16} />
        </span>
        <span className="stat-label">{label}</span>
        {trend ? (
          <span className="stat-trend">
            <TrendingUp size={11} /> {trend}
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </article>
  );
}
