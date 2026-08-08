// 真太阳时校正
// 中国标准时间（北京时间）为 UTC+8，以 120°E 经线为基准。
// 真太阳时 = 平太阳时 + 均时差（Equation of Time）
//   平太阳时 = 北京时间 + (经度 - 120°) × 4 分钟/度
//   均时差 EoT ≈ 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)，B = 2π·(N−81)/365
// 返回校正后的分钟数偏移（相对北京时间），及说明文本。

/** 计算某日某地的真太阳时偏移（分钟），相对北京时间 */
export function trueSolarOffsetMinutes(
  dayOfYear: number,
  longitude: number
): number {
  // 经度修正：每度 4 分钟
  const lonOffset = (longitude - 120) * 4;
  // 均时差（业内常用近似，误差约 ±2 分钟）
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return lonOffset + eot;
}

/** 计算某年某月某日的日序（1-366） */
export function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const cur = Date.UTC(year, month - 1, day);
  return Math.round((cur - start) / 86400000) + 1;
}

/** 把北京时间（hour/minute）应用真太阳时偏移，返回校正后的时间（分钟数，0-1439，可跨日） */
export function applyTrueSolar(
  hour: number,
  minute: number,
  lonOffsetMinutes: number
): { totalMinutes: number; dayShift: number } {
  const total = hour * 60 + minute + lonOffsetMinutes;
  const dayShift = Math.floor(total / 1440);
  const wrapped = ((total % 1440) + 1440) % 1440;
  return { totalMinutes: wrapped, dayShift };
}

/** 生成校正说明文本 */
export function solarText(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  lon: number,
  location: string
): { corrected: string; note: string; offsetMinutes: number } {
  const doy = dayOfYear(year, month, day);
  const offset = trueSolarOffsetMinutes(doy, lon);
  const { totalMinutes, dayShift } = applyTrueSolar(hour, minute, offset);
  const ch = Math.floor(totalMinutes / 60);
  const cm = Math.round(totalMinutes % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  // 用 Date 处理跨月/跨年回退（如 1 月 1 日校正后回到 12 月 31 日）
  const d = new Date(Date.UTC(year, month - 1, day + dayShift, ch, cm, 0));
  const corrected = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

  const lonStr = Math.abs(Math.round(offset * 10) / 10);
  const dir = offset >= 0 ? "快" : "慢";
  const note = `${location}（经度 ${lon}°E）真太阳时比北京时间${dir} ${lonStr} 分钟，已按经度与均时差校正。`;
  return { corrected, note, offsetMinutes: offset };
}

/** 时辰序号 → 代表时间（时辰中点，避免子时换日边界歧义） */
export const SHICHEN_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 子时=00:00 ... 亥时=22:00
export const SHICHEN_NAMES = [
  "子时",
  "丑时",
  "寅时",
  "卯时",
  "辰时",
  "巳时",
  "午时",
  "未时",
  "申时",
  "酉时",
  "戌时",
  "亥时",
];
export const SHICHEN_RANGES = [
  "23:00-01:00",
  "01:00-03:00",
  "03:00-05:00",
  "05:00-07:00",
  "07:00-09:00",
  "09:00-11:00",
  "11:00-13:00",
  "13:00-15:00",
  "15:00-17:00",
  "17:00-19:00",
  "19:00-21:00",
  "21:00-23:00",
];