"use client";

import { useEffect, useRef, useState } from "react";
import Particles from "@/components/Particles";
import { computeBazi } from "@/lib/bazi";
import { computeZiwei, serializeZiwei } from "@/lib/ziwei";
import { store } from "@/lib/store";
import type { BaziResult, AiAnalysis } from "@/lib/types";

interface Step {
  label: string;
  desc: string;
}

const STEPS: Record<string, Step[]> = {
  bazi: [
    { label: "校验生辰信息", desc: "确认出生日期与地点合法性" },
    { label: "计算真太阳时", desc: "按经度与均时差校正时间" },
    { label: "排定四柱命盘", desc: "年柱 · 月柱 · 日柱 · 时柱" },
    { label: "解析五行格局", desc: "日主强弱 · 十神 · 神煞" },
    { label: "生成命理解读", desc: "AI 命理师生成深度解析" },
  ],
  career: [
    { label: "校验生辰信息", desc: "确认出生日期与地点合法性" },
    { label: "计算真太阳时", desc: "按经度与均时差校正时间" },
    { label: "排定四柱命盘", desc: "年柱 · 月柱 · 日柱 · 时柱" },
    { label: "解析官财印星", desc: "十神旺衰与格局判定" },
    { label: "生成事业解读", desc: "AI 职场导师生成深度解析" },
  ],
  ziwei: [
    { label: "校验生辰信息", desc: "确认出生日期与地点合法性" },
    { label: "计算真太阳时", desc: "按经度与均时差校正时间" },
    { label: "排定十二宫星盘", desc: "命宫 · 十二宫定位" },
    { label: "解析主星四化", desc: "星曜分布 · 庙旺格局" },
    { label: "生成紫微解读", desc: "AI 命理师生成深度解析" },
  ],
};

