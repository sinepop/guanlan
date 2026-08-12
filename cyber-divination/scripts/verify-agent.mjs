// 观澜 agent 运行时验证（playwright-core 端到端）
// 覆盖对抗式审查 P0 + P3 全部场景
// 用法：node scripts/verify-agent.mjs
import { createServer } from "node:http";
import { statSync, readFileSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { chromium } from "playwright-core";

const PORT = 4327;
const ROOT = join(process.cwd(), "out");
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  // Next 静态导出：/bazi → /bazi.html
  let fp = join(ROOT, normalize(p));
  try { if (!statSync(fp).isFile()) throw new Error("dir"); } catch {
    try { fp = join(ROOT, normalize(p) + ".html"); statSync(fp); } catch { /* fall through */ }
  }
  try {
    const data = readFileSync(fp);
    res.writeHead(200, { "Content-Type": MIME[extname(fp)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("not found: " + p);
  }
});

let pass = 0, fail = 0;
const checks = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; checks.push(`✓ ${name}`); }
  else { fail++; checks.push(`✗ ${name}  ${detail}`); }
}

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  console.log(`[serve] ${BASE} (root: ${ROOT})`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("  [console.error]", m.text()); });

  // 全局拦截表单提交触发的跳转：divining/ask/result 等导航 fulfill 成当前页 HTML
  // （localStorage/sessionStorage 跨页持久，验证可继续；显式 page.goto 放行）
  await page.route("**/divining*", (route) => route.fulfill({ status: 200, contentType: "text/html", body: readFileSync(join(ROOT, "index.html"), "utf8") }));
  await page.route("**/result*", (route) => route.fulfill({ status: 200, contentType: "text/html", body: readFileSync(join(ROOT, "index.html"), "utf8") }));

  // === 场景 0：localStorage 干净起步 ===
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await wait(400);

  // === P0-3：无 persona 时首页无横幅（且即便有也不暴露生辰） ===
  let bannerVisible0 = await page.isVisible("text=欢迎回来").catch(() => false);
  check("P0-3a 干净起步首页无欢迎横幅", bannerVisible0 === false);

  // === 场景 1：填生辰固化 persona（P0-1 存档端） ===
  await page.goto(`${BASE}/bazi`);
  await wait(400);
  // 老用户恢复提示应隐藏
  let restoreHintVisible = await page.isVisible("text=已保存命盘").catch(() => false);
  check("P0-1a 干净起步 bazi 页无恢复提示", restoreHintVisible === false);

  // 公历 / 1990/05/15 / 时辰=子(shichenIndex 0) / 地点 / 女
  await page.selectOption("select", { value: "1990" }).catch(async () => {
    // 第一个 select 是年份（页面有多个 select，按可见顺序定位）
  });
  // 用 evaluate 直接操作受控组件更可靠
  await page.evaluate(() => {
    const sels = document.querySelectorAll("select");
    // 年/月/日
    sels[0].value = "1990"; sels[0].dispatchEvent(new Event("change", { bubbles: true }));
    sels[1].value = "5";  sels[1].dispatchEvent(new Event("change", { bubbles: true }));
    sels[2].value = "15"; sels[2].dispatchEvent(new Event("change", { bubbles: true }));
    // 时辰模式按钮（默认 shichen），选子时按钮（第一个，含「子」字）
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("子时")) b.click(); });
    // 性别选女（坤造）
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("坤造")) b.click(); });
  });
  await wait(200);
  // 地点：直接选「北京市/北京市」（PROVINCES 真实值，硬编码避免 select 索引漂移）
  await page.evaluate(() => {
    const sels = document.querySelectorAll("select");
    const setVal = (sel, val) => { sel.value = val; sel.dispatchEvent(new Event("change", { bubbles: true })); };
    const prov = Array.from(sels).find((s) => Array.from(s.options).some((o) => o.value === "北京市"));
    if (prov) setVal(prov, "北京市");
    setTimeout(() => {
      const city = Array.from(document.querySelectorAll("select")).find((s) => s !== prov && Array.from(s.options).some((o) => o.value === "北京市"));
      if (city) setVal(city, "北京市");
    }, 100);
  });
  await wait(400);

  // 点「开始推演」触发 ensurePersona
  await page.click("button:has-text('开始推演')").catch(() => {});
  await wait(800); // setTimeout 跳转已被全局 hook，不离开页面
  const mem1raw = await page.evaluate(() => localStorage.getItem("cyber-divination-memory"));

  // 验证 localStorage 已固化 persona
  const mem1 = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("cyber-divination-memory")); } catch { return null; }
  });
  check("P0-1b 提交后排盘信息固化进 memory", !!mem1?.personas?.length, JSON.stringify(mem1)?.slice(0,120));
  check("P0-2a persona 含完整排盘字段", mem1?.personas?.[0]?.baziInput?.year === 1990 && mem1?.personas?.[0]?.baziInput?.calendar === "solar", JSON.stringify(mem1?.personas?.[0]?.baziInput ?? null)?.slice(0,160));

  // === 场景 2：回首页见横幅（P0-1 可见端 + P0-3 隐私） ===
  await page.goto(BASE);
  await wait(400);
  let bannerVisible = await page.isVisible("text=欢迎回来").catch(() => false);
  check("P0-1c 有 persona 后首页出现欢迎回来横幅", bannerVisible);

  // P0-3：横幅文案不暴露完整生辰（不应同时含「年」「月」「日」+「深圳」等地点）
  let bannerText = "";
  if (bannerVisible) {
    bannerText = await page.locator("text=欢迎回来").locator("..").innerText().catch(() => "");
  }
  const leaksBirthdate = /19\d{2}年|20\d{2}年.*月.*日/.test(bannerText);
  check("P0-3b 横幅不暴露完整出生年月日", leaksBirthdate === false, `文案：${bannerText.slice(0,80)}`);
  // P1-B（v2 审查扩展）：横幅也不应明确暴露关注维度（"最近关注感情/财运/..."等）
  // 注：当前设计保留「关注维度」作为弱提示，但不应直接显示维度名（事业/感情/财运/健康）让旁观者读到
  const leaksFocusDim = /(事业|感情|财运|健康)(?!供)/.test(bannerText) && /关注|最近/.test(bannerText);
  check("P0-3c 横幅不直接暴露关注维度名（P1-B 扩展）", leaksFocusDim === false, `文案：${bannerText.slice(0,80)}`);

  // === 场景 3：首页一键排盘恢复 → store 有 BaziInput（P0-1 用端） ===
  if (bannerVisible) {
    const result = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes("欢迎回来"));
      if (!btn) return { ok: false, reason: "no btn" };
      btn.click();
      try {
        const bi = JSON.parse(sessionStorage.getItem("bazi-input"));
        return { ok: !!bi && bi.year === 1990 };
      } catch (e) { return { ok: false, reason: String(e) }; }
    });
    check("P0-1d 点横幅后 persona 生辰恢复到 store", result.ok === true, JSON.stringify(result).slice(0,120));
    await wait(600); // 等点击触发的 setTimeout 跳转被 route fulfill 成首页
  }

  // === 场景 4：events 合并不丢（P0-2） ===
  // 第一次存「2020年结婚」
  await page.evaluate(() => {
    const raw = localStorage.getItem("cyber-divination-memory");
    if (!raw) return;
    const mem = JSON.parse(raw);
    if (!mem?.personas?.[0]) return;
    mem.personas[0].baziInput.events = ["2020年结婚"];
    localStorage.setItem("cyber-divination-memory", JSON.stringify(mem));
  });
  // 再 ensurePersona 一个 events=[] 但指纹相同的输入（模拟二次排盘没填事件）
  // 直接走真实路径——去 bazi 页再提交一次相同输入，看 events 是否保留
  await page.goto(`${BASE}/bazi`);
  await wait(300);
  await page.evaluate(() => {
    const sels = document.querySelectorAll("select");
    sels[0].value = "1990"; sels[0].dispatchEvent(new Event("change", { bubbles: true }));
    sels[1].value = "5";  sels[1].dispatchEvent(new Event("change", { bubbles: true }));
    sels[2].value = "15"; sels[2].dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("子时")) b.click(); });
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("坤造")) b.click(); });
    const prov = Array.from(sels).find((s) => Array.from(s.options).some((o) => o.value === "北京市"));
    if (prov) { prov.value = "北京市"; prov.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => {
      const city = Array.from(document.querySelectorAll("select")).find((s) => s !== prov && Array.from(s.options).some((o) => o.value === "北京市"));
      if (city) { city.value = "北京市"; city.dispatchEvent(new Event("change", { bubbles: true })); }
    }, 100);
  });
  await wait(400);
  // 诊断：提交前 localStorage 的 events 状态（保留为弱日志，验证通过后无需看）
  const preSubmit = await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem("cyber-divination-memory"));
    return { events: j?.personas?.[0]?.baziInput?.events, id: j?.personas?.[0]?.id };
  });
  await page.click("button:has-text('开始推演')").catch(() => {});
  await wait(700);
  const mem2 = await page.evaluate(() => JSON.parse(localStorage.getItem("cyber-divination-memory")));
  const eventsAfter = mem2?.personas?.[0]?.baziInput?.events ?? [];
  check("P0-2b 二次排盘 events 合并保留（不丢「2020年结婚」）", eventsAfter.includes("2020年结婚") && preSubmit.events?.includes("2020年结婚"), JSON.stringify(eventsAfter));

  // === 场景 5：应验闭环（P3） ===
  // 直接往 journal 塞测试数据（绕过 UI 验证聚合逻辑）
  await page.evaluate(() => {
    const entries = [
      { id: "t1", type: "ask", createdAt: Date.now()-3000, question: "工作要不要跳槽", resultSummary: "test1", followUpStatus: "verified", focus: "career" },
      { id: "t2", type: "ask", createdAt: Date.now()-2000, question: "感情合不合适", resultSummary: "test2", followUpStatus: "verified", focus: "love" },
      { id: "t3", type: "ask", createdAt: Date.now()-1000, question: "工作项目能不能接", resultSummary: "test3", followUpStatus: "refuted", focus: "career" },
      { id: "t4", type: "ask", createdAt: Date.now(), question: "项目能不能做", resultSummary: "test4", followUpStatus: "pending", focus: "career" },
    ];
    localStorage.setItem("cyber-divination-journal", JSON.stringify(entries));
  });
  await page.goto(`${BASE}/ledger`);
  await wait(500);
  const ledgerText = await page.locator("body").innerText().catch(() => "");
  // 应验率 = verified/(verified+refuted) = 2/(2+1) = 67%
  check("P3a ledger 展示应验率", ledgerText.includes("应验率"), ledgerText.slice(0,200));
  check("P3b 应验率数值=67%（2/3 已结案）", ledgerText.includes("67%"), `文案含应验率：${ledgerText.match(/应验率 \d+%/)?.[0] ?? "未匹配"}`);
  // 维度拆分：事业 1 verified + 1 refuted = 50%；感情 1 verified = 100%
  const hasDimSection = ledgerText.includes("按关注维度");
  check("P3c 有按维度拆分区块", hasDimSection);
  // 清除记忆按钮存在（P1-4）
  const hasClearBtn = await page.isVisible("text=清除命盘记忆").catch(() => false);
  check("P3d 有清除命盘记忆入口（P1-4）", hasClearBtn);

  // === 场景 6：focus 关键词单字歧义修复（P1-1） ===
  // detectFocus 已暴露在 window 上（memory.ts）；纯函数无副作用
  const focusCases = await page.evaluate(() => {
    const fn = window.detectFocus;
    if (typeof fn !== "function") return { err: "window.detectFocus 未暴露" };
    const run = (q) => fn(q).slice().sort().join(",");
    return {
      // 旧 bug：单字误判（「合」「情」「爱」「病」「买」）应不再误命中
      合同纠纷: run("合同纠纷怎么办"),
      心情不好: run("今天心情不好"),
      可爱小猫: run("可爱的小猫"),
      毛病诊断: run("程序毛病在哪"),
      工作事情: run("工作的事情怎么处理"), // career 命中（工作），但 love 不应命中（事情的单字情已去）
      // 多维度同命中
      事业财运: run("看看我的事业和财运"),
      // 维度准确命中
      结婚: run("什么时候能结婚"),
      脱单: run("我会脱单吗"),
      投资亏了: run("最近投资亏了"),
      股票套牢: run("股票套牢怎么办"),
      身体恢复: run("手术后身体恢复"),
      备孕: run("今年适合备孕吗"),
      考试: run("考试能过吗"),
      副业: run("想做副业"),
    };
  });
  if (focusCases.err) {
    check("P1-1 window.detectFocus 暴露", false, focusCases.err);
  } else {
    check("P1-1 window.detectFocus 暴露", true);
    // 单字歧义：合同/事情/可爱/毛病 → 应无 love/health 误命中
    check("P1-1a 「合同」不误命中 love", focusCases.合同纠纷 !== "love" && !focusCases.合同纠纷.includes("love"), focusCases.合同纠纷);
    check("P1-1a 「心情」不误命中 love", focusCases.心情不好 === "", focusCases.心情不好);
    check("P1-1a 「可爱」不误命中 love", focusCases.可爱小猫 === "", focusCases.可爱小猫);
    check("P1-1a 「毛病」不误命中 health", focusCases.毛病诊断 === "", focusCases.毛病诊断);
    // 「工作的事情」只命中 career，不命中 love（事情的情单字已去）
    check("P1-1a 「事情」不误命中 love（工作的事）", focusCases.工作事情 === "career", focusCases.工作事情);
    // 多维度同命中
    check("P1-1b 「事业+财运」双命中 career+wealth", focusCases.事业财运 === "career,wealth", focusCases.事业财运);
    // 维度准确
    check("P1-1c 「结婚」→ love", focusCases.结婚 === "love", focusCases.结婚);
    check("P1-1c 「脱单」→ love", focusCases.脱单 === "love", focusCases.脱单);
    check("P1-1c 「投资」→ wealth", focusCases.投资亏了 === "wealth", focusCases.投资亏了);
    check("P1-1c 「股票」→ wealth", focusCases.股票套牢 === "wealth", focusCases.股票套牢);
    check("P1-1c 「身体」→ health", focusCases.身体恢复 === "health", focusCases.身体恢复);
    check("P1-1c 「备孕」→ health", focusCases.备孕 === "health", focusCases.备孕);
    check("P1-1c 「考试」→ career", focusCases.考试 === "career", focusCases.考试);
    check("P1-1c 「副业」→ career", focusCases.副业 === "career", focusCases.副业);
  }

  // === 场景 7：events 不触发 focus（P0-D v2 修复后的契约） ===
  // 历史背景：v1 P1-5 让 events 也触发 inferFocus；v2 P0-D 发现这不幂等
  // （重复提交会让 events 命中维度权重无限累加，覆盖真实最近关注），已回退。
  // 现在契约：events 进 persona 持久化但**不**进 focus 权重；focus 仅来自 ask 问题
  const focusBeforeSubmit = await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem("cyber-divination-memory"));
    return j?.focus ?? null;
  });
  // 真实提交一次带 events 的表单
  await page.goto(`${BASE}/bazi`);
  await wait(400);
  await page.evaluate(() => {
    const sels = document.querySelectorAll("select");
    sels[0].value = "1990"; sels[0].dispatchEvent(new Event("change", { bubbles: true }));
    sels[1].value = "5";  sels[1].dispatchEvent(new Event("change", { bubbles: true }));
    sels[2].value = "15"; sels[2].dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("子时")) b.click(); });
    document.querySelectorAll("button").forEach((b) => { if (b.textContent?.includes("坤造")) b.click(); });
    const prov = Array.from(sels).find((s) => Array.from(s.options).some((o) => o.value === "北京市"));
    if (prov) { prov.value = "北京市"; prov.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => {
      const city = Array.from(document.querySelectorAll("select")).find((s) => s !== prov && Array.from(s.options).some((o) => o.value === "北京市"));
      if (city) { city.value = "北京市"; city.dispatchEvent(new Event("change", { bubbles: true })); }
    }, 100);
  });
  await wait(400);
  await page.click("button:has-text('开始推演')").catch(() => {});
  await wait(700);
  const focusAfterSubmit = await page.evaluate(() => {
    const j = JSON.parse(localStorage.getItem("cyber-divination-memory"));
    return j?.focus ?? null;
  });
  if (focusBeforeSubmit && focusAfterSubmit) {
    const changed =
      focusAfterSubmit.career !== focusBeforeSubmit.career ||
      focusAfterSubmit.love !== focusBeforeSubmit.love ||
      focusAfterSubmit.wealth !== focusBeforeSubmit.wealth ||
      focusAfterSubmit.health !== focusBeforeSubmit.health;
    check("P0-D-v2 events 提交不应触发 focus 累加（inferFocus 不幂等 bug 修复）", changed === false,
      `before=${JSON.stringify(focusBeforeSubmit)}, after=${JSON.stringify(focusAfterSubmit)}`);
  } else {
    check("P0-D-v2 focus 状态读取失败", false, `before=${JSON.stringify(focusBeforeSubmit)}, after=${JSON.stringify(focusAfterSubmit)}`);
  }

  await browser.close();
  server.close();
  console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n` + checks.join("\n"));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(2); });
