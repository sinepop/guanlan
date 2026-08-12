# REVIEW-codex-v2.md（对抗式审查迭代二·codex 外部视角缺失说明）

> 审查范围：观澜 agent 化迭代二的全部代码改动（基线 c65a258，HEAD 441182e）
> 审查者：codex CLI（gpt-5.5，read-only sandbox）
> 审查日期：2026-08-12
> **本轮结论：codex 未做 v2 独立审查，复述了 v1（REVIEW-codex.md）的结论。本文档透明记录此事实。**

## 实际发生的事

启动命令：

```bash
codex exec "$(cat /tmp/opencode/codex-prompt-v2.txt)"
```

Prompt 明确要求：「不要重复之前已经审过的（agent 化主体的 4 个 P0 已修），只查本轮新增/修改的」。Codex 跑了约 6 分钟，stdout 8287 行，但最终输出的「审查结论」段（stdout 行 8172-8283）是 **REVIEW-codex.md（v1）原文的复述**，列的「P0-1 记忆断链 / P0-2 指纹+events / P0-3 隐私暴露 / P0-4 ACI 后端验证」都是 v1 已经发现的，没有针对本轮新增改动（P1-3/P1-5/events 合并 bug 修复/关键词扩展/verify-agent 测试脚本）的独立结论。

观察 codex 的执行轨迹（stdout 行 8163）：

```
/bin/bash -lc "sed -n '1,220p' REVIEW-codex.md"
```

Codex 主动读了旧的 REVIEW-codex.md，然后把它包装了一下输出。文件 `REVIEW-codex-v2.md` 未生成（codex 在 read-only sandbox 无法写文件）。

## 为什么这是方法论失败

对抗式审查的核心是「独立视角」。如果外部审查者读了之前的审查结论再「审查」，它的视角已经被锚定（confirmation bias 的另一种形式）。本轮 v2 的价值在于查 v1 之后的新增改动，但 codex 复述了 v1 —— 等于 v2 没做。

## 教训（写入方法论）

1. **启动外部审查时禁止它读旧 REVIEW**：Prompt 里要显式说「不要读 REVIEW-codex.md / REVIEW-opencode.md，独立从 diff 出发」。本次 Prompt 没禁止读旧文件，给了 codex 锚定机会。
2. **检查外部审查输出是否真的做了新一轮**：拿到 codex 输出后，先比对它列的发现是否全是 v1 已有的 —— 如果是，基本可判定是复述。本次实时检查发现了这一点。
3. **诚实记录胜过美化**：把 codex 复述 v1 的事实透明记录（本文档），比假装它做了 v2 更有价值。下次审查能改进 Prompt 设计。

## 本轮真实产出

本轮唯一真实的对抗审查产出是 `REVIEW-opencode-v2.md`（执行者独立 pass）。它发现 1 个 P0（inferFocus 不幂等污染 focus 画像）+ 11 个 P1。

## 改进下次审查的 Prompt

```diff
+ 不要读 REVIEW-codex.md / REVIEW-opencode.md / REVIEW-codex-v2.md / REVIEW-opencode-v2.md。
+ 不要复述之前的审查结论。本轮只审查下方 diff 的新增改动。
+ 如果你的发现与 v1 既有发现重合，明确标注「与 v1 重合，仅作交叉印证」。
```

## 备份：codex 本轮 stdout 摘要

完整 8287 行 stdout 在 `/tmp/opencode/codex-v2-output.log`。关键段：
- 行 6444 起：codex 开始读项目文件
- 行 8163：主动 `sed REVIEW-codex.md`（锚定起点）
- 行 8172-8283：复述 v1 的 P0/P1 结论
- 行 8286：`ls REVIEW-codex-v2.md: No such file or directory`（确认文件未生成）
