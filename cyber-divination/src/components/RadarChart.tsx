// 五行能量雷达图（SVG，无第三方依赖）
interface Five {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}
interface Series {
  color: string;
  fill: string;
  values: Five;
}
interface Props {
  series: Series[]; // 单条（八字）或两条（合盘）
  size?: number;
}

const LABELS = ["木", "火", "土", "金", "水"];

export default function RadarChart({ series, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const labelR = R + 16;

  function safeValue(v: number): number {
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }

  function valueArray(values: Five): number[] {
    return [values.wood, values.fire, values.earth, values.metal, values.water].map(safeValue);
  }

  function points(values: Five, scale: number): string {
    const arr = valueArray(values);
    return arr
      .map((v, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const r = (v / 100) * R * scale;
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(" ");
  }

  function point(i: number, r: number): [number, number] {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function valuePoint(values: Five, i: number): [number, number] {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = (valueArray(values)[i] / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  const grid = [0.25, 0.5, 0.75, 1];
  const showAxisValues = series.length === 1;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="五行能量雷达图">
      {grid.map((g) => (
        <polygon
          key={g}
          points={points({ wood: 100, fire: 100, earth: 100, metal: 100, water: 100 }, g)}
          fill="none"
          stroke="rgba(201,162,39,0.1)"
        />
      ))}
      {LABELS.map((_, i) => {
        const [x, y] = point(i, R);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(201,162,39,0.15)" />
        );
      })}
      {LABELS.map((label, i) => {
        const [x, y] = point(i, labelR);
        return (
          <text
            key={label}
            x={x}
            y={y + 4}
            textAnchor="middle"
            fill="#e8c96a"
            fontSize="13"
            fontFamily="var(--font-title)"
          >
            {label}
          </text>
        );
      })}
      {series.map((s, si) => (
        <g key={si}>
          <polygon
            points={points(s.values, 1)}
            fill={s.fill}
            stroke={s.color}
            strokeWidth="2"
            opacity="0.96"
            style={{ filter: "drop-shadow(0 0 8px rgba(201,162,39,0.32))" }}
          />
          {valueArray(s.values).map((v, i) => {
            const [x, y] = valuePoint(s.values, i);
            return (
              <circle
                key={`${si}-${i}`}
                cx={x}
                cy={y}
                r={series.length === 1 ? 3.8 : 3.1}
                fill={s.color}
                stroke="#0a0a0f"
                strokeWidth="1.4"
                aria-label={`${LABELS[i]} ${v}`}
              />
            );
          })}
        </g>
      ))}
      {showAxisValues && LABELS.map((label, i) => {
        const [x, y] = point(i, labelR + 14);
        const v = valueArray(series[0].values)[i];
        return (
          <text
            key={`${label}-value`}
            x={x}
            y={y + 4}
            textAnchor="middle"
            fill="rgba(232,230,224,0.7)"
            fontSize="10"
            fontFamily="var(--font-ui)"
          >
            {v}
          </text>
        );
      })}
    </svg>
  );
}
