// 顶部返回大厅按钮（所有二级页可回首页，宫阙图标）
export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <button
        className="back-btn"
        onClick={() => (window.location.href = "/")}
        aria-label="返回大厅"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-home-palace.svg" alt="" width={18} height={18} className="opacity-80" />
        返回大厅
      </button>
      {title && (
        <div className="text-center">
          <h1 className="font-display text-[1.8rem] tracking-[0.22em] text-cinnabar">{title}</h1>
          {subtitle && <p className="type-overline mt-1">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
