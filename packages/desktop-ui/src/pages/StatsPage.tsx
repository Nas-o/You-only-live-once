import {
  bestDay,
  categoryBreakdown,
  daySeries,
  estimateCalibration,
  formatDayKeyCN,
  formatMinutes,
  formatSecondsShort,
  totals,
  todayFocusMinutes,
  type TaskCategory,
} from '@yolo/core';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  ScrollText,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BarChart } from '../components/charts/BarChart';
import { Donut } from '../components/charts/Donut';
import { Heatmap } from '../components/charts/Heatmap';
import { StatCard } from '../components/StatCard';

const CATEGORY_COLOR: Record<TaskCategory, string> = {
  learning: '#b08a4a',
  practice: '#7fa083',
  project: '#7d9aac',
  reading: '#c07a70',
  other: '#9a85b0',
};

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  learning: '学习',
  practice: '练习',
  project: '项目',
  reading: '阅读',
  other: '其他',
};

export function StatsPage() {
  const data = useAppStore((s) => s.data);
  const summary = totals(data);
  const series = daySeries(data.sessions, 14);
  const compactChart = useMediaQuery('(max-width: 820px)');
  const barData = series.map((point, index) => ({
    label: point.label,
    value: point.minutes,
    hint: `${point.label} · ${point.sessions} 次专注`,
    highlight: index === series.length - 1,
  }));
  const categories = categoryBreakdown(data);
  const calibration = estimateCalibration(data.tasks);
  const best = bestDay(data.sessions);
  const todayMinutes = todayFocusMinutes(data.sessions);
  const goal = data.settings.dailyGoalMinutes;
  const reportRate =
    data.tasks.length === 0
      ? 0
      : Math.round((data.tasks.filter((task) => task.report).length / data.tasks.length) * 100);
  const calibrationMean =
    calibration.length > 0
      ? Math.round(calibration.reduce((sum, row) => sum + row.accuracy, 0) / calibration.length)
      : null;
  const avgRatio =
    calibration.length > 0
      ? calibration.reduce((sum, row) => sum + row.ratio, 0) / calibration.length
      : null;

  const insights: string[] = [];
  if (summary.sessionCount === 0) {
    insights.push('还没有专注数据。完成第一次计时后，这里会开始说话。');
  } else {
    insights.push(
      `你平均每次专注 ${summary.avgSessionMinutes} 分钟${
        summary.avgSessionMinutes >= 45 && summary.avgSessionMinutes <= 90
          ? '，正落在容易进入心流的区间。'
          : summary.avgSessionMinutes < 45
            ? '。试着把单次时间拉长到 45 分钟以上，减少启动损耗。'
            : '。注意留出恢复时间，长时段不等于高质量。'
      }`,
    );
    if (best) insights.push(`到目前为止，你在 ${formatDayKeyCN(best.key)} 投入最多：${best.minutes} 分钟。`);
    if (avgRatio !== null) {
      if (avgRatio > 1.15) insights.push('你倾向低估所需时间。下次写报告时，可以给预计值留 20% 的缓冲。');
      else if (avgRatio < 0.85) insights.push('你倾向高估所需时间。可以更大胆地开始，完成比完美更重要。');
      else insights.push('你的预计与实际相当接近，时间感正在变准。');
    }
    if (todayMinutes >= goal) insights.push('今日目标已达成。剩下的时间，可以留给休息或真正想做的事。');
  }

  return (
    <div className="page-inner stats-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">统计</div>
          <h1>时间去了哪里，一目了然</h1>
          <p className="page-lede">
            这里没有考核，只有镜子。看清投入与预估偏差，才能把时间放回真正重要的地方。
          </p>
        </div>
      </header>

      <div className="stat-grid stat-grid-five">
        <StatCard
          icon={Timer}
          label="累计专注"
          value={formatSecondsShort(summary.focusSeconds)}
          hint={`共 ${summary.sessionCount} 次 · 平均 ${summary.avgSessionMinutes} 分钟`}
          tone="var(--jade)"
        />
        <StatCard
          icon={Flame}
          label="今日专注"
          value={`${todayMinutes} 分钟`}
          hint={`每日目标 ${goal} 分钟`}
          tone="var(--gold)"
        />
        <StatCard
          icon={CheckCircle2}
          label="完成任务"
          value={`${summary.taskDone} 个`}
          hint={`完成率 ${summary.completionRate}%`}
          tone="var(--azure)"
        />
        <StatCard
          icon={ScrollText}
          label="报告完成率"
          value={`${reportRate}%`}
          hint={`${summary.reportCount} 份启程侦查`}
          tone="var(--violet)"
        />
        <StatCard
          icon={Target}
          label="预估准确度"
          value={calibrationMean === null ? '—' : `${calibrationMean}%`}
          hint={calibrationMean === null ? '开始计时后可见' : `${calibration.length} 个任务可对比`}
          tone="var(--rose)"
        />
      </div>

      <section className="chart-card chart-card-wide">
        <div className="chart-card-head">
          <div>
            <h2>最近 14 天专注</h2>
            <p>柱高是当天累计专注分钟数，虚线是你设定的每日目标。</p>
          </div>
          <span className="chart-total">
            <BarChart3 size={14} /> 14 天合计 {series.reduce((sum, point) => sum + point.minutes, 0)} 分钟
          </span>
        </div>
        <BarChart data={barData} goal={goal} unit="分钟" compact={compactChart} />
        <div className="chart-goal-legend">
          <span /> 虚线为每日目标 {goal} 分钟
        </div>
      </section>

      <div className="stats-two-col">
        <section className="chart-card">
          <div className="chart-card-head">
            <div>
              <h2>时间投向</h2>
              <p>按任务类型拆分累计专注时长。</p>
            </div>
          </div>
          {categories.length > 0 ? (
            <Donut
              slices={categories.map((slice) => ({
                label: CATEGORY_LABEL[slice.category],
                value: slice.minutes,
                color: CATEGORY_COLOR[slice.category],
              }))}
              centerLabel="累计"
              centerValue={`${summary.focusMinutes}`}
              centerHint="分钟"
            />
          ) : (
            <p className="muted chart-empty">还没有可以归类的专注记录。</p>
          )}
        </section>

        <section className="chart-card">
          <div className="chart-card-head">
            <div>
              <h2>专注热力图</h2>
              <p>每个格子是一天，越亮代表投入越多。</p>
            </div>
            <span className="chart-total">
              <Flame size={14} /> 连续节奏在线
            </span>
          </div>
          <Heatmap sessions={data.sessions} weeks={12} />
          <div className="heatmap-summary">
            <span>
              <strong>{summary.sessionCount}</strong> 次专注
            </span>
            <span>
              <strong>{best ? best.minutes : 0}</strong> 分钟单日最高
            </span>
            <span>
              <strong>{summary.avgSessionMinutes}</strong> 分钟平均每次
            </span>
          </div>
        </section>
      </div>

      <div className="stats-single-col">
        <section className="chart-card">
          <div className="chart-card-head">
            <div>
              <h2>预计 vs 实际</h2>
              <p>只有真实记录，才能校准你对时间的直觉。</p>
            </div>
            {calibrationMean !== null ? (
              <span className="chart-total">
                <TrendingUp size={14} /> 平均准确度 {calibrationMean}%
              </span>
            ) : null}
          </div>
          {calibration.length > 0 ? (
            <div className="calibration-list">
              {calibration.slice(0, 6).map((row) => {
                const max = Math.max(row.estimatedMinutes, row.actualMinutes, 1);
                return (
                  <div key={row.taskId} className="calibration-row">
                    <div className="calibration-title">
                      <span data-i18n-skip>{row.title}</span>
                      <em className={`accuracy-tag ${row.accuracy >= 80 ? 'is-high' : row.accuracy >= 50 ? 'is-mid' : 'is-low'}`}>
                        {row.accuracy}%
                      </em>
                      <span className={`calibration-delta ${row.deltaMinutes > 0 ? 'is-over' : 'is-under'}`}>
                        {row.deltaMinutes > 0 ? '+' : ''}
                        {row.deltaMinutes} 分钟
                      </span>
                    </div>
                    <div className="calibration-bars">
                      <div className="calibration-bar">
                        <span className="bar-name">预计</span>
                        <span className="bar-track">
                          <span style={{ width: `${(row.estimatedMinutes / max) * 100}%`, background: 'var(--ink-mute)' }} />
                        </span>
                        <em>{formatMinutes(row.estimatedMinutes)}</em>
                      </div>
                      <div className="calibration-bar">
                        <span className="bar-name">实际</span>
                        <span className="bar-track">
                          <span style={{ width: `${(row.actualMinutes / max) * 100}%`, background: 'var(--seal)' }} />
                        </span>
                        <em>{formatMinutes(row.actualMinutes)}</em>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted chart-empty">
              有预计用时的任务开始计时后，这里会自动对比「预计 vs 实际」。
            </p>
          )}
        </section>

      </div>

      <section className="insight-panel">
        <div className="insight-head">
          <Lightbulb size={18} />
          <h2>时间洞察</h2>
        </div>
        <ul>
          {insights.map((insight) => (
            <li key={insight}>
              <Clock3 size={13} />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
