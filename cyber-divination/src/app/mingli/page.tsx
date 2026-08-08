"use client";

import Particles from "@/components/Particles";
import Header from "@/components/Header";
import GoldIcon from "@/components/GoldIcon";

// 命理：四柱八字 / 紫微斗数 / 双人合盘
// 八字与紫微共用同一张出生信息表单（bazi 页按 view 切换排盘引擎），
// 这里用 ?view=bazi|ziwei 预选视角；合盘复用现有 /compat。

const ENTRIES = [
  {
    href: "/bazi?view=bazi",
    icon: "/icons/icon-chart.svg",
    title: "四柱八字",
    desc: "年柱月柱 · 五行结构 · 大运流年",
    seal: "八字",
  },
  {
    href: "/bazi?view=ziwei",
    icon: "/icons/icon-bazi-compass.svg",
    title: "紫微斗数",
    desc: "十二宫星曜 · 庙旺四化 · 大限",
    seal: "紫微",
  },
  {
    href: "/compat",
    icon: "/icons/icon-compat.svg",
    title: "双人合盘",
    desc: "关系结构 · 互补冲突 · 相处节奏",
    seal: "合盘",
  },
];

export default function MingLiPage() {
  return (
    <main className="bg-ask relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={25} />
      <div className="page-shell">
        <Header title="命理" subtitle="四柱八字 · 紫微斗数 · 双人合盘" />

        <div className="space-y-3.5">
          {ENTRIES.map((e) => (
            <button
              key={e.title}
              className="feature-card flex w-full flex-row items-center gap-4 !p-5 text-left"
              onClick={() => (window.location.href = e.href)}
            >
              <GoldIcon src={e.icon} size={40} />
              <span className="min-w-0 flex-1">
                <span className="type-title block text-base text-mist">{e.title}</span>
                <span className="type-caption mt-0.5 block">{e.desc}</span>
              </span>
              <span className="vermilion-seal">{e.seal}</span>
            </button>
          ))}
        </div>

        <p className="type-caption mt-10 text-center opacity-60">
          命理仅供文化娱乐与自我反思，人生由自己的选择决定
        </p>
      </div>
    </main>
  );
}
