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

console.log(`\n=== unit-memory: ${pass} 通过 / ${fail} 失败 ===\n` + checks.join("\n"));
process.exit(fail > 0 ? 1 : 0);
