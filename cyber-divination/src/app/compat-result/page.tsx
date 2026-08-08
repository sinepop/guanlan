"use client";

import { useEffect, useState, type ReactNode } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import RadarChart from "@/components/RadarChart";
import ScoreRing from "@/components/ScoreRing";
import GoldIcon from "@/components/GoldIcon";
import { Toast, useToast } from "@/components/Toast";
import { computeBazi } from "@/lib/bazi";
import { computeCompat } from "@/lib/compat";
import { store } from "@/lib/store";
import { deriveCompatCredibility } from "@/lib/credibility";
import CredibilityPanel from "@/components/CredibilityPanel";
import SaveToJournal from "@/components/SaveToJournal";
import { CheckIcon, WarnIcon, DiamondIcon } from "@/components/Icons";
import type { BaziResult, CompatScore } from "@/lib/types";

export default function CompatResultPage() {
  const [a, setA] = useState<BaziResult | null>(null);
  const [b, setB] = useState<BaziResult | null>(null);
  const [score, setScore] = useState<CompatScore | null>(null);
  const [relation, setRelation] = useState("couple");
  const [open, setOpen] = useState<Record<string, boolean>>({ dimensions: true, relation: true, match: true });
  const [poster, setPoster] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const input = store.getCompatInput();
    if (!input) {
      window.location.href = "/compat";
      return;
    }
    try {
      const ra = computeBazi(input.a);
      const rb = computeBazi(input.b);
      const s = computeCompat(ra, rb, input.relation);
      setA(ra);
      setB(rb);
      setScore(s);
      setRelation(input.relation);
      store.setCompatResult(s);
    } catch {
      window.location.href = "/compat";
    }
  }, []);

  if (!a || !b || !score) return null;

  const dims = [
    { key: "attraction", label: "吸引力", value: score.dimensions.attraction },
    { key: "stability", label: "稳定性", value: score.dimensions.stability },
    { key: "communication", label: "沟通度", value: score.dimensions.communication },
    { key: "effort", label: "长期经营难度", value: score.dimensions.effort, invert: true },
  ];
  const relationNames: Record<string, string> = {
    couple: "情侣/夫妻",
    friends: "朋友",
    work: "同事/合伙人",
    family: "家人",
  };
  const relationName = relationNames[relation] ?? "关系";
  const summary = `${score.total}分 · ${score.label}，以${relationName}关系看，适合把互补优势转化为稳定经营。`;
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  async function share() {
    if (!score) return;
    const usingNativeShare = "share" in navigator;
    try {
      if (usingNativeShare) {
        await navigator.share({
          title: "观澜 · 缘分合盘",
          text: `我们的缘分指数：${score.total}分 · ${score.label}！`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setPoster(true);
      }
    } catch (err) {
      // 用户主动取消分享不算错误
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPoster(true);
      showToast(usingNativeShare ? "分享失败，请重试" : "复制链接失败");
    }
  }

  return (
    <main className="bg-compat relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={25} />
      <div className="page-shell">
        <Header />

        <div className="mb-5 flex items-center justify-center gap-3">
          <GoldIcon src="/icons/icon-result-scroll.svg" size={40} />
          <h2 className="font-display text-[1.35rem] tracking-[0.18em] text-gold-light">缘分合盘报告</h2>
        </div>

        {/* 一句话总评 */}
        <div className="glass-panel mb-5 rounded-card p-6 text-center">
          <ScoreRing value={score.total} label="缘分指数" />
          <div className="type-title mt-4 text-[1.3rem] text-vermilion">{score.label}</div>
          <p className="type-title mt-3 text-base">「{summary}」</p>
        </div>

        {/* 可信度 / 仅供参考印章 */}
        <CredibilityPanel cred={deriveCompatCredibility(a, b)} />

        {/* 基础命盘摘要 */}
        <div className="glass-panel mb-5 rounded-card p-5">
          <div className="card-title">基础命盘摘要</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-[10px] border border-gold/20 bg-ink/60 p-3">
              <span className="vermilion-seal">甲方</span>
              <div className="type-title mt-2 text-lg">{a.dayMaster}{a.dayMasterElement}日主</div>
              <p className="type-caption mt-1">{a.strength} · 用神 {a.yongShen}</p>
            </div>
            <div className="rounded-[10px] border border-gold/20 bg-ink/60 p-3">
              <span className="vermilion-seal">乙方</span>
              <div className="type-title mt-2 text-lg">{b.dayMaster}{b.dayMasterElement}日主</div>
              <p className="type-caption mt-1">{b.strength} · 用神 {b.yongShen}</p>
            </div>
          </div>
          <div className="term-primer mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <span><b>日主</b>：代表自己</span>
            <span><b>用神</b>：平衡命局的关键五行</span>
            <span><b>五行</b>：金木水火土能量</span>
            <span><b>天干五合</b>：日主天干间的契合</span>
          </div>
        </div>

        {/* 五行雷达图 */}
        <div className="glass-panel mb-5 rounded-card p-5">
          <div className="mb-4 flex items-center justify-center gap-2">
            <GoldIcon src="/icons/icon-wuxing-radar.svg" size={26} />
            <div className="card-title mb-0">五行能量对比</div>
          </div>
          <div className="flex justify-center">
            <RadarChart
              series={[
                { color: "#c9a227", fill: "rgba(201,162,39,0.25)", values: score.fiveA },
                { color: "#d4a574", fill: "rgba(212,165,116,0.25)", values: score.fiveB },
              ]}
              size={260}
            />
          </div>
          <div className="mt-2 flex justify-center gap-5 text-xs text-mist-dim">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-gold" />甲方 {a.dayMaster}{a.dayMasterElement}</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#d4a574]" />乙方 {b.dayMaster}{b.dayMasterElement}</span>
          </div>
        </div>

        <CollapseSection title="四项评分" open={open.dimensions} onToggle={() => toggle("dimensions")}>
          <div className="space-y-3">
            {dims.map((d) => (
              <div key={d.key}>
                <div className="mb-1 flex justify-between text-xs text-mist-dim">
                  <span>{d.label}</span>
                  <span className="text-gold-light">{d.value}{d.invert ? "（越低越好）" : ""}</span>
                </div>
                <div className="confidence-bar"><i style={{ width: `${d.invert ? 100 - d.value : d.value}%` }} /></div>
              </div>
            ))}
          </div>
        </CollapseSection>

        <CollapseSection title="关系适配" open={open.relation} onToggle={() => toggle("relation")}>
          {score.relationFit.map((r, i) => (
            <div key={i} className="mb-2 flex gap-3 last:mb-0">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/15 text-gold-light"><DiamondIcon /></span>
              <p className="type-body">{r}</p>
            </div>
          ))}
        </CollapseSection>

        <CollapseSection title="匹配分析" open={open.match} onToggle={() => toggle("match")} maxHeight={1200}>
          <div className="mb-2 text-xs tracking-[0.1em] text-gold-light"><CheckIcon className="mr-1 inline text-gold" />互补点</div>
          {score.complement.map((c, i) => (
            <div key={i} className="mb-3 flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gold/15 text-gold-light"><CheckIcon /></span>
              <p className="type-body">{c}</p>
            </div>
          ))}
          <div className="mb-2 mt-5 text-xs tracking-[0.1em] text-[#d4a574]"><WarnIcon className="mr-1 inline text-[#d4a574]" />需磨合</div>
          {score.conflict.map((c, i) => (
            <div key={i} className="mb-3 flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#d4a574]/15 text-[#d4a574]"><WarnIcon /></span>
              <p className="type-body">{c}</p>
            </div>
          ))}
          <div className="mb-2 mt-5 text-xs tracking-[0.1em] text-gold-light"><DiamondIcon className="mr-1 inline text-gold" />相处建议</div>
          {score.advice.map((a, i) => (
            <div key={i} className="mb-2 flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-gold/25 bg-gold/15 text-xs text-gold-light">{i + 1}</span>
              <p className="type-body">{a}</p>
            </div>
          ))}
        </CollapseSection>

        {/* 术语解释 */}
        <div className="term-tip mb-6">
          <b>小知识：</b>「五行」指金木水火土五种能量，「相生」即互相滋养（如土生金、金生水）。「日主」是命盘的核心，代表你自己。「天干五合」指日主天干间的契合（如甲己合、乙庚合）。
        </div>

        {poster && (
          <p className="mb-4 text-center text-xs text-gold-light">链接已复制，请手动分享给对方</p>
        )}

        {/* 按钮 */}
        <button
          className="glass-panel flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold hover:shadow-[0_0_20px_rgba(201,162,39,0.15)]"
          onClick={share}
        >
          <GoldIcon src="/icons/icon-share-seal.svg" size={24} />
          分享缘分结果
        </button>
        <button className="mt-3 w-full rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold" onClick={() => (window.location.href = "/compat")}>
          再测一对
        </button>
        <SaveToJournal
          type="compat"
          resultSummary={`缘分指数 ${score.total}分 · ${score.label}`}
          question={relationName}
          calculation={`${a.dayMaster}${a.dayMasterElement} 与 ${b.dayMaster}${b.dayMasterElement}`}
          advice={score.advice.slice(0, 2).join("；")}
          className="mt-3"
        />

        <p className="type-caption mt-8 border-t border-gold/10 pt-4 text-center opacity-60">
          合盘结果仅供文化娱乐参考
          <br />
          缘分好坏 · 终究在于经营
        </p>
      </div>
      <Toast message={toast} />
    </main>
  );
}

function CollapseSection({
  title,
  open,
  onToggle,
  maxHeight = 700,
  children,
}: {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  maxHeight?: number;
  children: ReactNode;
}) {
  return (
    <div className={`collapse-card mb-5 ${open ? "open" : ""}`}>
      <button type="button" className="collapse-head w-full text-left" onClick={onToggle}>
        <span className="title">{title}</span>
        <span className={`text-sm text-mist-dim transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      <div className="collapse-body" style={{ maxHeight: open ? maxHeight : 0 }}>
        <div className="collapse-body-inner">{children}</div>
      </div>
    </div>
  );
}
