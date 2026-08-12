// 语义记忆层（agent 地基）：固化用户画像 slots + 关注维度学习
// localStorage 持久化；阶段二迁云数据库 agent_memories.kind=slots（见 docs/guanlan-agent-design.md）
// 与 journal.ts（情景记忆/应验簿）互补：journal 记「发生了什么」，memory 记「用户是谁」
// 对应核心公式 Agent=LLM+规划+记忆+工具 中的「记忆」要素，以及 Hello-Agents 记忆四类中的「语义记忆」
import type { BaziInput } from "./types";

export type FocusDim = "career" | "love" | "wealth" | "health";

export interface Persona {
  id: string;
  label: string;          // 自己 / 伴侣 / 家人 / 朋友
  baziInput: BaziInput;   // 固化的生辰 slots（确定性事实，LLM 只读）
  createdAt: number;
  lastUsedAt: number;
}

export interface UserProfile {
  version: 1;
  primaryPersonaId: string | null;
  personas: Persona[];
  focus: Record<FocusDim, number>;   // 各维度累计提及次数（用于关注画像）
  updatedAt: number;
}

const KEY = "cyber-divination-memory";
const MAX_PERSONAS = 8;

const FOCUS_KEYWORDS: Record<FocusDim, string[]> = {
  career: ["工作", "事业", "升职", "跳槽", "创业", "项目", "面试", "职业", "考试", "学业", "考研", "offer", "上班", "老板", "同事", "辞职", "转型"],
  love: ["感情", "爱", "婚", "情", "合", "对象", "男友", "女友", "老公", "老婆", "桃花", "分手", "复合", "表白", "暧昧", "相亲", "暗恋"],
  wealth: ["财", "钱", "投资", "理财", "股", "基金", "房", "买", "卖", "收入", "财运", "破财", "还款", "负债"],
  health: ["病", "健康", "身体", "手术", "怀孕", "生产", "康复", "体检", "症状", "调理"],
};

// 生辰指纹（用于 persona 去重）：纳入全部影响 computeBazi 结果的字段
// 第一性原理：同一组会产生不同排盘结果的输入才算不同 persona
// 排盘无关字段（events）不进指纹，走合并去重（见 ensurePersona）
function personaFingerprint(b: BaziInput): string {
  return [
    b.calendar,
    b.year, b.month, b.day,
    b.timeMode,
    b.timeMode === "shichen" ? b.shichenIndex : "",
    b.timeMode === "exact" ? `${b.hour ?? ""}:${b.minute ?? ""}` : "",
    b.gender,
    b.location,
  ].join("|");
}

function emptyProfile(): UserProfile {
  return {
    version: 1,
    primaryPersonaId: null,
    personas: [],
    focus: { career: 0, love: 0, wealth: 0, health: 0 },
    updatedAt: Date.now(),
  };
}

function newId(): string {
  // crypto.randomUUID 跨 tab 无碰撞；不可用时退回时间戳+随机
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `p${crypto.randomUUID()}`;
  }
  const counter = (window.__memSeq = (window.__memSeq ?? 0) + 1);
  return `p${Date.now().toString(36)}${counter.toString(36)}`;
}
declare global {
  interface Window {
    __memSeq?: number;
  }
}

export function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyProfile();
    const p = parsed as Partial<UserProfile>;
    // schema normalize：坏数据降级为空 profile，不崩溃/不写 NaN（审查 P1-2）
    const focus = normalizeFocus(p.focus);
    const personas = Array.isArray(p.personas)
      ? p.personas.filter((x): x is Persona => !!x && typeof x === "object" && !!x.id && !!x.baziInput)
      : [];
    return {
      version: 1,
      primaryPersonaId: typeof p.primaryPersonaId === "string" ? p.primaryPersonaId : null,
      personas,
      focus,
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
    };
  } catch {
    return emptyProfile();
  }
}

function normalizeFocus(f: unknown): Record<FocusDim, number> {
  const empty: Record<FocusDim, number> = { career: 0, love: 0, wealth: 0, health: 0 };
  if (!f || typeof f !== "object") return empty;
  const src = f as Record<string, unknown>;
  const out: Record<FocusDim, number> = { ...empty };
  (["career", "love", "wealth", "health"] as FocusDim[]).forEach((d) => {
    const v = Number(src[d]);
    out[d] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  });
  return out;
}

