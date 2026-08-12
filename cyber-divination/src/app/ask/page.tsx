"use client";

import { useEffect, useRef, useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import CredibilityPanel from "@/components/CredibilityPanel";
import SaveToJournal from "@/components/SaveToJournal";
import { Toast, useToast } from "@/components/Toast";
import { castHexagram, serializeCast, parseCast } from "@/lib/meihua";
import { deriveAskCredibility } from "@/lib/credibility";
import { getRecent } from "@/lib/journal";
import { getTopFocus } from "@/lib/memory";
import { store } from "@/lib/store";
import type { MeihuaResult, AiAskAnalysis } from "@/lib/types";
import { AI_BASE_URL } from "@/lib/api";

const TOPICS = ["工作", "感情", "项目", "二选一"];

const STEPS = [
  { label: "凝神定问", desc: "把问题写在纸上或心里，明确而不含糊" },
  { label: "默念心数", desc: "心中默念一个 1-999 的数（可选，聚焦更准）" },
  { label: "此刻起卦", desc: "取当下农历年月日时辰，代入梅花时间起卦公式" },
];

// 六爻渲染：自下而上，动爻标红
function YaoLines({ trigramIndex, movingLineInGua }: { trigramIndex: number; movingLineInGua: number | null }) {
  const bits = { 0: 0, 1: 7, 2: 3, 3: 5, 4: 1, 5: 6, 6: 2, 7: 4 }[trigramIndex] ?? 0;
  return (
    <div className="yaos" aria-label="卦象六爻">
      {[0, 1, 2].map((i) => {
        const yang = (bits & (1 << i)) !== 0;
        const isMoving = movingLineInGua === i + 1;
        return (
          <span
            key={i}
            className={`yao-line ${yang ? "" : "yin"} ${isMoving ? "moving" : ""}`}
            aria-label={isMoving ? `第${i + 1}爻动` : `${i + 1}爻`}
          />
        );
      })}
    </div>
  );
}

// 六爻卦：上下两卦叠放，动爻序号换算到整体 1-6
function HexagramView({ upper, lower, movingLine, name, symbol }: { upper: number; lower: number; movingLine: number | null; name: string; symbol: string }) {
  const upperMoving = movingLine !== null && movingLine >= 4 ? movingLine - 3 : null;
  const lowerMoving = movingLine !== null && movingLine <= 3 ? movingLine : null;
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-2">
        <YaoLines trigramIndex={upper} movingLineInGua={upperMoving} />
        <YaoLines trigramIndex={lower} movingLineInGua={lowerMoving} />
      </div>
      <div>
        <div className="type-overline mb-1">{name}</div>
        <div className="font-serif text-xl tracking-[0.3em] text-gold-light">{symbol}</div>
      </div>
    </div>
  );
}

