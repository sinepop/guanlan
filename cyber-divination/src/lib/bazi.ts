// 四柱排盘引擎（V3 准确版）
// 基于 lunar-javascript（6tail）精确天文历法：节气定月、立春定年、真太阳时、子时换日。
// 子时换日采用「晚子时」约定（23:00-24:00 归次日子时）。
// 输入为公历/农历 + 时辰或精确时间 + 出生地经纬度，输出结构化 JSON 供前端渲染。

import { Solar, Lunar } from "lunar-javascript";
import type { BaziInput, BaziResult } from "./types";
import {
  trueSolarOffsetMinutes,
  dayOfYear,
  applyTrueSolar,
  solarText,
  SHICHEN_HOURS,
} from "./solarTime";

export const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
export type ElementName = "木" | "火" | "土" | "金" | "水";
export const GAN_ELEMENT: ElementName[] = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
export const GAN_YINYANG = ["阳", "阴", "阳", "阴", "阳", "阴", "阳", "阴", "阳", "阴"];
export const ZHI_ELEMENT: ElementName[] = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];

// 地支藏干（本气、中气、余气）
const CANGAN: Record<number, number[]> = {
  0: [9], // 子:癸
  1: [5, 9, 7], // 丑:己癸辛
  2: [0, 2, 4], // 寅:甲丙戊
  3: [1], // 卯:乙
  4: [4, 1, 9], // 辰:戊乙癸
  5: [2, 6, 4], // 巳:丙庚戊
  6: [3, 5], // 午:丁己
  7: [5, 3, 1], // 未:己丁乙
  8: [6, 8, 4], // 申:庚壬戊
  9: [7], // 酉:辛
  10: [4, 7, 3], // 戌:戊辛丁
  11: [8, 0], // 亥:壬甲
};

// 十神（以日主为基准）
function shishen(dayStem: number, otherStem: number): string {
  const dEle = GAN_ELEMENT[dayStem];
  const oEle = GAN_ELEMENT[otherStem];
  const sameYin = GAN_YINYANG[dayStem] === GAN_YINYANG[otherStem];
  const cycle = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (dEle === oEle) return sameYin ? "比肩" : "劫财"; // 同我
  if (cycle[dEle] === oEle) return sameYin ? "食神" : "伤官"; // 我生
  if (cycle[oEle] === dEle) return sameYin ? "偏印" : "正印"; // 生我
  if (ke[dEle] === oEle) return sameYin ? "偏财" : "正财"; // 我克
  if (ke[oEle] === dEle) return sameYin ? "七杀" : "正官"; // 克我
  return "比肩";
}

