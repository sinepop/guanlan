# 观澜 · 进度跟踪

> 当前形态：Next.js 14 静态导出 + Cloudflare Pages，VNext 四入口升级（每日一签 / 占卜·梅花易数 / 命理 / 应验簿）+ AI 双后端解读。详见 `cyber-divination/README.md`。

## 当前状态（2026-08-07）

### 功能页背景素材换代 + 全局分散光晕 + 玻璃按钮 + 每日一签圆盘（2026-08-07，用户两轮反馈）

- **新素材**：用户补传 6 张 2752x1536 jpeg（首页/占卜/每日一签/双人合盘/四柱八字/紫微斗数/结果页），转 webp（q82）接入：`bg-ask`（占卜+每日一签+问事）、`bg-compat`（合盘+合盘结果）、`bg-bazi`/`bg-ziwei`（八字页按 view 切换）、`bg-result`、`bg-home` 重写、`bg-ledger` 复用 bg-home、删除 `bg-form.webp`。新素材亮度 19-40（旧 ~15）。应验簿背景 = 首页背景（用户指定）。
- **分散光晕**：用户反馈上轮集中光晕「太集中」→ 每页 4 点分散 radial-gradient 光晕（18%/82% 等位置），移动端独立较浅遮罩（0.16/0.32）；`.bg-divining` 3 点分散光晕 + bg-result 图。页面背景实测亮度：home 30.9 / ask 25 / compat 27.5 / bazi 34.9 / ziwei 26.3 / ledger 30.9 / result 52.8。
- **玻璃按钮**：`.feature-card` 加 `backdrop-filter: blur(6px)`（所有功能按钮玻璃质感）；首页应验簿不用 feature-card，保持原样（用户指定）。
- **每日一签圆盘**（用户规格）：去掉中间图标；三签缩小（5x40/48/36）居中于圆盘中央（left/top 50%，-18°/+2°/+16° 小角度）；圆盘 `lotRingSpin 9s` 常转（同推演动画）；点击抽签加速 1.6s + 三签 `lotSlipA/B/C` translateY 上下浮动（lotCasterShake 保留）。
- **验证**：`npm run build` 14 路由全绿；Playwright 全页面背景图正确加载且亮度 25-53；每日一签圆盘 6 项检查通过（环转、3 签居中、图标移除、抽签浮动）。`/result` 直访跳 `/bazi` 是防呆逻辑（无 sessionStorage 数据时重定向），非 bug——注入真实排盘结果后 `bg-result` 正确渲染。
- **已部署**：生产 `89741e5a`（commit `795ba2f`）。线上实测：7 路由全 200、console 零错误；背景图 md5 与本地一致；亮度 home 29.6 / mingli 24.1 / ask 24.1 / daily 24.1 / compat 29.8 / bazi 34.2 / ledger 29.6；feature-card blur 生效。

### 功能页背景提亮：遮罩调浅 + 金色光晕（2026-08-07，用户反馈「功能页手机漆黑」）

- **根因**：素材本身暗——三张 webp（1672x941）纯图渲染亮度仅 ~15、93% 近纯黑；原图命盘图案集中在画面中下部（4x4 网格：中部 30-32、四周 12-23）。`cover` 在手机竖屏只露出**中间竖条 = 原图最暗区**，叠加遮罩后漆黑一片。CSS 遮罩怎么调都救不了照片暗部（旧遮罩 13.9 vs 无遮罩 14.8，仅差 0.9）。
- **修复**（globals.css）：`.bg-form`/`.bg-result` 金色光晕 0.12→**0.4/0.2 双光晕**（中部 26%、底部 82%）做「光源」，遮罩 0.5/0.68→**0.16/0.36**；移动端（≤760px）单独**更强光晕 0.5/0.25 + 更浅遮罩 0.1/0.28**（cover 竖屏露中间暗条）。`.bg-divining` 同步 0.4/0.2。首页 `.bg-home` 不动。
- **数值**（纯背景渲染实测）：桌面旧 13.9 → 新 30.0（近黑 86%→38%）；手机新 38.7（近黑 27%）。页面边缘像素实测改前 rgb(13-15) → 改后 rgb(28-37) 且带金色调。
- **验证**：`npm run build` 14 路由全绿；Playwright 真实页面桌面/手机截图亮度对比确认提亮（mingli 边缘 x=20: rgb(13,13)→rgb(28,28)；x=300 中部：rgb(37,35,23) 金色光晕透出）。
- **已部署**：生产 `9e4c9bc6`（commit `8617028`）。线上实测：4 路由全 200、console 零错误、生产 CSS 已含新光晕 `rgba(201,162,39,.4)`；移动端亮度 27.8（mingli）/25.5（bazi）显著高于桌面 15.9（mingli）/19.4（home）——与配置一致（移动端光晕更强）。
- **遗留**：素材仅 3 张（bg-home/form/result，同批 1672x941），用户记忆中「传了很多背景页」不实——资产包 tar.gz 只含这 3 张 + 图标；若后续要更强纹理，需重做背景素材或换 CSS 绘制。

### 首页文字/布局 + 全站背景透出 + 卡片玻璃模糊（2026-08-06，用户 4 项反馈）

