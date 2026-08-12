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

// 关键词表设计原则（P1-1 修复）：
// - 只收语义明确的 2+ 字复合词，不收高歧义单字（「爱」「情」「合」「财」「钱」
//   「买」「卖」「股」「房」「病」等在无关语境极易误命中：合同/事情/毛病/买房时机）
// - 维度边界：学业/考试归 career；婚恋/桃花归 love；投资/收入归 wealth；就医/生育归 health
const FOCUS_KEYWORDS: Record<FocusDim, string[]> = {
  career: [
    "工作", "事业", "升职", "跳槽", "创业", "项目", "面试", "职业", "考试", "学业",
    "考研", "offer", "上班", "老板", "同事", "辞职", "转型", "就业", "求职", "升迁",
    "职位", "副业", "打工", "工薪", "深造", "留学", "考公", "考编", "编制",
  ],
  love: [
    "感情", "恋爱", "婚姻", "婚恋", "结婚", "离婚", "对象", "男友", "女友", "老公",
    "老婆", "桃花", "分手", "复合", "表白", "暧昧", "相亲", "暗恋", "单身", "脱单",
    "追求", "前任", "情感", "另一半", "伴侣", "喜欢的人", "复合吗", "姻缘",
  ],
  wealth: [
    "财运", "赚钱", "亏损", "投资", "理财", "股票", "基金", "买房", "卖房", "收入",
    "破财", "还款", "负债", "财富", "涨薪", "加薪", "存款", "债务", "还钱",
    "财务紧张", "缺钱", "中彩票", "还债",
  ],
  health: [
    "生病", "健康", "身体", "手术", "怀孕", "生产", "康复", "体检", "症状", "调理",
    "疾病", "就医", "住院", "治疗", "生育", "备孕", "生子", "体质", "虚弱", "失眠",
  ],
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

function save(p: UserProfile): boolean {
  try {
    p.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch (e) {
    // localStorage 满 / disabled（隐私模式）/ JSON 循环引用等
    // 不抛出（记忆持久化是软失败：本次会话 store 仍能用，下次访问恢复失败用户也能感知）
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[memory] save 失败，记忆将无法在下次访问恢复", e);
    }
    return false;
  }
}

/** 固化一个生辰为 persona：若指纹已存在则更新，否则新建。首个 persona 自动设为 primary。返回 persona id。 */
export function ensurePersona(input: BaziInput, label = "自己"): string {
  const p = getProfile();
  const fp = personaFingerprint(input);
  const existing = p.personas.find((x) => personaFingerprint(x.baziInput) === fp);
  if (existing) {
    // 先保存覆盖前的 events（用于合并），再整体更新排盘字段
    const prevEvents = existing.baziInput.events;
    existing.baziInput = input;
    existing.lastUsedAt = Date.now();
    // events 不影响排盘，是校准信息 → 合并去重保留（避免重填丢失历史校准事件）
    existing.baziInput.events = mergeEvents(prevEvents, input.events);
    save(p);
    return existing.id;
  }
  const id = newId();
  // 浅拷贝 input 防御外部引用污染（P1-v2-A）：调用方提交后若复用同一 input 对象
  // 修改其字段，不应回写到已固化的 persona
  p.personas.push({ id, label, baziInput: { ...input }, createdAt: Date.now(), lastUsedAt: Date.now() });
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

/** 纯函数：从问题文本检测命中的关注维度（不写记忆）。供测试与 inferFocus 复用。 */
export function detectFocus(question: string): FocusDim[] {
  if (!question) return [];
  const dims: FocusDim[] = ["career", "love", "wealth", "health"];
  const hit: FocusDim[] = [];
  for (const d of dims) {
    if (FOCUS_KEYWORDS[d].some((kw) => question.includes(kw))) hit.push(d);
  }
  return hit;
}

/** 从问题文本推断关注维度并累加权重。返回本次命中的维度（可能为空）。 */
export function inferFocus(question: string): FocusDim[] {
  const hit = detectFocus(question);
  if (hit.length === 0) return [];
  const p = getProfile();
  for (const d of hit) p.focus[d] += 1;
  save(p);
  return hit;
}

// 暴露纯函数给运行时端到端测试（无副作用，无安全风险）
// 注：webpack tree-shake 会移除未被业务代码引用的导出，所以这里只暴露已被
// 业务路径引用的 detectFocus（被 inferFocus 调用）。其它纯函数通过端到端
// 业务场景间接验证（见 verify-agent.mjs P1-6 场景）
if (typeof window !== "undefined") {
  (window as unknown as { detectFocus?: typeof detectFocus }).detectFocus = detectFocus;
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

/** 弱提示（首页用，不暴露生辰细节也不暴露关注维度，只表达"已保存命盘"）— 审查 P0-3 + P1-v2-J 隐私 */
export function getPersonaHint(): string {
  const persona = getPrimaryPersona();
  if (!persona) return "";
  // P1-v2-J：不再暴露「最近关注 XX」给共用设备的旁观者（隐私扩展修复）
  return "已保存命盘";
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
