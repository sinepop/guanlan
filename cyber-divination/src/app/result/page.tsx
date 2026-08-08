"use client";

import { useEffect, useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import RadarChart from "@/components/RadarChart";
import GoldIcon from "@/components/GoldIcon";
import { store } from "@/lib/store";
import { getTerm } from "@/lib/terms";
import { computeZiwei } from "@/lib/ziwei";
import { deriveBaziCredibility } from "@/lib/credibility";
import CredibilityPanel from "@/components/CredibilityPanel";
import SaveToJournal from "@/components/SaveToJournal";
import type { BaziResult, AiAnalysis } from "@/lib/types";
import { SparkIcon, SuccessIcon } from "@/components/Icons";

interface CardItem {
  text: string;
  basis?: string;
  confidence?: number;
}

const FIVE_METRICS = [
  { name: "木", key: "wood" as const, hint: "生发" },
  { name: "火", key: "fire" as const, hint: "行动" },
  { name: "土", key: "earth" as const, hint: "承载" },
  { name: "金", key: "metal" as const, hint: "决断" },
  { name: "水", key: "water" as const, hint: "流动" },
];

export default function ResultPage() {
  const [result, setResult] = useState<BaziResult | null>(null);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [poster, setPoster] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  useEffect(() => {
    const res = store.getResult();
    if (!res) {
      window.location.href = "/bazi";
      return;
    }
    setResult(res);
    setAi(store.getAi());
    setOpen({ personality: true, liuNian: true, advice: true });
  }, []);

  if (!result) return null;
  const { input, pillars, solarDate, solarTime, dayMaster, dayMasterElement, dayMasterYinYang, animal, strength, yongShen, xiShen, currentDaYun, qiYunAge, liuNian, five, shenSha, calendarChange } = result;

  const view = input.view ?? "bazi";
  const ziwei = view === "ziwei" ? (() => {
    try {
      return computeZiwei(input);
    } catch {
      return null;
    }
  })() : null;

  const pickCards = (k: keyof NonNullable<AiAnalysis["cards"]>): CardItem[] =>
    ai?.cards?.[k]?.length ? ai.cards[k] : result.cards[k].map((t) => ({ text: t }));

  const cards: Record<string, CardItem[]> = {
    personality: pickCards("personality"),
    career: pickCards("career"),
    wealth: pickCards("wealth"),
    love: pickCards("love"),
    health: pickCards("health"),
  };

  const adviceShow = ai?.advice?.length ? ai.advice : result.advice;
  const summaryText = ai?.summary || (
    view === "ziwei" && ziwei
      ? `命主${ziwei.soul}、身主${ziwei.body}，当前大限${ziwei.currentDaXian}，适合先稳住节奏再顺势推进。`
      : `${dayMaster}${dayMasterElement}日主，命局${strength}，用神取${yongShen}，宜围绕喜用五行调整行动节奏。`
  );
  const primer = view === "ziwei"
    ? [
        ["命宫", "命盘核心宫位"],
        ["大限", "十年阶段气运"],
        ["流年", "逐年运势"],
        ["五行", "金木水火土能量"],
      ]
    : [
        ["日主", "代表自己"],
        ["十神", "人事关系分类"],
        ["用神", "平衡命局的关键五行"],
        ["喜忌", "宜补与宜避的能量"],
        ["神煞", "特殊星曜提示"],
        ["大运", "十年阶段气运"],
        ["流年", "逐年运势"],
      ];
  const glossaryNames = view === "ziwei"
    ? ["命宫", "大限", "五行局", "命主", "身主", "流年", "五行", "真太阳时"]
    : ["日主", "十神", "五行", "用神", "喜忌", "神煞", "身强身弱", "大运", "流年", "真太阳时"];
  const activeTermInfo = activeTerm ? getTerm(activeTerm) : undefined;

  const modules: { key: string; title: string; body: CardItem[] }[] = [
    { key: "personality", title: "性格核心特征", body: cards.personality },
    { key: "career", title: "事业格局", body: cards.career },
    { key: "wealth", title: "财运模式", body: cards.wealth },
    { key: "love", title: "感情婚姻", body: cards.love },
    { key: "health", title: "健康提示", body: cards.health },
  ];

  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  function generatePoster() {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;

    const roundRect = (x: number, y: number, w: number, h: number, r = 14) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const wrapText = (text: string, x: number, y: number, maxW: number, lh = 28, maxLines = 4): number => {
      const chars = text.split("");
      let line = "";
      let lines = 0;
      for (const ch of chars) {
        if (ctx.measureText(line + ch).width > maxW && line) {
          ctx.fillText(line, x, y);
          y += lh;
          lines += 1;
          line = ch;
          if (lines >= maxLines) return y;
        } else {
          line += ch;
        }
      }
      if (line && lines < maxLines) {
        ctx.fillText(line, x, y);
        y += lh;
      }
      return y;
    };
    const sectionTitle = (title: string, y: number) => {
      ctx.fillStyle = "#c9a227";
      ctx.font = "22px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.textAlign = "left";
      ctx.fillText(title, 54, y);
      ctx.fillStyle = "rgba(201,162,39,0.65)";
      ctx.fillRect(38, y - 20, 4, 24);
    };
    const metricLine = (label: string, value: string, x: number, y: number) => {
      ctx.fillStyle = "#8a8698";
      ctx.font = "15px 'Noto Sans SC', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, x, y);
      ctx.fillStyle = "#e8c96a";
      ctx.font = "20px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.fillText(value, x, y + 30);
    };

    // 玄黑底 + 暗金光场
    const bg = ctx.createLinearGradient(0, 0, 0, 1200);
    bg.addColorStop(0, "#0e0d12");
    bg.addColorStop(0.45, "#0a0a0f");
    bg.addColorStop(1, "#07070b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 600, 1200);
    const aura = ctx.createRadialGradient(300, 120, 20, 300, 160, 340);
    aura.addColorStop(0, "rgba(201,162,39,0.2)");
    aura.addColorStop(1, "rgba(201,162,39,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 600, 360);
    ctx.strokeStyle = "rgba(201,162,39,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 552, 1152);

    // 标题区
    ctx.fillStyle = "#c9a227";
    ctx.font = "40px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText(view === "ziwei" ? "观澜 · 紫微盘" : "观澜 · 命盘", 300, 82);
    ctx.fillStyle = "#8a8698";
    ctx.font = "16px 'Noto Sans SC', sans-serif";
    ctx.fillText(`${solarDate} · ${solarTime.slice(11)} 真太阳时 · ${input.gender === "male" ? "乾造" : "坤造"}`, 300, 122);
    ctx.fillStyle = "#e8c96a";
    ctx.font = "22px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.fillText(`${dayMaster}${dayMasterElement}日主 · ${strength} · ${yongShen}`, 300, 160);

    // 一句话总评
    roundRect(48, 188, 504, 112, 16);
    ctx.fillStyle = "rgba(18,18,28,0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(201,162,39,0.28)";
    ctx.stroke();
    ctx.fillStyle = "#e8c96a";
    ctx.font = "19px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    wrapText(`「${summaryText}」`, 300, 232, 430, 30, 3);

    // 四柱
    sectionTitle("四柱排盘", 348);
    const pLabels = ["年柱", "月柱", "日柱", "时柱"];
    pLabels.forEach((lab, i) => {
      const x = 60 + i * 126;
      roundRect(x, 374, 102, 132, 12);
      ctx.fillStyle = "rgba(18,18,28,0.7)";
      ctx.fill();
      ctx.strokeStyle = "rgba(201,162,39,0.24)";
      ctx.stroke();
      ctx.fillStyle = "#8a8698";
      ctx.font = "14px 'Noto Sans SC'";
      ctx.textAlign = "center";
      ctx.fillText(lab, x + 51, 405);
      ctx.fillStyle = "#e8c96a";
      ctx.font = "36px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.fillText(pillars[i].gan + pillars[i].zhi, x + 51, 454);
      ctx.fillStyle = "#d4a574";
      ctx.font = "13px 'Noto Sans SC', sans-serif";
      ctx.fillText(pillars[i].shishen, x + 51, 484);
    });

    // 命盘要览
    sectionTitle("命盘要览", 560);
    metricLine("生肖", animal, 54, 596);
    metricLine("日主", `${dayMaster}（${dayMasterElement} · ${dayMasterYinYang}）`, 190, 596);
    metricLine("当前大运", currentDaYun.gan ? `${currentDaYun.gan}${currentDaYun.zhi} ${currentDaYun.startYear}-${currentDaYun.endYear}` : "尚未起运", 54, 672);
    metricLine("喜神", xiShen, 320, 672);

    // 五行
    sectionTitle("五行能量", 770);
    FIVE_METRICS.forEach((m, i) => {
      const v = five[m.key];
      const y = 808 + i * 38;
      ctx.fillStyle = "#e8c96a";
      ctx.font = "18px 'Smiley Sans', 'Noto Serif SC'";
      ctx.textAlign = "left";
      ctx.fillText(m.name, 58, y);
      ctx.fillStyle = "rgba(232,230,224,0.55)";
      ctx.font = "13px 'Noto Sans SC', sans-serif";
      ctx.fillText(m.hint, 86, y);
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(142, y - 14, 320, 16);
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(142, y - 14, 320 * (v / 100), 16);
      ctx.fillStyle = "#8a8698";
      ctx.font = "13px 'Noto Sans SC', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${v}`, 506, y);
    });

    // 流年与建议
    sectionTitle("近期流年", 1022);
    ctx.font = "15px 'Noto Sans SC', sans-serif";
    ctx.textAlign = "left";
    liuNian.slice(0, 3).forEach((l, i) => {
      const y = 1056 + i * 28;
      ctx.fillStyle = "#e8c96a";
      ctx.fillText(`${l.year} ${l.gan}${l.zhi} · ${l.if}`, 54, y);
      ctx.fillStyle = "#8a8698";
      ctx.fillText(ai?.liuNian?.[String(l.year)] || l.summary, 200, y);
    });
    ctx.fillStyle = "#d4a574";
    ctx.font = "15px 'Noto Sans SC', sans-serif";
    wrapText(`建议：${adviceShow.slice(0, 2).join("；")}`, 54, 1140, 492, 24, 2);

    // 底部
    ctx.fillStyle = "#8a8698";
    ctx.font = "13px 'Noto Sans SC'";
    ctx.textAlign = "center";
    ctx.fillText("观澜 · 命理仅供文化娱乐与自我反思", 300, 1168);
    const url = canvas.toDataURL("image/png");
    setPoster(url);
  }

  return (
    <main className="bg-result relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={25} />
      <div className="page-shell">
        <Header />

        {/* 命理报告标题 */}
        <div className="mb-5 flex items-center justify-center gap-3">
          <GoldIcon src="/icons/icon-result-scroll.svg" size={40} />
          <h2 className="font-display text-[1.35rem] tracking-[0.18em] text-gold-light">命理报告</h2>
        </div>

        {/* 一句话总评 */}
        <div className="glass-panel mb-4 rounded-card border border-gold/25 bg-gold/10 p-5 text-center">
          <p className="type-title text-[1.05rem] leading-8">「{summaryText}」</p>
        </div>

        {/* 可信度 / 仅供参考印章 */}
        <CredibilityPanel cred={deriveBaziCredibility(result)} />

        <div className="term-primer mb-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {primer.map(([name, desc]) => (
            <span key={name}>
              <b>{name}<TermHelpButton name={name} onOpen={setActiveTerm} /></b>：{desc}
            </span>
          ))}
        </div>

        {/* 四柱总览（八字/职场视角） */}
        {view !== "ziwei" && (
          <div className="mb-4 grid grid-cols-4 gap-2.5">
            {pillars.map((p) => (
              <div key={p.label} className="glass-panel rounded-[10px] p-3 text-center">
                <div className="type-overline mb-1.5">{p.label}</div>
                <div className="type-title text-[1.5rem] font-bold text-gold">{p.gan}</div>
                <div className="type-title mt-1 text-[1.1rem] text-vermilion">{p.zhi}</div>
                <div className="mt-1.5 inline-block rounded-[10px] bg-gold/10 px-2 py-0.5 text-[0.65rem] text-mist-dim">{p.shishen}</div>
              </div>
            ))}
          </div>
        )}

        {/* 紫微星盘总览（紫微视角） */}
        {view === "ziwei" && ziwei && (
          <div className="glass-panel mb-4 rounded-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="card-title">紫微星盘</div>
              <div className="type-caption">
                {ziwei.fiveElementsClass} · 命主<TermHelpButton name="命主" onOpen={setActiveTerm} />{ziwei.soul} · 身主<TermHelpButton name="身主" onOpen={setActiveTerm} />{ziwei.body}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ziwei.palaces.map((pl) => {
                const isMing = pl.name === "命宫";
                const isCur = pl.decadal && ziwei.currentDaXian.startsWith(pl.decadal);
                return (
                  <div
                    key={pl.name}
                    className={`rounded-[10px] border p-2.5 text-center ${
                      isCur
                        ? "border-gold bg-gold/15"
                        : isMing
                          ? "border-vermilion/40 bg-vermilion/10"
                          : "border-gold/20 bg-ink"
                    }`}
                  >
                    <div className="text-[0.65rem] tracking-[0.1em] text-mist-dim">
                      {pl.name}{pl.isBody ? "（身宫）" : ""}
                      {isCur && <span className="ml-1 text-gold-light">大限</span>}
                    </div>
                    <div className="mt-1 font-serif text-[0.8rem] leading-5 text-gold-light">
                      {pl.main ? pl.main.replace(/\([^)]*\)/g, "") : "空宫"}
                    </div>
                    {pl.minor && <div className="text-[0.6rem] text-mist-dim">{pl.minor.split(" ").slice(0, 3).join(" ")}</div>}
                    <div className="mt-1 text-[0.6rem] text-mist-dim opacity-70">
                      {pl.gan}{pl.zhi} {pl.decadal || ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[0.7rem] leading-5 text-mist-dim">
              当前大限：{ziwei.currentDaXian}（当前虚岁 {ziwei.currentAge} 岁）
            </p>
          </div>
        )}

        {/* 命盘要览 */}
        <div className="glass-panel mb-4 rounded-card p-5">
          {view === "ziwei" && ziwei ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="type-caption">五行局<TermHelpButton name="五行局" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-lg">{ziwei.fiveElementsClass}</div>
              </div>
              <div>
                <div className="type-caption">生肖</div>
                <div className="type-title mt-1 text-lg">{animal}</div>
              </div>
              <div>
                <div className="type-caption">命主<TermHelpButton name="命主" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-lg">{ziwei.soul}</div>
              </div>
              <div>
                <div className="type-caption">身主<TermHelpButton name="身主" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-lg">{ziwei.body}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="type-caption">日主<TermHelpButton name="日主" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-lg">{dayMaster}（{dayMasterElement} · {dayMasterYinYang}）</div>
              </div>
              <div>
                <div className="type-caption">生肖</div>
                <div className="type-title mt-1 text-lg">{animal}</div>
              </div>
              <div>
                <div className="type-caption">格局强弱<TermHelpButton name="身强身弱" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-base">{strength}</div>
              </div>
              <div>
                <div className="type-caption">用神<TermHelpButton name="用神" onOpen={setActiveTerm} /></div>
                <div className="type-title mt-1 text-base">{yongShen}</div>
              </div>
            </div>
          )}
          <div className="type-caption mt-4 border-t border-gold/10 pt-3">
            {view === "ziwei" ? (
              <>{ziwei ? <>当前大限<TermHelpButton name="大限" onOpen={setActiveTerm} />：<span className="text-gold-light">{ziwei.currentDaXian}</span></> : "紫微排盘失败，请稍后重试。"}</>
            ) : currentDaYun.gan ? (
              <>当前大运<TermHelpButton name="大运" onOpen={setActiveTerm} />：<span className="text-gold-light">{currentDaYun.gan}{currentDaYun.zhi}</span>（{qiYunAge}岁起运，{currentDaYun.startYear}-{currentDaYun.endYear}）</>
            ) : (
              <>尚未起运，当前运势看命宫胎元，起运后正式行大运。</>
            )}
          </div>
          <div className="type-caption mt-2 opacity-80">{calendarChange}</div>
        </div>

        {/* 五行雷达图（八字/职场视角） */}
        {view !== "ziwei" && (
          <div className="glass-panel mb-4 rounded-card p-5">
            <div className="mb-4 flex items-center justify-center gap-2">
              <GoldIcon src="/icons/icon-wuxing-radar.svg" size={28} />
              <div className="card-title mb-0">五行能量<TermHelpButton name="五行" onOpen={setActiveTerm} /></div>
            </div>
            <div className="flex justify-center">
              <RadarChart series={[{ color: "#c9a227", fill: "rgba(201,162,39,0.25)", values: five }]} size={240} />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {FIVE_METRICS.map((m) => (
                <div key={m.key} className="rounded-[8px] border border-gold/15 bg-ink/55 px-1.5 py-2 text-center">
                  <div className="type-title text-sm">{m.name}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gold/10">
                    <i className="block h-full rounded-full bg-gold" style={{ width: `${five[m.key]}%` }} />
                  </div>
                  <div className="mt-1 font-sans text-[0.65rem] text-mist-dim">{five[m.key]}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-2">
              {shenSha.map((s) => (
                <span key={s} className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[0.65rem] text-gold-light">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* 模块卡片 */}
        {modules.map((m) => (
          <div key={m.key} className={`collapse-card mb-4 ${open[m.key] ? "open" : ""}`}>
            <div className="collapse-head" onClick={() => toggle(m.key)}>
              <span className="title"><SparkIcon />{m.title}</span>
              <span className={`text-sm text-mist-dim transition-transform duration-300 ${open[m.key] ? "rotate-180" : ""}`}>▼</span>
            </div>
            <div className="collapse-body" style={{ maxHeight: open[m.key] ? 600 : 0 }}>
              <div className="collapse-body-inner">
                {m.body.map((c, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <p className="type-body">{c.text}</p>
                    {c.basis && <p className="analysis-basis">依据：{c.basis}</p>}
                    {c.confidence !== undefined && (
                      <div className="mt-1.5 flex items-center gap-2 text-[0.65rem] text-mist-dim">
                        <span>置信度</span>
                        <span className="confidence-bar w-16"><i style={{ width: `${c.confidence * 100}%` }} /></span>
                        <span>{Math.round(c.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* 流年运势 */}
        <div className={`collapse-card mb-4 ${open.liuNian ? "open" : ""}`}>
          <div className="collapse-head" onClick={() => toggle("liuNian")}>
            <span className="title"><ScrollIconMini />{liuNian.length ? `${liuNian[0].year}-${liuNian[liuNian.length - 1].year} 流年运势` : "流年运势"}</span>
            <span className={`text-sm text-mist-dim transition-transform duration-300 ${open.liuNian ? "rotate-180" : ""}`}>▼</span>
          </div>
          <div className="collapse-body" style={{ maxHeight: open.liuNian ? 600 : 0 }}>
            <div className="relative px-5 pb-5 pl-8">
              <div className="absolute bottom-0 left-[10px] top-0 w-px bg-gradient-to-b from-gold to-transparent" />
              {liuNian.map((l) => (
                <div key={l.year} className="relative pb-5">
                  <div className="absolute -left-[18px] top-[6px] h-[9px] w-[9px] rounded-full bg-gold shadow-[0_0_10px_var(--gold)]" />
                  <div className="font-serif text-base text-gold-light">
                    {l.year} {l.gan}{l.zhi}
                    <span className="ml-2 rounded bg-gold/10 px-1.5 py-0.5 text-[0.65rem] text-vermilion">{l.if}</span>
                  </div>
                  <div className="type-caption mt-1">{ai?.liuNian?.[String(l.year)] || l.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 可执行建议 */}
        <div className={`collapse-card mb-4 ${open.advice ? "open" : ""}`}>
          <div className="collapse-head" onClick={() => toggle("advice")}>
            <span className="title"><SuccessIcon />可执行建议</span>
            <span className={`text-sm text-mist-dim transition-transform duration-300 ${open.advice ? "rotate-180" : ""}`}>▼</span>
          </div>
          <div className="collapse-body" style={{ maxHeight: open.advice ? 500 : 0 }}>
            <div className="collapse-body-inner">
              {adviceShow.map((a, i) => (
                <div key={i} className="flex gap-3 border-b border-gold/10 py-3 last:border-b-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/15 text-xs text-gold-light">{i + 1}</span>
                  <span className="type-body text-[0.9rem]">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 术语解释 */}
        <div className="glass-panel mb-6 rounded-card p-5">
          <div className="card-title">术语小解</div>
          <div className="grid grid-cols-2 gap-2">
            {glossaryNames.map((t) => {
              const term = getTerm(t);
              return term ? (
                <button
                  key={t}
                  type="button"
                  className="flex items-center justify-between rounded-[8px] border border-gold/15 bg-ink/55 px-3 py-2 text-left transition hover:border-gold/35"
                  onClick={() => setActiveTerm(t)}
                >
                  <span className="type-title text-[0.86rem]">{term.name}</span>
                  <span className="ml-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-[0.62rem] leading-none text-gold-light">?</span>
                </button>
              ) : null;
            })}
          </div>
        </div>

        <TermDetailPanel term={activeTermInfo} onClose={() => setActiveTerm(null)} />

        {/* 命盘海报 */}
        {poster && (
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-mist-dim">
              <GoldIcon src="/icons/icon-share-seal.svg" size={20} />
              <span>命盘海报 · 可保存分享</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster} alt="命盘海报" className="w-full rounded-card border border-gold/25" />
            <a href={poster} download="命盘海报.png" className="btn-primary mt-3 block text-center text-sm">保存海报</a>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-[10px] border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold"
            onClick={() => (window.location.href = "/bazi")}
          >
            再测一次
          </button>
          <button className="btn-primary flex-[2] text-sm" onClick={generatePoster}>生成命盘海报</button>
        </div>
        <SaveToJournal
          type="bazi"
          resultSummary={`${dayMaster}${dayMasterElement}日主 · ${strength} · 用神${yongShen}`}
          question={`${view === "ziwei" ? "紫微" : "八字"}排盘`}
          calculation={calendarChange}
          advice={adviceShow.slice(0, 2).join("；")}
          className="mt-3"
        />

        <p className="type-caption mt-8 border-t border-gold/10 pt-4 text-center opacity-60">
          命理分析仅供文化娱乐与自我反思参考
          <br />
          生辰与事件信息将发送至 AI 服务生成分析，请勿填写敏感隐私
          <br />
          人生最终由自己的选择决定
        </p>
      </div>
    </main>
  );
}

function ScrollIconMini() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function TermHelpButton({ name, onOpen }: { name: string; onOpen: (name: string) => void }) {
  if (!getTerm(name)) return null;
  return (
    <button
      type="button"
      className="ml-1 inline-flex h-4 w-4 translate-y-[-1px] items-center justify-center rounded-full border border-gold/35 bg-gold/10 align-middle text-[0.62rem] leading-none text-gold-light transition hover:border-gold hover:bg-gold/20"
      aria-label={`查看${name}解释`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(name);
      }}
    >
      ?
    </button>
  );
}

function TermDetailPanel({ term, onClose }: { term: ReturnType<typeof getTerm>; onClose: () => void }) {
  if (!term) return null;
  return (
    <div className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-[420px] rounded-card border border-gold/35 bg-[#11111b]/95 p-4 text-left shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_28px_rgba(201,162,39,0.18)] backdrop-blur" role="dialog" aria-modal="false">
      <div className="flex items-start justify-between gap-4">
        <div className="type-title text-lg">{term.name}</div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/25 text-sm text-mist-dim transition hover:border-gold hover:text-gold-light"
          aria-label="关闭术语解释"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="type-body mt-2 text-[0.88rem]">{term.desc}</p>
    </div>
  );
}