- **tagline 改白**：「观水有术 · 必观其澜」由朱砂 `text-cinnabar` → 暖白 `text-mist`（rgb(232,230,224)）。
- **每日一签卡布局**：右侧签信息块由 `justify-end`+`items-end`+`text-right`（靠右、右对齐）改为**左对齐**（`items-start`+`text-left`）+ **在竖线与竖排徽标之间居中**（外层包一层 `flex-1 justify-center` 泳道，徽标 `shrink-0` 钉右缘）。桌面与 390px 实测「第↔竖线 ≈ 物↔徽标」对称。
- **功能页背景透出**：根因是 bg-form/bg-result 遮罩深达 0.72–0.88 + `.card`/`.glass-panel`/`.collapse-card` 的 `rgba(18,18,28,0.76)` 近全屏覆盖 → 用户读作「没背景」。修复：遮罩统一调浅（form/result 0.5→0.68、home 0.5→0.72、divining 0.42→0.68），`--card` token 及三处玻璃卡 alpha 0.76→**0.6**。线上对比实测亮度：bazi +4.2、首页 +2.6、mingli/ledger +0.8，std 纹理均增。
- **首页卡片玻璃模糊**：`.holo-border` 加 `backdrop-filter: blur(6px)` + webkit 前缀（仅首页 4 卡，不波及 mingli 的 feature-card）。
- **验证**：`npm run build` 14 路由全绿；`scripts/verify-home-polish.mjs` 8 项检查全过（tagline 白、签信息居中、徽标钉右、blur 生效、bg 类在、390px 无横滚 + 移动端居中）；`scripts/analyze-bg.mjs` 线上/本地亮度对比确认背景透出。
- 新增脚本：`scripts/verify-home-polish.mjs`、`scripts/analyze-bg.mjs`；dev 依赖 +pngjs（像素分析）。
- **已部署**：生产 `a84a0438`（`npx wrangler pages deploy out --project-name cyber-divination --branch main`）。线上实测：tagline 白 rgb(232,230,224)、首页卡 blur(6px)、390px 无横滚、console 零错误；7 条 URL 全 200（含 3 张背景 webp）；生产 CSS 已含调浅遮罩 0.5/0.68/0.72/0.42 与 blur(6px)。

### 首页入口标题回退浅色 + 每日一签卡靠右竖排徽标（2026-08-06，用户反馈「不如上一版」后回退）

- **入口标题回退**：上一轮把首页四入口标题(每日一签/占卜/命理/应验簿)全改朱砂红，用户反馈「不如上一版」→ 恢复为上一版浅色 `text-mist`。页面 h1 朱砂、seal-red/vermilion-seal/stamp 色块中空字样式保留。
- **每日一签卡**：右块恢复靠右布局(`justify-end`)，右侧竖排「今日已求签」徽标保留本轮朱砂色块中空字样式(`seal-vertical`：vertical-rl、朱砂底 `rgba(185,74,61,0.18)`+描边+中空亮字 `#e8b4a8`、11px)。
- **验证**：build 14 路由全绿、25 项 UI 检查 0 硬失败；入口标题浅色 `rgb(232,230,224)`、竖排徽标 vertical-rl 实测。
- **已部署**：生产 `84c38e7c`（commit `46d1b1d`）。

### 全站朱砂红改版 + 色块中空字小标（2026-08-06，用户反馈后调整）

- **真朱砂红收敛**：此前 `--vermilion:#d4a574`(米红)、`text-cinnabar-light:#e48a7e`(浅红)、stamp `#e48a7e` 统一改为真朱砂红 `#b94a3d`。用户反馈「浅色红不好看，不如朱砂色好看」。
- **色块中空字小标**：`seal-red`/`vermilion-seal`/`stamp` 改为朱砂色块样式——朱砂底 `rgba(185,74,61,0.18)` + 朱砂描边 `rgba(185,74,61,0.65)` + 中空亮字 `#e8b4a8`。
- **标题上朱砂**：首页 每日一签/占卜/命理/应验簿 卡标题、`问一事/每日一签/应验簿` h1、Header 组件 h1(命理/合盘/八字页共享)全部 `text-cinnabar`。
- **每日一签卡**：右块信息改为 `px-4` 对称内边距、水平垂直双居中(实测 dx=-0.5、dy=0)；「今日已求签」改为小号(10.56px)朱砂色块中空字徽标。
- **清理**：删除不再使用的 `.text-vertical`；`#e48a7e` 全部替换为 `text-cinnabar`。
- **验证**：build 14 路由全绿、25 项 UI 检查 0 硬失败；生产实测 seal 朱砂底/描边/中空字、卡内居中 dx=-0.5/dy=0、标题朱砂色、390px 无横滚；生产 HTML md5 与本地构建一致。
- **已部署**：生产 `36a9e9b0`（commit `72a4cf1`）。

### 首页朱砂点缀 + 排版调优 + 每日一签竖排（2026-08-06，用户反馈后调整）

- **朱砂点缀文字**：上标「CYBER DIVINATION」改孟子典「观水有术 · 必观其澜」并着色朱砂红 `text-cinnabar-light`；tagline 改「见微澜而知其变 · 察时变而观其源」且「变」「源」二字朱砂；每日一签卡「今日已求签」由横向小字改为**竖排朱砂徽标**（`.text-vertical` vertical-rl + text-orientation:upright）置卡右缘。
- **排版调优（用户「排版不舒服 / 有的字过于小」）**：`type-overline` 0.68→0.76rem、`type-caption` 0.72→0.78rem、`type-body` 0.92→0.95rem；`p` 行高 1.85→1.7；h1 字距 0.34em→0.26em 且字号 2.4→2.5rem；`holo-overline` 字距 0.5em→0.4em。
- **每日一签卡**：信息块 `justify-content:flex-end` 靠右，竖排「今日已求签」徽标在最右。
- **验证**：build 14 路由全绿、25 项 UI 检查 0 硬失败；DOM 实测竖排徽标 vertical-rl + 朱砂 `rgb(228,138,126)`、信息 right-align、390px 无横滚；生产 curl md5 与本地构建一致、含新文案无旧文案。
- **已部署**：生产 `e04fc3c2`（commit `eb25d2a`）。

