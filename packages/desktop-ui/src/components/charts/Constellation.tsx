import type { KnowledgePoint } from '@yolo/core';

interface ConstellationProps {
  points: KnowledgePoint[];
  color?: string;
  width?: number;
  height?: number;
  interactive?: boolean;
  showLabels?: boolean;
  selectedId?: string;
  onSelect?: (point: KnowledgePoint) => void;
  compact?: boolean;
}

interface Positioned {
  point: KnowledgePoint;
  x: number;
  y: number;
  index: number;
}

function layout(points: KnowledgePoint[], width: number, height: number): Positioned[] {
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(24, width / 2 - (width < 340 ? 34 : 58));
  const ry = Math.max(18, height / 2 - (height < 160 ? 24 : 40));
  return points.map((point, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, points.length)) * Math.PI * 2;
    const depth = index % 2 === 0 ? 1 : 0.68;
    return {
      point,
      x: cx + Math.cos(angle) * rx * depth,
      y: cy + Math.sin(angle) * ry * depth,
      index,
    };
  });
}

/**
 * 大目标星图：知识点按顺序连成星座。
 * 已点亮为金色实心，可点亮为空心，未解锁为暗色虚线。
 */
export function Constellation({
  points,
  color = '#e3b65b',
  width = 560,
  height = 240,
  interactive = false,
  showLabels = true,
  selectedId,
  onSelect,
  compact = false,
}: ConstellationProps) {
  const positions = layout(points, width, height);
  const cx = width / 2;
  const cy = height / 2;

  if (points.length === 0) {
    return (
      <div className="constellation-empty" style={{ height }}>
        <span>还没有知识点</span>
        <small>把大目标拆成一颗颗可以点亮的星</small>
      </div>
    );
  }

  return (
    <svg
      className={`constellation ${compact ? 'constellation-compact' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      role={interactive ? 'group' : 'img'}
      aria-label="知识点星图"
    >

      <ellipse
        cx={cx}
        cy={cy}
        rx={Math.max(24, width / 2 - (width < 340 ? 34 : 58))}
        ry={Math.max(18, height / 2 - (height < 160 ? 24 : 40))}
        fill="none"
        stroke="var(--constellation-line)"
        strokeDasharray="2 6"
      />

      {positions.map((entry, index) => {
        const next = positions[index + 1];
        if (!next) return null;
        const bothLit = entry.point.status === 'lit' && next.point.status === 'lit';
        return (
          <line
            key={`line-${entry.point.id}`}
            x1={entry.x}
            y1={entry.y}
            x2={next.x}
            y2={next.y}
            stroke={bothLit ? color : 'var(--constellation-line)'}
            strokeWidth={bothLit ? 1.6 : 1}
            strokeDasharray={bothLit ? undefined : '3 5'}
          />
        );
      })}

      {positions.map((entry) => {
        const { point, x, y } = entry;
        const lit = point.status === 'lit';
        const locked = point.status === 'locked';
        const radius = compact ? (lit ? 5 : 4) : lit ? 7 : 5.5;
        const isSelected = selectedId === point.id;
        const labelY = y < cy ? y - 16 : y + 24;
        const canClick = interactive && Boolean(onSelect);
        return (
          <g
            key={point.id}
            className={`constellation-node ${lit ? 'is-lit' : ''} ${locked ? 'is-locked' : ''} ${
              canClick ? 'is-clickable' : ''
            } ${isSelected ? 'is-selected' : ''}`}
            role={canClick ? 'button' : undefined}
            tabIndex={canClick ? 0 : undefined}
            aria-label={`${point.title}，${lit ? '已点亮' : locked ? '未解锁' : '可点亮'}`}
            onClick={canClick ? () => onSelect?.(point) : undefined}
            onKeyDown={
              canClick
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(point);
                    }
                  }
                : undefined
            }
          >
            <title data-i18n-skip>{`${point.title} · ${lit ? '已点亮' : locked ? '未解锁' : '可点亮'}`}</title>
            {isSelected ? (
              <circle
                cx={x}
                cy={y}
                r={radius + 7}
                fill="none"
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.8"
              />
            ) : null}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={lit ? color : 'var(--constellation-fill)'}
              stroke={lit ? color : locked ? 'var(--constellation-locked)' : color}
              strokeWidth={lit ? 1 : 1.4}
              strokeDasharray={locked ? '2 2' : undefined}
            />
            {lit ? <circle cx={x} cy={y} r={2} fill="var(--constellation-core)" /> : null}
            {showLabels && !compact ? (
              <text
                x={x}
                y={labelY}
                textAnchor="middle"
                className="constellation-label"
                fill={lit ? 'var(--text)' : locked ? 'var(--text-mute)' : 'var(--text-dim)'}
              >
                {point.title.length > 9 ? `${point.title.slice(0, 8)}…` : point.title}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
