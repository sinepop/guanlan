"use client";

import { useEffect, useRef, useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import GoldIcon from "@/components/GoldIcon";
import SaveToJournal from "@/components/SaveToJournal";
import { Toast, useToast } from "@/components/Toast";
import { dailySignBySeed, saveTodaySign } from "@/lib/signs";
import type { DailySign } from "@/lib/types";

const SHICHEN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const SALT_KEY = "cyber-divination-daily-lot-salt";

function localDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function shichenName(now: Date): string {
  return SHICHEN[Math.floor((now.getHours() + 1) / 2) % 12];
}

function getDeviceSalt(): string {
  try {
    const existing = localStorage.getItem(SALT_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const salt = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(SALT_KEY, salt);
    return salt;
  } catch {
    return `volatile-${Math.random().toString(36).slice(2)}`;
  }
}

function getLocationBucket(timeoutMs = 1200): Promise<{ bucket: string; calibrated: boolean }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ bucket: "geo-unavailable", calibrated: false });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: { bucket: string; calibrated: boolean }) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish({ bucket: "geo-timeout", calibrated: false }), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        const lat = Math.round(pos.coords.latitude * 2) / 2;
        const lon = Math.round(pos.coords.longitude * 2) / 2;
        finish({ bucket: `${lat.toFixed(1)},${lon.toFixed(1)}`, calibrated: true });
      },
      () => {
        window.clearTimeout(timer);
        finish({ bucket: "geo-denied", calibrated: false });
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 60 * 6, timeout: timeoutMs }
    );
  });
}

function buildSeed(dateStr: string, geo: { bucket: string; calibrated: boolean }) {
  const now = new Date();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const secondGate = Math.floor(now.getSeconds() / 10);
  const seedText = [
    "daily-lot-v3",
    dateStr,
    shichenName(now),
    now.getHours(),
    now.getMinutes(),
    secondGate,
    zone,
    now.getTimezoneOffset(),
    navigator.language,
    geo.bucket,
    getDeviceSalt(),
  ].join("|");
  return {
    seedText,
    basis: geo.calibrated
      ? `${shichenName(now)}时起签 · 本机地点格网已纳入 · ${zone}`
      : `${shichenName(now)}时起签 · 地点未授权时按本机时区校准 · ${zone}`,
  };
}

