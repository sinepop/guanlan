# 观澜 · Guanlan

> 新中式玄学 Web 平台 — **观水有术，必观其澜**
> A modern Chinese metaphysics platform — _To read water, one must observe its waves._

**观澜**（Guanlan）是一款新中式玄学 Web 应用：以玄黑 × 鎏金 × 朱砂为视觉语言，采用**确定性排盘 + AI 解读**的双层架构。网站定名取《孟子·尽心上》「观水有术，必观其澜」——观波澜而知其下，察变化而推其变。

**Guanlan** is a modern Chinese metaphysics web app with a dark-lacquer × gold × cinnabar aesthetic. It pairs **deterministic, rule-based chart casting with AI interpretation**. The name comes from Mencius: _In observing water, one must observe its waves_ — read the ripples to know what lies beneath.

在线演示 · Live demo: <https://cyber-divination-7e4.pages.dev>

---

## 功能 · Features

VNext 版本为四入口结构：**每日一签 → 占卜（梅花易数）· 命理（八字/紫微/合盘） → 应验簿**。

Four entrances: **Daily Fortune → Divination (Plum Blossom) · Mingli (Bazi/Ziwei/Compatibility) → Ledger**.

| 入口 Entrance | 路由 Route | 说明 Description |
|---|---|---|
| 首页 Home | `/` | 四入口导航 · Four-entrance hub |
| 每日一签 Daily Fortune | `/daily-fortune` | 按日期/时区/地点格网与本地签筒盐即时推算，确定性无 `Math.random`。Deterministic, seeded by date/time/location |
| 问一事 Ask（梅花易数） | `/ask` | 本地规则引擎确定性起卦（同刻+同念必同卦），AI 只解释结构化卦象。Deterministic Plum Blossom casting; AI explains the hexagram |
| 命理 Mingli | `/mingli` | 八字 / 紫微斗数 / 双人合盘 聚合页 · Bazi / Ziwei / Compatibility hub |
| 八字 Bazi | `/bazi` | 八字排盘（公历/农历、真太阳时），支持 `?view=bazi/ziwei` 视角切换。BaZi chart with true solar time |
| 双人合盘 Compatibility | `/compat` · `/compat-result` | 缘分指数、四项评分、双雷达图。Compatibility score + radar charts |
| 应验簿 Ledger | `/ledger` | 本地记录与回顾（localStorage）。Local journal of outcomes |
| 结果报告 Result | `/result` | 八字/紫微结果报告 · Bazi/Ziwei report |

---

## 技术栈 · Tech Stack

- **Next.js 14**（App Router，`output: "export"` 静态导出）
- **Tailwind CSS 3.4**；自托管得意黑 SmileySans 字体（OFL 开源）
- **lunar-javascript** 八字排盘（立春定年 / 节气定月 / 晚子时换日 / 真太阳时）
- **iztro** 引擎前端紫微排盘（十二宫 / 星曜庙旺 / 四化 / 大限）
- **Cloudflare Pages + Functions** 代理 AI 后端（默认火山方舟，可切 DeepSeek/Zen）

## 架构亮点 · Highlights

- **确定性优先**：八字/紫微/梅花全部前端规则引擎排盘，AI 只做解读，绝不显示假 AI；梅花起卦不用 `Math.random`，同刻+同念必同卦。
- **可信度系统**：节气边界/子时换日/真太阳时校正输出 high/medium/low/review，结果页附依据与警告。
- **密钥安全**：仓库不含任何密钥，AI Key 只存于 Cloudflare 加密环境变量。

## 快速开始 · Quick Start

```bash
cd cyber-divination
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 out/（含 TS 类型检查）
npm run lint       # ESLint
```

## 部署 · Deployment

```bash
npm run build
npx wrangler pages deploy out --project-name cyber-divination --branch main
```

- 生产分支 `main`（`--branch main` 必带）
- AI 后端通过 Cloudflare Pages Functions（`functions/api/divine.ts`、`functions/api/ask.ts`）代理，密钥为 Pages 加密环境变量。

## AI 后端配置 · AI Backend

| 变量 Env | 说明 |
|---|---|
| `AI_PROVIDER` | `ark`（默认，火山方舟）\| `zen`（DeepSeek/Zen） |
| `ARK_API_KEY` | 火山方舟 Key（只存于服务端 env，仓库/浏览器不出现明文） |
| `ZEN_API_KEY` | 切回 zen 时必填 |

## 文档 · Docs

- [`cyber-divination/README.md`](cyber-divination/README.md) — 应用详细文档（功能路由 / 排盘引擎 / 陷阱约定）
- [`PROGRESS.md`](PROGRESS.md) — 进度、验证基线、已修复 bug
- [`BLOCKED.md`](BLOCKED.md) — 当前阻塞与遗留

---

<p align="center"><sub>观水有术，必观其澜 · In observing water, one must observe its waves</sub></p>