export default function AskPage() {
  const [phase, setPhase] = useState<"form" | "casting" | "result">("form");
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [intention, setIntention] = useState("");
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<MeihuaResult | null>(null);
  const [ai, setAi] = useState<AiAskAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [poster, setPoster] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const [recent, setRecent] = useState<ReturnType<typeof getRecent>>([]);

  useEffect(() => {
    setRecent(getRecent("ask", 3));
    // 支持分享回放：?c=castAt|intention
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) {
      const parsed = parseCast(c);
      if (parsed) {
        startCast("（分享回放的卦象）", parsed.intention, parsed.now);
      }
    }
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestAi(calc: MeihuaResult) {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 60000);
    setAiLoading(true);
    try {
      const r = await fetch(`${AI_BASE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "meihua_ask",
          question: calc.input.question,
          // 语义记忆进入 LLM 输入（审查 P0-1）：关注维度让解读侧重
          memory: { focus: getTopFocus() },
          calculation: {
            mainName: calc.mainName,
            changedName: calc.changedName,
            movingLine: calc.movingLine,
            mainUpper: calc.mainUpper.name,
            mainLower: calc.mainLower.name,
            tiGua: calc.tiGua.name,
            yongGua: calc.yongGua.name,
            tiYongRelation: calc.tiYongRelation,
            intention: calc.calculation.intention,
            lunarDate: calc.lunarDate,
            timeZhi: calc.timeZhi,
            formula: calc.calculation.formula,
          },
        }),
        signal: controller.signal,
      });
      const j = await r.json();
      if (j.ok && j.analysis) {
        setAi(j.analysis as AiAskAnalysis);
        setResult((prev) => (prev ? { ...prev, ai: j.analysis, aiOk: true } : prev));
      } else {
        showToast("AI 解读暂不可用，已展示规则卦辞");
      }
    } catch {
      showToast("AI 解读暂不可用，已展示规则卦辞");
    } finally {
      clearTimeout(timer);
      setAiLoading(false);
    }
  }

  function startCast(q: string, int: number | null, now?: number) {
    setResult(null);
    setAi(null);
    setPoster(null);
    setStepIndex(0);
    setPhase("casting");
    try {
      const res = castHexagram({ question: q, intention: int, now });
      setResult(res);
      storeCast(res);
      // 关注维度由 SaveToJournal 存档时统一推断（单一真相源），这里不再双写
      requestAi(res);
    } catch {
      setPhase("form");
      setError("起卦失败，请重试");
    }
  }

  function storeCast(res: MeihuaResult) {
    store.setAskResult(res);
  }

  function onCast() {
    if (!question.trim()) {
      setError("请输入你当下想问的事");
      return;
    }
    setError("");
    const int = intention.trim() ? Number(intention) : null;
    if (int !== null && (!Number.isInteger(int) || int < 1 || int > 999)) {
      setError("心念数需为 1-999 的整数");
      return;
    }
    startCast(question.trim(), int);
  }

  // 步骤动画
  useEffect(() => {
    if (phase !== "casting") return;
    if (stepIndex >= STEPS.length) {
      // 进入结果
      setPhase("result");
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 700);
    return () => clearTimeout(t);
  }, [phase, stepIndex]);

  function generatePoster() {
    if (!result) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        showToast("当前环境不支持绘图");
        return;
      }
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, 600, 900);
      ctx.strokeStyle = "rgba(201,162,39,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, 552, 852);
      ctx.fillStyle = "#c9a227";
      ctx.font = "38px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.textAlign = "center";
      ctx.fillText("问 一 事", 300, 90);
      ctx.fillStyle = "#8a8698";
      ctx.font = "17px 'Noto Sans SC', sans-serif";
      ctx.fillText(`${result.lunarDate} ${result.timeZhi}时 · 梅花易数`, 300, 132);
      // 卦名
      ctx.fillStyle = "#e8c96a";
      ctx.font = "30px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.fillText(`${result.mainName}（${result.movingLine}爻动）`, 300, 196);
      ctx.fillStyle = "#d4a574";
      ctx.font = "22px 'Smiley Sans', 'Noto Serif SC', serif";
      ctx.fillText(`之 ${result.changedName}`, 300, 232);
      // 断语
      ctx.fillStyle = "#c9a227";
      ctx.font = "19px 'Noto Sans SC', sans-serif";
      const wrap = (text: string, y: number, maxW = 460, lh = 30) => {
        const chars = text.split("");
        let line = "";
        for (const ch of chars) {
          if (ctx.measureText(line + ch).width > maxW) {
            ctx.fillText(line, 300, y);
            y += lh;
            line = ch;
          } else {
            line += ch;
          }
        }
        if (line) ctx.fillText(line, 300, y);
        return y;
      };
      let y = 300;
      y = wrap(`「${result.duan}」`, y) + 24;
      ctx.fillStyle = "#8a8698";
      ctx.font = "16px 'Noto Sans SC', sans-serif";
      wrap(`所问：${result.input.question.slice(0, 40)}`, y);
      ctx.fillStyle = "#8a8698";
      ctx.font = "14px 'Noto Sans SC', sans-serif";
      ctx.fillText("观澜 · 问一事 · 仅供娱乐参考", 300, 848);
      const url = canvas.toDataURL("image/png");
      setPoster(url);
      showToast("分享卡已生成");
    } catch {
      showToast("生成分享卡失败");
    }
  }

  // ===== 渲染 =====
  if (phase === "casting") {
    const step = STEPS[stepIndex] ?? STEPS[STEPS.length - 1];
    return (
      <main className="bg-ask relative flex min-h-screen flex-col items-center justify-center">
        <div className="paper-texture" />
        <Particles count={30} />
        <div className="relative z-10 w-full max-w-[420px] px-6 py-10 text-center">
          <Header />
          <div className="hexagram-card mt-8">
            <div className="text-lg tracking-[0.2em] text-gold-light">{step.label}</div>
            <p className="type-caption mt-2">{step.desc}</p>
            {/* 已起出的卦象实时展示 */}
            {result && (
              <div className="mt-6">
                <HexagramView
                  upper={result.mainUpper.index}
                  lower={result.mainLower.index}
                  movingLine={result.movingLine}
                  name={result.mainName}
                  symbol={result.mainSymbol}
                />
              </div>
            )}
          </div>
          {aiLoading && <p className="type-caption mt-4 text-gold-light">AI 正在解读卦象…</p>}
          <p className="type-caption mt-8 opacity-60">规则起卦 · 确定性公式 · 同刻同问必同卦</p>
        </div>
      </main>
    );
  }

  if (phase === "result" && result) {
    const cred = deriveAskCredibility(result.calculation, result.aiOk ?? false);
    const shareUrl = `${window.location.origin}/ask?c=${serializeCast(result)}`;
    const q = result.input.question;
    const showAiBanner = !ai && !aiLoading;
    return (
      <main className="bg-result relative min-h-screen">
        <div className="paper-texture" />
        <Particles count={25} />
        <div className="page-shell">
          <Header />
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="font-display text-[1.35rem] tracking-[0.18em] text-gold-light">问一事 · 梅花易数</span>
          </div>

          {/* 所问 + 卦象 */}
          <div className="hexagram-card mb-4">
            <div className="type-overline mb-2">所问：{q}</div>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="type-overline mb-1">本卦</p>
                <HexagramView
                  upper={result.mainUpper.index}
                  lower={result.mainLower.index}
                  movingLine={result.movingLine}
                  name={result.mainName}
                  symbol={result.mainSymbol}
                />
              </div>
              <div className="text-mist-dim text-2xl">→</div>
              <div>
                <p className="type-overline mb-1">变卦</p>
                <HexagramView
                  upper={result.changedUpper.index}
                  lower={result.changedLower.index}
                  movingLine={null}
                  name={result.changedName}
                  symbol={result.changedSymbol}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
              <span className="chip active">第{result.movingLine}爻动</span>
              <span className="chip active">体卦 {result.tiGua.name}</span>
              <span className="chip">用卦 {result.yongGua.name}</span>
              <span className="chip active">{result.tiYongRelation}</span>
            </div>
            <p className="type-caption mt-3 text-center opacity-70">{result.lunarDate} · {result.timeZhi}时起卦</p>
          </div>

          {/* AI 解读 */}
          {aiLoading && (
            <div className="glass-panel mb-4 rounded-card p-5 text-center">
              <span className="spinner inline-block" /> <span className="ml-2 type-caption text-gold-light">AI 正在解读卦象…</span>
            </div>
          )}
          {!aiLoading && ai && (
            <div className="glass-panel mb-4 rounded-card p-5">
              <div className="card-title mb-3">AI 解读</div>
              <p className="type-title text-[1rem] leading-8 text-gold-light">「{ai.summary}」</p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs tracking-[0.1em] text-gold-light">当前局势</div>
                  <p className="type-body mt-1">{ai.situation.text}</p>
                  {ai.situation.basis && <p className="analysis-basis">依据：{ai.situation.basis}</p>}
                </div>
                <div>
                  <div className="text-xs tracking-[0.1em] text-gold-light">行动建议</div>
                  {ai.advice.map((a, i) => (
                    <div key={i} className="mt-1 flex gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/15 text-[0.65rem] text-gold-light">{i + 1}</span>
                      <div>
                        <p className="type-body text-[0.9rem]">{a.text}</p>
                        {a.basis && <p className="analysis-basis">依据：{a.basis}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs tracking-[0.1em] text-gold-light">何时再看</div>
                  <p className="type-body mt-1">{ai.timing.text}</p>
                  {ai.timing.basis && <p className="analysis-basis">依据：{ai.timing.basis}</p>}
                </div>
                {ai.risk && <p className="type-caption mt-2 border-t border-gold/10 pt-2">风险提示：{ai.risk}</p>}
              </div>
            </div>
          )}
          {showAiBanner && (
            <div className="glass-panel mb-4 rounded-card p-5">
              <div className="flex items-center gap-2 text-xs text-cinnabar">
                <span className="stamp !static rotate-0">AI 解读暂不可用</span>
              </div>
              <p className="type-body mt-3 text-[0.9rem]">以下为规则卦辞参考（周易原文白话，非 AI 生成）：</p>
              <p className="type-title mt-2 text-[1rem] text-gold-light">「{result.duan}」</p>
            </div>
          )}

          {/* 体用生克（规则） */}
          <div className="glass-panel mb-4 rounded-card p-5">
            <div className="card-title mb-2">体用生克</div>
            <p className="type-body">{result.tiYongRelation}。动爻在第{result.movingLine}爻，{result.tiGua.name}为体（自己），{result.yongGua.name}为用（所问之事）。</p>
          </div>

          <CredibilityPanel cred={cred} />

          {/* 起卦依据（计算过程可见） */}
          <div className="glass-panel mb-4 rounded-card p-5">
            <div className="card-title mb-2">起卦依据</div>
            <p className="type-caption leading-6">{result.calculation.formula}</p>
            <p className="type-caption mt-2 opacity-80">
              上卦={result.calculation.mainUpper}，下卦={result.calculation.mainLower}；同刻同问必同卦，可复制链接回放。
            </p>
          </div>

          {/* 保存应验簿 */}
          <SaveToJournal
            type="ask"
            resultSummary={`${result.mainName}（${result.movingLine}爻动）之${result.changedName}`}
            question={q}
            calculation={result.calculation.formula}
            advice={ai?.advice.map((a) => a.text).join("；") || result.duan}
            className="mb-3"
          />

          {/* 分享卡 */}
          {poster && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt="问事分享卡" className="w-full rounded-card border border-gold/25" />
              <a href={poster} download="问一事分享卡.png" className="btn-primary mt-3 block text-center text-sm">保存分享卡</a>
            </div>
          )}
          <button className="btn-primary w-full text-sm" onClick={generatePoster}>生成分享卡</button>

          {/* 分享链接 */}
          <button
            className="mt-3 w-full rounded-lg border border-gold/25 py-3 text-xs text-mist-dim transition hover:border-gold hover:text-gold-light"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                showToast("回放链接已复制");
              } catch {
                showToast("复制失败");
              }
            }}
          >
            复制本卦回放链接 · 分享给朋友验证
          </button>

          <button className="mt-3 w-full rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold" onClick={() => (window.location.href = "/ask")}>
            再问一事
          </button>

          <p className="type-caption mt-8 border-t border-gold/10 pt-4 text-center opacity-60">
            梅花易数仅供文化娱乐与自我反思
            <br />
            起卦确定性 · 规则可见 · AI 仅作解释
          </p>
        </div>
        <Toast message={toast} />
      </main>
    );
  }

  // ===== 表单 =====
  return (
    <main className="bg-ask relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={30} />
      <div className="page-shell">
        <Header />

        <div className="mb-5 text-center">
          <h1 className="font-display text-[1.65rem] tracking-[0.2em] text-cinnabar">问一事</h1>
          <p className="type-overline mt-1">梅花易数 · 此刻起卦 · 决策问答</p>
        </div>

        {error && (
          <div className="error-banner mb-4 justify-center">
            <span>{error}</span>
          </div>
        )}

        <div className="glass-panel rounded-card p-5">
          <div className="mb-3 flex gap-2">
            {TOPICS.map((t) => (
              <button
                key={t}
                className={`chip ${topic === t ? "active" : ""}`}
                onClick={() => { setTopic(t); if (!question.trim()) setQuestion(`关于${t}，`); }}
                aria-pressed={topic === t}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="ask-box">
            <textarea
              placeholder="写下你当下想问的事，例如：这件事今天要不要推进？"
              maxLength={200}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <p className="type-caption mt-1 text-right text-mist-dim">{question.length}/200</p>
          </div>

          <div className="mt-3">
            <label className="form-label">心念数（可选）</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={999}
              placeholder="默念一个 1-999 的数，聚焦更准"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
            />
          </div>

          <button className="btn-primary mt-5 w-full text-base" onClick={onCast}>此刻起卦</button>
          <p className="type-caption mt-3 text-center opacity-70">规则起卦：年支序+农历月日+时辰+心念数，确定性公式</p>
        </div>

        {recent.length > 0 && (
          <div className="mt-6">
            <div className="type-overline mb-2">最近问过</div>
            <div className="space-y-2">
              {recent.map((e) => (
                <button
                  key={e.id}
                  className="glass-panel w-full rounded-card p-3 text-left transition hover:border-gold"
                  onClick={() => {
                    setQuestion(e.question ?? "");
                    setTopic(null);
                  }}
                >
                  <div className="text-xs text-gold-light">{e.resultSummary}</div>
                  {e.question && <div className="type-caption mt-0.5 line-clamp-1">{e.question}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="type-caption mt-8 text-center opacity-60">问事仅供文化娱乐与自我反思</p>
      </div>
    </main>
  );
}
