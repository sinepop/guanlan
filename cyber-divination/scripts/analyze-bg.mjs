// 对比生产（改版前）与本地（改版后）背景透出效果
// 运行：node scripts/analyze-bg.mjs
import { PNG } from "pngjs";
import { readFileSync } from "fs";
import { chromium } from "playwright-core";

const PROD = "https://cyber-divination-7e4.pages.dev";
const LOCAL = "http://localhost:3099";

// 采样背景区域（避开卡片/文字）：取页面中部偏上的空白带
function bgStats(p) {
  const png = PNG.sync.read(readFileSync(p));
  const { width, height, data } = png;
  const rows = [];
  const cols = [];
  // 在 40%~70% 高度、横向全宽采样，但去掉中心 40%（卡片区）
  let sum = 0, sum2 = 0, n = 0;
  for (let y = Math.floor(height * 0.4); y < height * 0.7; y += 2) {
    for (let x = 0; x < width; x += 2) {
      // 避开中心 50% 横向（卡片区），只采左右两侧背景
      if (x > width * 0.25 && x < width * 0.75) continue;
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += lum; sum2 += lum * lum; n++;
    }
  }
  const mean = sum / n;
  const std = Math.sqrt(sum2 / n - mean * mean);
  return { mean: +mean.toFixed(1), std: +std.toFixed(1), n };
}

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });

const routes = ["/mingli", "/ledger", "/bazi", "/"];
for (const r of routes) {
  await page.goto(PROD + r, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `artifacts/polish/prod-${r.replace("/", "")}.png` });
  await page.goto(LOCAL + r, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `artifacts/polish/local-${r.replace("/", "")}.png` });
  const prod = bgStats(`artifacts/polish/prod-${r.replace("/", "")}.png`);
  const local = bgStats(`artifacts/polish/local-${r.replace("/", "")}.png`);
  const lift = (local.mean - prod.mean).toFixed(1);
  console.log(`${r}: 生产 mean=${prod.mean} std=${prod.std}  →  本地 mean=${local.mean} std=${local.std}  (亮度+${lift})`);
}
await b.close();
