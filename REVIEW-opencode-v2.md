# REVIEW-opencode-v2.md（对抗式审查迭代二·opencode 独立 pass）

> 审查范围：观澜 agent 化迭代二的全部代码改动（基线 c65a258，HEAD 441182e，共 7 commit）
> 审查者：opencode（执行者本人独立 pass，对抗式审查模式）
> 审查模式：work-modes skill 模式一「进行对抗式审查」—— 假设代码是错的，多维度独立找茬 + 对抗验证
> 审查日期：2026-08-12
> 与 codex-v2 关系：codex 本轮实际复述了 v1 结论（透明记录见 REVIEW-codex-v2.md），未做 v2 独立审查；本文是本轮唯一真实的对抗审查产出

## 审查维度分解

按 work-modes 协议拆 7 个独立维度：
1. memory.ts 逻辑正确性 + 调用链
2. verify-agent.mjs 测试脚本本身可靠性
3. inferFocus(events) 副作用 + focus 权重累加合理性
4. focus 关键词表新增词歧义 / 遗漏
5. ledger 应验率跨维度重复命中算法
6. save() 返回值是否被调用方真用了
7. unit-memory.mjs 断言深度

每条发现都已做对抗验证（尝试推翻），只有幸存的进入下方结论。

## P0（必须修）

### P0-D：inferFocus 在 bazi 页不幂等，重复提交污染 focus 画像

- **位置**：`cyber-divination/src/app/bazi/page.tsx:154-155`
- **失败场景**：
  ```
  用户首次提交 events=["2020年结婚"] → focus.love = 1
  用户改时辰/性别/地点，二次提交（events 相同）→ focus.love = 2
  用户连续改 3 次表单 → focus.love = 5
  用户去 ask 页问「工作要不要换」→ focus.career = 1
  getTopFocus() 返回 love（5 > 1）→ 错误！用户当前真实关心 career
  ```
- **根因**：`ensurePersona` 幂等（指纹相同 → 合并 events），但 `inferFocus(evtText)` 每次都跑一遍，无去重。events 是「人生大事」语义（已发生），每次表单重复提交不应再次累加关注度。
- **对抗验证**：实测 `node --experimental-transform-types` 跑 detectFocus 累加 5 次得 `{love:5, career:0}`，再加 1 次 ask 工作得 `{love:5, career:1}`，getTopFocus 返回 love（错误）。
- **为什么之前的审查没抓到**：v1 审查早于 P1-5 改动（commit d49bc1e），P1-5 是后加的；v1 审查不可能预知后加的功能引入新 bug。本轮 codex 又复述了 v1（未独立审 v2），所以这条只在本文发现。

### 修复方案

bazi 页提交时不要直接调 `inferFocus(evtText)`。两种修法（选一）：

**方案 A（推荐，最小改动）**：bazi 页提交时不调 inferFocus；只让 ask 页的 saveEntry 触发 inferFocus。events 进 persona 持久化但**不**进 focus 权重 —— focus 仅来自「当前问什么」（ask 问题），而非「人生经历过什么」。语义更清晰。
```diff
- // bazi/page.tsx line 153-155 删除
- // P1-5：events 也作为关注维度学习来源 ...
- const evtText = input.events.filter((e) => e.trim()).join(" ");
- if (evtText) inferFocus(evtText);
```

**方案 B**：保留 events 学习但做幂等。需要 persona 记录「已学习过的 events 集合」，每次提交时只对新增 events 调 inferFocus。复杂度比方案 A 高，且语义模糊（events 是历史事件还是当前关注？）。

推荐方案 A，符合第一性原理：「关注画像」的本质是「用户当前关心什么」，而 events 反映的是「用户过去经历过什么」—— 后者不该污染前者。

## P1（入 TODO.md）

### P1-A：memory.ts:161 引用污染隐患

- **位置**：`memory.ts:161` `p.personas.push({ id, label, baziInput: input, ... })`
- **场景**：直接保存外部传入 `input` 引用。当前唯一调用方 `bazi/page.tsx:151` 提交后立即 `window.location.href = "/divining"`（页面卸载），不会再次修改 `input`，所以当前安全。但任何在异步上下文里复用 `input` 的调用都会污染 persona。
- **修复**：保存时浅拷贝 `baziInput: { ...input }`。

