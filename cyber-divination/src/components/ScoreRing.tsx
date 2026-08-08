// 缘分指数环
interface Props {
  value: number; // 0-100
  label: string;
  size?: number;
}

export default function ScoreRing({ value, label, size = 150 }: Props) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 150 150">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6d1a" />
            <stop offset="100%" stopColor="#e8c96a" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(201,162,39,0.12)" strokeWidth="8" />
        <circle
          cx="75"
          cy="75"
          r={r}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 75 75)"
          style={{ transition: "stroke-dashoffset 1.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[2.2rem] font-bold text-gold-light drop-shadow-[0_0_20px_rgba(201,162,39,0.4)]">
          {value}
        </span>
        <span className="mt-0.5 text-[0.7rem] tracking-[0.2em] text-mist-dim">{label}</span>
      </div>
    </div>
  );
}