### 全站改名「观澜」+ 得意黑全站换字（2026-08-06，用户选定）

- **改名**：网站定名「观澜」（孟子·尽心上「观水有术，必观其澜」——观波澜而知其下、察变化而推其变，契合「以推演见变化」的立意）。metadata `观澜 · 玄机推演`、首页 h1「观澜」、4 个 canvas 海报水印、合盘分享 title 共 7 处全部替换，无残留。
- **字体**：得意黑 SmileySans（OFL 开源、可商用可网页嵌入）自托管 `public/fonts/SmileySans-Oblique.ttf.woff2`（1.15MB，`@font-face` + `font-display:swap`），全站 `--font-display/title/body/ui` 四套字体栈与 3 个 canvas 海报 ctx.font 统一换用；移除马善政/站酷（不再引用）。此前否决过商用字体 AaSongHuiZongGuoBaoShouJinShu-2 自托管（公开分发含许可风险），改用开源得意黑。
- **每日一签排版**：去签号圆圈，`第X签` 改为小号字与签名同行基线对齐。
- **验证**：build 14 路由全绿、tsc 通过、25 项 UI 检查 0 硬失败；生产全新无缓存实测 h1「观澜」、title「观澜 · 玄机推演」、woff2 200、served HTML 与本地构建 md5 一致。
- **已部署**：生产 `de20610f`（commit `ee7332f`；截图脚本优化 commit `8b2734a`）。

### 首页赛博玄门风格（2026-08-06，第三轮 UI 反馈）

- **借鉴参考设计**（纯黑 `#101012` + 流光金骨架 + 发光朱砂激活 + 全息发光标题）：首页 `bg-home` 遮罩改 `16,16,18` 纯黑底；新增 `.holo-border`（发丝金线边框 `rgba(230,188,107)` + 霓虹内外光晕，hover/focus 金→朱砂红 `#FF3333` 发光）与 `.holo-title`（淡金/纯白字 + 三层 text-shadow 全息光晕）；首页 h1 启用 holo-title，四个入口卡挂 holo-border。
- **瘦金字体修复（用户反馈「没多大改变，尤其字体」后）**：① h1 之前用 `font-display`=马善政楷书（粗圆毛笔楷）且排在小薇体前挡住——`.holo-title` 显式 `font-family: ZCOOL XiaoWei`（细笔画瘦金感）并移除 h1 的 `font-display`；② 光晕增强（holo-title 0.7/0.38/0.18、holo-border 0.18/0.10）静置可见；③ `.feature-card.primary` 两重类覆盖 `.holo-border` 单类金色边框，提升为 `.feature-card.holo-border` 使其胜出。实测：小薇体亮像素 4924 vs 马善政楷 6412（更纤细）。
- **范围**：仅首页落地（/mingli 等共享卡片不动），验证满意后推广全站。
- **验证**：build 14 路由全绿、tsc 通过、25 项 UI 检查 0 硬失败；生产全新无缓存实测 h1 字体 `ZCOOL XiaoWei`、日签卡 hover border 金→红、390px 无横滚。
- **已部署**：生产 `7b6b0643`（commit `ba177a0`）。

- **每日一签大卡左右布局**：标题/组件居左（icon + 每日一签 + 今日关键词·宜忌），抽签信息展示在右侧（竖分隔线分开）——未求签时右侧显示「今日未求签 · 点此抽一签」，求签后显示签号圆徽 + 签名 + 今日一句 + 「今日已求签」；首页四个朱砂小字（日签/占/命/簿）已移除。
- **验证**：verify-ui-vnext.mjs 升级为 25 项检查（主入口改为「更宽」断言 + 日签卡左右布局提示），本地全过；生产实测日签更宽/置顶/并排/应验簿居下全 true，390px 无横滚，served HTML 与本地构建 md5 一致。
- **已部署**：生产 `cf0cdc97`（commit `5615c2c`）。

### 首页入口层级化（2026-08-06，第二轮 UI 反馈）

- **入口改为层级而非四平级**：每日一签为最大入口置顶（primary 大卡，`/daily-fortune`），抽完签后今日签信息（签号+签名+今日一句+「今日已求签」）直接展示在大卡内；占卜（`/ask`）与命理（`/mingli`）并排两卡；应验簿（`/ledger`）为底部细窄入口（icon-result-scroll 卷轴图标 + 「回顾每次占问 →」）。
- **验证**：verify-ui-vnext.mjs 升级为 24 项检查（新增 4 项布局断言：日签置顶于占卜/命理之上、占卜与命理并排同高、应验簿居下、日签卡更高），本地全过；生产实测日签更高/置顶/并排/居下全 true，390px 无横滚。
- **已部署**：生产 `de3a59ad`（commit `efb0315`）。

### UI 改版（2026-08-06，用户反馈后调整）

