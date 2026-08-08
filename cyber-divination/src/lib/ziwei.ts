// 紫微斗数排盘（iztro 引擎）+ 紧凑星盘序列化
// 与八字共用同一套「真太阳时校正」的出生时刻，保证两盘时辰一致。
// iztro 仅在前端运行（静态导出），排盘结果作为权威数据传给后端解读，模型不重复排盘。
//
// iztro API：astro.bySolar(solarDate, timeIndex, gender, fixLeap)
//   solarDate: 'YYYY-M-D'（校正后的公历日期）
//   timeIndex: 0-11（时辰序号，子=0…亥=11）
//   gender:    '男' | '女'
//   fixLeap:   false（公历日期无需置闰）

import { astro } from "iztro";
import { Solar, Lunar } from "lunar-javascript";
import type { BaziInput } from "./types";
import { dayOfYear, trueSolarOffsetMinutes, applyTrueSolar } from "./solarTime";

/** 时辰序号 → 代表时间（与八字引擎一致：子时=00:00 … 亥时=22:00） */
const SHICHEN_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

/** 从校正后的北京时间（小时）映射到时辰序号：子=0（23-1点）…
 * 公式：floor((ch+1)/2) % 12，ch=23→0，ch=0→0，ch=1→1 … ch=22→11 */
function hourToTimeIndex(ch: number): number {
  return Math.floor((ch + 1) / 2) % 12;
}

/** 紫微宫位（序列化用，精简字段） */
export interface ZiweiPalace {
  name: string; // 宫名（命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/仆役/官禄/田宅/福德/父母）
  isBody: boolean; // 是否身宫
  gan: string; // 宫干
  zhi: string; // 宫支
  main: string; // 主星及庙旺/四化，如 "天梁(陷)"、"太阳(得,禄)"
  minor: string; // 辅星（仅星名）
  adjective: string; // 杂曜（仅星名）
  decadal: string; // 大限区间，如 "35-44岁"
}

/** 紫微星盘（序列化用） */
export interface ZiweiChart {
  fiveElementsClass: string; // 五行局
  soul: string; // 命主
  body: string; // 身主
  currentAge: number; // 虚岁（2026 基准）
  currentDaXian: string; // 当前所处大限，如 "35-44岁 田宅宫"
  palaces: ZiweiPalace[];
}

/** 把单星格式化为 "名(庙旺,四化)"，无庙旺标记时省略括号 */
function fmtStar(s: { name: string; brightness?: string; mutagen?: string }): string {
  const parts: string[] = [];
  if (s.brightness) parts.push(s.brightness);
  if (s.mutagen) parts.push(s.mutagen);
  return parts.length ? `${s.name}(${parts.join(",")})` : s.name;
}

/** iztro 星曜（精简映射） */
interface IztroStar {
  name: string;
  brightness?: string;
  mutagen?: string;
}
/** iztro 宫位（只取序列化所需字段） */
interface IztroPalace {
  name: string;
  isBodyPalace?: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: IztroStar[];
  minorStars: IztroStar[];
  adjectiveStars: IztroStar[];
  decadal?: { range: [number, number] };
}
/** iztro 星盘返回（精简） */
interface IztroChart {
  fiveElementsClass: string;
  soul: string;
  body: string;
  palaces: IztroPalace[];
}

/** 计算当前虚岁（用于定位大限），基准年取当前年份，避免逐年过期 */
function nominalAge(birthYear: number, birthMonth: number, birthDay: number, refYear = new Date().getFullYear()): number {
  // 虚岁 = 当前年 - 出生年 + 1（约数，冬腊月出生以农历年记，此处取公历近似）
  return refYear - birthYear + 1;
}

/** 主入口：由出生信息排紫微星盘并序列化 */
export function computeZiwei(input: BaziInput): ZiweiChart {
  // 出生公历日（用于真太阳时 + 紫微排盘）。农历输入先转公历，与八字引擎一致。
  let solar: Solar;
  if (input.calendar === "lunar") {
    const lunar = Lunar.fromYmdHms(input.year, input.month, input.day, 12, 0, 0);
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(input.year, input.month, input.day, 12, 0, 0);
  }
  const solarYear = solar.getYear();
  const solarMonth = solar.getMonth();
  const solarDay = solar.getDay();

  // 基础出生时刻（与八字引擎同规则）
  let hour: number;
  let minute: number;
  if (input.timeMode === "exact" && input.hour !== undefined) {
    hour = input.hour;
    minute = input.minute ?? 0;
  } else if (input.timeMode === "unknown") {
    hour = 12;
    minute = 0;
  } else {
    hour = SHICHEN_HOURS[input.shichenIndex] ?? 12;
    minute = 0;
  }

  // 真太阳时校正（前置：公历输入的日期即可，无需先转农历）
  const doy = dayOfYear(solarYear, solarMonth, solarDay);
  const offset = trueSolarOffsetMinutes(doy, input.lon);
  const { totalMinutes, dayShift } = applyTrueSolar(hour, minute, offset);
  const ch = Math.floor(totalMinutes / 60);
  const cm = Math.round(totalMinutes % 60);
  const d = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay + dayShift, ch, cm, 0));
  const dateStr = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  const timeIndex = hourToTimeIndex(ch);

  // 紫微排盘（公历日期 + 时辰序号 + 性别）
  const a = astro.bySolar(dateStr, timeIndex, input.gender === "male" ? "男" : "女", false) as unknown as IztroChart;

  const palaces: ZiweiPalace[] = a.palaces.map((p) => ({
    name: p.name,
    isBody: !!p.isBodyPalace,
    gan: p.heavenlyStem,
    zhi: p.earthlyBranch,
    main: p.majorStars.map(fmtStar).join(" "),
    minor: p.minorStars.map((s) => s.name).join(" "),
    adjective: p.adjectiveStars.map((s) => s.name).join(" "),
    decadal: p.decadal ? `${p.decadal.range[0]}-${p.decadal.range[1]}岁` : "",
  }));

  const currentAge = nominalAge(solarYear, solarMonth, solarDay);
  // 当前大限：命中年龄所在的宫位
  const cur = palaces.find((p) => {
    const m = p.decadal.match(/(\d+)-(\d+)岁/);
    return m && currentAge >= Number(m[1]) && currentAge <= Number(m[2]);
  });
  const currentDaXian = cur ? `${cur.decadal} ${cur.name}宫` : "未起运";

  return {
    fiveElementsClass: a.fiveElementsClass,
    soul: a.soul,
    body: a.body,
    currentAge,
    currentDaXian,
    palaces,
  };
}

/** 序列化为提示词里的紧凑文本（供模型解读，不重复排盘） */
export function serializeZiwei(chart: ZiweiChart): string {
  const lines: string[] = [];
  lines.push(
    `星盘：${chart.fiveElementsClass}，命主=${chart.soul}，身主=${chart.body}，当前虚岁${chart.currentAge}岁，当前大限=${chart.currentDaXian}`
  );
  for (const p of chart.palaces) {
    const tag = p.isBody ? "（身宫）" : "";
    const bits = [p.main || "（空宫）", p.minor, p.adjective].filter(Boolean).join(" · ");
    lines.push(`- ${p.name}${tag}（${p.gan}${p.zhi}）${p.decadal}：${bits}`);
  }
  return lines.join("\n");
}