// 神煞（简化规则，按年支/日支/日干）
function computeShenSha(pillars: number[][]): string[] {
  const result = new Set<string>();
  const yearBranch = pillars[0][1];
  const dayBranch = pillars[2][1];
  const dayStem = pillars[2][0];

  // 桃花（咸池）：按年支/日支各自所在三合局定，分别判定后取并集
  const tao: Record<string, number> = { 申: 9, 子: 9, 辰: 9, 寅: 3, 午: 3, 戌: 3, 巳: 6, 酉: 6, 丑: 6, 亥: 0, 卯: 0, 未: 0 };
  const taoBranches = [tao[ZHI[yearBranch]], tao[ZHI[dayBranch]]];
  if (taoBranches.some((b) => b !== undefined && pillars.some((p) => p[1] === b))) result.add("桃花");
  // 驿马：按年支/日支分别判定
  const ma: Record<string, number> = { 申: 2, 子: 2, 辰: 2, 寅: 8, 午: 8, 戌: 8, 巳: 11, 酉: 11, 丑: 11, 亥: 5, 卯: 5, 未: 5 };
  const maBranches = [ma[ZHI[yearBranch]], ma[ZHI[dayBranch]]];
  if (maBranches.some((b) => b !== undefined && pillars.some((p) => p[1] === b))) result.add("驿马");
  // 华盖：按年支/日支分别判定
  const gai: Record<string, number> = { 申: 4, 子: 4, 辰: 4, 寅: 10, 午: 10, 戌: 10, 巳: 1, 酉: 1, 丑: 1, 亥: 7, 卯: 7, 未: 7 };
  const gaiBranches = [gai[ZHI[yearBranch]], gai[ZHI[dayBranch]]];
  if (gaiBranches.some((b) => b !== undefined && pillars.some((p) => p[1] === b))) result.add("华盖");
  // 天乙贵人（按日干）
  const gui: Record<string, number[]> = {
    甲: [1, 7], 戊: [1, 7], 庚: [1, 7],
    乙: [0, 8], 己: [0, 8],
    丙: [11, 9], 丁: [11, 9],
    壬: [3, 5], 癸: [3, 5],
    辛: [2, 6],
  };
  const guiZhis = gui[GAN[dayStem]] ?? [];
  if (guiZhis.some((z) => pillars.some((p) => p[1] === z))) result.add("天乙贵人");
  // 羊刃（按日干）
  const yangren: Record<string, number> = {
    甲: 3, 乙: 2, 丙: 6, 丁: 5, 戊: 6, 己: 5, 庚: 9, 辛: 8, 壬: 0, 癸: 11,
  };
  const yr = yangren[GAN[dayStem]];
  if (yr !== undefined && pillars.some((p) => p[1] === yr)) result.add("羊刃");
  // 空亡（日柱旬空）：旬首支 = (日支 - 日干) mod 12，空亡为旬首后两位
  const xunHead = ((dayBranch - dayStem) % 12 + 12) % 12;
  const kw1 = (xunHead + 10) % 12;
  const kw2 = (xunHead + 11) % 12;
  if (pillars.some((p) => p[1] === kw1 || p[1] === kw2)) result.add("旬空");

  return Array.from(result);
}

/** 解析出生时间为北京时间（小时/分钟），并应用真太阳时校正。
 *  solarYear/Month/Day 为公历日期（农历输入时已转换），用于均时差与显示。 */
function resolveBirthTime(input: BaziInput, solarYear: number, solarMonth: number, solarDay: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayShift: number;
  solarNote: string;
  corrected: string;
} {
  const year = solarYear;
  const month = solarMonth;
  const day = solarDay;
  let hour: number;
  let minute: number;

  if (input.timeMode === "exact" && input.hour !== undefined) {
    hour = input.hour;
    minute = input.minute ?? 0;
  } else if (input.timeMode === "unknown") {
    // 未知时辰：默认午时（12:00）作为代表，置信度降低
    hour = 12;
    minute = 0;
  } else {
    // 时辰：取中点代表时间
    hour = SHICHEN_HOURS[input.shichenIndex] ?? 12;
    minute = 0;
  }

  const doy = dayOfYear(solarYear, solarMonth, solarDay);
  const offset = trueSolarOffsetMinutes(doy, input.lon);
  const { totalMinutes, dayShift } = applyTrueSolar(hour, minute, offset);
  const ch = Math.floor(totalMinutes / 60);
  const cm = Math.round(totalMinutes % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  // 用 Date 处理跨月/跨年回退（如 1 月 1 日校正后回到 12 月 31 日）
  const d = new Date(Date.UTC(year, month - 1, day + dayShift, ch, cm, 0));
  const corrected = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

  const note = solarText(year, month, day, hour, minute, input.lon, input.location).note;
  return { year, month, day, hour: ch, minute: cm, dayShift, solarNote: note, corrected };
}

/** 农历日期校验：库解析 + 往返校验（防不存在日期静默进位） */
export function isValidLunarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  try {
    const lunar = Lunar.fromYmdHms(year, month, day, 12, 0, 0);
    const back = lunar.getSolar().getLunar();
    return back.getYear() === year && back.getMonth() === month && back.getDay() === day;
  } catch {
    return false;
  }
}

