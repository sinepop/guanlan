# AGENTS.md — 观澜项目约定

## 构建与验证

- 提交前必须 `npm run build`（静态导出 + TS 类型检查）与 `npm run lint`（ESLint）。
- 运行时验证优先：改排盘引擎后用 node 直接调 `computeBazi` 三组命例核对（PROGRESS.md「验证基线」），不要只依赖类型检查。
- 无浏览器环境时，不要声称「验收通过」——只写「代码级验证」或「真实运行验证」。

## 代码红线

- `lunar-javascript` 的 Yun **没有** `getStartAge()`；起运年龄用 `daYunList[0].startAge`（虚岁）。
- 未起运者（新生儿）不得伪造当前大运：用 `currentDaYun.gan === ""` 判空显示「尚未起运」。
- 禁止浏览器 `alert`，错误一律走 `ErrorBanner`/页内提示。
- 禁止硬编码假结果（甲子/87 分/固定上上签）；AI 不可用时显示错误而不是假结果。
- AI 后端为腾讯云 CloudBase 云函数 `guanlan`（混元 hy3），前端通过 `src/lib/api.ts` 的 `AI_BASE_URL` 直连。无 API Key、无服务端代理。
- 云函数内 origin 白名单（`ALLOWED_ORIGINS`）控制访问；改域名需更新云函数代码并重新部署。
- 改提示词/校验逻辑：改云函数代码（独立部署，不在本仓库内），不是 `lib/zen.ts`（已删除）。
- 自定义类型声明在 `types/`（lunar 包无 d.ts，方法签名以实际运行为准）。

## 文档

- 进度与修复记录：`../PROGRESS.md`；阻塞与遗留：`../BLOCKED.md`。改完代码同步更新。