function save(p: UserProfile): void {
  try {
    p.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** 固化一个生辰为 persona：若指纹已存在则更新，否则新建。首个 persona 自动设为 primary。返回 persona id。 */
export function ensurePersona(input: BaziInput, label = "自己"): string {
  const p = getProfile();
  const fp = personaFingerprint(input);
  const existing = p.personas.find((x) => personaFingerprint(x.baziInput) === fp);
  if (existing) {
    // 同一 persona：排盘字段用新值覆盖（用户更精确的输入应被采纳）
    existing.baziInput = input;
    existing.lastUsedAt = Date.now();
    // events 不影响排盘，是校准信息 → 合并去重保留（避免重填丢失历史校准事件）
    const merged = mergeEvents(existing.baziInput.events, input.events);
    existing.baziInput.events = merged;
    if (!p.primaryPersonaId) p.primaryPersonaId = existing.id;
    save(p);
    return existing.id;
  }
  const id = newId();
  p.personas.push({ id, label, baziInput: input, createdAt: Date.now(), lastUsedAt: Date.now() });
  if (!p.primaryPersonaId) p.primaryPersonaId = id;
  if (p.personas.length > MAX_PERSONAS) {
    p.personas.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    const primary = p.personas.find((x) => x.id === p.primaryPersonaId);
    // primary 必保留：从非 primary 中选 MAX-1 个最近，加 primary 凑满 MAX（避免突破上限）
    const nonPrimary = p.personas.filter((x) => x.id !== p.primaryPersonaId).slice(0, MAX_PERSONAS - 1);
    p.personas = primary ? [primary, ...nonPrimary] : nonPrimary.slice(0, MAX_PERSONAS);
  }
  save(p);
  return id;
}

/** events 合并去重（按字符串相等去重，保留首次出现的顺序） */
function mergeEvents(existing: string[], incoming: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of [...existing, ...incoming]) {
    const k = e.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

export function getPrimaryPersona(): Persona | null {
  const p = getProfile();
  return p.personas.find((x) => x.id === p.primaryPersonaId) ?? p.personas[0] ?? null;
}

export function setPrimary(id: string): boolean {
  const p = getProfile();
  if (!p.personas.some((x) => x.id === id)) return false;
  p.primaryPersonaId = id;
  save(p);
  return true;
}

/** 从问题文本推断关注维度并累加权重。返回本次命中的维度（可能为空）。 */
export function inferFocus(question: string): FocusDim[] {
  if (!question) return [];
  const hit: FocusDim[] = [];
  const dims: FocusDim[] = ["career", "love", "wealth", "health"];
  for (const d of dims) {
    if (FOCUS_KEYWORDS[d].some((kw) => question.includes(kw))) hit.push(d);
  }
  if (hit.length === 0) return [];
  const p = getProfile();
  for (const d of hit) p.focus[d] += 1;
  save(p);
  return hit;
}

/** 当前最关注的维度（提及次数最高且 > 0）；用于 LLM context 选择与 UI 老用户提示 */
export function getTopFocus(): FocusDim | null {
  const p = getProfile();
  const entries = Object.entries(p.focus) as [FocusDim, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  return top && top[1] > 0 ? top[0] : null;
}

export const FOCUS_LABEL: Record<FocusDim, string> = {
  career: "事业",
  love: "感情",
  wealth: "财运",
  health: "健康",
};

/** 用户画像完整摘要（内页/LLM 用，含生辰细节） */
export function getPersonaSummary(): string {
  const persona = getPrimaryPersona();
  if (!persona) return "";
  const b = persona.baziInput;
  const cal = b.calendar === "lunar" ? "农历" : "公历";
  const top = getTopFocus();
  const focusPart = top ? `· 最关注${FOCUS_LABEL[top]}` : "";
  return `${cal} ${b.year}年${b.month}月${b.day}日 · ${b.gender === "male" ? "男" : "女"} · ${b.location} ${focusPart}`;
}

/** 弱提示（首页用，不暴露生辰细节，只表达"已保存命盘"）— 审查 P0-3 隐私修复 */
export function getPersonaHint(): string {
  const persona = getPrimaryPersona();
  if (!persona) return "";
  const top = getTopFocus();
  return top ? `已保存命盘 · 最近关注${FOCUS_LABEL[top]}` : "已保存命盘";
}

/**
 * 把 primary persona 的生辰恢复到 store，返回是否成功（用于"一键继续排盘"交互）。
 * 第一性原理：agent 的"记忆"必须能影响交互流才算记忆，否则是死数据（审查 P0-1）。
 * 注意：调用方需传入 store.setBaziInput（避免 memory.ts 直接依赖 store.ts 造成循环）。
 */
export function restorePrimaryToStore(setBaziInput: (b: BaziInput) => void): boolean {
  const persona = getPrimaryPersona();
  if (!persona) return false;
  // bump lastUsedAt（用户主动恢复视为活跃）
  const p = getProfile();
  const target = p.personas.find((x) => x.id === persona.id);
  if (target) target.lastUsedAt = Date.now();
  save(p);
  setBaziInput(persona.baziInput);
  return true;
}

/** 清空（设置页/调试用） */
export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
