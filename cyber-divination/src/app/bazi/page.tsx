"use client";

import { useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import ErrorBanner from "@/components/ErrorBanner";
import { PROVINCES, DEFAULT_CITY } from "@/lib/locations";
import { SHICHEN_NAMES, SHICHEN_RANGES } from "@/lib/solarTime";
import { isValidLunarDate } from "@/lib/bazi";
import { store } from "@/lib/store";
import type { CalendarMode, TimeMode, BaziInput, DivinationView } from "@/lib/types";

const currentYear = new Date().getFullYear();
const YEAR_MIN = 1940;

const VIEWS: { key: DivinationView; label: string; desc: string }[] = [
  { key: "bazi", label: "八字综合", desc: "四柱五行·全局解读" },
  { key: "ziwei", label: "紫微斗数", desc: "十二宫星曜·命运推演" },
];

function initialView(): DivinationView {
  if (typeof window === "undefined") return "bazi";
  const v = new URLSearchParams(window.location.search).get("view");
  return v === "ziwei" ? "ziwei" : "bazi";
}

export default function BaziPage() {
  const [calendar, setCalendar] = useState<CalendarMode>("solar");
  const [view, setView] = useState<DivinationView>(initialView);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [timeMode, setTimeMode] = useState<TimeMode>("shichen");
  const [shichenIndex, setShichenIndex] = useState<number | null>(null);
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("0");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [events, setEvents] = useState<string[]>([""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  const provinceCities = PROVINCES.find((p) => p.name === province)?.cities ?? [];

  function addEvent() {
    if (events.length >= 5) return;
    setEvents([...events, ""]);
  }
  function removeEvent(i: number) {
    if (events.length <= 1) return;
    setEvents(events.filter((_, idx) => idx !== i));
  }

  type FieldId = "birth-date" | "birth-time" | "birth-location" | null;

  function validate(): { message: string; field: FieldId } | null {
    if (!year || !month || !day) return { message: "请完整填写出生年月日", field: "birth-date" };
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (calendar === "solar") {
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
        return { message: `无效的日期：${y}年${m}月${d}日不存在`, field: "birth-date" };
      }
    } else {
      if (!isValidLunarDate(y, m, d)) {
        return { message: `无效的农历日期：${y}年${m}月${d}日不存在`, field: "birth-date" };
      }
    }
    if (timeMode === "shichen" && shichenIndex === null) {
      return { message: "请选择出生时辰", field: "birth-time" };
    }
    if (timeMode === "exact" && hour === "") return { message: "请选择精确出生时间", field: "birth-time" };
    if (!province || !city) return { message: "请选择出生地点（用于真太阳时校正）", field: "birth-location" };
    return null;
  }

  function flashAndScroll(field: FieldId) {
    setErrorField(field);
    const el = document.getElementById(field ?? "");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setErrorField(null), 1900);
  }

  function start() {
    if (submitting) return;
    const err = validate();
    if (err) {
      setError(err.message);
      flashAndScroll(err.field);
      return;
    }
    setError("");
    const target = PROVINCES.find((p) => p.name === province)?.cities.find((c) => c.name === city) ?? DEFAULT_CITY;
    const input: BaziInput = {
      calendar,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      timeMode,
      shichenIndex: shichenIndex ?? 0,
      hour: timeMode === "exact" ? Number(hour) : undefined,
      minute: timeMode === "exact" ? Number(minute) : undefined,
      location: `${province} ${city}`,
      lon: target.lon,
      lat: target.lat,
      gender,
      events: events.filter((e) => e.trim()),
      view,
    };
    setSubmitting(true);
    // 让 spinner/文案先渲染一拍，再跳推演页，避免「点了没反应」
    window.setTimeout(() => {
      store.setBaziInput(input);
      window.location.href = "/divining";
    }, 450);
  }

  return (
    <main className={`${view === "ziwei" ? "bg-ziwei" : "bg-bazi"} relative min-h-screen`}>
      <div className="paper-texture" />
      <Particles count={30} />
      <div className="page-shell">
        <Header />

        {/* 分析视角切换 */}
        <div className="mb-5">
          <div className="mb-2 flex rounded-lg border border-gold/25 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                className={`flex-1 rounded-md py-2.5 text-sm transition-all ${
                  view === v.key ? "bg-gold/15 text-gold-light" : "text-mist-dim hover:text-mist"
                }`}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="type-caption px-1">{VIEWS.find((v) => v.key === view)?.desc}</p>
        </div>

        {/* 公历/农历切换 */}
        <div className="mb-5 flex rounded-lg border border-gold/25 p-1">
          {(["solar", "lunar"] as CalendarMode[]).map((c) => (
            <button
              key={c}
              className={`flex-1 rounded-md py-2.5 text-sm transition-all ${
                calendar === c ? "bg-gold/15 text-gold-light" : "text-mist-dim hover:text-mist"
              }`}
              onClick={() => setCalendar(c)}
            >
              {c === "solar" ? "公历" : "农历"}
            </button>
          ))}
        </div>

        {/* 出生日期 */}
        <section id="birth-date" className={`card ${errorField === "birth-date" ? "field-error" : ""}`}>
          <h2 className="card-title">{calendar === "solar" ? "公历出生日期" : "农历出生日期"}</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">年份</label>
              <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">年份</option>
                {Array.from({ length: currentYear - YEAR_MIN + 1 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">月份</label>
              <select className="form-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">月份</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">日期</label>
              <select className="form-select" value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="">日期</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 出生时间 */}
        <section id="birth-time" className={`card mt-4 ${errorField === "birth-time" ? "field-error" : ""}`}>
          <h2 className="card-title">出生时间</h2>
          <div className="mb-3 flex gap-2">
            {(["shichen", "exact", "unknown"] as TimeMode[]).map((t) => (
              <button
                key={t}
                className={`flex-1 rounded-lg border py-2 text-xs transition-all ${
                  timeMode === t ? "strong-selected" : "border-gold/25 text-mist-dim hover:border-gold/50"
                }`}
                onClick={() => setTimeMode(t)}
              >
                {t === "shichen" ? "时辰" : t === "exact" ? "精确时间" : "不确定"}
              </button>
            ))}
          </div>

          {timeMode === "shichen" && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {SHICHEN_NAMES.map((n, i) => (
                  <button
                    key={n}
                    className={`rounded-lg border py-2.5 text-xs transition-all ${
                      shichenIndex === i ? "strong-selected" : "border-gold/25 text-mist-dim hover:border-gold/50"
                    }`}
                    onClick={() => setShichenIndex(i)}
                    aria-pressed={shichenIndex === i}
                  >
                    <span className="sel-mark">✓</span>
                    <span className="block">{n}</span>
                    <span className="block text-[0.6rem] opacity-60">{SHICHEN_RANGES[i]}</span>
                  </button>
                ))}
              </div>
              <p className="type-caption mt-2.5">
                {shichenIndex !== null ? `已选：${SHICHEN_NAMES[shichenIndex]}时（${SHICHEN_RANGES[shichenIndex]}）` : "请选择出生时辰"}
              </p>
            </div>
          )}

          {timeMode === "exact" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">小时</label>
                <select className="form-select" value={hour} onChange={(e) => setHour(e.target.value)}>
                  <option value="">时</option>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")} 时</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">分钟</label>
                <select className="form-select" value={minute} onChange={(e) => setMinute(e.target.value)}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")} 分</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {timeMode === "unknown" && (
            <p className="type-caption">
              时辰未知时，将按午时（正午）推算命盘，结果置信度会降低并明确标注。
            </p>
          )}
        </section>

        {/* 出生地点 */}
        <section id="birth-location" className={`card mt-4 ${errorField === "birth-location" ? "field-error" : ""}`}>
          <h2 className="card-title">出生地点</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">省份/直辖市</label>
              <select
                className="form-select"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                }}
              >
                <option value="">请选择</option>
                {PROVINCES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">城市</label>
              <select
                className="form-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!province}
              >
                <option value="">请选择</option>
                {provinceCities.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="type-caption mt-3">
            出生地经度用于真太阳时校正：东部与西部实际太阳时不同，影响时辰推演。
          </p>
        </section>

        {/* 性别 */}
        <section className="card mt-4">
          <h2 className="card-title">性别</h2>
          <div className="flex gap-3">
            <button
              className={`flex-1 rounded-lg border py-3.5 text-sm transition-all ${
                gender === "male"
                  ? "border-gold bg-gold/15 text-gold-light shadow-[0_0_12px_rgba(201,162,39,0.15)]"
                  : "border-gold/25 text-mist-dim hover:border-gold/50"
              }`}
              onClick={() => setGender("male")}
            >
              乾造 · 男
            </button>
            <button
              className={`flex-1 rounded-lg border py-3.5 text-sm transition-all ${
                gender === "female"
                  ? "border-gold bg-gold/15 text-gold-light shadow-[0_0_12px_rgba(201,162,39,0.15)]"
                  : "border-gold/25 text-mist-dim hover:border-gold/50"
              }`}
              onClick={() => setGender("female")}
            >
              坤造 · 女
            </button>
          </div>
        </section>

        {/* 已发生事件 */}
        <section className="card mt-4">
          <h2 className="card-title">已发生事件（用于校准）</h2>
          {events.map((e, i) => (
            <div key={i} className="mb-2.5 flex items-center gap-2">
              <input
                className="form-input flex-1"
                placeholder={`例如：2020年结婚 / 2022年创业`}
                maxLength={200}
                value={e}
                onChange={(ev) => {
                  const next = [...events];
                  next[i] = ev.target.value;
                  setEvents(next);
                }}
              />
              {events.length > 1 && (
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-vermilion/30 bg-vermilion/10 text-lg text-vermilion transition hover:bg-vermilion/20"
                  onClick={() => removeEvent(i)}
                  aria-label="删除事件"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            className="w-full rounded-lg border border-dashed border-gold/25 py-3 text-xs text-mist-dim transition hover:border-gold hover:text-gold-light"
            onClick={addEvent}
          >
            + 添加事件（最多5条）
          </button>
        </section>

        <ErrorBanner message={error} />

        {/* 开始推演 */}
        <button
          className="btn-primary mt-8 flex w-full items-center justify-center gap-2 text-base disabled:opacity-60"
          onClick={start}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner" />
              正在推演…
            </>
          ) : (
            "开始推演"
          )}
        </button>

        <p className="type-caption mt-8 text-center opacity-60">
          命理仅供文化娱乐与自我反思
        </p>
      </div>
    </main>
  );
}
