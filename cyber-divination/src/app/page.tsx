"use client";

import { useEffect, useState } from "react";
import Particles from "@/components/Particles";
import GoldIcon from "@/components/GoldIcon";
import { getTodaySign } from "@/lib/signs";

export default function HallPage() {
  const [today, setToday] = useState<{ dateStr: string; sign: { number: string; title: string; advice: string } } | null>(null);

  // 首页每日一签小卡：今天求过签才显示
  useEffect(() => {
    const t = getTodaySign();
    if (t) setToday({ dateStr: t.dateStr, sign: { number: t.sign.number, title: t.sign.title, advice: t.sign.advice } });
  }, []);

  return (
    <main className="bg-home relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={35} />

      <div className="relative z-10 mx-auto max-w-[520px] px-6 pb-24 pt-10">
        {/* 品牌 */}
        <header className="mb-8 text-center">
          <h1 className="holo-title text-[2.5rem] leading-tight tracking-[0.26em]">
            观澜
          </h1>
          <p className="holo-overline type-overline mt-2 text-mist">观水有术 · 必观其澜</p>
          <p className="type-title mt-4 text-[0.95rem]">
            见微澜而知其<span className="text-cinnabar">变</span>
            <span className="mx-1 text-gold/40">·</span>
            察时变而观其<span className="text-cinnabar">源</span>
          </p>
        </header>

        {/* 每日一签（最大入口，置顶；标题组件在左，抽签展示在右） */}
        <button
          className="feature-card primary holo-border flex min-h-[176px] w-full items-stretch gap-4 !p-5 text-left"
          onClick={() => (window.location.href = "/daily-fortune")}
        >
          {/* 左：标题 + 组件 */}
          <span className="flex shrink-0 flex-col items-center justify-center gap-1.5 text-center">
            <GoldIcon src="/icons/icon-daily.svg" size={44} />
            <span className="type-title text-lg text-mist">每日一签</span>
            <span className="type-caption">今日关键词 · 宜忌</span>
          </span>

          {/* 右：抽签后的展示（签信息在竖线与徽标之间居中，朱砂竖徽标钉最右） */}
          <span className="flex min-w-0 flex-1 items-center gap-3 border-l border-gold/20 pl-4">
            <span className="flex min-w-0 flex-1 items-center justify-center">
              {today ? (
                <span className="flex min-w-0 flex-col items-start gap-1.5 text-left">
                  <span className="flex items-baseline gap-2">
                    <span className="type-overline text-[0.8rem] tracking-[0.14em] text-cinnabar">{today.sign.number}</span>
                    <span className="type-title min-w-0 text-lg text-gold-light">{today.sign.title}</span>
                  </span>
                  <span className="type-caption line-clamp-2 text-left">{today.sign.advice}</span>
                </span>
              ) : (
                <span className="type-caption text-left opacity-60">今日未求签 · 点此抽一签</span>
              )}
            </span>
            <span className="seal-vertical shrink-0">今日已求签</span>
          </span>
        </button>

        {/* 占卜 + 命理（并排） */}
        <div className="mt-3.5 grid grid-cols-2 gap-3.5">
          <button
            className="feature-card holo-border flex flex-col items-center gap-2.5 !p-5 text-center"
            onClick={() => (window.location.href = "/ask")}
          >
            <GoldIcon src="/icons/icon-ask.svg" size={44} />
            <span className="type-title text-base text-mist">占卜</span>
            <span className="type-caption">梅花易数 · 决策问答</span>
          </button>

          <button
            className="feature-card holo-border flex flex-col items-center gap-2.5 !p-5 text-center"
            onClick={() => (window.location.href = "/mingli")}
          >
            <GoldIcon src="/icons/icon-chart.svg" size={44} />
            <span className="type-title text-base text-mist">命理</span>
            <span className="type-caption">八字 · 紫微 · 合盘</span>
          </button>
        </div>

        {/* 应验簿（细窄入口） */}
        <button
          className="holo-border mt-3.5 flex w-full items-center gap-3 rounded-card border border-gold/20 bg-[rgba(18,18,28,0.5)] px-5 py-3 text-left transition hover:border-gold/50"
          onClick={() => (window.location.href = "/ledger")}
        >
          <GoldIcon src="/icons/icon-result-scroll.svg" size={26} />
          <span className="type-title text-sm text-mist">应验簿</span>
          <span className="type-caption ml-auto opacity-60">回顾每次占问 →</span>
        </button>

        {/* 警示（唯一提示语） */}
        <p className="type-caption mt-10 text-center opacity-70">
          命理仅供文化娱乐与自我反思，人生由自己的选择决定
        </p>
      </div>
    </main>
  );
}
