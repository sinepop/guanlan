# TODO.md（对抗式审查 P1 清单）

> 来源：REVIEW-opencode.md / REVIEW-codex.md（2026-08-12 一轮对抗式审查）
> 规则：P0 已在审查结论中列出（必修），本文档只记 P1（风格/可维护性/边界缺失，不阻塞合并）

## 记忆层（memory.ts）

- [ ] **P1-1** focus 关键词单字误判：去高歧义单字（"合"/"工"）或改词组匹配。
- [ ] **P1-2** ~~getProfile 校验太浅~~ ✅ 已在 P0 修复时顺手补 normalize schema。
- [ ] **P1-3** save() 返回 boolean：inferFocus/ensurePersona 调用方应能感知持久化失败。
- [ ] **P1-4** ~~加清除入口~~ ✅ 已在 ledger 页接入两步确认按钮（2026-08-12 P3）。
- [ ] **P1-5** focus 学习来源单一：bazi 页提交时也应学习（从 view/events 推断），不只 ask。
- [ ] **P1-6** memory.ts 补单元测试。（部分补：`scripts/verify-agent.mjs` 已覆盖端到端 12 断言，纯函数单元测试仍缺）
- [ ] **P1-7** ~~MAX_PERSONAS 裁剪修正~~ ✅ 已在 P0 修复时顺手改为 primary 必保留取 MAX-1。
- [ ] **P1-8** ~~ID 改 crypto.randomUUID~~ ✅ 已在 P0 修复时顺手补。
- [ ] **P1-9** memory 抽象 storage adapter（迁云数据库时做）。
- [x] **P0-2b-runtime** ~~events 合并顺序 bug~~ ✅ 2026-08-12 运行时验证抓到：`existing.baziInput = input` 先覆盖再 merge，导致 merge 两边都是 input 的空 events，历史校准事件永远丢。修复为先存 `prevEvents` 再覆盖再 merge。**对抗式审查（codex+opencode 两轮）未抓到，运行时验证抓到**。

## 评估闭环（P3 已实现纯前端部分）

- [ ] **P3-1** 维度应验率反馈给 LLM：低准维度自动降置信提示。需 `/divine` `/ask` payload 加维度历史应验率字段，云函数消费（审查 P0-4 同类不可验证风险，标注待对接）。

## 文档

- [x] **P1-10** ~~guanlan-agent-design.md 状态诚实化~~ ✅ 已标注（2026-08-12 P0 修复时）。
- [ ] **P1-11** guanlan-agent-design.md 补 P3 应验闭环章节（评估闭环落地形态）。
- [x] **P1-12** ~~同步写回 Obsidian~~ ✅ 2026-08-12 已建 `6-projects/观澜-设计决策.md` 并更新 `AGENT_INDEX.md`/`ACTIVE_CONTEXT.md`。
