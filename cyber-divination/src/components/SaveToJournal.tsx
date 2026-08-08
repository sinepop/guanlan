"use client";

// 一键存入应验簿。接入 ask / daily / bazi result / compat result 结果页。
import { useToast, Toast } from "@/components/Toast";
import { saveEntry, type JournalEntry } from "@/lib/journal";

interface Props {
  type: JournalEntry["type"];
  resultSummary: string;
  question?: string;
  calculation?: string;
  advice?: string;
  className?: string;
  label?: string;
}

export default function SaveToJournal({
  type,
  resultSummary,
  question,
  calculation,
  advice,
  className = "",
  label = "存入应验簿",
}: Props) {
  const { toast, showToast } = useToast();

  function onSave() {
    const id = saveEntry({ type, resultSummary, question, calculation, advice, createdAt: Date.now(), followUpStatus: "pending" });
    if (id) {
      showToast("已存入应验簿");
    } else {
      showToast("保存失败：浏览器存储不可用");
    }
  }

  return (
    <>
      <button
        className={`w-full rounded-lg border border-gold/25 py-3.5 text-sm tracking-[0.1em] text-gold-light transition hover:border-gold ${className}`}
        onClick={onSave}
      >
        {label}
      </button>
      <Toast message={toast} />
    </>
  );
}
