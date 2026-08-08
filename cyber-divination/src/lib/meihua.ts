// 问一事 / 梅花易数起卦引擎
// 确定性规则：同一时刻 + 同一心念数 → 同一卦象。绝不用 Math.random。
// 公式（梅花易数·时间起卦法）：
//   上卦 = (年支序 + 农历月 + 农历日 + 心念) % 8
//   下卦 = (年支序 + 农历月 + 农历日 + 时辰支序 + 心念) % 8
//   动爻 = (年支序 + 农历月 + 农历日 + 时辰支序 + 心念) % 6（0 记第 6 爻）
// 年支序：子1 丑2 … 亥12；八卦序：1乾 2兑 3离 4震 5巽 6坎 7艮 0坤
import { Lunar } from "lunar-javascript";
import { ZHI } from "./bazi";
import type { MeihuaRequest, MeihuaResult, MeihuaCalculation, Trigram } from "./types";

/** 先天八卦：index → 卦（index 即公式 0-7 结果） */
export const TRIGRAMS: Trigram[] = [
  { index: 0, name: "坤", symbol: "☷", element: "土", nature: "地" },
  { index: 1, name: "乾", symbol: "☰", element: "金", nature: "天" },
  { index: 2, name: "兑", symbol: "☱", element: "金", nature: "泽" },
  { index: 3, name: "离", symbol: "☲", element: "火", nature: "火" },
  { index: 4, name: "震", symbol: "☳", element: "木", nature: "雷" },
  { index: 5, name: "巽", symbol: "☴", element: "木", nature: "风" },
  { index: 6, name: "坎", symbol: "☵", element: "水", nature: "水" },
  { index: 7, name: "艮", symbol: "☶", element: "土", nature: "山" },
];

// 三爻位值（自下而上，下爻为最低位，阳爻=1，value=下+2中+4上）：
// 乾☰阳阳阳=7 兑☱阳阳阴=3 离☲阳阴阳=5 震☳阳阴阴=1 巽☴阴阳阳=6 坎☵阴阳阴=2 艮☶阴阴阳=4 坤☷阴阴阴=0
const TRIGRAM_BITS: Record<number, number> = { 0: 0, 1: 7, 2: 3, 3: 5, 4: 1, 5: 6, 6: 2, 7: 4 };
// 二进制值 → 卦 index（互为逆变换）
const BITS_TO_INDEX: Record<number, number> = { 0: 0, 1: 4, 2: 6, 3: 2, 4: 7, 5: 3, 6: 5, 7: 1 };

