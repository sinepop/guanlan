"use client";

import { useState } from "react";
import { PROVINCES, DEFAULT_CITY } from "@/lib/locations";
import { SHICHEN_NAMES } from "@/lib/solarTime";
import { isValidLunarDate } from "@/lib/bazi";
import type { CalendarMode, TimeMode, BaziInput } from "@/lib/types";

const currentYear = new Date().getFullYear();
const YEAR_MIN = 1940;

export type FillFn = (v: BaziInput) => void;
export type ReadFn = () => BaziInput | null;

interface Props {
  name: string;
  tag: string;
  accent?: "vermilion" | "gold";
  defaultValues?: Partial<BaziInput>;
  fillRef?: React.MutableRefObject<FillFn | null>;
  readRef?: React.MutableRefObject<ReadFn | null>;
  onReady?: (v: BaziInput) => void;
}

export default function PersonForm({ name, tag, accent = "vermilion", defaultValues, fillRef, readRef, onReady }: Props) {
  const [calendar, setCalendar] = useState<CalendarMode>(defaultValues?.calendar ?? "solar");
  const [year, setYear] = useState(defaultValues?.year ? String(defaultValues.year) : "");
  const [month, setMonth] = useState(defaultValues?.month ? String(defaultValues.month) : "");
  const [day, setDay] = useState(defaultValues?.day ? String(defaultValues.day) : "");
  const [timeMode, setTimeMode] = useState<TimeMode>(defaultValues?.timeMode ?? "shichen");
  const [shichenIndex, setShichenIndex] = useState<number | null>(defaultValues?.shichenIndex ?? null);
  const [hour, setHour] = useState(defaultValues?.hour !== undefined ? String(defaultValues.hour) : "");
  const [minute, setMinute] = useState(defaultValues?.minute !== undefined ? String(defaultValues.minute) : "0");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"male" | "female">(defaultValues?.gender ?? "male");

  const provinceCities = PROVINCES.find((p) => p.name === province)?.cities ?? [];

  function fill(v: BaziInput) {
    setCalendar(v.calendar);
    setYear(String(v.year));
    setMonth(String(v.month));
    setDay(String(v.day));
    setTimeMode(v.timeMode);
    setShichenIndex(v.shichenIndex);
    if (v.hour !== undefined) setHour(String(v.hour));
    if (v.minute !== undefined) setMinute(String(v.minute));
    const loc = v.location.split(" ");
    setProvince(loc[0] ?? "");
    setCity(loc[1] ?? "");
    setGender(v.gender);
  }

  // 每次渲染刷新 ref 闭包：ref 必须指向最新 state 的 build/fill，
  // 否则挂载后输入的任何内容都不会被读（「开始合盘」将永远读到空表单）。
  if (fillRef) fillRef.current = fill;
  if (readRef) readRef.current = build;

  function build(): BaziInput | null {
    if (!year || !month || !day || !province || !city) return null;
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (calendar === "solar") {
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    } else {
      if (!isValidLunarDate(y, m, d)) return null;
    }
    if (timeMode === "shichen" && shichenIndex === null) return null;
    if (timeMode === "exact" && hour === "") return null;
    const target = PROVINCES.find((p) => p.name === province)?.cities.find((c) => c.name === city) ?? DEFAULT_CITY;
    return {
      calendar,
      year: y,
      month: m,
      day: d,
      timeMode,
      shichenIndex: shichenIndex ?? 0,
      hour: timeMode === "exact" ? Number(hour) : undefined,
      minute: timeMode === "exact" ? Number(minute) : undefined,
      location: `${province} ${city}`,
      lon: target.lon,
      lat: target.lat,
      gender,
      events: [],
    };
  }

  return (
    <div className={`glass-panel rounded-card p-5 ${accent === "vermilion" ? "border-[#d4a574]/30" : "border-gold/30"}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-[0.1em] ${accent === "vermilion" ? "bg-[#c43a2b] text-[#0a0a0f]" : "bg-gold text-[#0a0a0f]"}`}>{tag}</span>
        <span className="font-serif text-sm text-gold-light">{name}</span>
      </div>

      {/* 公历/农历 */}
      <div className="mb-3 flex rounded-lg border border-gold/25 p-1">
        {(["solar", "lunar"] as CalendarMode[]).map((c) => (
          <button key={c} className={`flex-1 rounded-md py-1.5 text-xs transition-all ${calendar === c ? "bg-gold/15 text-gold-light" : "text-mist-dim"}`} onClick={() => setCalendar(c)}>
            {c === "solar" ? "公历" : "农历"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select className="form-select !py-2.5 text-xs" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">年</option>
          {Array.from({ length: currentYear - YEAR_MIN + 1 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="form-select !py-2.5 text-xs" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">月</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select className="form-select !py-2.5 text-xs" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">日</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* 时间 */}
      <div className="mt-3 mb-2 flex gap-2">
        {(["shichen", "exact", "unknown"] as TimeMode[]).map((t) => (
          <button key={t} className={`flex-1 rounded-lg border py-1.5 text-xs transition-all ${timeMode === t ? "strong-selected" : "border-gold/25 text-mist-dim hover:border-gold/50"}`} onClick={() => setTimeMode(t)} aria-pressed={timeMode === t}>
            {t === "shichen" ? "时辰" : t === "exact" ? "精确" : "未知"}
          </button>
        ))}
      </div>
      {timeMode === "shichen" && (
        <div>
          <div className="grid grid-cols-4 gap-1.5">
            {SHICHEN_NAMES.map((n, i) => (
              <button key={n} className={`relative rounded-lg border py-1.5 text-xs transition-all ${shichenIndex === i ? "strong-selected" : "border-gold/25 text-mist-dim hover:border-gold/50"}`} onClick={() => setShichenIndex(i)} aria-pressed={shichenIndex === i}>
                <span className="sel-mark">✓</span>
                {n}
              </button>
            ))}
          </div>
          <p className="type-caption mt-2">
            {shichenIndex !== null ? `已选：${SHICHEN_NAMES[shichenIndex]}时` : "请选择出生时辰"}
          </p>
        </div>
      )}
      {timeMode === "exact" && (
        <div className="grid grid-cols-2 gap-2">
          <select className="form-select !py-2.5 text-xs" value={hour} onChange={(e) => setHour(e.target.value)}>
            <option value="">时</option>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
          <select className="form-select !py-2.5 text-xs" value={minute} onChange={(e) => setMinute(e.target.value)}>
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      )}

      {/* 地点 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className="form-select !py-2.5 text-xs" value={province} onChange={(e) => { setProvince(e.target.value); setCity(""); }}>
          <option value="">省份</option>
          {PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <select className="form-select !py-2.5 text-xs" value={city} onChange={(e) => setCity(e.target.value)} disabled={!province}>
          <option value="">城市</option>
          {provinceCities.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 性别 */}
      <div className="mt-3 flex gap-2">
        <button className={`flex-1 rounded-lg border py-2 text-xs transition-all ${gender === "male" ? "border-gold bg-gold/15 text-gold-light" : "border-gold/25 text-mist-dim"}`} onClick={() => setGender("male")}>乾 · 男</button>
        <button className={`flex-1 rounded-lg border py-2 text-xs transition-all ${gender === "female" ? "border-gold bg-gold/15 text-gold-light" : "border-gold/25 text-mist-dim"}`} onClick={() => setGender("female")}>坤 · 女</button>
      </div>

      {onReady && (
        <button
          className="mt-3 w-full rounded-lg border border-dashed border-gold/30 py-2 text-xs text-mist-dim transition hover:border-gold hover:text-gold-light"
          onClick={() => { const v = build(); if (onReady && v) onReady(v); }}
        >
          使用此信息
        </button>
      )}
    </div>
  );
}