- **背景恢复**：VNext 引入的 SVG 纹样（细线 0.1-0.18 opacity + 深色遮罩）在手机上几乎不可见，读作「纯黑空页」。已从 git 历史恢复原 webp 实拍图做底（`bg-home/bg-form/bg-result.webp`），并比原版调浅遮罩（home 0.55-0.82、form 0.72-0.88），照片纹理重新可见；删除三个 SVG pattern。
- **首页去干扰**：移除 4 枚 trust pills（规则排盘/过程可见/AI 只做解释/不确定性提示），首页仅保留一行警示：「命理仅供文化娱乐与自我反思，人生由自己的选择决定」。
- **四平级入口重排**：问一事（梅花易数·决策问答）→ 每日一签（今日关键词·宜忌）→ 命理（八字·紫微·合盘）→ 应验簿（回顾每次占问）。双人合盘不再独立占首页卡位，移入命理聚合页。
- **每日一签小卡**：用户在每日一签页求签后，首页「每日一签」下方出现一行迷你小卡（签号+签名+今日一句 +「今日已求签」），点击回看；跨天自动过期。
- **新增命理聚合页 `/mingli`**：内含 四柱八字（`/bazi?view=bazi`）/ 紫微斗数（`/bazi?view=ziwei`）/ 双人合盘（`/compat`）三入口。`/bazi` 支持 `?view=` 预选视角；**职场事业（career）视角从 UI 入口移除**（后端/结果页支撑保留，类型不变）。
- **应验簿纯个人化 + 去焦虑**：本就 localStorage 私有（不做社区/共享）。状态标签由「已应验/未应验/待应验」改为中性「有所应/未显现/待回顾」，文案改为「应验与否在个人选择，不在命理」，降低二元判定的压迫感。
- **验证**：`npm run build` 14 路由全绿（新增 /mingli）、`npx tsc` 通过、`verify-meihua.ts` 全过、Playwright `verify-ui-vnext.mjs` 20 项检查 0 硬失败（首页四入口/去 trust pills/警示语/命理页三入口/问事流程/日签小卡/应验簿/390px 无横滚/console 零错误）。

### UI 改版生产部署（2026-08-06）

- **生产部署**：`npx wrangler pages deploy out --project-name cyber-divination --branch main`，最新 Production `57cd0d8a`（commit `0228a94`），域名 `https://cyber-divination-7e4.pages.dev`，11 路由全 200（含新增 `/mingli` 与恢复的三个 webp 背景）。
- **线上验证**：首页 4 入口（问一事/每日一签/命理/应验簿）按钮齐全、trust-pill 计数 0、警示语在页；`/mingli` 三入口（四柱八字/紫微斗数/双人合盘）齐全；390px 无横滚；console 零错误；`bg-home.webp` 作为 `.bg-home` 背景层生效且 fetch 200。
- **AI 后端回归**：`/api/ask` 无 Origin 403、完整请求 200 返回真实 `AiAskAnalysis`（summary/situation/advice/timing/risk 含 basis+confidence），无降级。
- **生产截图**：`cyber-divination/artifacts/production/prod-{home,home-with-sign,mingli,ledger,daily,home-mobile390}.png`（本批新增）；`shot-prod.mjs` 为截图脚本。

### VNext 整体交付（2026-08-06）

按《DeepSeek-VNext-整体任务书.md》完成 观澜 VNext 升级，`npm run build` 13 路由全绿、`npx tsc` 通过、`scripts/verify-meihua.ts` 全部通过、Playwright `scripts/verify-ui-vnext.mjs` 17 项检查 0 硬失败，已部署 Cloudflare Pages。详见交付回传（commit hash / URL / build 输出 / 截图）。

- **四入口首页**（`/`）：问一事（primary 大卡 `/ask`）→ 每日一签 `/daily-fortune` → 命盘档案 `/bazi` → 双人合盘 `/compat`（col-span-2），页脚「应验簿」`/ledger` 入口 + 4 枚 trust pills（规则排盘/过程可见/AI 只做解释/不确定性提示）。
- **问一事 / 梅花易数**（`/ask`，新页）：本地规则引擎 `src/lib/meihua.ts` 确定性起卦（**绝不用 Math.random**，同刻+同念必同卦），公式 = 年支序+农历月日+时辰+心念数（上卦/下卦/动爻），内置真实 64 卦表 `HEXAGRAM_GUA` 作 AI 不可用兜底。单页三阶段 form→casting→result，含本卦/变卦/动爻/体用生克/断语/可信度/起卦依据（计算过程可见）/应验簿/分享卡 canvas/回放链接 `?c=`。
- **AI 解读接真实后端**：新增 `functions/api/ask.ts` + `functions/_shared.ts`（origin 白名单、`ask-rl` 独立限流桶），复用 `lib/zen.ts` 双后端（默认火山方舟 ark / 备选 DeepSeek zen）的 `generateAskAnalysis`。起卦一律本地规则引擎；AI 只解释结构化卦象 JSON。AI 失败 → 规则卦象 + 周易卦辞（真实文本）+「AI 解读暂不可用」banner，**绝不显示假 AI**。
- **可信度系统**：`src/lib/credibility.ts` + `CredibilityPanel`，`deriveBaziCredibility`（节气边界/子时换日/真太阳时校正）+ `deriveCompatCredibility` + `deriveAskCredibility`，接入 result/compat-result/ask 三结果页。
- **应验簿**：`src/lib/journal.ts`（localStorage）+ `/ledger` 页（状态 4-pill/笔记/删除/统计）+ `SaveToJournal` 接入 ask/daily/bazi/compat 四结果页。
- **P0 修复**：bazi 推演反馈（submitting 态 + 校验滚动定位 + 450ms 延迟跳转）、时辰选中态（`strong-selected` + `sel-mark` ✓ + aria-pressed + 「已选」摘要，去掉静默默认选子时）、每日一签 hydration + 保存反馈（toast「签文卡已生成」+ 失败原因 + 移动端长按提示）、compat share async 错误处理。
- **背景资产**：webp → SVG pattern（`bg-home/bg-form/bg-result`，`.bg-result` 760px 水印 + 移动端缩放），新增 cinnabar 色 token 与 ask/trust/daily/chart/compat/share 图标。

