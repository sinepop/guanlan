# REVIEW-codex.md（外部独立审查）

> 审查者：codex（外部 CLI，read-only sandbox）
> 审查范围：观澜 agent 搭建改动（memory.ts 新增 + 4 处接入 + ACI 字段）
> 审查时间：2026-08-12
> 注：codex 因 sandbox 无法直接写文件，结论取自其 stdout；本文档为执行者代为整理的干净版（原始痕迹见 git 历史本次重写前的版本）。

## P0（必须修）

### 1. personaFingerprint 缺关键排盘字段 → 错误覆盖 persona
- 位置：`cyber-divination/src/lib/memory.ts:36`（指纹函数）, `:87`（ensurePersona 覆盖）
- 场景：同年/月/日/性别/地点，但 **calendar（公历vs农历）/时辰/timeMode** 不同，会被当成同一 persona，`existing.baziInput = input` 直接覆盖旧生辰 slots。
- 建议：指纹纳入 `calendar`、`timeMode`、时辰/时间等所有影响 `computeBazi` 的字段；修正同一 persona 应走显式 id 更新。

### 2. 语义记忆没进 AI payload → agent 记忆断链
- 位置：`bazi/page.tsx:119`, `ask/page.tsx:150`, `divining/page.tsx:136`, `ask/page.tsx:102`
- 场景：persona/focus 只存 localStorage，云函数无法读取，LLM 不知道用户画像或关注维度。
- 建议：`/divine`、`/ask` payload 显式传最小 memory context，或迁云数据库后由云函数读取。

### 3. 首页自动暴露完整生辰画像 → 隐私泄漏
- 位置：`page.tsx:15,:40`, `memory.ts:153`
- 场景：共享设备上打开首页即可看到出生日期、性别、地点、关注维度。
- 建议：首页只显示"已保存命盘"等弱提示，完整信息放到用户主动进入的页面。

### 4. persona 裁剪突破 MAX_PERSONAS = 8
- 位置：`memory.ts:98,:101,:102`
- 场景：旧 primary 不在最近 8 个里时，先 `slice(0,8)` 后又 `push(primary)`，最终存 9 条。
- 建议：primary 必保留时，从非 primary 中选 `MAX_PERSONAS - 1` 个最近项。

### 5. AI URL 改 `${AI_BASE_URL}/*` 无兜底 → 可能断链
- 位置：`divining/page.tsx:142`, `ask/page.tsx:102`
- 注：此改动为更早的历史改动（非本次 agent 搭建工作），但 codex 标为 P0，登记以备追溯。
- 场景：环境变量缺失或原 `/api/*` 承担代理/CORS/鉴权时，请求会变成非法 URL。
- 建议：集中封装 endpoint，缺失时回退或显式报错。

## P1（记 TODO）

1. **getProfile 校验太浅**（`memory.ts:65`）：坏 localStorage 如 `{personas:[{}], focus:{}}` 会崩溃或写 NaN。建议读取时 normalize schema。
2. **focus 关键词单字误判**（`memory.ts:29-31`）："适合换工作吗"会因"合"命中感情。建议去高歧义单字或降权重。
3. **save 吞掉持久化失败**（`memory.ts:74,:104,:132`）：quota 满或 storage 禁用时调用方仍以为成功。建议返回 boolean。
4. **ID 生成跨 tab 有碰撞风险**（`memory.ts:50`）：建议用 `crypto.randomUUID()`。
5. **memory 浏览器强绑定**（`:51,:62,:77`）：后续云函数/服务端复用会遇到 `window/localStorage`。建议抽象 storage adapter。
