"use client";

// 可信度面板：等级 + 逐项校验依据（过程可见）。result / compat-result / ask 结果页复用。
import { useState } from "react";
import type { Credibility } from "@/lib/credibility";

const LEVEL_LABEL: Record<string, { label: string; cls: string }> = {
  high: { label: "较高", cls: "text-gold-light border-gold/40 bg-gold/10" },
  medium: { label: "中等", cls: "text-[#e8c96a] border-[#d4a574]/40 bg-[#d4a574]/10" },
  review: { label: "需复核", cls: "text-cinnabar border-cinnabar/40 bg-cinnabar/10" },
};

export default function CredibilityPanel({ cred }: { cred: Credibility }) {
  const [open, setOpen] = useState(false);
  const meta = LEVEL_LABEL[cred.level] ?? LEVEL_LABEL.high;

  return (
    <div className="glass-panel mb-4 rounded-card p-4">
      <div className="type-caption flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="vermilion-seal">仅供参考</span>
          <span>推算可信度</span>
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="confidence-bar mt-2"><i style={{ width: `${cred.score * 100}%` }} /></div>
      <p className="type-caption mt-2">{cred.summary}</p>

      <button
        type="button"
        className="mt-2.5 flex items-center gap-1 text-xs tracking-[0.08em] text-mist-dim transition hover:text-gold-light"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "收起" : "展开"}计算依据
        <span className={`inline-block text-[0.6rem] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <ul className="mt-3 space-y-2 border-t border-gold/10 pt-3">
          {cred.reasons.map((r) => (
            <li key={r.label} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.62rem] ${
                  r.ok ? "bg-gold/20 text-gold-light" : "bg-cinnabar/20 text-cinnabar"
                }`}
                aria-hidden="true"
              >
                {r.ok ? "✓" : "!"}
              </span>
              <span>
                <b className="text-mist">{r.label}</b>
                <span className="ml-1.5 text-mist-dim">{r.note}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
