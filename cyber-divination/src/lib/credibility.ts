// 可信度系统：把「排盘/起卦有多可靠」转成可解释的等级 + 依据列表
// 原则：不夸大。任何近似（时辰未知、节气交界、未校正真太阳时、AI 不可用）都明确降级。
import { Solar } from "lunar-javascript";
import type { BaziResult, MeihuaResult } from "./types";

export type CredibilityLevel = "high" | "medium" | "review";

export interface CredibilityReason {
  label: string; // 校验项名称
  ok: boolean; // 是否通过
  note: string; // 人话说明
}

export interface Credibility {
  level: CredibilityLevel;
  reasons: CredibilityReason[];
  /** 0-1 置信度（用于进度条展示） */
  score: number;
  /** 一句总述 */
  summary: string;
}

const LEVEL_META: Record<CredibilityLevel, { label: string; score: number }> = {
  high: { label: "较高", score: 0.9 },
  medium: { label: "中等", score: 0.68 },
  review: { label: "需复核", score: 0.45 },
};

function reason(label: string, ok: boolean, note: string): CredibilityReason {
  return { label, ok, note };
}

/** 判断给定公历日期是否处于「节气边界 ±1 天」——用月柱变化检测（lunar-javascript 无 getMonthGanZhi，用 getMonthGan/Zhi 组合） */
function nearJieQiBoundary(date: Date): boolean {
  const solar = Solar.fromYmdHms(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, 0);
  const baseMonth = solar.getLunar().getEightChar().getMonthGan() + solar.getLunar().getEightChar().getMonthZhi();
  // 比较前一天与后一天：月柱若在相邻两日内发生变化，说明正处换月柱（节气）边界
  for (const delta of [-1, 1]) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + delta);
    const s = Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 12, 0, 0);
    const ec = s.getLunar().getEightChar();
    const nearMonth = ec.getMonthGan() + ec.getMonthZhi();
    if (nearMonth !== baseMonth) return true;
  }
  return false;
}

/** 命盘（八字）可信度：输入已知 → 较高；时辰未知/缺地点/节气交界 → 逐项降级 */
export function deriveBaziCredibility(r: BaziResult): Credibility {
  const reasons: CredibilityReason[] = [];
  const input = r.input;

  // 1. 日期完整
  reasons.push(reason("出生日期完整", true, `${input.year}年${input.month}月${input.day}日（${input.calendar === "lunar" ? "农历" : "公历"}）`));

  // 2. 时辰明确度
  if (input.timeMode === "exact") {
    reasons.push(reason("时辰明确", true, `精确 ${String(input.hour).padStart(2, "0")}:${String(input.minute ?? 0).padStart(2, "0")}`));
  } else if (input.timeMode === "shichen") {
    reasons.push(reason("时辰明确", true, "已选时辰"));
  } else {
    reasons.push(reason("时辰明确", false, "时辰未知，按午时代表推算，日支判定可能受影响"));
  }

  // 3. 真太阳时校正
  if (input.lon !== undefined && input.lon !== 0 && input.location) {
    reasons.push(reason("真太阳时校正", true, `按 ${input.location}（经度 ${input.lon}°）校正`));
  } else {
    reasons.push(reason("真太阳时校正", false, "未提供出生地经度，按北京时间推算"));
  }

  // 4. 节气边界
  const solar = parseSolar(input);
  if (solar && nearJieQiBoundary(solar)) {
    reasons.push(reason("节气边界", false, "出生日贴近换月柱节气边界，月柱判定可能有 ±1 天误差"));
  } else {
    reasons.push(reason("节气边界", true, "未处于节气交界，月柱判定稳定"));
  }

  // 5. 子时换日边界
  if (input.timeMode === "exact" && (input.hour === 23 || input.hour === 0)) {
    reasons.push(reason("子时换日", false, "出生在 23:00-01:00 子时，日柱可能受换日约定影响"));
  } else if (input.timeMode === "shichen" && input.shichenIndex === 0) {
    reasons.push(reason("子时换日", false, "子时出生，日柱可能受换日约定影响"));
  } else {
    reasons.push(reason("子时换日", true, "非子时，无换日歧义"));
  }

  return finalize(reasons);
}

function parseSolar(input: BaziResult["input"]): Date | null {
  try {
    const d = new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0));
    return d;
  } catch {
    return null;
  }
}

/** 合盘可信度：双方命盘置信度合并 */
export function deriveCompatCredibility(a: BaziResult, b: BaziResult): Credibility {
  const ra = deriveBaziCredibility(a);
  const rb = deriveBaziCredibility(b);
  const score = Math.round(((ra.score + rb.score) / 2) * 100) / 100;
  const level: CredibilityLevel = score >= 0.8 ? "high" : score >= 0.6 ? "medium" : "review";
  return {
    level,
    score,
    reasons: [
      ...ra.reasons.map((x) => ({ ...x, label: `甲方·${x.label}` })),
      ...rb.reasons.map((x) => ({ ...x, label: `乙方·${x.label}` })),
    ],
    summary: `双方命盘可信度合并 ${Math.round(score * 100)}%${score < 0.8 ? "，其中一项输入不完整，结果仅作参考" : "，输入完整，结果较可靠"}`,
  };
}

/** 问一事可信度：规则起卦确定性高；心念数缺省/过泛时略降 */
export function deriveAskCredibility(calc: MeihuaResult["calculation"], aiOk: boolean): Credibility {
  const reasons: CredibilityReason[] = [
    reason("规则起卦", true, "梅花时间起卦法：年支序+农历月日+时辰+心念数，纯确定性公式，同刻同问必同卦"),
    reason("心念数", calc.intention >= 2, calc.intention >= 2 ? `心念 ${calc.intention}（聚焦）` : "未填心念数，默认取 1（聚焦度略降）"),
  ];
  reasons.push(reason("AI 解读", aiOk, aiOk ? "AI 解读已生成（仅作解释，不参与起卦）" : "AI 解读暂不可用，以下为规则卦辞参考"));
  return finalize(reasons);
}

function finalize(reasons: CredibilityReason[]): Credibility {
  const failed = reasons.filter((x) => !x.ok).length;
  let level: CredibilityLevel = "high";
  if (failed === 0) level = "high";
  else if (failed === 1) level = "medium";
  else level = "review";
  const meta = LEVEL_META[level];
  const summary =
    level === "high"
      ? "输入完整，推算可靠"
      : level === "medium"
        ? "大部分信息完整，个别项按近似推算，结果方向可参考"
        : "关键信息缺失，结果需自行复核";
  return { level, reasons, score: meta.score, summary };
}
