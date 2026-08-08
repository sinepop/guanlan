# BLOCKED.md

## 当前阻塞项

### UI 改版已解决（2026-08-06）
- **背景图片「没了」**：VNext 的 SVG 纹样太淡（细线 0.1-0.18 opacity + 0.6-0.9 遮罩）在手机上读作纯黑页。已恢复 git 历史中的 webp 实拍图 + 调浅遮罩，照片纹理可见。删除了三个 SVG pattern。
- **首页干扰信号**：4 枚 trust pills 已移除，首页只留警示「命理仅供文化娱乐与自我反思，人生由自己的选择决定」。
- **入口结构（第三轮调整）**：层级化——每日一签最大入口置顶且为左右布局（标题组件在左、抽签展示在右，竖分隔线）；占卜（梅花易数）与命理（八字·紫微·合盘）并排；应验簿底部细窄入口。首页朱砂小字（日签/占/命/簿）已移除。双人合盘在命理页 `/mingli`；career（职场事业）从 UI 入口移除（后端支撑保留）。
- **赛博玄门风格（第四轮调整）**：首页落地流光金骨架（`.holo-border` 发丝金边 + 霓虹光晕，hover 金→朱砂红 `#FF3333`）+ 全息发光标题（`.holo-title` 三层 text-shadow）+ 底色加深纯黑 `#101012`。**瘦金字体修复**：标题改用站酷小薇体（细笔画瘦金感）+ 光晕增强 + border 特异性修复。仅首页，待确认后推广全站。
- **每日一签**：求签后首页每日一签大卡右侧显示今日签信息，跨天过期。
- **已部署**：生产 `84c38e7c`（commit `46d1b1d`），25 项 UI 检查通过。本轮：按反馈「不如上一版」回退——首页四入口标题恢复浅色，每日一签卡恢复靠右布局 + 竖排朱砂色块中空字徽标；页面 h1 朱砂与色块中空字小标保留。生产域名 `cyber-divination-7e4.pages.dev`（`cyber-divination.pages.dev` 为旧项目，勿混淆）。

### 仍待办（新）
- **应验簿统计图**：/ledger 当前为列表 + 状态 4-pill + 笔记 + 删除 + 统计（总/有所应/待回顾），任务书 §12 的图表留后续（范围让步，交付说明注明）。

### VNext 已解决（2026-08-06）
- **问一事「此刻起卦」验证脚本点击失败**：非页面 bug——`scripts/verify-ui-vnext.mjs` 用 `text=此刻起卦` 同时命中页面 `梅花易数 · 此刻起卦 · 决策问答` 副标题与按钮两元素，点击歧义。已改用 `getByRole("button", { name: "此刻起卦" })`，17 项检查 0 硬失败。页面本身三阶段流转正常。
- **verify-meihua.ts 阻断 build**：`yaoBits` 对象字面量索引返回 `number | undefined`，Next build 对 scripts 目录做类型检查时报 TS2322/TS2339。已加 `as Record<number, number>`，build 13 路由全绿。
- **AI 解读线上冒烟已完成**：生产实测 `/api/ask` 全链路正常——无 Origin 403、错 Origin 403、非法 feature 400、完整请求 200 返回真实 `AiAskAnalysis`（situation/advice/timing/risk 含 basis+confidence），浏览器端真实起卦流程已渲染「AI 解读」块（无降级 banner）。本地静态服务 404 属预期（无密钥），仅限本地。
- **/api/ask 体用关系校验误拒前端真实值（生产 P1，已修复并重部署）**：前端发送的 `tiYongRelation`（如「体克用（我有制衡之力，费力但可控）」19 字符）被 `MAX_NAME_LEN*2=12` 上限误拒 → 400「体用关系不合法」→ AI 解读在生产静默降级。改为引擎 5 种固定输出白名单（比和/体生用/用生体/体克用/用克体），本地 dev 实测 200 返回完整分析，已重部署生产 `2daecb6a`（commit `ad98fda`）并浏览器端验证 AI 块渲染。

### V3 新增（2026-08-04）
1. **线上 /api/divine 受 Zen 免费档 429 限流**（沿用 V2 遗留）：接口本体工作正常，但 `deepseek-v4-flash-free` 免费档有全局速率限制，会有 `FreeUsageLimitError`。本站前端已按计划书处理：API 失败 → 显示「推演繁忙」+「重新推演」+「查看基础排盘」，绝不展示假结果。换付费模型或等窗口后即可恢复完整 AI 解读。
   - **2026-08-04 实测确认**（wrangler deployment tail）：完整命盘 POST 链路（403→400→限流→Zen 调用）全部按预期工作；`ZEN_API_KEY` 已在生产 env，失败点纯为上游 `429 FreeUsageLimitError`。前端降级 UI 即为最终用户体验，无需改代码。
