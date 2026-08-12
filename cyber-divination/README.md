# 观澜（cyber-divination）

玄黑 × 鎏金 × 朱砂新中式玄学平台。网站定名「观澜」（孟子·尽心上「观水有术，必观其澜」——观波澜而知其下、察变化而推其变）。Next.js 14 静态导出 + 腾讯云 CloudBase 云函数 AI 后端（混元 hy3 模型，小程序成长计划免费额度）。

VNext 后为四入口结构：**每日一签**（最大入口置顶）→ **占卜**（梅花易数）·**命理**（八字/紫微/合盘）并排 → **应验簿**（底部细窄入口）。

## 功能入口

| 路由 | 功能 |
|---|---|
| `/` | 首页：每日一签 / 占卜 / 命理 / 应验簿 四入口 |
| `/daily-fortune` | 每日一签（按本机时间、时区、粗略地点格网与本地签筒盐即时推算，确定性无 Math.random） |
| `/ask` | 问一事 / 梅花易数（本地规则引擎确定性起卦，AI 只解释结构化卦象 JSON） |
| `/mingli` | 命理聚合页：四柱八字 / 紫微斗数 / 双人合盘 |
| `/bazi` | 八字排盘（公历/农历、时辰/精确/未知、真太阳时），支持 `?view=bazi/ziwei`（career 后端保留，UI 入口已移除） |
| `/compat` `/compat-result` | 双人合盘（缘分指数、四项评分、双雷达图） |
| `/ledger` | 应验簿（localStorage 记录 + 状态标记 + 统计） |
| `/divining` | 推演动画中转页 |
| `/result` | 八字/紫微结果报告（sessionStorage 无 `bazi-result` 数据时自动跳回 `/bazi`） |

## 页面背景图（2026-08-07 素材换代）

每页 `main` 挂独立背景类（`globals.css`），`url(...) center / cover` + 金色分散光晕 + 移动端浅遮罩：

| 背景类 | 图片 | 页面 |
|---|---|---|
| `.bg-home` | `bg-home.webp` | 首页 `/`、应验簿 `/ledger`（用户指定复用） |
| `.bg-ask` | `bg-ask.webp` | 命理聚合 `/mingli`、问一事 `/ask`、每日一签 `/daily-fortune` |
| `.bg-compat` | `bg-compat.webp` | 合盘 `/compat`、合盘结果 `/compat-result` |
| `.bg-bazi` / `.bg-ziwei` | `bg-bazi.webp` / `bg-ziwei.webp` | 八字页 `/bazi` 按 `view` 切换 |
| `.bg-result` | `bg-result.webp` | 结果页 `/result`、推演中转 `/divining` |

- 旧 `.bg-form` 类与 `bg-form.webp` 已删除（2026-08-07），勿引用。
- 玻璃按钮模糊在 `.feature-card.holo-border`（`globals.css:1046`）：功能入口卡 blur(6px)；首页应验簿入口不用 `.feature-card`，保持无 blur。

## 技术栈

- Next.js 14.2（App Router，`output: "export"` 静态导出）
- Tailwind CSS 3.4；字体自托管**得意黑 SmileySans**（OFL 开源、可商用可网页嵌入，`public/fonts/SmileySans-Oblique.ttf.woff2`），Noto Serif/Sans SC 走 Google Fonts 兜底
- `lunar-javascript@1.7.7` 排盘（立春定年/节气定月/晚子时换日/真太阳时）；紫微用 iztro 引擎前端排盘
- **腾讯云 CloudBase HTTP 云函数**：`guanlan`（`POST /api/divine` 八字/紫微、`POST /api/ask` 梅花易数），混元 hy3 模型（小程序成长计划免费额度），前端直连 `https://kaifa-d1gdl3ow4ec39065b.service.tcloudbase.com/api`

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 静态导出到 out/（Next 构建含 TS 类型检查；`npm run lint` 单独跑 ESLint）
```

## 代码结构

```
src/app/{ask,bazi,compat,compat-result,daily-fortune,divining,ledger,mingli,result}  九个页面
src/components/  Header / PersonForm / ScoreRing / RadarChart / ErrorBanner / CredibilityPanel / SaveToJournal / Toast / ...
src/lib/         bazi.ts 八字引擎（核心）；ziwei.ts 紫微引擎（iztro）；meihua.ts 梅花起卦（确定性）
                 compat.ts 合盘；credibility.ts 可信度；journal.ts 应验簿（localStorage）
                 solarTime.ts 真太阳时；locations.ts 34 省经纬度；signs.ts 每日签库
                 terms.ts 术语库；store.ts sessionStorage；types.ts 全部类型
                 api.ts（AI_BASE_URL 云函数端点常量）
