// 生产 AI 后端烟雾测试：部署后必须跑一次，验证 AI 解读真的能生成。
// 不验证前端路由（那是 verify-agent 的事），只验证云函数 guanlan 是否活着且产出合理。
// 运行：node --experimental-transform-types scripts/verify-prod-ai.mjs
//
// 第一性原理：部署成功 ≠ 功能可用。前端 chunk 上传成功不代表 AI 后端能产出。
// 这测试曾经缺席，导致某次部署后没人发现 AI 是否还能用，等用户报告就晚了。

import { register } from "node:module";
register("./_ts-extension-loader.mjs", import.meta.url);
const { computeBazi } = await import("../src/lib/bazi.ts");

const PROD_ORIGIN = "https://cyber-divination-7e4.pages.dev";
const AI_BASE = "https://kaifa-d1gdl3ow4ec39065b.service.tcloudbase.com/api";

let pass = 0, fail = 0;
const checks = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; checks.push(`✓ ${name}`); }
  else { fail++; checks.push(`✗ ${name}  ${detail}`); }
}

// === 1. CORS 预检：白名单应允许生产 Origin ===
const opt = await fetch(`${AI_BASE}/divine`, { method: "OPTIONS", headers: { Origin: PROD_ORIGIN } });
check("CORS 预检允许生产 Origin", opt.status === 204 || opt.status === 200 || opt.headers.get("access-control-allow-origin") === PROD_ORIGIN,
  `实际 status=${opt.status} allow-origin=${opt.headers.get("access-control-allow-origin")}`);

// === 2. 白名单外的 Origin 应被拒 ===
const optBad = await fetch(`${AI_BASE}/divine`, { method: "OPTIONS", headers: { Origin: "https://evil.com" } });
check("白名单外 Origin 被拒（403 或无 allow-origin）",
  optBad.status === 403 || optBad.headers.get("access-control-allow-origin") !== "https://evil.com",
  `status=${optBad.status} allow-origin=${optBad.headers.get("access-control-allow-origin")}`);

// === 3. 真实八字解读请求（核心） ===
// 用 PROGRESS.md 验证基线命例：1990-05-15 阳历女北京
const res = computeBazi({
  calendar: "solar", year: 1990, month: 5, day: 15,
  timeMode: "shichen", shichenIndex: 0, hour: null,
  location: "北京市", lon: 116.4074, lat: 39.9042, gender: "female",
  events: [], view: "bazi",
});

const payload = {
  view: "bazi", ziwei: "",
  input: {
    year: res.input.year, month: res.input.month, day: res.input.day,
    calendar: res.input.calendar, timeMode: res.input.timeMode,
    shichenIndex: res.input.shichenIndex, hour: null, minute: null,
    location: res.input.location, lon: res.input.lon, lat: res.input.lat,
    gender: res.input.gender, events: [],
  },
  pillars: res.pillars.map((p) => ({
    label: p.label, gan: p.gan, zhi: p.zhi, shishen: p.shishen,
    hidden: p.hidden.map((h) => ({ gan: h.gan, shishen: h.shishen })),
    nayan: p.nayan, kongwang: p.kongwang,
  })),
  dayMaster: res.dayMaster, dayMasterElement: res.dayMasterElement,
  dayMasterYinYang: res.dayMasterYinYang, animal: res.animal,
  strength: res.strength, yongShen: res.yongShen, xiShen: res.xiShen,
  shenSha: res.shenSha ?? [],
  five: res.five ?? { wood:0, fire:0, earth:0, metal:0, water:0 },
  taiYuan: res.taiYuan ?? "", mingGong: res.mingGong ?? "",
  shenGong: res.shenGong ?? "", qiYunAge: res.qiYunAge,
  currentDaYun: { gan: res.currentDaYun.gan, zhi: res.currentDaYun.zhi, startYear: res.currentDaYun.startYear, endYear: res.currentDaYun.endYear },
  liuNian: res.liuNian.map((l) => ({ year: l.year, gan: l.gan, zhi: l.zhi, if: l.if })),
  confidence: res.confidence, timeMode: res.input.timeMode,
  memory: { focus: {} },
};

const t0 = Date.now();
const r = await fetch(`${AI_BASE}/divine`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": PROD_ORIGIN },
  body: JSON.stringify(payload),
});
const elapsed = Date.now() - t0;
const j = await r.json();

// 分类故障：云函数本身 vs 上游 LLM
if (r.status === 502 || (r.status === 200 && j.error && !j.ok)) {
  // 云函数活着，但上游 LLM 失败（502 是腾讯云网关返回的；200+j.error 是云函数自己 catch 后返回的）
  console.log(`\n[故障分类] 云函数活着但上游 LLM 失败`);
  console.log(`  HTTP=${r.status}, error=${j.error}, 时延=${elapsed}ms`);
  console.log(`  可能原因：混元额度耗尽 / 混元上游故障 / 限流被触发`);
  console.log(`  排查：到 CloudBase 控制台看云函数 guanlan 日志`);
  check("云函数活着（即使 LLM 挂了也能返回结构化错误）", !!j.error && typeof j.error === "string", `j=${JSON.stringify(j).slice(0,200)}`);
  check("LLM 上游当前不可用（不阻断部署，但需排查）", false, `本条标记失败但 exit 时仍视情况而定`);
  console.log(`\n=== prod-ai: ${pass} 通过 / ${fail} 失败 ===（响应时延 ${elapsed}ms）\n` + checks.join("\n"));
  process.exit(2);  // 退出码 2 = LLM 上游问题（区别于 1=脚本本身有问题）
}

check("八字解读请求 HTTP 200", r.status === 200, `实际 status=${r.status}`);
check("响应 ok=true", j.ok === true, `实际 j=${JSON.stringify(j).slice(0,200)}`);
check("analysis 含四个核心字段", j.analysis && ["summary","cards","liuNian","advice"].every(k => k in j.analysis),
  `实际字段=${j.analysis ? Object.keys(j.analysis) : "null"}`);
check("summary 非空且中文", typeof j.analysis?.summary === "string" && j.analysis.summary.length > 10 && /[\u4e00-\u9fff]/.test(j.analysis.summary),
  `summary=${j.analysis?.summary}`);
check("cards 含 personality 数组", Array.isArray(j.analysis?.cards?.personality) && j.analysis.cards.personality.length > 0,
  `personality=${JSON.stringify(j.analysis?.cards?.personality ?? null).slice(0,100)}`);
check("响应时延 < 30s（用户体验基线）", elapsed < 30000, `实际 ${elapsed}ms`);

// === 4. 缺必要字段应返回 400 而非 500（防止无效请求消耗 LLM 额度） ===
const bad = await fetch(`${AI_BASE}/divine`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": PROD_ORIGIN },
  body: JSON.stringify({ view: "bazi", input: {} }),  // 缺 pillars/dayMaster 等
});
check("缺关键字段返回 400（不是 500 吞掉 LLM 额度）", bad.status === 400,
  `实际 status=${bad.status}`);

console.log(`\n=== prod-ai: ${pass} 通过 / ${fail} 失败 ===（响应时延 ${elapsed}ms）\n` + checks.join("\n"));
process.exit(fail > 0 ? 1 : 0);