function isValidDate(input: BaziInput): boolean {
  const { year, month, day, calendar } = input;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (calendar === "lunar") return isValidLunarDate(year, month, day);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** 主入口：计算四柱 */
export function computeBazi(input: BaziInput): BaziResult {
  const { year, month, day } = input;
  if (!isValidDate(input)) {
    throw new Error("无效的出生日期");
  }

  // 解析出生时间（公历 / 农历）→ 北京时间
  let solar: Solar;
  if (input.calendar === "lunar") {
    const lunar = Lunar.fromYmdHms(input.year, input.month, input.day, 12, 0, 0);
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(year, month, day, 12, 0, 0);
  }

  // 真太阳时校正（用公历日期算均时差）
  const solarYear = solar.getYear();
  const solarMonth = solar.getMonth();
  const solarDay = solar.getDay();
  const t = resolveBirthTime(input, solarYear, solarMonth, solarDay);

  // 用校正后的真太阳时构建 Solar（晚子时约定）
  // 用 Date 处理跨月/跨年回退（如 1 月 1 日子时校正后回到 12 月 31 日）
  const corrected = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay + t.dayShift, t.hour, t.minute, 0));
  const correctedSolar = Solar.fromYmdHms(
    corrected.getUTCFullYear(),
    corrected.getUTCMonth() + 1,
    corrected.getUTCDate(),
    corrected.getUTCHours(),
    corrected.getUTCMinutes(),
    0
  );

  const ec = correctedSolar.getLunar().getEightChar();
  ec.setSect(2); // 晚子时

  const dayStem = GAN.indexOf(ec.getDayGan());
  const dayBranch = ZHI.indexOf(ec.getDayZhi());
  const yearStem = GAN.indexOf(ec.getYearGan());
  const yearBranch = ZHI.indexOf(ec.getYearZhi());
  const monthStem = GAN.indexOf(ec.getMonthGan());
  const monthBranch = ZHI.indexOf(ec.getMonthZhi());
  const timeStem = GAN.indexOf(ec.getTimeGan());
  const timeBranch = ZHI.indexOf(ec.getTimeZhi());

  const pillars: BaziResult["pillars"] = [
    buildPillar("年柱", yearStem, yearBranch, dayStem, ec.getYearNaYin(), ec.getYearXunKong(), ec.getYearShiShenGan()),
    buildPillar("月柱", monthStem, monthBranch, dayStem, ec.getMonthNaYin(), ec.getMonthXunKong(), ec.getMonthShiShenGan()),
    buildPillar("日柱", dayStem, dayBranch, dayStem, ec.getDayNaYin(), ec.getDayXunKong(), ec.getDayShiShenGan()),
    buildPillar("时柱", timeStem, timeBranch, dayStem, ec.getTimeNaYin(), ec.getTimeXunKong(), ec.getTimeShiShenGan()),
  ];

  // 五行能量（用于雷达图）
  const five = computeFive(pillars);

  // 神煞
  const shenSha = computeShenSha(pillars.map((p) => [p.ganIndex, p.zhiIndex]));

  // 身强身弱 / 用神 / 喜神
  const strength = judgeStrength(five, dayStem);
  const { yongShen, xiShen } = judgeYongShen(five, dayStem, strength);

  // 大运（性别决定顺逆，sect 与八字一致用晚子时）
  const yun = ec.getYun(input.gender === "male" ? 1 : 0, 2);
  const daYunList = buildDaYun(yun);
  // 未起运（如新生儿，各段大运区间都在未来）时不得伪造「当前大运」，返回哨兵由 UI 判空显示
  const noDaYun: BaziResult["currentDaYun"] = {
    gan: "", zhi: "", ganIndex: -1, zhiIndex: -1,
    startAge: 0, endAge: 0, startYear: 0, endYear: 0, isCurrent: false,
  };
  const currentDaYun = daYunList.find((d) => d.isCurrent) ?? noDaYun;

  // 流年 2026-2030
  const liuNian = buildLiuNian(dayStem);

  // 生肖
  const animal = ANIMALS[yearBranch];

  // 置信度
  const confidence = input.timeMode === "unknown" ? 0.6 : 0.9;

  const cards = buildCards(pillars, dayStem, strength);

  return {
    input,
    solarDate: `${solarYear}-${String(solarMonth).padStart(2, "0")}-${String(solarDay).padStart(2, "0")}`,
    solarTime: t.corrected,
    calendarChange: t.solarNote,
    pillars,
    dayMaster: GAN[dayStem],
    dayMasterElement: GAN_ELEMENT[dayStem],
    dayMasterYinYang: GAN_YINYANG[dayStem],
    animal,
    strength,
    yongShen,
    xiShen,
    qiYunAge: daYunList[0] ? daYunList[0].startAge : yun.getStartYear() + 1,
    qiYunForward: yun.isForward(),
    currentDaYun,
    daYunList,
    liuNian,
    five,
    shenSha,
    taiYuan: ec.getTaiYuan(),
    mingGong: ec.getMingGong(),
    shenGong: ec.getShenGong(),
    confidence,
    cards,
    advice: buildAdvice(pillars, dayStem, strength, liuNian),
  };
}

