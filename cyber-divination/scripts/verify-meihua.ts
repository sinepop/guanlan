// 梅花引擎验证：确定性 / 64 卦完整性 / 变卦单爻翻转 / 心念数边界 / 闰月
// 运行：npx tsx scripts/verify-meihua.ts
import { castHexagram, HEXAGRAM_GUA, TRIGRAMS, serializeCast, parseCast } from "../src/lib/meihua";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("✗ FAIL:", msg);
    failed += 1;
  } else {
    console.log("✓", msg);
  }
}

// 1. 确定性：同 now + 心念 → 完全相同
const a = castHexagram({ question: "Q1", intention: 7, now: 1754476800000 });
const a2 = castHexagram({ question: "换问题", intention: 7, now: 1754476800000 });
assert(a.mainName === a2.mainName && a.changedName === a2.changedName && a.movingLine === a2.movingLine && a.castAt === a2.castAt, "确定性：同刻同念同卦");

// 2. 问题不参与公式（改问题不改卦）
assert(a.mainName === a2.mainName, "问题无关：改问题卦不变");

// 3. 心念数敏感
const b = castHexagram({ question: "Q", intention: 8, now: 1754476800000 });
assert(a.mainName !== b.mainName || a.movingLine !== b.movingLine, "心念敏感：改心念卦变");

// 4. 64 卦完整性
assert(Object.keys(HEXAGRAM_GUA).length === 64, `64 卦全：${Object.keys(HEXAGRAM_GUA).length}`);
const allKeys = Object.keys(HEXAGRAM_GUA);
assert(new Set(allKeys).size === 64 && allKeys.every((k) => /^[0-7][0-7]$/.test(k)), "64 卦 key 合法");

// 5. 变卦单爻翻转：本卦与变卦只有一爻不同（用二进制逐爻比较）
function yaoBits(index: number): number {
  return ({ 0: 0, 1: 7, 2: 3, 3: 5, 4: 1, 5: 6, 6: 2, 7: 4 } as Record<number, number>)[index];
}
function diffCount(u1: number, l1: number, u2: number, l2: number): number {
  let diff = 0;
  for (let i = 0; i < 3; i++) diff += ((yaoBits(u1) >> i) & 1) !== ((yaoBits(u2) >> i) & 1) ? 1 : 0;
  for (let i = 0; i < 3; i++) diff += ((yaoBits(l1) >> i) & 1) !== ((yaoBits(l2) >> i) & 1) ? 1 : 0;
  return diff;
}
for (let i = 1; i <= 6; i++) {
  const r = castHexagram({ question: "x", intention: 13, now: 1754476800000 + i * 1000 });
  const diff = diffCount(r.mainUpper.index, r.mainLower.index, r.changedUpper.index, r.changedLower.index);
  assert(diff === 1, `动爻${r.movingLine}：变卦恰好 1 爻翻转（实际 ${diff}）`);
}

// 6. 动爻与变卦位置对应（动爻 1-3 在下卦，4-6 在上卦）——遍历心念数直到 6 个动爻都覆盖
{
  const seen = new Set<number>();
  let guard = 0;
  for (let intention = 1; intention <= 60 && seen.size < 6 && guard < 200; intention++, guard++) {
    const r = castHexagram({ question: "x", intention, now: 1754476800000 });
    if (seen.has(r.movingLine)) continue;
    seen.add(r.movingLine);
    if (r.movingLine <= 3) {
      assert(r.changedLower.index !== r.mainLower.index && r.changedUpper.index === r.mainUpper.index, `动爻${r.movingLine}：下卦翻转上卦不变`);
    } else {
      assert(r.changedUpper.index !== r.mainUpper.index && r.changedLower.index === r.mainLower.index, `动爻${r.movingLine}：上卦翻转下卦不变`);
    }
  }
  assert(seen.size === 6, `六个动爻全部覆盖（覆盖 ${seen.size}/6）`);
}

// 7. movingLine 1-6
for (const r of [a, b]) assert(r.movingLine >= 1 && r.movingLine <= 6, "动爻范围 1-6");

// 8. 心念数边界：0/负/超界回落默认 1；999 合法
const c0 = castHexagram({ question: "x", intention: 0, now: 1754476800000 });
assert(c0.calculation.intention === 1, "心念 0 → 回落 1");
const c999 = castHexagram({ question: "x", intention: 999, now: 1754476800000 });
assert(c999.calculation.intention === 999, "心念 999 合法");

// 9. serialize/parse 往返
const s = serializeCast(a);
const p = parseCast(s);
assert(p !== null && p.now === a.castAt && p.intention === 7, "serialize→parse 往返一致");
assert(parseCast("bad") === null, "非法串 parseCast → null");

// 10. 起卦时间戳为 0 也合法（极端但允许）
const cE = castHexagram({ question: "x", intention: 3, now: 0 });
assert(cE.castAt === 0 && cE.mainName.length > 0, "now=0 边界可起卦");

// 11. 年支序/时辰支序合法
for (const r of [a, b, c999]) {
  assert(r.calculation.yearBranchOrdinal >= 1 && r.calculation.yearBranchOrdinal <= 12, "年支序 1-12");
  assert(r.calculation.shichenOrdinal >= 1 && r.calculation.shichenOrdinal <= 12, "时辰支序 1-12");
  assert(r.calculation.lunarMonth >= 1 && r.calculation.lunarMonth <= 12, "农历月 1-12");
}

// 12. 默认无 now 也能起卦（Date.now 路径）
const cNow = castHexagram({ question: "x", intention: 5 });
assert(cNow.castAt > 0, "无 now 参数可起卦（Date.now）");

console.log(failed === 0 ? "\n全部通过 ✓" : `\n${failed} 项失败 ✗`);
process.exit(failed === 0 ? 0 : 1);
