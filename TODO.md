# TODO.md（对抗式审查 P1 清单）

> 来源：REVIEW-opencode.md / REVIEW-codex.md（2026-08-12 一轮对抗式审查）
> 规则：P0 已在审查结论中列出（必修），本文档只记 P1（风格/可维护性/边界缺失，不阻塞合并）

## 记忆层（memory.ts）

- [x] **P1-1** ~~focus 关键词单字误判~~ ✅ 2026-08-12：关键词表去高歧义单字（「爱」「情」「合」「财」「钱」「买」「卖」「股」「房」「病」），改用语义明确的 2+ 字复合词；拆出纯 `detectFocus()` 挂 `window` 供测试；verify-agent 加 15 断言（5 单字歧义不再误判 + 1 多维度同命中 + 8 维度准确 + 1 暴露检查），27/27 全过。
- [ ] **P1-2** ~~getProfile 校验太浅~~ ✅ 已在 P0 修复时顺手补 normalize schema。
- [x] **P1-3** ~~save() 返回 boolean~~ ✅ 2026-08-12：save 返回 boolean + 失败时 console.warn（不抛出，记忆是软失败）；调用方签名未破坏。
- [ ] **P1-4** ~~加清除入口~~ ✅ 已在 ledger 页接入两步确认按钮（2026-08-12 P3）。
- [x] **P1-5** ~~focus 学习来源单一~~ ✅ 2026-08-12：bazi 页提交时 events 文本也触发 inferFocus（「2020年结婚」→ love 累加）。verify-agent 加场景 7（5 events 文本 → 维度 + 1 真实提交后 focus 累加断言）；wealth 关键词补「加薪」。
- [x] **P1-6** ~~memory.ts 补单元测试~~ ✅ 2026-08-12：用 Node 24 自带 `--experimental-transform-types` 直接 import .ts 零依赖跑单元测（不引入 vitest/jest）。`scripts/unit-memory.mjs` 14 断言覆盖 detectFocus 边界；package.json 加 `test:unit`/`test:e2e`/`test` 三脚本。有 DOM 依赖的（getProfile/save/ensurePersona）继续走 verify-agent 端到端。
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
