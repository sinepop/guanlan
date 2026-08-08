// 生产截图：改版后首页 / 命理聚合页 / 应验簿 / 日签小卡（需先求签）
// 运行：node scripts/shot-prod.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL ?? "https://cyber-divination-7e4.pages.dev";
const OUT = "artifacts/production";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 首页（未求签：应显示四入口）
await page.goto(`${BASE}/`, { waitUntil: "load" });
await page.screenshot({ path: `${OUT}/prod-home.png`, fullPage: true });

// 命理聚合页
await page.goto(`${BASE}/mingli`, { waitUntil: "load" });
await page.screenshot({ path: `${OUT}/prod-mingli.png`, fullPage: true });

// 应验簿
await page.goto(`${BASE}/ledger`, { waitUntil: "load" });
await page.screenshot({ path: `${OUT}/prod-ledger.png`, fullPage: true });

// 每日一签求签 → 回首页验证「今日已求签」小卡
await page.goto(`${BASE}/daily-fortune`, { waitUntil: "load" });
await page.click(".daily-lot-caster");
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/prod-daily.png`, fullPage: true });
await page.goto(`${BASE}/`, { waitUntil: "load" });
await page.screenshot({ path: `${OUT}/prod-home-with-sign.png`, fullPage: true });

// 移动端首页 390px
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto(`${BASE}/`, { waitUntil: "load" });
await mob.screenshot({ path: `${OUT}/prod-home-mobile390.png`, fullPage: true });

await browser.close();
console.log("screenshots saved to", OUT);