export default function DailyFortunePage() {
  const [dateStr, setDateStr] = useState("");
  const [sign, setSign] = useState<DailySign | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [drawText, setDrawText] = useState("本机时辰 · 地点气场 · 即时起签");
  const [drawBasis, setDrawBasis] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const isTouch = useRef(false);
  if (typeof window !== "undefined") {
    isTouch.current = window.matchMedia?.("(hover: none)").matches ?? false;
  }

  // 日期在客户端再算，避免服务端渲染与本地时区不一致导致 hydration mismatch
  useEffect(() => {
    setDateStr(localDateStr());
  }, []);

  async function draw() {
    if (shaking) return;
    setPoster(null);
    setDrawn(false);
    setShaking(true);
    setDrawText("校准本机时辰");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      setDrawText("采集地点气场");
      const geo = await getLocationBucket();
      setDrawText("签象落定");
      const seed = buildSeed(dateStr, geo);
      const next = dailySignBySeed(seed.seedText);
      await new Promise((resolve) => window.setTimeout(resolve, 760));
      setSign(next);
      setDrawBasis(seed.basis);
      setDrawn(true);
      saveTodaySign(next); // 首页每日一签小卡据此显示
      showToast("签文已生成");
    } catch {
      showToast("起签失败，请重试");
    } finally {
      setShaking(false);
      setDrawText("本机时辰 · 地点气场 · 即时起签");
    }
  }

  // 保存签文为图片（canvas 绘制，与命盘海报同风格）
  function saveImage() {
    if (!sign) return;
    let canvas: HTMLCanvasElement;
    try {
      canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 980;
    } catch {
      showToast("当前环境不支持绘图");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showToast("当前环境不支持绘图");
      return;
    }
    try {
    // 玄黑底
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, 600, 980);
    // 边框
    ctx.strokeStyle = "rgba(201,162,39,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 552, 932);
    // 标题
    ctx.fillStyle = "#c9a227";
    ctx.font = "40px 'Smiley Sans', 'Noto Serif SC', 'SimSun', serif";
    ctx.textAlign = "center";
    ctx.fillText("每 日 一 签", 300, 100);
    ctx.fillStyle = "#8a8698";
    ctx.font = "18px 'Noto Sans SC', sans-serif";
    ctx.fillText(dateStr, 300, 140);
    // 签号/等级
    ctx.fillStyle = "#d4a574";
    ctx.font = "20px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.fillText(`${sign.number} · ${sign.level}`, 300, 190);
    // 签题
    ctx.fillStyle = "#e8c96a";
    ctx.font = "26px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.fillText(sign.title, 300, 250);
    // 签诗
    ctx.fillStyle = "#c9a227";
    ctx.font = "22px 'Smiley Sans', 'Noto Serif SC', serif";
    sign.poem.forEach((line, i) => {
      ctx.fillText(line, 300, 330 + i * 40);
    });
    // 白话解
    ctx.fillStyle = "#a8a4b8";
    ctx.font = "17px 'Noto Sans SC', sans-serif";
    const wrap = (text: string, maxW: number, y: number, lh = 30): number => {
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
      if (line) {
        ctx.fillText(line, 300, y);
        y += lh;
      }
      return y;
    };
    let y = 430;
    y = wrap(sign.meaning, 460, y) + 8;
    // 宜忌与幸运信息
    ctx.fillStyle = "#c9a227";
    ctx.font = "18px 'Noto Sans SC', sans-serif";
    ctx.fillText(`宜：${sign.yi.join(" · ")}`, 300, y);
    y += 34;
    ctx.fillText(`忌：${sign.ji.join(" · ")}`, 300, y);
    y += 34;
    ctx.fillStyle = "#8a8698";
    ctx.font = "17px 'Noto Sans SC', sans-serif";
    ctx.fillText(`幸运色：${sign.luckyColor}    幸运方位：${sign.luckyDirection}`, 300, y);
    y += 34;
    ctx.fillText(`幸运数字：${sign.luckyNumber}`, 300, y);
    y += 50;
    // 今日一句
    ctx.fillStyle = "#e8c96a";
    ctx.font = "19px 'Smiley Sans', 'Noto Serif SC', serif";
    ctx.fillText(`今日一句：${sign.advice}`, 300, y);
    // 底部
    ctx.fillStyle = "#8a8698";
    ctx.font = "15px 'Noto Sans SC', sans-serif";
    ctx.fillText("观澜 · 签文仅供娱乐参考", 300, 930);
    const url = canvas.toDataURL("image/png");
    setPoster(url);
    showToast("签文卡已生成");
    } catch {
      showToast("生成签文图片失败");
    }
  }

  return (
    <main className="bg-ask relative flex min-h-screen flex-col items-center justify-center">
      <div className="paper-texture" />
      <Particles count={30} />
      <div className="relative z-10 w-full max-w-[480px] px-6 py-10 text-center">
        <Header />

        <div className="mb-1 flex items-center justify-center gap-2">
          <GoldIcon src="/icons/icon-daily-lot.svg" size={28} />
          <h1 className="font-display text-[1.65rem] tracking-[0.2em] text-cinnabar">每日一签</h1>
        </div>
        <p className="type-overline mt-1">{dateStr}</p>

        {!drawn ? (
          <div className="mt-10">
            <button
              className={`daily-lot-caster ${shaking ? "is-casting" : ""}`}
              onClick={() => draw()}
              aria-label="抽签"
            >
              <span className="lot-aura" />
              <span className="lot-ring" />
              <span className="lot-slip lot-slip-a" />
              <span className="lot-slip lot-slip-b" />
              <span className="lot-slip lot-slip-c" />
            </button>
            <p className="type-title mt-6 text-[0.95rem]">
              {shaking ? drawText : "轻触起签 · 抽取当下签文"}
            </p>
            <p className="type-caption mx-auto mt-3 max-w-[300px]">
              地点只在本机粗略取格参与推算，不上传精确经纬度。
            </p>
          </div>
        ) : (
          <div className="mt-8 animate-fade-up">
            <div className="glass-panel rounded-card p-7 text-left">
              <div className="mb-4 flex items-center justify-between">
                <span className="type-overline text-vermilion">{sign!.number}</span>
                <span className="vermilion-seal">{sign!.level}</span>
              </div>
              <div className="type-title mb-5 text-center text-[1.3rem] leading-9">
                {sign!.poem.map((line, i) => <div key={i}>{line}</div>)}
              </div>
              <p className="type-body mb-4">{sign!.meaning}</p>
              <div className="type-caption space-y-1.5">
                <div><b className="text-gold-light">宜：</b>{sign!.yi.join(" · ")}</div>
                <div><b className="text-gold-light">忌：</b>{sign!.ji.join(" · ")}</div>
                <div><b className="text-gold-light">幸运色：</b>{sign!.luckyColor}</div>
                <div><b className="text-gold-light">幸运方位：</b>{sign!.luckyDirection}</div>
                <div><b className="text-gold-light">幸运数字：</b>{sign!.luckyNumber}</div>
              </div>
            </div>

            {/* 今日建议 */}
            <div className="glass-panel mt-4 space-y-3 rounded-card p-5 text-left">
              <div className="flex gap-3">
                <span className="vermilion-seal shrink-0">今日一句</span>
                <p className="type-body">{sign!.advice}</p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 rounded bg-[#d4a574]/15 px-1.5 py-0.5 text-[0.65rem] text-[#d4a574]">避坑</span>
                <p className="type-caption">{sign!.avoid}</p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 rounded bg-gold/10 px-1.5 py-0.5 text-[0.65rem] text-gold-light">小事</span>
                <p className="type-caption">{sign!.smallThing}</p>
              </div>
            </div>

            <p className="type-caption mt-3">推算依据：{drawBasis}</p>

            {/* 保存图片 */}
            {poster ? (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="今日签文" className="w-full rounded-card border border-gold/25" />
                <a href={poster} download={`每日一签-${dateStr}.png`} className="btn-primary mt-3 block text-center text-sm">保存签文图片</a>
                {isTouch.current && <p className="type-caption mt-2">也可长按上方图片保存到相册</p>}
              </div>
            ) : (
              <div>
                <button className="mt-3 w-full rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold" onClick={saveImage}>
                  保存签文为图片
                </button>
                {isTouch.current && <p className="type-caption mt-2">生成后长按图片即可保存到相册</p>}
              </div>
            )}

            <button className="btn-primary mt-6 text-sm" onClick={() => (window.location.href = "/")}>返回大厅</button>
            <button className="mt-3 w-full rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold" onClick={() => draw()}>
              再摇一签
            </button>
            <SaveToJournal
              type="daily"
              resultSummary={`${sign!.number} · ${sign!.title}`}
              question={`${dateStr} 每日一签`}
              calculation={drawBasis}
              advice={sign!.advice}
              className="mt-3"
            />
            <p className="type-caption mt-2 opacity-70">每次起签按本机当下时间与地点格网重新推算。</p>
          </div>
        )}

        <p className="type-caption mt-8 opacity-60">签文仅供娱乐参考</p>
      </div>
      <Toast message={toast} />
    </main>
  );
}