export default function DiviningPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [status, setStatus] = useState<"running" | "ai" | "error">("running");
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const view = result?.input.view ?? "bazi";
  const steps = STEPS[view] ?? STEPS.bazi;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const input = store.getBaziInput();
    if (!input) {
      window.location.href = "/bazi";
      return;
    }
    try {
      const res = computeBazi(input);
      setResult(res);
      store.setResult(res);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "排盘失败，请检查输入");
      return;
    }
  }, []);

  // 推进步骤动画
  useEffect(() => {
    if (!result || status !== "running") return;
    if (stepIndex >= steps.length - 1) {
      // 进入 AI 解读
      setStatus("ai");
      fetchAI(result);
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 600 + Math.random() * 200);
    return () => clearTimeout(t);
  }, [stepIndex, result, status]);

  async function fetchAI(res: BaziResult) {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const payload = {
        view: res.input.view ?? "bazi",
        ziwei: res.input.view === "ziwei" ? serializeZiwei(computeZiwei(res.input)) : "",
        input: {
          year: res.input.year,
          month: res.input.month,
          day: res.input.day,
          calendar: res.input.calendar,
          timeMode: res.input.timeMode,
          shichenIndex: res.input.shichenIndex,
          hour: res.input.hour ?? null,
          minute: res.input.minute ?? null,
          location: res.input.location,
          lon: res.input.lon,
          lat: res.input.lat,
          gender: res.input.gender,
          events: res.input.events,
        },
        pillars: res.pillars.map((p) => ({
          label: p.label,
          gan: p.gan,
          zhi: p.zhi,
          shishen: p.shishen,
          hidden: p.hidden.map((h) => ({ gan: h.gan, shishen: h.shishen })),
          nayan: p.nayan,
          kongwang: p.kongwang,
        })),
        dayMaster: res.dayMaster,
        dayMasterElement: res.dayMasterElement,
        dayMasterYinYang: res.dayMasterYinYang,
        animal: res.animal,
        strength: res.strength,
        yongShen: res.yongShen,
        xiShen: res.xiShen,
        shenSha: res.shenSha ?? [],
        five: res.five ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        taiYuan: res.taiYuan ?? "",
        mingGong: res.mingGong ?? "",
        shenGong: res.shenGong ?? "",
        qiYunAge: res.qiYunAge,
        currentDaYun: { gan: res.currentDaYun.gan, zhi: res.currentDaYun.zhi, startYear: res.currentDaYun.startYear, endYear: res.currentDaYun.endYear },
        liuNian: res.liuNian.map((l) => ({ year: l.year, gan: l.gan, zhi: l.zhi, if: l.if })),
      };
      const r = await fetch("/api/divine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const j = await r.json();
      if (j.ok && j.analysis) {
        if (!mountedRef.current) return;
        store.setAi(j.analysis as AiAnalysis);
        window.location.href = "/result";
      } else {
        if (!mountedRef.current) return;
        setStatus("error");
        setError((j.error as string) || "AI 解读暂不可用");
      }
    } catch {
      if (!mountedRef.current) return;
      setStatus("error");
      setError("网络异常，请稍后再试");
    } finally {
      clearTimeout(timer);
    }
  }

  // 重新推演：重置动画，由步骤动画走完后单次调用 fetchAI（避免重复请求）；
  // 若排盘失败（result 为空）则先重排。
  function retry() {
    setError("");
    setStepIndex(0);
    setStatus("running");
    if (!result) {
      const input = store.getBaziInput();
      if (!input) {
        window.location.href = "/bazi";
        return;
      }
      try {
        const res = computeBazi(input);
        setResult(res);
        store.setResult(res);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "排盘失败，请检查输入");
      }
    }
  }

  const step = steps[stepIndex] ?? steps[steps.length - 1];
  const progress = Math.round(((stepIndex + (status === "ai" ? 1 : 0)) / steps.length) * 100);

  if (status === "error") {
    return (
      <main className="bg-divining relative flex min-h-screen items-center justify-center">
        <div className="paper-texture" />
        <Particles count={30} />
        <div className="relative z-10 w-full max-w-[420px] px-6 text-center">
          <div className="type-title mb-6 text-2xl text-gold">推演繁忙</div>
          <p className="type-body mb-3">{error}</p>
          <div className="error-banner justify-center">
            <span>AI 深度解读暂不可用，可稍后重试，或先查看基础排盘结果。</span>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button className="btn-primary" onClick={retry}>
              重新推演
            </button>
            <button
              className="rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold"
              onClick={() => (window.location.href = "/result")}
            >
              查看基础排盘
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-divining relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="paper-texture" />
      <Particles count={40} />
      <div className="relative z-10 w-full max-w-[480px] px-6 py-10 text-center">
        {/* 罗盘 */}
        <div className="mystic-compass mx-auto mb-8" aria-hidden="true">
          <span className="compass-halo" />
          <span className="compass-ring compass-ring-outer" />
          <span className="compass-ring compass-ring-middle" />
          <span className="compass-ring compass-ring-inner" />
          <span className="compass-meridian compass-meridian-v" />
          <span className="compass-meridian compass-meridian-h" />
          <span className="compass-meridian compass-meridian-a" />
          <span className="compass-meridian compass-meridian-b" />
          {["乾", "坤", "震", "巽", "坎", "离", "艮", "兑"].map((label, i) => (
            <span key={label} className={`compass-gua compass-gua-${i}`}>{label}</span>
          ))}
          <span className="compass-orbit-dot compass-orbit-dot-a" />
          <span className="compass-orbit-dot compass-orbit-dot-b" />
          <span className="compass-needle" />
          <span className="compass-core"><span>命</span></span>
        </div>

        {/* 步骤（半透明卡片） */}
        <div className="glass-panel rounded-card px-5 py-7">
          <h2 className="type-title font-display text-[1.45rem]">{step.label}</h2>
          <p className="type-caption mt-2">
            {status === "ai" ? "AI 命理师正在生成深度解析 · 请稍候" : step.desc}
          </p>

          {/* 四柱（真实数据，八字/职场视角） */}
          {result && view !== "ziwei" && stepIndex >= 2 && (
            <div className="mt-7 flex justify-center gap-4">
              {["年柱", "月柱", "日柱", "时柱"].map((label, i) => {
                const p = result.pillars[i];
                return (
                  <div key={label} className="w-16 text-center">
                    <div className="type-overline mb-2">{label}</div>
                    <div className="type-title flex h-11 items-center justify-center text-[1.6rem] font-bold text-gold" style={{ textShadow: "0 0 15px rgba(201,162,39,0.3)" }}>
                      {p.gan}{p.zhi}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 紫微星盘（真实数据，紫微视角） */}
          {result && view === "ziwei" && stepIndex >= 2 && (
            <div className="mx-auto mt-7 flex flex-wrap justify-center gap-2">
              {(() => {
                try {
                  return computeZiwei(result.input).palaces.map((pl) => (
                    <span key={pl.name} className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[0.65rem] tracking-[0.08em] text-gold-light">
                      {pl.name}宫 {pl.main.split(" ")[0]}
                    </span>
                  ));
                } catch {
                  return null;
                }
              })()}
            </div>
          )}

          {/* 真太阳时（真实数据） */}
          {result && stepIndex >= 1 && (
            <p className="type-caption mt-4">
              真太阳时：{result.solarTime}
            </p>
          )}

          {/* 神煞（八字/职场视角） */}
          {result && view !== "ziwei" && stepIndex >= 3 && (
            <div className="mt-5 flex min-h-[30px] flex-wrap justify-center gap-2">
              {result.shenSha.map((s) => (
                <span key={s} className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs tracking-[0.1em] text-gold-light">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 进度 */}
        <div className="mx-auto mt-7 w-full max-w-[300px]">
          <div className="mb-2.5 h-[2px] overflow-hidden rounded bg-gold/15">
            <div
              className="h-full bg-gradient-to-r from-gold-dark to-gold-light transition-all duration-500"
              style={{ width: `${progress}%`, boxShadow: "0 0 10px #c9a227" }}
            />
          </div>
          <div className="type-overline">{progress}%</div>
        </div>
      </div>
    </main>
  );
}