function buildPillar(
  label: string,
  stem: number,
  branch: number,
  dayStem: number,
  nayan: string,
  kongwang: string,
  shishenGan: string
): BaziResult["pillars"][number] {
  const hidden = CANGAN[branch].map((g) => ({
    gan: GAN[g],
    shishen: shishen(dayStem, g),
  }));
  return {
    label,
    ganIndex: stem,
    zhiIndex: branch,
    gan: GAN[stem],
    zhi: ZHI[branch],
    ganYinYang: GAN_YINYANG[stem],
    ganElement: GAN_ELEMENT[stem],
    zhiElement: ZHI_ELEMENT[branch],
    shishen: shishenGan || shishen(dayStem, stem),
    hidden,
    nayan: nayan || "",
    kongwang: kongwang || "",
  };
}

// 五行能量：天干 1.0 + 地支本气 1.0 / 中气 0.5 / 余气 0.3
function computeFive(pillars: BaziResult["pillars"]): BaziResult["five"] {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    counts[GAN_ELEMENT[p.ganIndex]] += 1;
    const hidden = CANGAN[p.zhiIndex];
    const weights = [1.0, 0.5, 0.3];
    hidden.forEach((g, i) => {
      counts[GAN_ELEMENT[g]] += weights[i] ?? 0;
    });
  }
  const max = Math.max(...Object.values(counts), 1);
  // 归一化到 0-100
  return {
    wood: Math.round((counts["木"] / max) * 100),
    fire: Math.round((counts["火"] / max) * 100),
    earth: Math.round((counts["土"] / max) * 100),
    metal: Math.round((counts["金"] / max) * 100),
    water: Math.round((counts["水"] / max) * 100),
  };
}

// 五行中文名 → FiveElement 英文字段
export const FIVE_KEY: Record<ElementName, keyof BaziResult["five"]> = {
  木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water",
};

function judgeStrength(five: BaziResult["five"], dayStem: number): string {
  const me = GAN_ELEMENT[dayStem];
  // 印比帮身：同我 + 生我（印），非食伤（我生/泄身）
  const yin = { 木: "水", 火: "木", 土: "火", 金: "土", 水: "金" } as Record<ElementName, ElementName>; // 生我=印
  const sheng = yin[me];
  const support = five[FIVE_KEY[me]] + five[FIVE_KEY[sheng]];
  if (support > 58) return "身强";
  if (support < 42) return "身弱";
  return "中和";
}