### P1-B：verify-agent.mjs P0-3 隐私断言覆盖漏洞

- **位置**：`scripts/verify-agent.mjs:129-135`
- **场景**：断言 `/19\d{2}年|20\d{2}年.*月.*日/.test(bannerText)` 只查生辰年份格式。但首页横幅 `<span>{personaHint}</span>` 显示 `已保存命盘 · 最近关注感情`（见 `memory.ts:262`），暴露了用户关注维度（事业/感情/财运/健康）。即便 personaHint 改为泄漏维度，断言也不会抓到。
- **修复**：断言加维度泄漏检查（如不应同时含「关注」+ 维度标签）。或讨论是否要把维度也藏起来（见 P1-K）。

### P1-C：verify-agent.mjs:162-172 死代码

- **位置**：`scripts/verify-agent.mjs:162-172` 场景 4 的第二个 evaluate 块
- **场景**：`window.__eventsBeforeAgain = ...` 和 `localStorage.setItem("__verify_events_before", ...)` 设置后从未被读取。是早期设计的死代码。
- **修复**：删除整个 evaluate 块（174 行的 `outHtml` 同理，读取 outerHTML 后从未使用）。

### P1-D：verify-agent.mjs:138 测试覆盖空洞

- **位置**：`scripts/verify-agent.mjs:138` `if (bannerVisible) { ... check(...) }`
- **场景**：如果场景 2 失败（bannerVisible=false），场景 3 被跳过，里面的 `check("P0-1d ...")` 不被记录。最终报告「33 通过 / 0 失败」会掩盖跳过的 check —— 用户看不到测试覆盖的空洞。
- **修复**：if 内失败时显式记一条 `check("P0-1d ...", false, "场景 2 失败导致跳过")`。

### P1-E：verify-agent.mjs:358 P1-5b 断言脆性

- **位置**：`scripts/verify-agent.mjs:350-359`
- **场景**：`evtFilledCount < 1` 时无条件通过 `check(..., true, "...跳过...")`。如果 events 输入框选择器永久失效（UI 改版），断言会一直「跳过」通过，没人发现 P1-5 的真实路径已不被测试。
- **修复**：跳过时记一条 `check("P1-5b 选择器失效", false, "...")` 强制失败，逼迫维护。

### P1-F：journal.ts:65-69 多维度命中只取 hit[0]，与 memory.focus 不一致

- **位置**：`cyber-divination/src/lib/journal.ts:65-69`
- **场景**：用户问「事业和财运哪个好」→ `inferFocus` 返回 `["career", "wealth"]`，内部把 career/wealth 权重都 +1（memory.focus 反映多维度），但 `focus = hit[0] = "career"`（journal 只存单维度）。ledger 维度拆分时 `entries.filter(e => e.focus === "wealth")` 漏掉这条记录。
- **修复**：journal.focus 改为 `FocusDim[]` 数组，ledger 拆分时 `e.focus.includes(d)`。或反过来 memory.focus 也只取主维度（与 journal 对齐）。建议前者，保留多维度信息。

### P1-G：memory.ts:156 死代码

- **位置**：`memory.ts:156` `if (!p.primaryPersonaId) p.primaryPersonaId = existing.id;`
- **场景**：existing 分支意味着 personas 数组里已存在该 persona，意味着之前必然设过 primaryPersonaId。此 if 永远 false，是死代码。
- **修复**：删除该行。

### P1-H：P1-3 名义完成实质未兑现

- **位置**：`memory.ts:129-142` save() 返回 boolean，但调用方全部忽略
- **场景**：本轮 commit d49bc1e 声称「P1-3 save() 返回 boolean + 调用方能感知失败」。实际查调用方：`ensurePersona/setPrimary/inferFocus/restorePrimaryToStore` 都没用 save 返回值。save 失败时只 console.warn，调用方拿不到失败信号。
- **对抗验证**：这是 P1-3 的名义修复 vs 实质修复之争。console.warn 确实让浏览器 console 能看到失败（用户能感知），但调用方代码本身没分支处理 —— P1-3 的原意（"调用方能感知"）实质未达成。
- **修复方案**：要么承认 P1-3 只做了「日志可见」未做「调用方分支」，更新 TODO.md 描述；要么调用方真的分支处理（如 ensurePersona 返回 `string | null`，调用方检查 null 决定是否再试一次或提示用户）。

