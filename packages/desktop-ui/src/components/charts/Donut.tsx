interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  slices: DonutSlice[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
  centerValue?: string;
  centerHint?: string;
}

/** 环形占比图，纯 SVG */
export function Donut({
  slices,
  size = 190,
  stroke = 18,
  centerLabel,
  centerValue,
  centerHint,
}: DonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="专注领域分布">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--chart-track)"
            strokeWidth={stroke}
          />
          {total > 0
            ? slices.map((slice) => {
                const length = (slice.value / total) * circumference;
                const dashOffset = -offset;
                offset += length;
                return (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={stroke}
                    strokeLinecap="butt"
                    strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
              })
            : null}
        </svg>
        <div className="donut-center">
          {centerLabel ? <span>{centerLabel}</span> : null}
          {centerValue ? <strong>{centerValue}</strong> : null}
          {centerHint ? <small>{centerHint}</small> : null}
        </div>
      </div>
      <ul className="donut-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">
              {slice.value}
              <small>{total > 0 ? ` · ${Math.round((slice.value / total) * 100)}%` : ''}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