/** 64 卦表：key = `${下卦index}${上卦index}`，duan 为真实卦辞的一句白话（AI 不可用时的兜底，非 AI 生成） */
export const HEXAGRAM_GUA: Record<string, { name: string; duan: string }> = {
  "11": { name: "乾为天", duan: "元亨利贞：大通之象，宜把握主动、持续进取，忌刚愎冒进。" },
  "00": { name: "坤为地", duan: "元亨，利牝马之贞：宜顺势厚载、踏实积累，先迷后得主。" },
  "46": { name: "水雷屯", duan: "元亨利贞，勿用有攸往：万事开头难，宜稳扎稳打、建立根基。" },
  "67": { name: "山水蒙", duan: "匪我求童蒙：知识未开，宜虚心求教、待时而行，忌急于求成。" },
  "16": { name: "水天需", duan: "需于沙，利用恒：时机未到，宜耐心等待、蓄力待发，不躁进。" },
  "61": { name: "天水讼", duan: "讼：有孚窒惕：争议将起，宜先沟通调解，忌争强好胜上法庭。" },
  "60": { name: "地水师", duan: "师出以律，否臧凶：谋事须有纪律与规划，号令不明则凶。" },
  "06": { name: "水地比", duan: "比：吉。原筮：结盟互助之象，宜择善而交、彼此信赖。" },
  "15": { name: "风天小畜", duan: "密云不雨，自我西郊：积蓄未足，宜收敛锋芒、小步积累。" },
  "21": { name: "天泽履", duan: "履虎尾，不咥人：如履薄冰，宜谨慎行事、按礼而行则亨。" },
  "10": { name: "地天泰", duan: "小往大来，吉亨：天地交泰，上下同心，宜积极成事。" },
  "01": { name: "天地否", duan: "否之匪人，不利君子贞：闭塞不通，宜守正藏锋，待否极泰来。" },
  "31": { name: "天火同人", duan: "同人于野，亨：同心协力之象，宜公开合作、求同存异。" },
  "13": { name: "火天大有", duan: "元亨：大获所有，宜谦以自持、普惠分享，忌恃富凌人。" },
  "70": { name: "地山谦", duan: "谦：亨，君子有终：谦逊有终则亨，功成不居、以柔克刚。" },
  "04": { name: "雷地豫", duan: "利建侯行师：顺动而乐，宜借势而行，但乐不可极、备豫不虞。" },
  "42": { name: "泽雷随", duan: "随时之义大矣哉：宜随势而动、随机应变，忌固执己见。" },
  "57": { name: "山风蛊", duan: "干父之蛊：积弊待整，宜革除旧习、整饬修复，振作有为。" },
  "20": { name: "地泽临", duan: "元亨利贞：阳气渐长，宜亲近督导、把握良机，至八月有凶则预戒。" },
  "05": { name: "风地观", duan: "观民设教：宜静观其变、观照大局，先看清形势再行动。" },
  "43": { name: "火雷噬嗑", duan: "噬嗑：亨，利用狱：障碍横梗，宜果断决断、明察处置。" },
  "37": { name: "山火贲", duan: "贲：亨，小利有攸往：文饰之美，宜注重形象与细节，但勿舍本逐末。" },
  "07": { name: "山地剥", duan: "不利有攸往：剥落之象，宜收敛保存实力，静待时势翻转。" },
  "40": { name: "地雷复", duan: "复：亨，出入无疾：一阳来复，宜改过自新、重新出发，生机初萌。" },
  "41": { name: "天雷无妄", duan: "无妄：元亨利贞：不妄为则吉，宜循正理而行，忌侥幸取巧。" },
  "17": { name: "山天大畜", duan: "利贞：厚积薄发之象，宜多备实力、蓄养德才，大器晚成。" },
  "47": { name: "山雷颐", duan: "贞吉，观颐自求口实：养正之道，宜节制饮食起居、慎言养德。" },
  "52": { name: "泽风大过", duan: "栋桡：压力过重，宜因时制宜、果断取舍，非常之时行非常之事。" },
  "66": { name: "坎为水", duan: "习坎：有孚维心亨：重险重重，宜诚信守正、小心涉险，行有尚。" },
  "33": { name: "离为火", duan: "利贞，亨：光明附丽之象，宜依附正道、明察通透，忌心浮气躁。" },
  "72": { name: "泽山咸", duan: "咸：亨，利贞：两情相感、以虚受人，宜真诚沟通、感应彼此。" },
  "54": { name: "雷风恒", duan: "恒：亨，无咎，利贞：恒久之道，宜坚守目标、持之以恒，忌朝令夕改。" },
  "71": { name: "天山遁", duan: "遁：亨，小利贞：退避之时，宜及时抽身、以退为进，保全大局。" },
  "14": { name: "雷天大壮", duan: "大壮：利贞：阳盛力强，宜光明正大、以壮行正，忌恃强妄动。" },
  "03": { name: "火地晋", duan: "晋：康侯用锡马蕃庶：旭日东升，宜进取晋升、明德亲民，顺理而进。" },
  "30": { name: "地火明夷", duan: "明入地中：光明受伤，宜韬光养晦、内明外柔，以待天明。" },
  "35": { name: "风火家人", duan: "家人：利女贞：先稳内部节奏再对外，宜家和万事兴、各安其位。" },
  "23": { name: "火泽睽", duan: "睽：小事吉：乖离之象，大事难合，宜从小处弥合分歧，求同存异。" },
  "76": { name: "水山蹇", duan: "蹇：利西南，不利东北：艰难阻滞，宜见险而止、反身修德，借力成行。" },
  "64": { name: "雷水解", duan: "解：利西南：难困得解，宜及时释负、宽以待人，险难自此消散。" },
  "27": { name: "山泽损", duan: "损而有孚，元吉：减损之道，宜有所舍才能有所得，损己利人为吉。" },
  "45": { name: "风雷益", duan: "益：利有攸往：损上益下，宜见善则迁、当行则行，利涉大川。" },
  "12": { name: "泽天夬", duan: "夬：扬于王庭：决而能和，宜当机立断、公正宣明，忌优柔反复。" },
  "51": { name: "天风姤", duan: "女壮，勿用取女：不期而遇、阴长阳消，宜防微杜渐，勿与之长。" },
  "02": { name: "泽地萃", duan: "萃：亨，王假有庙：聚众合欢之象，宜团结汇聚、以诚相待。" },
  "50": { name: "地风升", duan: "升：元亨：地中生木，宜循序渐进、积小成高大，与时偕行。" },
  "62": { name: "泽水困", duan: "困：亨，贞大人吉：困而不失其所亨，宜守正安命，困极而通。" },
  "56": { name: "水风井", duan: "井：改邑不改井：井养不穷，宜修己利人、守常不变，惠及大众。" },
  "32": { name: "泽火革", duan: "革：已日乃孚：变则通，宜审时度势、择机而变，改革须取信于人。" },
  "53": { name: "火风鼎", duan: "鼎：元吉，亨：鼎新之象，宜革故鼎新、稳重持重，调和鼎鼐。" },
  "44": { name: "震为雷", duan: "震来虩虩：惊雷震荡，宜临危不乱、戒惧修身，笑言哑哑后安。" },
  "77": { name: "艮为山", duan: "艮其背：止而静之，宜当止则止、安分守己，时止则止，时行则行。" },
  "75": { name: "风山渐", duan: "渐：女归吉，利贞：循序渐进之象，宜按部就班、积跬步以至千里。" },
  "24": { name: "雷泽归妹", duan: "归妹：征凶，无攸利：位不当则乱，宜安于本分、量力而行，忌攀附强求。" },
  "34": { name: "雷火丰", duan: "丰：亨，王假之：盛大明动之象，宜把握丰盛、日中则昃，居安思危。" },
  "73": { name: "火山旅", duan: "旅：小亨，旅贞吉：行旅在外，宜谦柔顺处、守正自持，客居得安。" },
  "55": { name: "巽为风", duan: "巽：小亨，利有攸往：申命行事之象，宜柔顺谦逊、渐入人心。" },
  "22": { name: "兑为泽", duan: "兑：亨，利贞：和悦相说之象，宜以诚感人、朋友讲习，乐而不淫。" },
  "65": { name: "风水涣", duan: "涣：亨，王假有庙：涣散之象，宜聚合人心、疏通积郁，散而后聚。" },
  "26": { name: "水泽节", duan: "节：亨，苦节不可贞：节制之道，宜有度而行、量入为出，苦节则凶。" },
  "25": { name: "风泽中孚", duan: "中孚：豚鱼吉：诚信感通之象，宜以诚相待、信及豚鱼，笃实守中。" },
  "74": { name: "雷山小过", duan: "小过：亨，利贞：小事可为，宜务小慎微、过而能改，不宜大举。" },
  "36": { name: "水火既济", duan: "既济：亨小，利贞：事已既成，宜守成持正、防微杜渐，初吉终乱。" },
  "63": { name: "火水未济", duan: "未济：亨：事未完成，宜审慎待成、再接再厉，慎辨物居方。" },
};