### V2 遗留（未变）
2. **密钥轮换（可选，若担忧泄露）**：`ZEN_API_KEY` 与旧 Cloudflare API Token 曾在旧对话明文出现。key 仅存于 Cloudflare secret env，代码/前端/日志不含 key；部署命令用 `$CF_API_TOKEN` 环境变量，不硬写明文。如担忧可到 opencode.ai/auth 与 dash.cloudflare.com 轮换。
3. **防刷加固已上线**（2026-08-03）：同源白名单 + Cache API 限流（5/min、30/hr）+ 输入形状校验，线上验证通过（403/400/429）。

### 断点续接后新增/变更（2026-08-04 opencode 续作）
4. **合盘「开始合盘」已修复**：此前 PersonForm ref 闭包锁死首帧空 state 导致合盘功能整体不可用（P1，Claude Code 断点前未发现），已改为渲染期刷新 ref；关系选择器也已接入计算（不再是假功能）。2026-08-04 UI 截图验收已覆盖合盘结果页。
5. **build 已恢复**：神煞表类型（TS7053×6）+ getYun 声明（TS2554）+ 未接线 retry（ESLint）三处 P0 全部修复，`npm run build` 通过，`out/` 已导出。
6. **BLOCKED.md 原文更正**：旧文称「分享按钮在 result/page.tsx」有误——share() 与分享按钮实际在 `compat-result/page.tsx`（result 页只有「生成命盘海报」）。若领导确认去分享，删 compat-result/page.tsx 的 share() 与按钮即可。
7. **已知小偏差（非阻塞，供后续打磨）**：divining 页无返回大厅按钮；`.sticky-cta` 样式定义了但无页面使用；每日一签签库当前 28 条、序号文案支持后续扩充到 60 签；result 页流年标题写死「2026-2030」。locations.ts 实际 34 省（> 声称的 31，功能无碍）。

### 对抗式审查新增（2026-08-04 第二轮，opencode 修复）
8. **排盘 CRITICAL 已修复**：`yun.getStartAge()` 在 lunar-javascript 1.7.7 不存在（V3 上线以来 computeBazi 每次必崩，八字排盘/合盘实际不可用），已改 `daYunList[0].startAge`；三组命例实测与 PROGRESS 声称完全一致。此前的"验收自测通过"结论需以真实运行为准。
9. **未起运处理已修复**：新生儿不再把未来大运标成"当前"，显示"尚未起运"。
10. **安全加固已修复**：/api/divine 的 pillars 形状/长度校验（防提示词放大）+ 错误统一文案（不再回显上游细节）；前端 events 加 200 字限制。
11. **遗留（记录不修）**：限流竞态（Cache API 非原子，平台边界）；PersonForm defaultValues/onReady 死代码。

## 矛盾记录（未阻塞，已按任务书让步顺序处理）

1. **分享按钮 vs 「不许加分享功能」**：任务 3 验收明确要求「再测一次」+「分享命盘」按钮，规矩又说不许加分享功能。按「看得懂 > 做得全 > 做得快」，验收标准是度量，按钮已实现且是用户已交付的 UI 一部分，保留。若领导确认去分享，删 result/page.tsx 的 share() 与按钮即可。

2. **点名最诱人的顺手活**：加用户系统、历史记录、多语言——均未做，符合任务书。

3. **卡片文案模板**：V3 已改为数据驱动 + AI 生成（含依据/置信度），前端模板仅作 AI 不可用时的兜底，不再是正式结果。

4. **合盘未接 DeepSeek**：合盘为纯前端 computeCompat 动态计算（分数/五行图随输入变化），DeepSeek 语言解读未接。计划书 P1「合盘动态化」已满足；如需更深的 AI 合盘解读，后续加 `/api/compat` 复用 lib/zen.ts。非阻塞。

## 环境备注
- 项目已纳入父仓库版本管理（commit 1612289，59 文件；2026-08-04 清理旧 V2 产物：`_v2_ref/`、`cyber-divination-ui/`、两个 tar.gz、Zone.Identifier 垃圾文件；Cloudflare Pages 项目 `cyber-divination` 当前仅保留最新生产部署 `84c38e7c-a85c-4361-ad3d-8ee900c09c27`）。
- **2026-08-06 已清理 12 条过时部署**：删除 `36a9e9b0/e04fc3c2/de20610f/7b6b0643/ad11ed91/cf0cdc97/de3a59ad/57cd0d8a/2daecb6a/afc80dfe/7d6c3dc8/b85b657d`（保留当前生产 `84c38e7c`），已删 URL 全部 404，生产 200 正常。preview 部署删除需 `?force=true`（aliased）。
- 字体：主字体得意黑 SmileySans 已自托管（`public/fonts/SmileySans-Oblique.ttf.woff2`，OFL 开源可商用）；Noto Serif/Sans SC 走 Google Fonts 兜底，内网/离线降级 SimSun/系统字体。
- 若绑定自定义域名：必须在 `functions/api/divine.ts` 的 `ALLOWED_ORIGINS` 加入新域名，否则 /api/divine 会 403。
- 换付费模型前必须先保留限流（当前限流已在代码层，切 ZEN_MODEL 不影响限流）。
