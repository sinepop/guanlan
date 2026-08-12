# BLOCKED.md（遗留与环境备注）

> 历史变更流水已迁移到 `PROGRESS.md`（2026-08-12 整理）。本文件只保留：
> 1. 真正的遗留项（未做、权衡记录、可选加固）；
> 2. 环境备注（运维信息）。
>
> 项目规则约定（cyber-divination/AGENTS.md）：「进度与修复记录：`../PROGRESS.md`；阻塞与遗留：`../BLOCKED.md`」。

## 当前无阻塞

agent 智能体化（2026-08-12）收官后无 P0/P1 阻塞。所有已解决项归档至 PROGRESS.md。

## 遗留项（非阻塞，按需处理）

### 设计权衡记录（有意保留）

- **分享按钮 vs 任务书「不许加分享」**：分享按钮在 `compat-result/page.tsx`（合盘结果页）保留，是用户已交付 UI 的一部分。任务书「不许加分享」与「测一次分享按钮」存在内部矛盾，按「看得懂 > 做得全 > 做得快」原则保留。若领导明确去掉，删除 `compat-result/page.tsx` 的 `share()` 与按钮即可。
- **结果页卡片文案**：V3 已改为数据驱动 + AI 生成（含依据/置信度），前端模板仅作 AI 不可用时的兜底——非阻塞。

### 功能性遗留（小颗粒，记录不修）

- **每日一签签库**：当前 28 条，序号文案支持后续扩充到 60 签。
- **结果页流年标题**：写死「2026-2030」，跨年需手动改。
- **divining 页无返回大厅按钮**：推演中不留按钮，符合交互设计。
- **`.sticky-cta` 样式定义未使用**：可清理或留作扩展。
- **locations.ts**：实际 34 省（> 任务书声称的 31，功能无碍）。
- **应验簿任务书 §12 图表**：本轮 agent 化已加应验率 + 维度拆分统计（文字形态）；可视化图表（柱/饼）仍未做，留后续。

### 已知小偏差（平台边界）

- **限流竞态**：Cache API 限流非原子，平台边界，记录不修。
- **PersonForm `defaultValues`/`onReady` 死代码**：不影响功能，记录不修。

### 可选加固（非必需）

- **密钥轮换**：旧 Cloudflare API Token 曾在历史对话明文出现（生产已迁 CloudBase，旧 token 仅遗留风险）。如担忧可到 dash.cloudflare.com 与 opencode.ai/auth 轮换。生产环境无密钥（CloudBase 云函数 origin 白名单控制访问）。

### 待云函数侧实现（前端契约已出）

- **P2 追问循环**：前端契约 + 云函数 spec 见 `docs/guanlan-agent-design.md` 附录 A（`/followup` 端点）。代码独立部署不在仓库。
- **P3-1 应验率反馈 LLM**：前端契约 + 云函数 spec 见 `docs/guanlan-agent-design.md` 附录 B（`dimensionAccuracy` 字段消费）。

## 环境备注

### 生产部署

- **生产域名**：`cyber-divination-7e4.pages.dev`（`cyber-divination.pages.dev` 为旧项目，勿混淆）。
- **当前生产部署**：Cloudflare Pages 静态托管；AI 后端迁至腾讯云 CloudBase HTTP 云函数 `guanlan`（混元 hy3），前端通过 `src/lib/api.ts` 的 `AI_BASE_URL` 直连 `https://kaifa-d1gdl3ow4ec39065b.service.tcloudbase.com/api`。
- **部署命令**：`npm run build` → `npx wrangler pages deploy out --project-name cyber-divination --branch main`。
- **CloudBase 云函数部署**：`tcb fn deploy guanlan -e kaifa-d1gdl3ow4ec39065b --runtime Nodejs20.19 --httpFn --path /api --force`。HTTP 网关路由必须用具体域名 + `WEB_SCF` 类型，通配符 `*` 会报 `FUNCTIONS_PARAM_INVALID`。`scf_bootstrap` 的 node 路径必须是 `/var/lang/node20/bin/node`（不带小版本号）。

### 配置约束

- **绑定自定义域名时**：必须更新云函数代码的 `ALLOWED_ORIGINS` 白名单并重新部署，否则前端调用会 403。
- **换 AI 模型**：云函数代码内 `max_tokens=1600`（HTTP 网关 60s 上限约束）；切换模型需同步评估响应时长。
- **换付费模型前必须保留限流**：当前限流已在云函数代码层，切换模型不应绕过。

### 字体

- 主字体得意黑 SmileySans 已自托管（`public/fonts/SmileySans-Oblique.ttf.woff2`，OFL 开源可商用）。
- Noto Serif/Sans SC 走 Google Fonts 兜底，内网/离线降级 SimSun/系统字体。

### 旧 Cloudflare Pages 项目清理

- 2026-08-06 已清理 12 条过时部署：`36a9e9b0/e04fc3c2/de20610f/7b6b0643/ad11ed91/cf0cdc97/de3a59ad/57cd0d8a/2daecb6a/afc80dfe/7d6c3dc8/b85b657d`（保留当前生产 `84c38e7c`）。已删 URL 全部 404，生产 200 正常。preview 部署删除需 `?force=true`（aliased）。

### 测试与验证

- `npm test` = 单元测（Node 24 `--experimental-transform-types` 直跑 .ts）+ 端到端（playwright-core）。
- 改排盘引擎后用 `node` 直接调 `computeBazi` 三组命例核对（PROGRESS.md「验证基线」），不要只依赖类型检查。
- 无浏览器环境时不要声称「验收通过」——只写「代码级验证」或「真实运行验证」（项目 AGENTS.md 红线）。