types/           自定义 lunar-javascript 类型声明（lunar 包无自带 d.ts）
```

## AI 后端配置（腾讯云 CloudBase 云函数）

**云函数 `guanlan`** 部署在腾讯云 CloudBase 环境 `kaifa-d1gdl3ow4ec39065b`（个人版，成长计划赠送）。

| 配置项 | 值 |
|---|---|
| HTTP 端点 | `https://kaifa-d1gdl3ow4ec39065b.service.tcloudbase.com/api` |
| 路径 | `/api/divine`（八字/紫微/career）、`/api/ask`（梅花易数） |
| 模型 | 混元 hy3（`hunyuan-v3` 组，消耗成长计划免费 Token 额度） |
| 鉴权 | 云函数内 origin 白名单（无 API Key，浏览器直连） |
| 超时 | 60s（云函数）/ 60s（HTTP 网关上限） |

前端通过 `src/lib/api.ts` 的 `AI_BASE_URL` 常量调用，无密钥、无中间代理。

> 云函数代码独立部署（不在本仓库内），包含提示词构造、输入校验、JSON normalize 逻辑。

## 分析视角（view）

`/bazi` 页顶部可切换三种视角，决定后端提示词；**输出结构恒为 `AiAnalysis`**（summary + 5 卡片 + 流年 + advice），前端 `/result` 无需区分来源：

| view | 解读流派 | 排盘数据 |
|---|---|---|
| `bazi`（默认） | 八字综合：四柱五行·全局 | 前端 `computeBazi` 排四柱/五行/十神/神煞/三垣/大运流年 |
| `ziwei` | 紫微斗数：十二宫星曜·命运推演 | iztro 引擎 `computeZiwei`（`src/lib/ziwei.ts`）排十二宫/主星庙旺/四化/命主身主/五行局/大限 |
| `career` | 职场事业：官杀财星·职业规划 | 同 `bazi`，提示词聚焦官杀/财星/印星/食伤（UI 入口已移除，后端保留） |

- **紫微不再让模型自排**：集成 iztro 引擎在**前端**排盘（与八字共用同一套真太阳时校正时刻），星盘作为权威数据传给模型解读，模型「勿重复排盘」。
- `view` 经云函数白名单校验（`bazi`/`ziwei`/`career`），防任意字符串注入。

## 可信度系统

`src/lib/credibility.ts` + `CredibilityPanel`：
- `deriveBaziCredibility`（节气边界/子时换日/真太阳时校正，输出 high/medium/low/review）
- `deriveCompatCredibility` + `deriveAskCredibility`
- 接入 result / compat-result / ask 三个结果页，附依据与警告卡。

## 应验簿

`src/lib/journal.ts`（localStorage key `cyber-divination-journal`，try/catch 降级）+ `/ledger` 页。状态为中性四档（有所应/未显现/待回顾/已归档），`SaveToJournal` 接入 ask/daily/bazi/compat 四结果页。

## 关键约定 / 陷阱

- **`lunar-javascript` 的 Yun 没有 `getStartAge()`**，起运年龄请取 `daYunList[0].startAge`（虚岁）。
- 未起运者（新生儿）不得伪造当前大运：用 `currentDaYun.gan === ""` 判空显示「尚未起运」。
- **梅花起卦必须确定性**：`src/lib/meihua.ts` 公式只用 年支序+农历月日+时辰+心念数，绝不用 `Math.random`；同刻+同念必同卦。AI 失败 → 64 卦卦辞（真实文本）+「AI 解读暂不可用」，绝不显示假 AI。
- 表单页「开始推演」写入 `sessionStorage`；推演/结果页若读不到会跳回 `/bazi`。
- `ZEN_API_KEY` 只在 Cloudflare 服务端 env，浏览器与代码仓库不得出现明文。
- 改了 `ALLOWED_ORIGINS`（`functions/_shared.ts`）才能在自定义域名下调用 AI 接口。
- 禁止浏览器 `alert`，错误一律走 `ErrorBanner`/页内提示/Toast。

## 部署

```bash
npm run build
npx wrangler pages deploy out --project-name cyber-divination --branch main
```

- 生产域名：`https://cyber-divination-7e4.pages.dev`（注意：`cyber-divination.pages.dev` 是**另一个账号**的旧站「赛博天师」，与本项目无关）。
- 生产分支 `main`（git 分支 `master`），**`--branch main` 必带**。
- 旧部署会被 Cloudflare 自动回收；preview/aliased 部署删除需 `?force=true`。

## 文档

- `../PROGRESS.md`：进度、验证基线、已修复 bug、续接注意事项
- `../BLOCKED.md`：当前阻塞与遗留（Zen 免费限流、限流竞态、应验簿统计图等）
