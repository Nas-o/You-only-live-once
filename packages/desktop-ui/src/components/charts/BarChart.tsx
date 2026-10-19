interface BarDatum {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  unit?: string;
  goal?: number;
  height?: number;
  tone?: string;
}

/** 14 天专注柱状图（SVG，避免额外图表依赖） */
export function BarChart({ data, unit = '分钟', goal, height = 220, tone = 'var(--chart-bar)' }: BarChartProps) {
  const width = 760;
  const padX = 10;
  const padTop = 24;
  const padBottom = 30;
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 30);
  const gap = 8;
  const barWidth = Math.max(8, (width - padX * 2 - gap * (data.length - 1)) / Math.max(1, data.length));
  const goalY = goal ? padTop + chartHeight - (goal / max) * chartHeight : null;

  return (
    <svg
      className="bar-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="近期专注时长柱状图"
      preserveAspectRatio="none"
    >
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padX}
          y1={padTop + chartHeight - chartHeight * ratio}
          x2={width - padX}
          y2={padTop + chartHeight - chartHeight * ratio}
          stroke="var(--chart-grid)"
          strokeDasharray="2 6"
        />
      ))}
      {goalY !== null ? (
        <line
          x1={padX}
          y1={goalY}
          x2={width - padX}
          y2={goalY}
          stroke="var(--seal)"
          strokeOpacity="0.5"
          strokeDasharray="4 5"
        />
      ) : null}
      {data.map((datum, index) => {
        const x = padX + index * (barWidth + gap);
        const barHeight = Math.max(datum.value > 0 ? 3 : 0, (datum.value / max) * chartHeight);
        const y = padTop + chartHeight - barHeight;
        return (
          <g key={`${datum.label}-${index}`} className="bar-group">
            <title>{`${datum.hint ?? datum.label}：${datum.value} ${unit}`}</title>
            {barHeight > 0 ? (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={1}
                fill={datum.highlight ? 'var(--seal)' : tone}
              />
            ) : null}
            {datum.value > 0 ? (
              <text x={x + barWidth / 2} y={Math.max(12, y - 6)} textAnchor="middle" className="bar-value">
                {datum.value}
              </text>
            ) : null}
            <text
              x={x + barWidth / 2}
              y={height - 9}
              textAnchor="middle"
              className={`bar-label ${datum.highlight ? 'is-highlight' : ''}`}
            >
              {datum.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
