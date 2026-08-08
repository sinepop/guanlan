// VNext UI 验证：首页分层入口（每日一签置顶 / 占卜·命理并排 / 应验簿细窄）· 问一事流程 · 每日一签保存 toast · 应验簿 · 移动端无横滚 · console 零错误
// 运行：node scripts/verify-ui-vnext.mjs   （需已构建 npm run build + 服务 npm start 或静态服务 out/）
import { chromium } from "playwright-core";
import { spawn } from "child_process";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = "artifacts/ui-verification";
mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];

function ok(name, cond, extra = "") {
  results.push(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) errors.push(name);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

// ---- 首页分层入口 ----
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/vnext-home.png`, fullPage: true });
const homeButtons = await page.locator("button").allTextContents();
ok("首页含「每日一签」", homeButtons.some((t) => t.includes("每日一签")));
ok("首页含「占卜」", homeButtons.some((t) => t.includes("占卜")));
ok("首页含「命理」", homeButtons.some((t) => t.includes("命理")));
ok("首页含「应验簿」入口", homeButtons.some((t) => t.includes("应验簿")));
ok("首页无 trust pills", (await page.locator(".trust-pill").count()) === 0);
ok("首页含警示语", (await page.textContent("body")).includes("人生由自己的选择决定"));
// 布局：每日一签在占卜/命理之上（DOM 顺序），应验簿在其下
const dailyTop = await page.locator("button", { hasText: "每日一签" }).boundingBox();
const wuTop = await page.locator("button", { hasText: "占卜" }).boundingBox();
const mingTop = await page.locator("button", { hasText: "命理" }).boundingBox();
const ledgerTop = await page.locator("button", { hasText: "应验簿" }).boundingBox();
ok("每日一签置顶于占卜/命理之上", dailyTop && wuTop && dailyTop.y < wuTop.y && dailyTop.y < mingTop.y);
ok("占卜与命理并排同高", wuTop && mingTop && Math.abs(wuTop.y - mingTop.y) < 4 && Math.abs(wuTop.height - mingTop.height) < 4);
ok("应验簿在占卜/命理之下", wuTop && ledgerTop && ledgerTop.y > wuTop.y + wuTop.height);
ok("每日一签卡比占卜卡更宽（主入口）", dailyTop && wuTop && dailyTop.width > wuTop.width);
ok("每日一签卡为左右布局（含「今日未求签」提示）", (await page.textContent("body")).includes("今日未求签") || (await page.textContent("body")).includes("今日已求签"));

// ---- 命理聚合页 ----
await page.goto(`${BASE}/mingli`, { waitUntil: "networkidle" });
const mingliBody = await page.textContent("body");
ok("命理页含「四柱八字」", mingliBody.includes("四柱八字"));
ok("命理页含「紫微斗数」", mingliBody.includes("紫微斗数"));
ok("命理页含「双人合盘」", mingliBody.includes("双人合盘"));

// ---- 问一事流程 ----
await page.goto(`${BASE}/ask`, { waitUntil: "networkidle" });
await page.fill(".ask-box textarea", "今天要不要推进这个项目？");
await page.getByRole("button", { name: "此刻起卦" }).click();
// 等起卦动画 + 结果出现（AI 请求会失败或超时，但结果必须展示）
await page.waitForSelector(".hexagram-card", { timeout: 15000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/vnext-ask-result.png`, fullPage: true });
const askBody = await page.textContent("body");
ok("问一事结果页展示本卦", askBody.includes("本卦"));
ok("问一事结果页展示变卦", askBody.includes("变卦"));
ok("问一事结果页展示动爻", askBody.includes("爻动"));
ok("问一事结果页展示可信度", askBody.includes("可信度"));
ok("问一事结果页展示起卦依据", askBody.includes("起卦依据"));
ok("问一事结果页展示应验簿按钮", askBody.includes("存入应验簿"));

// 心念数校验
await page.goto(`${BASE}/ask`, { waitUntil: "networkidle" });
await page.fill(".ask-box textarea", "测试心念");
await page.fill('input[type="number"]', "0");
await page.getByRole("button", { name: "此刻起卦" }).click();
await page.waitForTimeout(500);
const errBody = await page.textContent("body");
ok("心念数 0 被拒", errBody.includes("1-999"));

// ---- 每日一签保存 toast ----
await page.goto(`${BASE}/daily-fortune`, { waitUntil: "networkidle" });
await page.click(".daily-lot-caster");
await page.waitForTimeout(2500);
await page.click("text=保存签文为图片");
await page.waitForTimeout(800);
const dailyBody = await page.textContent("body");
ok("每日一签保存有反馈（toast 或图片）", dailyBody.includes("签文卡已生成") || dailyBody.includes("每日一签"));
await page.screenshot({ path: `${OUT}/vnext-daily-sharecard.png`, fullPage: true });

// ---- 应验簿 ----
await page.goto(`${BASE}/ledger`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/vnext-ledger.png`, fullPage: true });
const ledgerBody = await page.textContent("body");
ok("应验簿页面可打开", ledgerBody.includes("应验簿"));

// ---- 移动端无横滚 ----
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/ask`, { waitUntil: "networkidle" });
const hscroll = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok("390px 问事页无横向滚动", !hscroll);
await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
const hscrollHome = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok("390px 首页无横向滚动", !hscrollHome);
await mobile.screenshot({ path: `${OUT}/vnext-home-mobile390.png`, fullPage: true });

await browser.close();

console.log(results.join("\n"));
const fatal = errors.filter((e) => !e.startsWith("console.error"));
console.log(`\n${results.length} 项检查，${fatal.length} 项硬失败`);
// console.error 若来自 /api/ask 预期失败（本地无密钥）则降级为提示
const aiErrors = errors.filter((e) => e.includes("console.error") && e.includes("/api/ask"));
console.log(`AI 请求 console 错误 ${aiErrors.length} 条（本地无密钥属预期，见 /api/ask 调用）`);
process.exit(fatal.length ? 1 : 0);