function judgeYongShen(
  five: BaziResult["five"],
  dayStem: number,
  strength: string
): { yongShen: string; xiShen: string } {
  const me = GAN_ELEMENT[dayStem];
  const sheng = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }[me] as ElementName; // 食伤
  const ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }[me] as ElementName; // 我克=财
  const keWo = { 木: "金", 金: "火", 火: "水", 水: "土", 土: "木" }[me] as ElementName; // 克我=官杀
  const shengWo = { 木: "水", 水: "金", 金: "土", 土: "火", 火: "木" }[me] as ElementName; // 生我=印

  if (strength === "身强") {
    // 用克泄耗：官杀、食伤、财（取最失衡者）
    const weakest = minKey({ 官杀: five[FIVE_KEY[keWo]], 食伤: five[FIVE_KEY[sheng]], 财: five[FIVE_KEY[ke]] });
    return { yongShen: `用${weakest}（${weakest === "官杀" ? keWo : weakest === "食伤" ? sheng : ke}）`, xiShen: `喜${keWo}${sheng}${ke}` };
  }
  if (strength === "身弱") {
    return { yongShen: `用印比（${shengWo}${me}）`, xiShen: `喜${shengWo}${me}` };
  }
  // 中和：扶抑平衡
  const weakest = minKey({ 印: five[FIVE_KEY[shengWo]], 比: five[FIVE_KEY[me]], 财: five[FIVE_KEY[ke]], 食伤: five[FIVE_KEY[sheng]], 官杀: five[FIVE_KEY[keWo]] });
  return { yongShen: `用${weakest}调候`, xiShen: `喜${weakest}` };
}

function minKey(obj: Record<string, number>): string {
  return Object.entries(obj).sort((a, b) => a[1] - b[1])[0][0];
}

interface DaYunEntry {
  getGanZhi(): string;
  getStartYear(): number;
  getEndYear(): number;
  getStartAge(): number;
  getEndAge(): number;
}

function buildDaYun(yun: { getDaYun(): DaYunEntry[] }): BaziResult["daYunList"] {
  const list = yun.getDaYun();
  const daYunList: BaziResult["daYunList"] = [];
  const currentYear = new Date().getFullYear();
  list.slice(1).forEach((d) => {
    const gz = d.getGanZhi() as string;
    if (!gz) return;
    const gan = GAN.indexOf(gz[0]);
    const zhi = ZHI.indexOf(gz[1]);
    const startYear = d.getStartYear();
    const endYear = d.getEndYear();
    daYunList.push({
      gan: GAN[gan],
      zhi: ZHI[zhi],
      ganIndex: gan,
      zhiIndex: zhi,
      startAge: d.getStartAge(),
      endAge: d.getEndAge(),
      startYear,
      endYear,
      isCurrent: startYear <= currentYear && currentYear <= endYear,
    });
  });
  return daYunList;
}

function buildLiuNian(dayStem: number): BaziResult["liuNian"] {
  const years = [2026, 2027, 2028, 2029, 2030];
  return years.map((y) => {
    const stem = ((y - 4) % 10 + 10) % 10;
    const branch = ((y - 4) % 12 + 12) % 12;
    const ifText = shishen(dayStem, stem);
    return {
      year: y,
      gan: GAN[stem],
      zhi: ZHI[branch],
      if: ifText,
      summary: liuSummary(ifText),
    };
  });
}

function liuSummary(shi: string): string {
  const map: Record<string, string> = {
    正官: "官星透出，事业运佳，利晋升与名声，宜守正行事。",
    七杀: "杀星当值，压力与机遇并存，宜迎难而上，稳中求进。",
    正印: "印星得力，利学习考证、贵人相助，思路清晰。",
    偏印: "偏印主思考，宜进修深造，注意躲是非与口舌。",
    食神: "食神旺地，才华舒展，利创作表达与享受生活。",
    伤官: "伤官泄秀，创意涌动，但需防口舌冲动、言多必失。",
    正财: "正财透出，收入稳健，宜守成经营，忌投机冒进。",
    偏财: "偏财入命，机遇财源，但需防大起大落、谨慎投资。",
    比肩: "比肩帮身，合作运佳，利团队协作，防竞争分财。",
    劫财: "劫财夺财，防小人破财，宜守不宜攻，慎借贷。",
  };
  return map[shi] ?? "流年运势稳中有变，宜顺势而为。";
}

