# REVIEW-opencode.md（执行者独立 pass + 对抗式综合）

> 审查者：opencode（本会话执行者独立 pass，承认有确认偏误，故以"假设代码是错的"为前提找茬）
> 审查范围：同 codex（本次 agent 搭建改动）
> 外部视角：opencode CLI 子进程因与本会话共享 OPENCODE_DB 锁冲突中断，本轮外部独立视角由 codex 单独承担
> 方法：分维度独立 pass（正确性/边界/安全/设计/性能/测试/文档）→ 每条对抗验证 → 与 codex 交叉印证

## 综合幸存发现（去重 + 对抗验证后）

### P0（必须修，4 条）

**P0-1｜记忆层断链：只"存+展示"不"用"**〔codex P0-2 + 我的 A2，强印证〕
- 位置：`page.tsx:40`（横幅跳 `/mingli`）、`mingli/page.tsx`（不读 memory）、`bazi/page.tsx`（不从 persona 预填）、`compat/page.tsx:26`（fillFromMine 只读 store）、`divining/ask payload`（不传 persona/focus）
- 失败场景：老用户（memory 有 persona）打开首页看到"欢迎回来，公历 xx年·女·深圳·最关注事业"横幅，点"我的命盘→"跳到 `/mingli`（静态导航页不读 memory）→ 子链接 `/bazi?view=bazi` 也不从 memory 恢复生辰 → 用户被"认出"后要重填全部信息。**承诺与交付不符**。更本质：persona/focus 从未进入 `/divine` `/ask` payload，**LLM 永远不知道用户是谁**——agent 核心公式里的"记忆"要素名存实亡。
- 对抗验证：能否推翻？不能。compat 页"复制我的八字"也只读 `store.getBaziInput()`（sessionStorage），老用户重开浏览器后该按钮失效。整条链路从"用"端断开。✅ 留，**本次最核心 P0**。
- 修复方向：①横幅 onClick 改为恢复 persona 生辰到 store 并跳 `/divining`（一键重排）；或 ②`/mingli` 和 `/bazi` 增加"从记忆恢复"入口；③`/divine` `/ask` payload 加 `memory: { focus, personaSummary }` 字段（需云函数配合消费）。

**P0-2｜persona 指纹不全 + events 覆盖丢失**〔codex P0-1 + 我的 A1，叠加〕
- 位置：`memory.ts:36`（指纹）、`:87`（覆盖）、`:89`（events 处理）
- 失败场景一（codex）：同 year/month/day/gender/location 但 calendar 或 timeMode 不同 → 误判同一 persona → 覆盖。
- 失败场景二（我）：同一人首次填 `events:["2020年结婚"]`，二次排盘 `events:[]` → `existing.baziInput = input` 整体覆盖 → **结婚校准事件丢失** → 后续 AI 解读缺关键校准信息。
- 对抗验证：推不翻。指纹确实缺 calendar/timeMode；覆盖确实整体替换丢 events。✅ 留
- 修复方向：指纹补 calendar/timeMode/shichen/hour；覆盖时 events 走"合并去重"而非替换。

**P0-3｜首页暴露完整生辰画像**〔codex P0-3，接受升级〕
- 位置：`page.tsx:40`（横幅全文展示）、`memory.ts:153`（getPersonaSummary 返回完整生辰+地点+关注）
- 失败场景：共用/公共设备打开首页，无需任何交互即可读到他人出生年月日+性别+出生地+关注维度（事业/感情）。这类数据在命理产品里属敏感个人信息。
- 对抗验证：推不翻。React 转义无 XSS，但"可见性"本身是隐私问题。✅ 留
- 修复方向：横幅改为弱提示"已有命盘记录"（不显示具体生辰），详情放 `/ledger` 或专门的"我的"页，并加清除入口。

