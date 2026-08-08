"use client";

import { useRef, useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import ErrorBanner from "@/components/ErrorBanner";
import PersonForm, { type FillFn, type ReadFn } from "@/components/PersonForm";
import { store } from "@/lib/store";
import type { CompatInput } from "@/lib/types";

const RELATIONS = [
  { key: "couple", label: "情侣/夫妻" },
  { key: "friends", label: "朋友" },
  { key: "work", label: "同事/合伙人" },
  { key: "family", label: "家人" },
];

export default function CompatPage() {
  const [relation, setRelation] = useState("couple");
  const [error, setError] = useState("");
  const aFill = useRef<FillFn | null>(null);
  const aRead = useRef<ReadFn | null>(null);
  const bRead = useRef<ReadFn | null>(null);

  function fillFromMine() {
    const mine = store.getBaziInput();
    if (!mine) {
      setError("还没有做过八字排盘，请先在大厅完成一次八字排盘后再填入本人信息。");
      return;
    }
    setError("");
    aFill.current?.(mine);
  }

  function start() {
    const a = aRead.current?.();
    const b = bRead.current?.();
    if (!a) { setError("请完整填写甲方的出生信息（含地点）。"); return; }
    if (!b) { setError("请完整填写乙方的出生信息（含地点）。"); return; }
    setError("");
    const input: CompatInput = { a, b, relation };
    store.setCompatInput(input);
    window.location.href = "/compat-result";
  }

  return (
    <main className="bg-compat relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={30} />
      <div className="page-shell">
        <Header title="双人合盘" subtitle="两情相悦 · 缘分天定" />

        <button
          className="type-caption mb-5 w-full rounded-lg border border-dashed border-gold/30 py-3 text-gold-light transition hover:border-gold"
          onClick={fillFromMine}
        >
          + 复制我的八字信息为甲方
        </button>

        <PersonForm name="缘分主角 · 一" tag="甲方" accent="vermilion" fillRef={aFill} readRef={aRead} />
        <div className="my-4 flex items-center gap-3 text-xs text-mist-dim">
          <div className="h-px flex-1 bg-gold/15" />
          <span>VS</span>
          <div className="h-px flex-1 bg-gold/15" />
        </div>
        <PersonForm name="缘分主角 · 二" tag="乙方" accent="gold" readRef={bRead} />

        {/* 关系选择 */}
        <div className="mt-6">
          <div className="section-title">你们的关系</div>
          <div className="flex flex-wrap gap-2.5">
            {RELATIONS.map((r) => (
              <button
                key={r.key}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${
                  relation === r.key
                    ? "border-gold bg-gold/15 text-gold-light"
                    : "border-gold/25 text-mist-dim hover:border-gold/50"
                }`}
                onClick={() => setRelation(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <ErrorBanner message={error} />

        <button className="btn-primary mt-8 text-base" onClick={start}>
          开始合盘
        </button>

        <p className="type-caption mt-8 text-center opacity-60">
          合盘结果仅供娱乐参考
        </p>
      </div>
    </main>
  );
}
