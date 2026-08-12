# TODO.md（对抗式审查 P1 清单）

> 来源：REVIEW-opencode.md / REVIEW-codex.md（2026-08-12 一轮对抗式审查）
> 规则：P0 已在审查结论中列出（必修），本文档只记 P1（风格/可维护性/边界缺失，不阻塞合并）

## 记忆层（memory.ts）

- [x] **P1-1** ~~focus 关键词单字误判~~ ✅ 2026-08-12：关键词表去高歧义单字（「爱」「情」「合」「财」「钱」「买」「卖」「股」「房」「病」），改用语义明确的 2+ 字复合词；拆出纯 `detectFocus()` 挂 `window` 供测试；verify-agent 加 15 断言（5 单字歧义不再误判 + 1 多维度同命中 + 8 维度准确 + 1 暴露检查），27/27 全过。
- [ ] **P1-2** ~~getProfile 校验太浅~~ ✅ 已在 P0 修复时顺手补 normalize schema。
- [x] **P1-3** ~~save() 返回 boolean~~ ✅ 2026-08-12 v1：save 返回 boolean + 失败时 console.warn（不抛出，记忆是软失败）。
  - **v2 审查诚实化（P1-v2-H）**：v1 描述「调用方能感知失败」实质未达成——所有调用方都忽略 save 返回值。本次保留 console.warn 方案不实现调用方分支：(1) save 失败是极小概率边缘；(2) 让 ensurePersona 改返回 `string|null` 破坏 5 处调用方签名，改动面过大；(3) 记忆持久化是软失败（本次会话 store 仍能用）。承认 P1-3 只做「日志可见」未做「调用方分支」，描述诚实化。
- [ ] **P1-4** ~~加清除入口~~ ✅ 已在 ledger 页接入两步确认按钮（2026-08-12 P3）。
- [x] **P1-5** ~~focus 学习来源单一~~ → ✅ 2026-08-12 v1 实施 → ❌ 2026-08-12 v2 审查发现 P0-D（inferFocus 不幂等）已回退。详见 P0-D 条目。
- [x] **P1-6** ~~memory.ts 补单元测试~~ ✅ 2026-08-12：用 Node 24 自带 `--experimental-transform-types` 直接 import .ts 零依赖跑单元测（不引入 vitest/jest）。`scripts/unit-memory.mjs` 14 断言覆盖 detectFocus 边界；package.json 加 `test:unit`/`test:e2e`/`test` 三脚本。有 DOM 依赖的（getProfile/save/ensurePersona）继续走 verify-agent 端到端。
- [x] **P1-7** ~~MAX_PERSONAS 裁剪修正~~ ✅ 已在 P0 修复时顺手改为 primary 必保留取 MAX-1。
- [x] **P1-8** ~~ID 改 crypto.randomUUID~~ ✅ 已在 P0 修复时顺手补。
- [ ] **P1-9** memory 抽象 storage adapter（迁云数据库时做）。
- [x] **P0-2b-runtime** ~~events 合并顺序 bug~~ ✅ 2026-08-12 运行时验证抓到：`existing.baziInput = input` 先覆盖再 merge，导致 merge 两边都是 input 的空 events，历史校准事件永远丢。修复为先存 `prevEvents` 再覆盖再 merge。**对抗式审查（codex+opencode 两轮）未抓到，运行时验证抓到**。

## v2 对抗式审查新增 P1（2026-08-12，REVIEW-opencode-v2.md）

- [x] **P1-v2-A**：~~memory.ts:161 引用污染防御~~ ✅ 2026-08-12：保存时浅拷贝 `{ ...input }`。
- [x] **P1-v2-B**：~~verify-agent.mjs P0-3 隐私断言只查生辰年份格式~~ ✅ 2026-08-12：已加 P0-3c 维度名断言。
- [x] **P1-v2-C**：~~verify-agent.mjs 场景 4 死代码~~ ✅ 2026-08-12：审查时已顺手删除。
- [x] **P1-v2-D**：~~verify-agent.mjs 场景 3 跳过时 check 不记录~~ ✅ 2026-08-12：跳过时显式记 fail。
- [x] **P1-v2-E**：~~verify-agent.mjs P1-5b 断言脆性~~ ✅ 2026-08-12：已被 P0-D-v2 测试替换。
- [x] **P1-v2-F**：~~journal.ts:65-69 多维度只取 hit[0]~~ ✅ 2026-08-12：journal.focus 改为 `FocusDim[]`；ledger 维度拆分用 `e.focus.includes(d)`；readAll 加向后兼容（旧单值数据自动转单元素数组）；verify-agent 加 t5 多维度测试记录。
- [x] **P1-v2-G**：~~memory.ts:156 existing 分支死代码~~ ✅ 2026-08-12：审查时已顺手删。
- [x] **P1-v2-H**：~~P1-3 名义完成实质未兑现~~ ✅ 2026-08-12：诚实化完成（见 P1-3 条目）。保留 console.warn 方案不实现调用方分支。
- [x] **P1-v2-I**：~~关键词表遗漏「姻缘」「生子」，「金钱」歧义~~ ✅ 2026-08-12：补「姻缘」「生子」；删除「金钱」单字歧义；补「缺钱」「财务紧张」更精确词。补 11 条单元测断言（含「老公公」误命中 known-issue 记录）。
- [x] **P1-v2-J**：~~getPersonaHint 暴露关注维度给旁观者~~ ✅ 2026-08-12：hint 改为「已保存命盘」隐藏维度（共用设备隐私优先于快速识别）。P0-3c 断言保护回归。
- [x] **P1-v2-K**：~~unit-memory.mjs 断言深度不足~~ ✅ 2026-08-12：补 11 条边界用例（含长文本性能、相邻多维度、英文穿插、标点分隔、子串误匹配 known-issue）。

## 评估闭环（P3 已实现纯前端部分）

- [ ] **P3-1** 维度应验率反馈给 LLM：低准维度自动降置信提示。需 `/divine` `/ask` payload 加维度历史应验率字段，云函数消费（审查 P0-4 同类不可验证风险，标注待对接）。

## 文档

- [x] **P1-10** ~~guanlan-agent-design.md 状态诚实化~~ ✅ 已标注（2026-08-12 P0 修复时）。
- [ ] **P1-11** guanlan-agent-design.md 补 P3 应验闭环章节（评估闭环落地形态）。
- [x] **P1-12** ~~同步写回 Obsidian~~ ✅ 2026-08-12 已建 `6-projects/观澜-设计决策.md` 并更新 `AGENT_INDEX.md`/`ACTIVE_CONTEXT.md`。
