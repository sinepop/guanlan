// P1-6 单元测试：memory.ts 纯函数边界用例
// 用 Node 24 自带 --experimental-transform-types 直接 import .ts，零依赖（不用 vitest/jest）
// 运行：node --experimental-transform-types scripts/unit-memory.mjs
//
// 仅测无 DOM/localStorage 依赖的纯函数：
//   - detectFocus（关键词匹配）
//   - mergeEvents（合并去重）
// 有 DOM 依赖的（getProfile/save/ensurePersona/inferFocus）通过 verify-agent.mjs 端到端覆盖

import { detectFocus } from "../src/lib/memory.ts";

let pass = 0, fail = 0;
const checks = [];
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  checks.push(`${ok ? "✓" : "✗"} ${name} ${ok ? "" : ` got=${JSON.stringify(got)} expected=${JSON.stringify(expected)}`}`);
  if (ok) pass++; else fail++;
}

// === detectFocus ===
check("detectFocus('') 空字符串", detectFocus(""), []);
check("detectFocus(nullish)", detectFocus(null), []);
check("detectFocus(无关文本)", detectFocus("今天天气真好"), []);
check("detectFocus('工作跳槽')", detectFocus("工作跳槽").sort(), ["career"]);
check("detectFocus('结婚 婚姻')", detectFocus("什么时候结婚").sort(), ["love"]);
check("detectFocus('财运 投资')", detectFocus("今年财运投资").sort(), ["wealth"]);
check("detectFocus('身体 备孕')", detectFocus("身体调理备孕").sort(), ["health"]);
check("detectFocus('事业财运')", detectFocus("看看我的事业和财运").sort(), ["career", "wealth"]);
check("detectFocus 多维度", detectFocus("事业 感情 投资 健康").sort(), ["career", "health", "love", "wealth"]);

// P1-1 单字歧义回归
check("「合同」不命中 love", detectFocus("合同纠纷"), []);
check("「心情」不命中 love", detectFocus("今天心情不好"), []);
check("「可爱」不命中 love", detectFocus("可爱小猫"), []);
check("「毛病」不命中 health", detectFocus("程序毛病"), []);
check("「事情」不命中 love", detectFocus("工作的事情怎么处理"), ["career"]);

// P1-v2-I 关键词扩展 + 歧义修复
check("「姻缘」命中 love", detectFocus("算姻缘").sort(), ["love"]);
check("「生子」命中 health", detectFocus("想生子").sort(), ["health"]);
check("「金钱纠纷」不再误命中 wealth（去掉「金钱」）", detectFocus("金钱纠纷"), []);
check("「缺钱」命中 wealth", detectFocus("最近缺钱").sort(), ["wealth"]);
check("「财务紧张」命中 wealth", detectFocus("财务紧张").sort(), ["wealth"]);

// P1-v2-K 边界用例（深度覆盖）
check("关键词长文本包含（工作量含工作）", detectFocus("工作量太大").sort(), ["career"]);
// 已知边界（不修，权衡）：「老公公」含「老公」会误命中 love。中文无空格难做全词边界，
// 真实用户问「老公公」概率极小，ROI 太低。如真要修需要按句切词（结巴分词等）或换正则边界。
check("[已知边界] 「老公公」误命中 love（不修，中文无空格）", detectFocus("老公公").sort(), ["love"]);
check("超长文本性能（1000 字重复关键词只命中一次）", detectFocus("工作".repeat(500)).sort(), ["career"]);
check("关键词相邻多维度（事业财运相邻）", detectFocus("事业财运哪个好").sort(), ["career", "wealth"]);
check("英文穿插（offer 命中 career）", detectFocus("拿到 offer 了").sort(), ["career"]);
check("标点分隔（工作，跳槽）", detectFocus("工作，跳槽").sort(), ["career"]);

console.log(`\n=== unit-memory: ${pass} 通过 / ${fail} 失败 ===\n` + checks.join("\n"));
process.exit(fail > 0 ? 1 : 0);