### VNext 验证产物（2026-08-06）

`cyber-divination/artifacts/ui-verification/vnext-{home,ask-result,daily-sharecard,ledger,home-mobile390}.png`。验证结论：首页四入口/trust pills、问事流程（起卦→结果）、心念数 0 被拒、每日一签保存反馈、应验簿、390px 无横滚、console 零错误，全部通过。

### VNext 生产部署（2026-08-06，已线上验证）

- **生产部署**：`npx wrangler pages deploy out --project-name cyber-divination --branch main`，最新 Production `2daecb6a`（commit `ad98fda`），域名 `https://cyber-divination-7e4.pages.dev`，9 路由全 200。
- **AI 双后端线上冒烟通过**：`/api/ask` 无 Origin 403、错 Origin 403、非法 feature 400、完整请求 200 返回真实 `AiAskAnalysis`；浏览器端真实起卦→结果页渲染「AI 解读」块（当前局势/行动建议/何时再看，无降级 banner）。`/api/divine` 沿用既有 403/400/429 防护，体用关系改白名单校验后不再误拒。
- **生产截图**：`cyber-divination/artifacts/production/prod-{home,ask-result,daily-sharecard,bazi-result,ledger}.png`。
- **修复记录**：生产实测发现 `/api/ask` 体用关系按 `MAX_NAME_LEN*2=12` 上限误拒前端真实值（如「体克用（我有制衡之力，费力但可控）」19 字符）→ AI 解读静默降级。改为引擎 5 种固定输出白名单，commit `ad98fda` 后重部署验证通过。

### 当前状态（2026-08-04：经真实运行验证）

V3 MVP 核心功能全部落地，**且已通过真实运行时验证**（此前声称的"验收 9/9 通过"为静态代码级验证，未能暴露一个 CRITICAL——见"修复记录"第 1 条）。

### UI 资产优化（2026-08-04）

已按《观澜网站-背景图标UI优化任务书》接入背景与暗金 SVG 图标，范围限定为视觉集成，不改 DeepSeek/Ark API 逻辑、不新增用户系统/历史记录等功能：

- 资源路径：`public/images/bg-home.webp`、`bg-form.webp`、`bg-result.webp`；`public/icons/icon-*.svg` 8 个图标。
- 页面接入：首页使用 `bg-home`，八字/合盘输入页与每日一签使用 `bg-form`，推演/八字结果/合盘结果使用 `bg-result`。
- 首页主入口调整为「命盘排算」最大卡片，双人合盘/每日一签为副卡片；页面 emoji 已替换为 SVG/线性图标。
- 结果页首屏调整为：一句话总评 → 仅供参考/置信度 → 基础命盘摘要 → 五行雷达 → 折叠详情；合盘结果同步改为报告式结构。
- 验证产物：`cyber-divination/artifacts/ui-verification/`，含 home/bazi/result/compat-result 在 `390x844` 与 `1440x1000` 的截图，以及 `report.json`。
- 验证结论：`npm run build` 通过；Playwright 真实渲染 8 张截图均无横向滚动、控制台错误、页面异常、图片/CSS/JS 404；首页「命盘排算/双人合盘/每日一签」与输入页「返回大厅」真实点击导航通过。构建仍有既有 warning：`divining/page.tsx` hook 依赖提示、`layout.tsx` Google Font 提示。

### 每日一签随机性与动画（2026-08-04）

- 随机性：`/daily-fortune` 不再按纯日期取签；每次起签按本机日期、当前时辰/分钟/10 秒段、时区、浏览器语言、粗略地点格网（0.5 度桶）与本地签筒盐生成 `dailySignBySeed()`。定位拒绝/超时时按本机时区与本地盐兜底；精确经纬度不上传、不保存。
- 动画：旧签筒短棍动画改为 `daily-lot-caster`，包含暗金光环、罗盘虚线、中心签筒 SVG 与签条上浮动画。
- 验证产物：`artifacts/ui-verification/daily-fortune-mobile390-before.png`、`daily-fortune-mobile390-after.png`、`daily-fortune-report.json`。
- 验证结论：`npm run build` 通过；Playwright 模拟北京/上海/成都/同地不同设备 4 个用户环境，得到 4 个不同签号，且无横向滚动、控制台错误、资源 404。

### 推演页转盘与背景（2026-08-04）

