// 共享类型：生辰输入与命盘结果（V3 数据驱动）

export type CalendarMode = "solar" | "lunar";
export type TimeMode = "shichen" | "exact" | "unknown";
// 分析视角：八字综合 / 紫微斗数 / 职场事业（决定后端提示词，输出结构不变）
export type DivinationView = "bazi" | "ziwei" | "career";

export interface BaziInput {
  calendar: CalendarMode; // 公历 / 农历
  year: number;
  month: number;
  day: number;
  timeMode: TimeMode;
  shichenIndex: number; // 时辰序号 0-11：子=0 丑=1 … 亥=11（timeMode=shichen 时生效）
  hour?: number; // 精确时间，小时 0-23（timeMode=exact 时生效）
  minute?: number; // 精确时间，分钟 0-59
  location: string; // 出生地显示名
  lon: number; // 经度
  lat: number; // 纬度
  gender: "male" | "female";
  events: string[];
  view?: DivinationView; // 分析视角，默认 bazi
}

export interface HiddenStem {
  gan: string;
  shishen: string;
}

export interface Pillar {
  label: string; // 年柱/月柱/日柱/时柱
  ganIndex: number;
  zhiIndex: number;
  gan: string;
  zhi: string;
  ganYinYang: string; // 天干阴阳
  ganElement: string; // 天干五行
  zhiElement: string; // 地支五行
  shishen: string; // 天干十神
  hidden: HiddenStem[]; // 藏干 + 十神
  nayan: string; // 纳音
  kongwang: string; // 空亡
}

export interface DaYun {
  gan: string;
  zhi: string;
  ganIndex: number;
  zhiIndex: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface LiuNian {
  year: number;
  gan: string;
  zhi: string;
  if: string; // 流年天干十神
  summary: string;
}

export interface FiveElement {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface BaziResult {
  input: BaziInput;
  // 排盘信息
  solarDate: string; // 公历
  solarTime: string; // 真太阳时
  calendarChange: string; // 真太阳时校正说明
  pillars: Pillar[];
  dayMaster: string;
  dayMasterElement: string;
  dayMasterYinYang: string;
  animal: string;
  strength: string; // 身强 / 身弱 / 中和
  yongShen: string; // 用神
  xiShen: string; // 喜神
  qiYunAge: number;
  qiYunForward: boolean;
  currentDaYun: DaYun;
  daYunList: DaYun[];
  liuNian: LiuNian[];
  five: FiveElement; // 五行能量（用于雷达图）
  shenSha: string[]; // 神煞
  taiYuan?: string; // 胎元
  mingGong?: string; // 命宫
  shenGong?: string; // 身宫
  confidence: number; // 0-1，时辰未知时降低
  cards: {
    personality: string[];
    career: string[];
    wealth: string[];
    love: string[];
    health: string[];
  };
  advice: string[];
}

// DeepSeek 命理解读（覆盖模板文案，带依据/置信度）
export interface AiAnalysis {
  summary: string; // 一句话总评
  cards: {
    personality: { text: string; basis: string; confidence: number }[];
    career: { text: string; basis: string; confidence: number }[];
    wealth: { text: string; basis: string; confidence: number }[];
    love: { text: string; basis: string; confidence: number }[];
    health: { text: string; basis: string; confidence: number }[];
  };
  liuNian: Record<string, string>;
  advice: string[];
}

// 合盘输入
export interface CompatInput {
  a: BaziInput;
  b: BaziInput;
  relation: string; // couple / friends / work / family
}

export interface CompatScore {
  total: number; // 0-100
  label: string; // 天作之合 / 佳偶天成 / 相辅相成 / 欢喜冤家 / 需要磨合
  dimensions: {
    attraction: number; // 吸引力
    stability: number; // 稳定性
    communication: number; // 沟通度
    effort: number; // 长期经营难度（越低越好）
  };
  complement: string[]; // 互补点
  conflict: string[]; // 冲突点
  advice: string[]; // 相处建议
  relationFit: string[]; // 适合/不适合的关系类型
  fiveA: FiveElement;
  fiveB: FiveElement;
}

// 每日一签
export interface DailySign {
  id: number;
  number: string; // 第几签
  level: string; // 上上 / 上吉 / 中吉 / 中平 / 下下
  title: string; // 签题
  poem: string[]; // 签诗（每行一句）
  meaning: string; // 白话解
  yi: string[]; // 宜
  ji: string[]; // 忌
  luckyColor: string;
  luckyDirection: string;
  luckyNumber: number;
  advice: string; // 今日一句建议
  avoid: string; // 避坑提醒
  smallThing: string; // 适合做的 1 件小事
}

// ===== 问一事 / 梅花易数 =====

/** 八卦单卦 */
export interface Trigram {
  index: number; // 先天卦序 1乾 2兑 3离 4震 5巽 6坎 7艮 0坤
  name: string; // 乾/兑/离/震/巽/坎/艮/坤
  symbol: string; // ☰☱☲☳☴☵☶☷
  element: string; // 五行
  nature: string; // 象意（天/泽/火/雷/风/水/山/地）
}

/** 梅花起卦请求：now 为起卦时刻（本地规则引擎，仅用于生成公式输入） */
export interface MeihuaRequest {
  question: string;
  intention?: number | null; // 心念数 1-999
  now?: number; // Date.now() 毫秒戳，可注入以便测试/分享回放
}

/** 梅花一卦结果（纯规则、确定性） */
export interface MeihuaResult {
  input: MeihuaRequest;
  // 起卦时刻信息
  castAt: number; // epoch ms
  solarDate: string;
  lunarDate: string; // 农历：乙巳年 六月 廿四
  timeZhi: string; // 时辰地支
  // 计算依据（过程可见）
  calculation: MeihuaCalculation;
  // 本卦
  mainUpper: Trigram;
  mainLower: Trigram;
  mainName: string;
  mainSymbol: string;
  // 变卦（动爻翻转后）
  changedUpper: Trigram;
  changedLower: Trigram;
  changedName: string;
  changedSymbol: string;
  movingLine: number; // 1-6，第几爻动
  // 体用
  tiGua: Trigram; // 体卦
  yongGua: Trigram; // 用卦
  tiYongRelation: string; // 体用生克
  // 断语（AI 不可用时用卦辞兜底）
  duan: string;
  // 是否使用了 AI 解读
  ai?: AiAskAnalysis | null;
  aiOk?: boolean;
  confidence: number; // 0-1
}

/** 起卦计算过程（展示给用户，证明规则而非随机） */
export interface MeihuaCalculation {
  yearBranchOrdinal: number; // 年支序 子1..亥12
  lunarMonth: number;
  lunarDay: number;
  shichenOrdinal: number; // 时辰支序 1-12
  intention: number; // 最终采用的心念数
  upperNum: number; // (年支序+月+日+心念) % 8
  lowerNum: number; // (年支序+月+日+时辰支序+心念) % 8
  movingNum: number; // (…+心念) % 6，0 记第6爻
  mainUpper: number;
  mainLower: number;
  changedLower: number;
  formula: string; // 人话说明
}

/** AI 问事解读（结构化，与 AiAnalysis 同风格：每段带依据+置信度） */
export interface AiAskAnalysis {
  summary: string; // 一句话总评
  situation: { text: string; basis: string; confidence: number }; // 当前局势
  advice: { text: string; basis: string; confidence: number }[]; // 行动建议 2-3 条
  timing: { text: string; basis: string; confidence: number }; // 何时再看
  risk: string; // 风险提示
}