const ZHI_ORDINAL: Record<string, number> = {};
ZHI.forEach((z, i) => (ZHI_ORDINAL[z] = i + 1)); // 子1 丑2 … 亥12

const LUNAR_MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
const LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

function lunarDayText(day: number): string {
  if (day >= 1 && day <= 30) return LUNAR_DAYS[day - 1];
  return `${day}日`;
}

/** 翻转动爻所在爻，生成变卦的下/上卦 index */
function flipLine(lowerIndex: number, upperIndex: number, movingLine: number): { changedLower: number; changedUpper: number } {
  const lowerBits = TRIGRAM_BITS[lowerIndex];
  const upperBits = TRIGRAM_BITS[upperIndex];
  if (movingLine <= 3) {
    const changedLowerBits = lowerBits ^ (1 << (movingLine - 1));
    return { changedLower: BITS_TO_INDEX[changedLowerBits], changedUpper: upperIndex };
  }
  const changedUpperBits = upperBits ^ (1 << (movingLine - 4));
  return { changedLower: lowerIndex, changedUpper: BITS_TO_INDEX[changedUpperBits] };
}

/** 五行生克关系 */
const SHENG: Record<string, string> = { 金: "水", 水: "木", 木: "火", 火: "土", 土: "金" };
const KE: Record<string, string> = { 金: "木", 木: "土", 土: "水", 水: "火", 火: "金" };