- 推演页使用专属 `bg-divining`，以 `bg-result.webp` 加强命盘水印背景与暗金光场，避免看起来像纯黑页。
- 删除转盘外侧单独闪烁的 `icon-loading-stars.svg`；转盘改为纯 CSS `mystic-compass`，含多层旋转环、卦位、经纬线、轨道光点、指针与中心「命」字。
- 验证产物：`artifacts/ui-verification/divining-mobile390.png`、`divining-desktop1440.png`、`divining-report.json`。
- 验证结论：`npm run build` 通过；Playwright 在 390px/1440px 下均无横向滚动、控制台错误、图片/CSS/JS 404，且确认外置 loading-stars 图标不存在。

### 全局古风字体（2026-08-04）

- 字体分层：品牌/大标题用 `font-display`（Ma Shan Zheng → ZCOOL XiaoWei → Noto Serif SC → 宋体），板块标题用 `font-serif`（ZCOOL XiaoWei → Noto Serif SC → 宋体），正文默认 `Noto Serif SC`/宋体气质，表单控件保留 `font-ui` 黑体栈保证可读性。
- 同步范围：`layout.tsx` Google Fonts 链接、`tailwind.config.ts` 字体族、`globals.css` 字体变量与控件覆盖；首页/报告/每日一签/推演页大标题显式切 `font-display`；海报 canvas 字体同步。
- 验证产物：`artifacts/ui-verification/font-home-mobile390.png`、`font-bazi-mobile390.png`、`font-divining-mobile390.png`、`font-report.json`。
- 验证结论：`npm run build` 通过；Playwright 390px 渲染无横向滚动、控制台错误、图片/CSS/JS 404，实际计算字体为正文宋体栈、大标题手写古风栈。

### 文字层级与排版（2026-08-04）

- 全局新增 `type-overline`、`type-title`、`type-body`、`type-caption` 四层文字语义，统一标题、正文、辅助说明的字体、字号、行高、字距和默认颜色；选择器使用低优先级 `:where()`，页面局部 `text-gold-light`/`text-vermilion` 等颜色覆盖不被压掉。
- 强化 `card-title`、`section-title`、`term-tip`、`term-primer`、`collapse-head`、`collapse-body-inner`、`analysis-basis` 的排版层级：模块标题改古风标题字体并加暗金竖线，正文行高拉开，术语解释与依据改为辅助层。
- 页面同步：首页入口卡片、八字/合盘输入页说明、每日一签签诗/白话解/推算依据、推演页步骤说明、八字结果/合盘结果报告总评与折叠正文均接入对应 `type-*` 层级。
- 验证产物：`artifacts/ui-verification/home-mobile390.png`、`bazi-mobile390.png`、`result-mobile390.png`、`compat-result-mobile390.png`、`daily-fortune-mobile390-after.png`、`divining-mobile390.png` 及对应 `report.json`/专项报告。
- 验证结论：`npm run build` 通过；Playwright 覆盖首页、排盘页、命理报告、合盘报告的 390px/1440px 截图均无横向滚动、控制台错误、页面异常、图片/CSS/JS 404；每日一签与推演页专项截图也通过。

### 结果页图表、海报与术语交互（2026-08-04）

- 五行能量：修复 `RadarChart` 能量多边形因缺失 `fade-in` keyframes 一直透明的问题；图表改为默认可见，并增加能量节点、单人图轴向数值和下方五行条，避免只剩空五角星阵。
- 命盘海报：`generatePoster()` 从 600×800 简图扩展为 600×1200 长图，包含标题/真太阳时、总评、四柱、命盘要览、五行能量条、近期流年、行动建议和免责声明。
- 术语交互：`result` 页术语旁新增小问号按钮，点击后以页内底部说明面板展示完整解释；`术语小解` 改为可点击速查项。术语库新增大限、五行局、命主、身主、官杀、财星、食伤、印星等解释。
- 验证产物：`artifacts/ui-verification/result-polish-radar-mobile390.png`、`result-polish-term-mobile390.png`、`result-polish-poster-mobile390.png`、`result-polish-report.json`。
- 验证结论：`npm run build` 与 `npx tsc --noEmit` 通过；Playwright 验证五行多边形 opacity=0.96、5 个能量点、术语弹窗包含日主解释、海报 PNG 为 600×1200，且无横向滚动、控制台错误、页面异常、资源 404。

## 验证基线（真实运行，2026-08-04）

在 node 中直接执行 `computeBazi` 全链，三组命例**四柱与真太阳时逐字一致**：

| 命例 | 四柱 | 真太阳时 | 起运 |
|---|---|---|---|
| 1990-05-15 午时 深圳（男） | 庚午 辛巳 庚辰 壬午 | 11:40 | 8 岁 |
| 2000-01-01 子时 北京（男） | 己卯 丙子 丁巳 壬子 | 1999-12-31 23:42 | 10 岁 |
| 1985-11-03 未时 乌鲁木齐（女） | 乙丑 丙戌 丙午 甲午 | 12:07 | 3 岁 |

- 2026-01-01 子时（新生儿）：`isCurrent` 全 false，正确显示「尚未起运」，不伪造未来大运。
- `npm run build` 通过，静态导出 `out/` 覆盖 8 路由。

## Cloudflare 部署与防刷（线上已应用）

**架构**：`output: "export"` 静态导出 + Pages Functions 代理 `/api/divine` → Zen API（DeepSeek V4 Flash）。密钥仅在服务端 env（secret），浏览器不接触。