function buildCards(
  pillars: BaziResult["pillars"],
  dayStem: number,
  strength: string
): BaziResult["cards"] {
  const element = GAN_ELEMENT[dayStem];
  const yin = GAN_YINYANG[dayStem] === "阴";
  const basic = yin ? "温和细腻" : "刚毅果决";
  const elementDesc: Record<string, string> = {
    木: "仁德向上，有主见，执行力强",
    火: "热情外放，行动迅捷，感染力强",
    土: "稳重包容，踏实可靠，有担当",
    金: "果决刚健，重义气，目标感强",
    水: "聪慧灵动，善变通，思虑周全",
  };
  const me = GAN_ELEMENT[dayStem];
  const shiShen = pillars[2].shishen;
  const personality = [
    `${basic}：${GAN[dayStem]}${element}日主，${elementDesc[element]}。`,
    `日主${shiShen}当令，性格${strength === "身强" ? "行动果敢，但需防固执" : "思虑周全，但需增强自信"}。`,
    `五行中${element}气较旺，做事有${strength === "身强" ? "主见与魄力" : "韧劲与耐心"}。`,
  ];
  const career = [
    `适合方向：教育、文化创意、技术研发、咨询顾问——${element}日主配印，利于知识输出。`,
    `当前身${strength === "身强" ? "强" : "弱"}，事业宜${strength === "身强" ? "主攻求进" : "稳中积累"}。`,
    `2026-2028：印星得力，利学习深造、考证、职位晋升。`,
  ];
  const wealth = [
    `财星为${me === "土" ? "水" : "金"}，${me === "土" ? "土克水为财，命局水弱，宜稳健求财" : "财星配置，宜量入为出，稳中求进"}。`,
    `食神生财：凭技能、创意、口才获利，适合知识付费与内容创作。`,
    `2027 丁未年：财星透出，有意外收获，但需防比劫夺财。`,
  ];
  const love = [
    `配偶星：${pillars[0].shishen}在年柱，配偶可能年长或异地，性格稳重有责任。`,
    `夫妻宫：${pillars[2].zhi}${pillars[2].zhiElement === "土" ? "为湿土，感情细腻但易多思" : "主性情，需加强沟通避免猜疑"}。`,
    `2026 丙午年桃花旺，单身者有机会，已婚者需防外界干扰。`,
  ];
  const health = [
    `脾胃：${element}旺易滞，注意饮食规律，避免暴饮暴食。`,
    `肝胆：木克土，春季易疲劳，宜早睡养肝，适量运动。`,
    `情绪：身${strength === "身强" ? "强" : "弱"}，宜${strength === "身强" ? "多松弛、少逞强" : "多外出、少内耗"}，规律作息。`,
  ];
  return { personality, career, wealth, love, health };
}

function buildAdvice(
  pillars: BaziResult["pillars"],
  dayStem: number,
  strength: string,
  liuNian: BaziResult["liuNian"]
): string[] {
  const y2026 = liuNian[0];
  return [
    `${y2026.year} 年利学习，建议考取专业证书或深造，把握${y2026.if}旺年。`,
    `发展知识付费或内容创作副业，食神生财格局利于技能变现。`,
    `2027 年谨慎投资，避免大额借贷，防比劫夺财。`,
    `春季注意肝胆养护，早睡养肝，避免熬夜。`,
    `身${strength === "身强" ? "强" : "弱"}，宜多${strength === "身强" ? "布水、多喝茶饮以平衡" : "补金水之助"}。`,
  ];
}