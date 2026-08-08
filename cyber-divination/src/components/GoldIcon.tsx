// 暗金资产图标（/public/icons 下的 SVG，统一光晕 + 尺寸）
export default function GoldIcon({
  src,
  size = 44,
  className = "",
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`icon-gold ${className}`}
      style={{ width: size, height: size }}
    />
  );
}