**最新生产部署（2026-08-04）**：`npm run build` 后用 Wrangler 直接上传 `out/` 到 Cloudflare Pages 项目 `cyber-divination` 的生产分支 `main`。最新 Production deployment：`b85b657d-5ee7-4bfa-b979-dd10cdb1b8e3`，生产域名 `https://cyber-divination-7e4.pages.dev`；根域名返回 200，`/api/divine` 形状校验请求返回预期 400（Function 已生效）。已清理同项目过时部署 `42cec3c5-c147-4e44-bd9b-a381ab90f9d4`（误传 Preview/master）、`f075ee53-cb87-4522-84f3-757307ad545f`（旧 Production）与 `d40b8c83-b05f-4c15-a6cf-6f17f2f6943a`（被新版本替换的 Production），当前只保留最新 Production。

**防双纵深**（全部线上验证过）：
1. 同源白名单：POST 必须带 Origin ∈ {本站, localhost}，否则 403。
2. Cache API 限流：每 IP 每分钟 5 次、每小时 30 次 → 429。
3. 输入形状：body ≤256KB、events ≤5 条且每条 ≤200 字、pillars 强制 4 柱且 6 字段≤8 字 / hidden≤3。
4. 走私单：请求代理仅在提交时构造 prompt，无 prompt 后门。

**已知限制**：Zen 免费档仍会 429（上游限流，非本站问题）；Cache API 计数 non-原子（并发可穿越 5/min，平台能力边界）；需自定义域名 → 扩 `ALLOWED_ORIGINS`。

**线上链路实测（2026-08-04，wrangler deployment tail 抓错）**：`/api/divine` 全链路正常——同源校验 403、形状校验 400、限流 429 均按预期；完整命盘 POST 直达 Zen API，但上游返回 `429 FreeUsageLimitError: Rate limit exceeded`（免费档全局限流，非代码问题）。前端已按计划书降级：API 失败显示「推演繁忙」+ 重新推演 + 查看基础排盘，绝不展示假结果。

## 已修复的重大 bug（聚合）

| 级别 | 位置 | 问题 | 修复 |
|---|---|---|---|
| CRITICAL | bazi.ts:242 | `yun.getStartAge()` 在 lunar-javascript 1.7.7 的 Yun 上不存在 → computeBazi 每次必崩（八字排盘/合盘功能全灭） | 起运年龄改 `daYunList[0].startAge`（虚岁），倒退 `yun.getStartYear()+1` |
| CRITICAL | bazi.ts:216 | 未起运者（新生儿）isCurrent 全 false → 把未来大运标成"当前"（假结果） | 返回哨兵，result 页显示「尚未起运」 |
| HIGH | divining/page.tsx fetchAI | 无挂载守卫/无取消：离开页面后旧 fetch 仍写 store 并强制跳 /result，污染新会话 | mountedRef + AbortController + 60s 超时 + 跳转前守卫 |
| HIGH | PersonForm.tsx:56-61 | ref 只在挂载时赋值，闭包锁死首帧空 state → 合盘「开始合盘」永远报错 | 改为渲染期每次刷新 ref 闭包 |
| HIGH | divining/page.tsx:158 | retry() 提取后未接线，按钮仍内联 lambda（双请求+空转） | 绑定 `onClick={retry}`，动画走完单次 fetchAI |
| MED | types/lunar-javascript.d.ts | `getYun` 声明 0 参 vs 实际 2 参 TS2554 | 声明改 `getYun(gender, sect)` |
| MED | bazi.ts tao/guard/ma | 神煞表 string 索引对象字面量 6×TS7053 | 加 `Record<string, number>` |
| MED | compat.ts + compat-result | 关系选择器不参与计算，relationFit 恒空（假功能） | `computeCompat(a,b,relation)` 加权 + 文案评语 |
| MED | result/page.tsx:39 | 可选链只保护 ai，ai.cards/liuNian 缺失时白屏 | `ai?.cards?.` 完整可选链 + pickCards |
| LOW | compat-result:84 | effort 进度条方向与「越低越好」矛盾 | invert 时 `100-value` |
| LOW | result/page.tsx:226 | AI 缺年回退 `"" ??` 失效 | `||` + `.length` 判空 |
| 安全 | divine.ts | pillars 无形状/长度校验 → prompt 放大 + TypeError 502 泄露内部 | 形状校验，错误统一文案 |
| MED | bazi.ts:144 | `isValidDate` 用公历逻辑校验农历日期 → 有效的农历二月三十（如 2021-2-30）被误拒"无效的出生日期" | 新增 `isValidLunarDate`（库解析 + 往返校验），computeBazi 按 calendar 分流 |
| MED | signs.ts + daily-fortune | 每日一签按日期种子固定，同一天永远同一签（用户反馈"没有随机性"） | 改为 `dailySignBySeed()`：本机时间 + 时区 + 粗略地点格网 + 本地签筒盐即时推算，拒绝定位时按时区/本地盐兜底 |
| LOW | locations.ts | 各省城市严重缺失（江苏仅 6 城、广东 8 城） | 补全至 34 省级 349 城（江苏 13、广东 21、四川 21 等全地级市） |

## 已知留白（有意为之）

