import { useEffect } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ProgressBar } from './ui/Progress';

/** 一条真实证据被归档时的印章反馈。 */
export function GrowthStampOverlay() {
  const stamp = useAppStore((s) => s.growthStamp);
  const dismiss = useAppStore((s) => s.dismissGrowthStamp);

  useEffect(() => {
    if (!stamp) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stamp, dismiss]);

  if (!stamp) return null;

  return (
    <div className="growth-stamp-layer" role="presentation">
      <div className="growth-stamp-backdrop" onClick={dismiss} />
      <div className="growth-stamp-card" role="dialog" aria-modal="true" aria-label="成长证据">
        <div className="growth-stamp-eyebrow">
          <Sparkles size={14} /> 成长证据
        </div>
        <div className="growth-stamp-mark">证</div>
        <h2>{stamp.title}</h2>
        <p className="growth-stamp-detail">{stamp.detail}</p>
        {stamp.skill ? <p className="growth-stamp-skill">技能树 · {stamp.skill}</p> : null}
        <div className="growth-stamp-count">
          <span>第 {stamp.evidenceCount} 条证据</span>
          <span>{stamp.stage}</span>
        </div>
        <ProgressBar value={Math.round(stamp.progress * 100)} height={6} tone="var(--seal)" />
        <p className="growth-stamp-next">
          {stamp.nextStage ? `下一阶段 · ${stamp.nextStage}` : '你已经走在很前面了。'}
        </p>
        <button type="button" className="btn btn-primary growth-stamp-btn" onClick={dismiss}>
          继续积累 <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}