### P1-I：focus 关键词表遗漏 + 新歧义

- **位置**：`memory.ts:32-52` 关键词表
- **遗漏**：「姻缘」（love）、「生子」（health，备孕在了但生子没）—— 用户常用问法漏命中。
- **新歧义**：「金钱」（wealth）在「金钱纠纷」语境误命中（实际是法律/合同问题，不是财运关注）。
- **修复**：补「姻缘」「生子」；「金钱」改更精确词如「财务紧张」「缺钱」。

### P1-J：getPersonaHint 暴露关注维度给旁观者

- **位置**：`memory.ts:262` `已保存命盘 · 最近关注${FOCUS_LABEL[top]}`
- **场景**：共用设备上，旁观者看到横幅「最近关注感情」属于隐私扩展。比生辰轻（不暴露身份），但仍是个人信息可见性。
- **对抗验证**：这其实是设计权衡，不是 bug。如果产品决定「关注维度是用户私有信息，不应在横幅公开」，就改 hint 为「已保存命盘」（隐藏维度）；如果决定「维度有助于用户快速识别是不是自己的设备」，就保留。
- **修复**：产品决策；如果选隐藏，删 top 部分文案。

### P1-K：unit-memory.mjs 断言深度不足

- **位置**：`scripts/unit-memory.mjs`
- **场景**：14 断言只覆盖 detectFocus 表层用例，未覆盖：超长文本（1000+ 字）匹配性能、关键词长文本包含（"考研备考" 含 "考研"）、关键词边界（"工作" 在 "工作量" 里也算命中 —— 这其实是设计决定但应有测试固化）。
- **修复**：补 5-10 条边界用例。

## 被对抗验证推翻的发现（说明查过，避免被当成遗漏）

| 发现 | 推翻理由 |
|---|---|
| `verify-agent.mjs:132 locator("..")` 不能找到父节点 | 实测能读到 button.innerText，含三个 span 合并文本。怀疑错。 |
| `personaFingerprint` 不纳入 hour 字段 | 实际纳入了 exact 模式的 hour:minute（line 63）。怀疑错。 |
| `MAX_PERSONAS` 裁剪可能丢失 primary | 实际逻辑 primary 必保留取 MAX-1（line 165-168），无丢失。怀疑错。 |
| ensurePersona 的 existing 分支会覆盖性别导致 bug | 性别是排盘字段，指纹纳入了 gender，不同性别本就该是不同 persona。怀疑错。 |
| `clearProfile` 不重置 primaryPersonaId | 直接 removeItem 整个 key，没有部分清除的歧义。怀疑错。 |

## 对抗式审查方法论复核

本轮是一次方法论自检案例：

1. **v1 审查（针对 f7e2d8f）漏掉了 events 合并顺序 bug** → 运行时验证才抓到 → 沉淀为「审查看不到执行顺序 bug」的方法论（见 Obsidian `5-ai/Agent代码验证方法论.md`）。
2. **v2 审查（本轮）原本想让 codex 做独立外部视角**，但 codex 实际复述了 v1（透明记录见 REVIEW-codex-v2.md），未做 v2 独立审查 → 这是审查工具调用层面的失败，方法论上要警觉：**外部审查工具不一定真的做了新一轮审查，需要检查它的输出是不是复述**。
3. **本轮独立 pass 抓到的 P0-D（inferFocus 不幂等）** 仍然是「执行顺序」类 bug（重复触发累加），与 v1 漏掉的 events 合并 bug 是同类 —— 印证审查对执行顺序问题持续盲区。

## 修复优先级建议

按对 agent 核心价值的影响排序：

1. **P0-D（inferFocus 不幂等）**：直接破坏 focus 画像准确性，进而破坏应验率维度拆分（P3）和未来 P3-1（应验率反馈 LLM）。不修 = focus 是噪声。
2. **P1-H（P1-3 名义完成）**：诚实性问题 —— TODO.md 声称完成但实质未达成，应明确降级或补做。
3. **P1-F（journal 多维度只取 hit[0]）**：数据一致性，影响维度拆分准确性。
4. **P1-A（引用污染）**：当前安全但潜在隐患，小改。
5. 其它 P1（测试断言脆性、关键词表、死代码）：维护性，按需修。
