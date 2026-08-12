// 部署前 schema 迁移测试：模拟老用户的 6 种 localStorage 形态，
// 用真实 getProfile/readAll 跑一遍，确认新版代码不崩、不丢数据、不写 NaN。
// 运行：node --experimental-transform-types scripts/verify-migration.mjs
//
// 关键：旧版本（生产当前部署的 84c38e7c）的 memory.focus 已经是 Record<FocusDim, number>
// （早期就有的 schema），所以重点测的是 journal.focus 单值 -> 数组的迁移。

// 不引入 jsdom（避免新增依赖）；用一个最小内存 store 满足 localStorage 同步 API
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => { store.clear(); },
};
globalThis.window = {};  // memory.ts/journal.ts 用 window.__memSeq / __journalSeq

import { register } from "node:module";
register("./_ts-extension-loader.mjs", import.meta.url);
const { getProfile } = await import("../src/lib/memory.ts");
const { getEntries } = await import("../src/lib/journal.ts");

let pass = 0, fail = 0;
const checks = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; checks.push(`✓ ${name}`); }
  else { fail++; checks.push(`✗ ${name}  ${detail}`); }
}

// === 形态 A：完全空 ===
localStorage.clear();
const a = getProfile();
check("A 空起步 getProfile 不崩", !!a && Array.isArray(a.personas) && a.personas.length === 0);
check("A 空起步 focus schema 完整", a.focus.career === 0 && a.focus.love === 0 && a.focus.wealth === 0 && a.focus.health === 0);
const aJ = getEntries();
check("A 空起步 journal 不崩", Array.isArray(aJ) && aJ.length === 0);

// === 形态 B：只有 journal 无 memory ===
localStorage.clear();
localStorage.setItem("cyber-divination-journal", JSON.stringify([
  { id: "old1", type: "ask", createdAt: 1, resultSummary: "x", followUpStatus: "verified" },
]));
const b = getProfile();
check("B 只有 journal 时 getProfile 返回空 profile", b.personas.length === 0);
const bJ = getEntries();
check("B journal 单条无 focus 字段也能读", bJ.length === 1 && bJ[0].id === "old1");

// === 形态 C：memory 存在但 personas 空 ===
localStorage.clear();
localStorage.setItem("cyber-divination-memory", JSON.stringify({
  version: 1, primaryPersonaId: null, personas: [], focus: { career: 0, love: 0, wealth: 0, health: 0 }, updatedAt: 1,
}));
const c = getProfile();
check("C memory 空 personas 不崩", c.personas.length === 0);

// === 形态 D：memory 含 persona 含 events ===
localStorage.clear();
localStorage.setItem("cyber-divination-memory", JSON.stringify({
  version: 1, primaryPersonaId: "p1",
  personas: [{ id: "p1", label: "自己", baziInput: { calendar: "solar", year: 1990, month: 5, day: 15, timeMode: "shichen", shichenIndex: 0, hour: null, location: "x", lon: 1, lat: 2, gender: "female", events: ["2020年结婚"], view: "bazi" }, createdAt: 1, lastUsedAt: 1 }],
  focus: { career: 0, love: 1, wealth: 0, health: 0 }, updatedAt: 1,
}));
const d = getProfile();
check("D 旧 memory 含 persona events 保留", d.personas.length === 1 && d.personas[0].baziInput.events?.includes("2020年结婚"));

// === 形态 E：memory.focus 是单值（更早期版本） ===
localStorage.clear();
localStorage.setItem("cyber-divination-memory", JSON.stringify({
  version: 1, primaryPersonaId: null, personas: [],
  focus: "love", // 故意错的早期 schema
  updatedAt: 1,
}));
const e = getProfile();
check("E focus 单值字符串降级为空 schema（normalize 不崩）",
  e.focus.career === 0 && e.focus.love === 0);  // 单值字符串被 normalize 为 0（无法识别老的单值 focus 含义，但至少不崩
check("E focus 不是 NaN", !Number.isNaN(e.focus.love));

// === 形态 F：journal.focus 单值字符串（v2 P1-F 之前的版本） ===
localStorage.clear();
localStorage.setItem("cyber-divination-journal", JSON.stringify([
  { id: "old-single", type: "ask", createdAt: 1, question: "工作", resultSummary: "x", followUpStatus: "verified", focus: "career" },
  { id: "old-array", type: "ask", createdAt: 2, question: "事业财运", resultSummary: "y", followUpStatus: "pending", focus: ["career", "wealth"] },
  { id: "old-null", type: "ask", createdAt: 3, resultSummary: "z", followUpStatus: "refuted", focus: null },
]));
const fJ = getEntries();
check("F 旧 journal 单值 focus 自动转数组", fJ.find(e => e.id === "old-single")?.focus?.includes("career"));
check("F 新 journal 数组 focus 保留", fJ.find(e => e.id === "old-array")?.focus?.length === 2);
check("F null focus 保持 undefined", fJ.find(e => e.id === "old-null")?.focus === undefined);
check("F 三条都读出来", fJ.length === 3);

// === 形态 G：完全损坏的 localStorage（JSON 解析失败） ===
localStorage.clear();
localStorage.setItem("cyber-divination-memory", "{not valid json");
localStorage.setItem("cyber-divination-journal", "garbage");
const g = getProfile();
const gJ = getEntries();
check("G 损坏 JSON 不崩，降级为空", g.personas.length === 0 && gJ.length === 0);

// === 形态 H：生产当前版本（84c38e7c，2026-08-07）的真实数据形态 ===
// 生产版本没有 memory key（本轮才引入），但有 journal key（旧版本就有）
localStorage.clear();
localStorage.setItem("cyber-divination-journal", JSON.stringify([
  { id: "prod-1", type: "ask", createdAt: Date.now()-86400000, question: "工作跳槽", resultSummary: "某卦", followUpStatus: "pending" },
]));
const h = getProfile();
const hJ = getEntries();
check("H 生产当前用户（无 memory）首次访问新版不崩", h.personas.length === 0 && hJ.length === 1);
check("H 生产旧 journal 条目（无 focus）正常读取", hJ[0].id === "prod-1");

console.log(`\n=== migration: ${pass} 通过 / ${fail} 失败 ===\n` + checks.join("\n"));
process.exit(fail > 0 ? 1 : 0);
