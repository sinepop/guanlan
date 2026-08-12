// 应验簿：localStorage 记录每次占问/日签/命盘的应验情况
// key: cyber-divination-journal（与 store.ts 同风格 try/catch 降级：webview 禁用存储时静默失效）
import { inferFocus, type FocusDim } from "./memory";

export type JournalType = "ask" | "daily" | "bazi" | "compat";
export type FollowUpStatus = "pending" | "verified" | "refuted";

export interface JournalEntry {
  id: string; // nanoid 风格短 id（时间戳+随机），仅用于列表 key/删除
  type: JournalType;
  createdAt: number; // epoch ms
  question?: string; // ask：所问之事
  resultSummary: string; // 一句话摘要（卦名/签题/命盘要点）
  calculation?: string; // 起卦依据 / 排盘依据（过程可见）
  advice?: string; // 行动建议/今日一句
  followUpStatus?: FollowUpStatus; // 应验状态（默认 pending）
  note?: string; // 用户备注
  focus?: FocusDim; // 关注维度（评估闭环用：按维度拆分应验率；有 question 时自动推断）
}

const KEY = "cyber-divination-journal";
const MAX_ENTRIES = 200; // 防 localStorage 撑爆（每条约 500B，200 条约 100KB）

function readAll(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is JournalEntry => !!x && typeof x === "object" && typeof (x as JournalEntry).id === "string");
  } catch {
    return [];
  }
}

function writeAll(list: JournalEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  // 不用 Math.random 保证可复现；时间戳 + 计数器自增足够唯一
  const counter = (window.__journalSeq = (window.__journalSeq ?? 0) + 1);
  return `j${Date.now().toString(36)}${counter.toString(36)}`;
}
declare global {
  interface Window {
    __journalSeq?: number;
  }
}

/** 全部条目，按时间倒序 */
export function getEntries(): JournalEntry[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

/** 保存一条，返回新 id；失败（存储禁用）返回 null */
export function saveEntry(e: Omit<JournalEntry, "id">): string | null {
  // 评估闭环：有 question 时自动推断关注维度（存档=真正在意，比起卦即学更准确）
  // 同时把维度累加进 memory.focus（单一真相源，避免调用方多处写）
  let focus = e.focus;
  if (!focus && e.question) {
    const hit = inferFocus(e.question);
    focus = hit.length > 0 ? hit[0] : undefined;
  }
  const entry: JournalEntry = { ...e, focus, id: newId() };
  const list = readAll();
  list.push(entry);
  return writeAll(list) ? entry.id : null;
}

/** 更新应验状态/备注；找不到 id 则静默 */
export function updateEntry(id: string, patch: Partial<Pick<JournalEntry, "followUpStatus" | "note" | "resultSummary">>): boolean {
  const list = readAll();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], ...patch };
  return writeAll(list);
}

export function deleteEntry(id: string): boolean {
  const list = readAll();
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  return writeAll(next);
}

/** 最近 N 条指定类型（ask 页「最近问过」用） */
export function getRecent(type: JournalType, n = 3): JournalEntry[] {
  return getEntries().filter((e) => e.type === type).slice(0, n);
}