**P0-4｜ACI 字段后端消费不可验证**〔我的 C1，独立发现，codex 未提〕
- 位置：`divining/page.tsx:140`（payload 加 `confidence` `timeMode`）；云函数代码已从本仓库删除（`functions/` 不存在），独立部署
- 失败场景：前端单方面加字段，但云函数 `/divine` 若未解析这两个字段组 prompt，则"P0 ACI 修复"完全无效——前端传了后端不读。本次会话无法验证（云函数代码不在仓库）。
- 对抗验证：推不翻。"加字段"向后兼容无害，但**声称修复但实际可能未修复**是真实风险。✅ 留（定性为"需后端验证"，非"确定 bug"）
- 修复方向：文档（guanlan-agent-design.md 第五节）把 P0 状态从"已完成"改为"前端就绪，待云函数对接消费"；或拉云函数代码入仓共审。

### P1（记 TODO.md，不阻塞，9 条）

| # | 发现 | 位置 | 来源 |
|---|---|---|---|
| 1 | focus 关键词单字误判（"合"→感情，"项目"按钮自动填词污染） | `memory.ts:29-31`, `ask/page.tsx` TOPICS | codex P1-2 + 我 A3 |
| 2 | getProfile 校验浅，坏 localStorage 崩溃/NaN | `memory.ts:65` | codex P1-1 |
| 3 | save 吞持久化失败，应返回 boolean | `memory.ts:74,:104,:132` | codex P1-3 |
| 4 | 无清除入口（隐私债） | `memory.ts` clearProfile 未接入 UI | 我 B2 |
| 5 | focus 只在 ask 学习，bazi view/Events 不学习 → 画像不全 | `memory.ts` inferFocus 仅 ask 调用 | 我 D1 |
| 6 | memory.ts 零测试（纯函数状态逻辑无回归保护） | 整个 memory.ts | 我 F1 |
| 7 | 设计文档过满：P1 标"已完成"但"用"端未做 | `docs/guanlan-agent-design.md` 第五节 | 我 G1 |
| 8 | MAX_PERSONAS 裁剪可能存 9 条（codex 标 P0，对抗验证降级：影响小不崩） | `memory.ts:98-102` | codex P0-4 降级 |
| 9 | ID 用 Math 时间戳+计数器，建议 crypto.randomUUID；memory 浏览器强绑定无 storage adapter | `memory.ts:50,:51,:62,:77` | codex P1-4/P1-5 |

### 已查证但推翻/不记（说明查过，避免当遗漏）

- **XSS**：personaSummary 含 location 来自固定 PROVINCES 字典非自由输入，React 默认转义。无注入风险。
- **指纹不含 timeMode 是 bug？**：覆盖为"最新输入"其实是期望行为（用户更新更精确时间应被采纳）。真正问题是覆盖丢 events，已在 P0-2。
- **首页 useEffect 双调 getProfile**：性能影响极小，可顺手优化但不记。
- **SSR/SSG 安全**：memory.ts 的 localStorage/window 调用都在事件处理或客户端 useEffect，静态导出无 SSR 问题。

## 对抗式验证总结

- codex 5 个 P0：采纳 P0-1/P0-2/P0-3；P0-4（MAX 超限）对抗降级为 P1-8（影响小不崩）；P0-5（AI_URL 兜底）属历史改动非本次范围，登记备追溯。
- 我的 11 个发现：A1/A2/B2/C1 升级或合并入 P0；其余落 P1。
- 两个独立视角在"记忆层断链"和"指纹/覆盖"上强印证 → 这两条是本次最可信的核心问题。
- opencode CLI 外部视角缺失是本轮审查的唯一盲区（DB 锁冲突），下轮可改用不同 DB 实例或改用 codex-only 双 pass。

## 修复优先级建议

按"对 agent 核心价值的影响"排序：
1. **P0-1（记忆断链）**：决定了本次 agent 搭建是不是"真的有记忆"。不修 = memory.ts 是死代码。
2. **P0-2（指纹+events）**：数据正确性，会导致用户画像损坏。
3. **P0-3（隐私暴露）**：文化产品信任问题，且法律风险（个人信息可见性）。
4. **P0-4（ACI 后端验证）**：需拉云函数代码或文档标注，不阻塞前端。