function tiYongRelation(ti: Trigram, yong: Trigram): string {
  if (ti.element === yong.element) return "比和（体用同气，平和顺遂）";
  if (SHENG[ti.element] === yong.element) return "体生用（我付出，需留意消耗）";
  if (SHENG[yong.element] === ti.element) return "用生体（外部相助，吉）";
  if (KE[ti.element] === yong.element) return "体克用（我有制衡之力，费力但可控）";
  return "用克体（外部压制，宜谨慎防损）";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function castHexagram(req: MeihuaRequest): MeihuaResult {
  const now = req.now ?? Date.now();
  const dt = new Date(now);
  const lunar = Lunar.fromDate(dt);
  const yearGanZhi = lunar.getYearInGanZhiByLiChun(); // 立春定年（命理年）
  const yearBranch = yearGanZhi.charAt(1); // 丙午 → 午
  const timeZhi = lunar.getTimeZhi(); // 子..亥
  const intention = req.intention && req.intention >= 1 && req.intention <= 999 ? Math.floor(req.intention) : 1;

  const yearBranchOrdinal = ZHI_ORDINAL[yearBranch] ?? 1;
  // lunar-javascript：闰月返回负值（如闰六月 = -6），梅花取月份序数取绝对值
  const rawMonth = lunar.getMonth();
  const isLeapMonth = rawMonth < 0;
  const lunarMonth = Math.abs(rawMonth);
  const lunarDay = lunar.getDay();
  const shichenOrdinal = ZHI_ORDINAL[timeZhi] ?? 1;

  // 公式（确定性，无随机）
  const base = yearBranchOrdinal + lunarMonth + lunarDay;
  const upperNum = (base + intention) % 8;
  const lowerNum = (base + shichenOrdinal + intention) % 8;
  const movingNum = (base + shichenOrdinal + intention) % 6;
  const movingLine = movingNum === 0 ? 6 : movingNum;

  const mainUpper = upperNum; // 0-7 卦 index
  const mainLower = lowerNum;
  const { changedLower, changedUpper } = flipLine(mainLower, mainUpper, movingLine);

  const tiIndex = movingLine <= 3 ? mainUpper : mainLower; // 动爻所在卦为用，另一为体
  const yongIndex = movingLine <= 3 ? mainLower : mainUpper;

  const key = `${mainLower}${mainUpper}`;
  const hex = HEXAGRAM_GUA[key] ?? { name: "未知卦", duan: "卦象不明，建议换个时刻再问。" };
  const changedKey = `${changedLower}${changedUpper}`;
  const changedHex = HEXAGRAM_GUA[changedKey] ?? { name: "未知卦", duan: "" };

  const ti = TRIGRAMS[tiIndex];
  const yong = TRIGRAMS[yongIndex];

  const calculation: MeihuaCalculation = {
    yearBranchOrdinal,
    lunarMonth,
    lunarDay,
    shichenOrdinal,
    intention,
    upperNum,
    lowerNum,
    movingNum,
    mainUpper,
    mainLower,
    changedLower,
    formula: `上卦=(年支${yearBranchOrdinal}+农历月${lunarMonth}+农历日${lunarDay}+心念${intention})%8=${upperNum}；` +
      `下卦=(年支${yearBranchOrdinal}+农历月${lunarMonth}+农历日${lunarDay}+时辰${timeZhi}支${shichenOrdinal}+心念${intention})%8=${lowerNum}；` +
      `动爻=(年支${yearBranchOrdinal}+农历月${lunarMonth}+农历日${lunarDay}+时辰${timeZhi}支${shichenOrdinal}+心念${intention})%6=${movingNum === 0 ? 6 : movingNum}`,
  };

  const solarDate = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  const lunarDate = `${yearGanZhi}年 ${isLeapMonth ? "闰" : ""}${LUNAR_MONTHS[lunarMonth - 1] ?? lunarMonth}月 ${lunarDayText(lunarDay)}`;

  return {
    input: { question: req.question, intention: req.intention ?? null, now },
    castAt: now,
    solarDate,
    lunarDate,
    timeZhi,
    calculation,
    mainUpper: TRIGRAMS[mainUpper],
    mainLower: TRIGRAMS[mainLower],
    mainName: hex.name,
    mainSymbol: TRIGRAMS[mainUpper].symbol + TRIGRAMS[mainLower].symbol,
    changedUpper: TRIGRAMS[changedUpper],
    changedLower: TRIGRAMS[changedLower],
    changedName: changedHex.name,
    changedSymbol: TRIGRAMS[changedUpper].symbol + TRIGRAMS[changedLower].symbol,
    movingLine,
    tiGua: ti,
    yongGua: yong,
    tiYongRelation: tiYongRelation(ti, yong),
    duan: hex.duan,
    ai: null,
    aiOk: false,
    confidence: intention >= 2 ? 0.75 : 0.68, // 心念数具体则聚焦度更高；可信度细节由 credibility.ts 统一
  };
}

/** 生成分享回放串：`${castAt}|${intention}`，用于 URL ?c= 参数 */
export function serializeCast(r: MeihuaResult): string {
  return `${r.castAt}|${r.input.intention ?? 1}`;
}
export function parseCast(s: string): { now: number; intention: number | null } | null {
  const m = /^(\d+)\|(\d+)?$/.exec(s);
  if (!m) return null;
  const now = Number(m[1]);
  if (!Number.isFinite(now) || now <= 0) return null;
  const intention = m[2] ? Number(m[2]) : null;
  return { now, intention };
}
