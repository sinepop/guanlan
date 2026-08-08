"use client";

// 应验簿：记录每次占问/日签/命盘，追踪应验状态
import { useCallback, useEffect, useState } from "react";
import Particles from "@/components/Particles";
import Header from "@/components/Header";
import { Toast, useToast } from "@/components/Toast";
import { getEntries, updateEntry, deleteEntry, type JournalEntry, type FollowUpStatus } from "@/lib/journal";

const STATUS_META: Record<FollowUpStatus, { label: string; cls: string }> = {
  pending: { label: "待回顾", cls: "border-gold/30 bg-gold/10 text-gold-light" },
  verified: { label: "有所应", cls: "border-[#4de0c8]/40 bg-[#4de0c8]/10 text-[#4de0c8]" },
  refuted: { label: "未显现", cls: "border-cinnabar/40 bg-cinnabar/10 text-cinnabar" },
};

const TYPE_LABEL: Record<JournalEntry["type"], string> = {
  ask: "问一事",
  daily: "每日一签",
  bazi: "命盘",
  compat: "合盘",
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { toast, showToast } = useToast();

  const refresh = useCallback(() => {
    setEntries(getEntries());
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onStatus(id: string, status: FollowUpStatus) {
    updateEntry(id, { followUpStatus: status });
    refresh();
    showToast(STATUS_META[status].label);
  }
  function onDelete(id: string) {
    deleteEntry(id);
    refresh();
    showToast("已删除");
  }
  function onNote(id: string, note: string) {
    updateEntry(id, { note });
    refresh();
  }

  const count = entries.length;
  const verifiedCount = entries.filter((e) => e.followUpStatus === "verified").length;
  const pendingCount = entries.filter((e) => e.followUpStatus === "pending").length;

  return (
    <main className="bg-ledger relative min-h-screen">
      <div className="paper-texture" />
      <Particles count={25} />
      <div className="page-shell">
        <Header />

        <div className="mb-5 text-center">
          <h1 className="font-display text-[1.65rem] tracking-[0.2em] text-cinnabar">应验簿</h1>
          <p className="type-overline mt-1">记录每次占问 · 留待对照 · 仅供自省</p>
        </div>

        {/* 统计 */}
        <div className="glass-panel mb-4 rounded-card p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="type-title text-lg text-gold-light">{count}</div>
              <div className="type-caption">总记录</div>
            </div>
            <div>
              <div className="type-title text-lg text-[#4de0c8]">{verifiedCount}</div>
              <div className="type-caption">有所应</div>
            </div>
            <div>
              <div className="type-title text-lg text-mist-dim">{pendingCount}</div>
              <div className="type-caption">待回顾</div>
            </div>
          </div>
        </div>

        {loaded && entries.length === 0 ? (
          <div className="glass-panel rounded-card p-10 text-center">
            <p className="type-caption">还没有记录</p>
            <p className="type-caption mt-2 opacity-70">在问一事 / 每日一签 / 命盘 / 合盘结果页点「存入应验簿」，随后回来对照回顾。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const st = STATUS_META[e.followUpStatus ?? "pending"];
              return (
                <div key={e.id} className="glass-panel rounded-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[0.62rem] tracking-[0.1em] text-gold-light">{TYPE_LABEL[e.type]}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="type-title mt-2 text-[0.95rem] leading-6">{e.resultSummary}</div>
                      {e.question && <div className="type-caption mt-1">{e.question}</div>}
                      {e.calculation && <p className="analysis-basis mt-1 line-clamp-2">{e.calculation}</p>}
                      {e.advice && <p className="type-caption mt-1 opacity-80">建议：{e.advice}</p>}
                      <div className="type-caption mt-2 text-mist-dim">{fmtTime(e.createdAt)}</div>
                    </div>
                    <button
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/25 text-xs text-mist-dim transition hover:border-cinnabar hover:text-cinnabar"
                      aria-label="删除记录"
                      onClick={() => onDelete(e.id)}
                    >
                      ×
                    </button>
                  </div>

                  {/* 应验状态 4-pill */}
                  <div className="mt-3 flex gap-2">
                    {(Object.keys(STATUS_META) as FollowUpStatus[]).map((s) => {
                      const m = STATUS_META[s];
                      const active = (e.followUpStatus ?? "pending") === s;
                      return (
                        <button
                          key={s}
                          className={`flex-1 rounded-lg border py-1.5 text-xs transition-all ${active ? m.cls + " font-semibold" : "border-gold/15 text-mist-dim hover:border-gold/40"}`}
                          onClick={() => onStatus(e.id, s)}
                          aria-pressed={active}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* 备注 */}
                  <input
                    className="form-input mt-3 !py-2 text-xs"
                    placeholder="补充备注（如：后来发生了什么 / 如何理解）"
                    defaultValue={e.note ?? ""}
                    maxLength={200}
                    onBlur={(ev) => {
                      if (ev.target.value !== (e.note ?? "")) onNote(e.id, ev.target.value);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <button className="mt-8 w-full rounded-lg border border-gold/25 py-3 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold" onClick={() => (window.location.href = "/")}>
          返回大厅
        </button>

        <p className="type-caption mt-6 border-t border-gold/10 pt-4 text-center opacity-60">
          应验簿仅供个人自省，不构成任何预测承诺
          <br />
          应验与否在个人选择，不在命理
        </p>
      </div>
      <Toast message={toast} />
    </main>
  );
}
