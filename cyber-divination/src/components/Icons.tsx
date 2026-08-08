// 金色线性 SVG 图标（统一图标风格，替代 emoji）
interface IconProps {
  className?: string;
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function HomeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function BackIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function BaziIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
    </svg>
  );
}

export function HeartIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 20.5c-4.5-3-7.5-6-7.5-9.5a4.5 4.5 0 0 1 8-2.7 4.5 4.5 0 0 1 8 2.7c0 3.5-3 6.5-7.5 9.5z" />
    </svg>
  );
}

export function ScrollIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3h12a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function ShareIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6" />
    </svg>
  );
}

export function AlertIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l9 17H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function SparkIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  );
}

export function CompassIcon({ className, size = 22 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

export function SuccessIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function CheckIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12l5 5L20 6.5" />
    </svg>
  );
}

export function WarnIcon({ className, size = 14 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l9 17H3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function DiamondIcon({ className, size = 12 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l9 9-9 9-9-9z" />
    </svg>
  );
}