- result 页 5 卡片文案是模板兜底，DeepSeek 后端接入后 AI 生成替换。
- /api/compat、/api/quick-sign 未单独建接口：合盘为纯前端 computeCompat；每日一签本地签库。DeepSeek 合盘解释可后续加 `/api/compat` 复用 lib/zen.ts。
- 项目不在 git 仓库（父目录 ai-workspace 是 git 仓库但未提交子目录，是否由 agent 提交需用户确认）。
- 浏览器端全流程中，每日一签点击与 390px 截图已实测；合盘页填写→结果、命盘海报下载仍待完整端到端实测。签库当前 28 条，序号文案支持后续扩充到 60 签。
- divining 页无返回大厅按钮（推演中不留按钮，符合交互）；`.sticky-cta` 样式定义了未用。

## 断点恢复

1. `npm run build` 确认可编译，`npm run dev` 起服务。
2. 后端接 DeepSeek 合盘解读：新增 `/api/compat`，复用 lib/zen.ts 提示词构造，保持 BaziInput/BaziResult 类型不变。
3. 大运/流年相关修改只能在 `buildDaYun/buildLiuNian` 内，`qiYunAge` 必须来自 `daYunList[0].startAge`（不要直接调 Yun 方法，lunar-javascript 1.7.7 的 Yun 无 getStartAge）。

## 续接注意事项

- 老版本会话的 PROGRESS.md 历史段已被合并；本文件是唯一进度文档。
- 密钥相关：ARK_API_KEY / ZEN_API_KEY 仅存在于 Cloudflare secret env；防刷和限流逻辑在 `functions/api/divine.ts`，有 pull 版改 `ALLOWED_ORIGINS`。
- AI 后端（2026-08-04 新增 dual-backend）：`lib/zen.ts` 的 `resolveProvider()` 按 `AI_PROVIDER` 选择，默认 `ark`（火山方舟 plan / `ark-code-latest`，Auto 模式按「效果+速度」自动选模型，OpenAI 兼容 `https://ark.cn-beijing.volces.com/api/plan/v3`）；`AI_PROVIDER=zen` 切回旧 DeepSeek。改后端只换 env，提示词不变。切模型在火山方舟控制台改 `ARK_MODEL`，3-5 分钟生效，与限流无关。
- 速度优化（2026-08-04 实测）：完整命盘单请求 21.2s → 8.8s（2.4 倍）。两招：① Ark plan 端点接受 `thinking:{type:"disabled"}`，关推理省 ~7s（base 5.1s→0.8s；注意 `reasoning_effort` 无效且会截断，别用）；② 精简提示词输出要求（每卡 2-3 条×20-40 字、总输出≤1000 字）。剩余 ~8s 基本是模型生成成本，欲再快需换更快 plan（违背「模型不变」）。
- 输出兜底（2026-08-04）：`ark-code-latest` Auto 模式偶发产出缺 `liuNian`/`advice`/卡片的 JSON → `generateAnalysis` 内 `isComplete()` 判空 + 重试一次；`max_tokens` 用 2500（thinking 已禁用，此上限纯输出预算，1500 会截断末尾字段）。
- 本地冒烟：`.dev.vars`（已 gitignore）存 `AI_PROVIDER=ark` + `ARK_API_KEY`，可 `npx wrangler pages dev` 或直接 node 调 `generateAnalysis`。
- 提示词补齐（2026-08-04）：对齐《DeepSeek 观澜.docx》最强全能主提示词。① 系统提示补全经典书目《子平真诠》《神峰通考》《千里命稿》+盲派技法；② 前端已算好的权威数据接进 API 请求：神煞 `shenSha`、五行能量 `five`(0-100)、胎元/命宫/身宫 `taiYuan/mingGong/shenGong`，模型直接解读不重复排盘；③ `divine.ts` 新增 `validExtra` 形状校验（神煞≤12个×限长、五行 0-100 数字、三垣限长）防注入。
- 三视角（2026-08-04 上线）：`/bazi` 顶部切换 `bazi`（八字综合）/`ziwei`（紫微斗数）/`career`（职场事业），`lib/zen.ts` 的 `buildUserPrompt` 三分支，共用 `OUTPUT_FMT` 保证输出结构恒为 `AiAnalysis`。**紫微集成 iztro 引擎在前端排盘**（`src/lib/ziwei.ts`，与八字共用真太阳时校正时刻，十二宫/主星庙旺/四化/命主身主/五行局/大限），不再让模型自排（验证发现模型自排必编造）。`divine.ts` 校验 `view` 白名单。已实测三视角均产出完整结构。
- 速度波动（2026-08-04 实测）：`ark-code-latest` plan 的 Auto 模式按「效果+速度」自动选模型，单请求耗时抖动明显（实测 8.8s~37s）。这是 plan 特性，非代码问题；若要稳定低延迟需固定到具体模型（违背「模型不变」）。
- 三视角对抗式审查（2026-08-04 第二轮，Claude Code 执行修复 + opencode 完成验证）：发现并修复 4 项 —— ① CRITICAL `ziwei.ts` 农历输入未转公历直接排盘（约半数农历用户拿错盘），已按 bazi 引擎分流 `Lunar→getSolar()`；② HIGH `divine.ts` 未校验 `ziwei` 字段（提示词注入/成本放大），已加 `MAX_ZIWEI_LEN=3000`；③ MED 重试-once 与 60s 客户端超时叠加（最坏 120s→502），已按耗时 <25s 才重试；④ LOW `nominalAge` 硬编码 2026（年底漂移+大限错位），已改 `new Date().getFullYear()`。opencode 复验：公历/农历同刻命宫一致（丁亥 天梁陷）、三组命例四柱逐字一致、`npm run build` 通过。
