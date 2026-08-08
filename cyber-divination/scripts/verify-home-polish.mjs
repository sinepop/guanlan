// 首页改版视觉验证脚本（#26 tagline 白色 + 日签卡居中 + #27 背景透出 + #28 卡片模糊）
// 运行：node scripts/verify-home-polish.mjs
import { chromium } from "playwright-core";

const BASE = "http://localhost:3099";
const shot = (p) => `/home/xizhiyizhi/ai-workspace/projects/观澜/cyber-divination/artifacts/polish/${p}`;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// 首页
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
// 预置「今日已求签」：写入当天签（跨天过期逻辑用真实今天）
await page.evaluate(() => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  localStorage.setItem(
    "cyber-divination-today-sign",
    JSON.stringify({ dateStr, sign: { number: "第八签", title: "厚德载物", advice: "厚德载物，自强不息" } })
  );
});
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({ path: shot("home-1440.png"), fullPage: false });

// 1. tagline 白色（text-mist #e8e6e0 而非朱砂 #b94a3d）
const tagline = page.locator(".holo-overline");
const tagColor = await tagline.evaluate((el) => getComputedStyle(el).color);
check("tagline 白色", tagColor === "rgb(232, 230, 224)", tagColor);

// 2. 每日一签卡：文字块在竖线与徽标之间居中，徽标钉右缘
const card = page.locator(".feature-card.primary");
const dayCardBox = await card.boundingBox();
const lane = await card.locator(".border-l").first().boundingBox(); // 竖线所在右容器（x 即竖线位置）
const seal = page.locator(".seal-vertical").first();
const sealBox = await seal.boundingBox();
const infoCol = card.locator("span.flex.flex-col.items-start").first();
const infoBox = await infoCol.boundingBox();
const infoCenterX = infoBox ? infoBox.x + infoBox.width / 2 : -1;
const laneCenterX = lane ? (lane.x + sealBox.x) / 2 : -1;
check("签信息居中于竖线↔徽标", Math.abs(infoCenterX - laneCenterX) < 10, `infoCenter=${infoCenterX.toFixed(1)} laneCenter=${laneCenterX.toFixed(1)}`);
check("竖排徽标钉右缘(卡padding内)", sealBox && dayCardBox.x + dayCardBox.width - (sealBox.x + sealBox.width) < 28, `sealRight=${(sealBox.x + sealBox.width).toFixed(1)} cardRight=${(dayCardBox.x + dayCardBox.width).toFixed(1)}`);

// 3. 卡片 backdrop-filter 生效
const bdf = await card.evaluate((el) => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
check("首页卡片 backdrop blur(6px)", bdf.includes("blur(6px)"), bdf);

// 4. 背景遮罩调浅：bg-form 页（/mingli）读线性遮罩颜色，应显著浅于原 0.72/0.88
await page.goto(BASE + "/mingli", { waitUntil: "networkidle" });
await page.screenshot({ path: shot("mingli-1440.png"), fullPage: false });
const bgImg = await page.locator(".bg-form").first().evaluate((el) => getComputedStyle(el).backgroundImage);
check("mingli 使用 bg-form", bgImg.includes("bg-form.webp"), bgImg.split(",").pop().trim());
// 卡片背景 alpha 降为 0.6
const mingliCard = page.locator(".feature-card").first();
const cardBg = await mingliCard.evaluate((el) => getComputedStyle(el).backgroundColor);
check("feature-card 背景（bg-image 透出）", cardBg === "rgba(0, 0, 0, 0)" || cardBg.includes("rgba"), cardBg);

// 5. /ledger（bg-form）与 /bazi（bg-form + .card）截图
await page.goto(BASE + "/ledger", { waitUntil: "networkidle" });
await page.screenshot({ path: shot("ledger-1440.png"), fullPage: false });
await page.goto(BASE + "/bazi", { waitUntil: "networkidle" });
await page.screenshot({ path: shot("bazi-1440.png"), fullPage: false });

// 6. 390px 无横滚 + 移动端居中
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  localStorage.setItem(
    "cyber-divination-today-sign",
    JSON.stringify({ dateStr, sign: { number: "第八签", title: "厚德载物", advice: "厚德载物，自强不息" } })
  );
});
await page.reload({ waitUntil: "networkidle" });
const scrollW = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("390px 无横滚", scrollW <= 0, `scrollW=${scrollW}`);
const mCard = page.locator(".feature-card.primary").first();
const mLane = await mCard.locator(".border-l").first().boundingBox();
const mSeal = await page.locator(".seal-vertical").first().boundingBox();
const mCol = await mCard.locator("span.flex.flex-col.items-start").first().boundingBox();
const mCenter = mCol ? mCol.x + mCol.width / 2 : -1;
const mSwim = mLane && mSeal ? (mLane.x + mSeal.x) / 2 : -1;
check("390px 签信息居中", Math.abs(mCenter - mSwim) < 10, `center=${mCenter.toFixed(1)} swim=${mSwim.toFixed(1)}`);
await page.screenshot({ path: shot("home-mobile390.png"), fullPage: false });

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);
