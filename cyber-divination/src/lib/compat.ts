// 双人合盘引擎：由两人命盘计算缘分指数与维度评分
// 规则：天干五合、生肖六合/相冲、五行互补、日主十神关系。

import type { BaziResult, CompatScore } from "./types";

const GAN_WUHE: Record<string, Record<string, string>> = {
  甲: { 己: "土" }, 己: { 甲: "土" },
  乙: { 庚: "金" }, 庚: { 乙: "金" },
  丙: { 辛: "水" }, 辛: { 丙: "水" },
  丁: { 壬: "木" }, 壬: { 丁: "木" },
  戊: { 癸: "火" }, 癸: { 戊: "火" },
};
const SHENGXIAO_LIUHE: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
const SHENGXIAO_CHONG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
const ELEMENT: Record<string, number> = { 木: 0, 火: 1, 土: 2, 金: 3, 水: 4 };
const SHENG = [1, 2, 3, 4, 0]; // 木生火、火生土、土生金、金生水、水生木
const KE = [3, 4, 0, 1, 2]; // 木克土、火克金、土克水、金克木、水克火

export function computeCompat(a: BaziResult, b: BaziResult, relation: string = "couple"): CompatScore {
  const aStem = a.dayMaster;
  const bStem = b.dayMaster;
  const aBranch = a.animal === "鼠" ? "子" : a.animal === "牛" ? "丑" : a.animal === "虎" ? "寅" :
    a.animal === "兔" ? "卯" : a.animal === "龙" ? "辰" : a.animal === "蛇" ? "巳" :
    a.animal === "马" ? "午" : a.animal === "羊" ? "未" : a.animal === "猴" ? "申" :
    a.animal === "鸡" ? "酉" : a.animal === "狗" ? "戌" : "亥";
  const bBranch = b.animal === "鼠" ? "子" : b.animal === "牛" ? "丑" : b.animal === "虎" ? "寅" :
    b.animal === "兔" ? "卯" : b.animal === "龙" ? "辰" : b.animal === "蛇" ? "巳" :
    b.animal === "马" ? "午" : b.animal === "羊" ? "未" : b.animal === "猴" ? "申" :
    b.animal === "鸡" ? "酉" : b.animal === "狗" ? "戌" : "亥";

  // --- 吸引力 ---
  let attraction = 60;
  if (GAN_WUHE[aStem]?.[bStem]) attraction += 20; // 天干五合
  if (SHENGXIAO_LIUHE[aBranch] === bBranch) attraction += 15; // 生肖六合
  if (SHENGXIAO_CHONG[aBranch] === bBranch) attraction -= 10; // 生肖相冲
  // 日主五行相生
  const aEl = ELEMENT[a.dayMasterElement];
  const bEl = ELEMENT[b.dayMasterElement];
  if (SHENG[aEl] === bEl || SHENG[bEl] === aEl) attraction += 5;
  attraction = clamp(attraction, 20, 100);

  // --- 稳定性 ---
  let stability = 60;
  // 五行互补：A 弱项是 B 强项
  const strongA = strongest(a.five);
  const weakA = weakest(a.five);
  const strongB = strongest(b.five);
  const weakB = weakest(b.five);
  if (strongA === weakB) stability += 15;
  if (strongB === weakA) stability += 15;
  if (SHENGXIAO_CHONG[aBranch] === bBranch) stability -= 15;
  stability = clamp(stability, 20, 100);

  // --- 沟通度 ---
  let communication = 60;
  const aDay = a.pillars[2].zhi;
  const bDay = b.pillars[2].zhi;
  if (aDay === bDay) communication += 10; // 日支相同
  if (SHENGXIAO_LIUHE[aBranch] === bBranch) communication += 10;
  if (ELEMENT[a.dayMasterElement] === ELEMENT[b.dayMasterElement]) communication += 5;
  communication = clamp(communication, 20, 100);

  // --- 长期经营难度（越高越难）---
  let effort = 40;
  if (SHENGXIAO_CHONG[aBranch] === bBranch) effort += 25;
  if (KE[aEl] === bEl || KE[bEl] === aEl) effort += 15;
  if (a.strength === b.strength) effort += 5;

  // --- 关系类型修正（所选关系决定各维度权重倾向）---
  if (relation === "couple") {
    attraction += 10;
    effort -= 5;
  } else if (relation === "friends") {
    communication += 10;
  } else if (relation === "work") {
    stability += 10;
  } else if (relation === "family") {
    stability += 15;
  }

  attraction = clamp(attraction, 20, 100);
  stability = clamp(stability, 20, 100);
  communication = clamp(communication, 20, 100);
  effort = clamp(effort, 10, 90);

  // 总分
  const total = clamp(
    Math.round(attraction * 0.3 + stability * 0.3 + communication * 0.2 + (100 - effort) * 0.2),
    30,
    99
  );

  const label = total >= 90 ? "天作之合" : total >= 80 ? "佳偶天成" : total >= 70 ? "相辅相成" : total >= 60 ? "欢喜冤家" : "需要磨合";

  // 互补点 / 冲突点 / 相处建议
  const complement: string[] = [];
  const conflict: string[] = [];
  const advice: string[] = [];

  if (GAN_WUHE[aStem]?.[bStem]) {
    complement.push(`日主天干相合（${aStem}${bStem}合${GAN_WUHE[aStem][bStem]}），缘分联结深，彼此有天然吸引力。`);
  }
  if (SHENGXIAO_LIUHE[aBranch] === bBranch) {
    complement.push(`生肖相合（${aBranch}${bBranch}六合），气场相投，相处轻松融洽。`);
  }
  if (strongA === weakB || strongB === weakA) {
    complement.push(`五行互补：${a.dayMasterElement}方旺于${b.dayMasterElement}方弱处，能量此消彼长，互相成就。`);
  }
  if (SHENG[aEl] === bEl || SHENG[bEl] === aEl) {
    complement.push(`日主五行相生，一方滋养另一方，关系有滋养与成长。`);
  }
  if (complement.length === 0) {
    complement.push(`双方五行各有其强，虽非强烈互补，但正如两块拼图，可求同存异、共同成长。`);
  }

  if (SHENGXIAO_CHONG[aBranch] === bBranch) {
    conflict.push(`生肖相冲（${aBranch}${bBranch}），性格与节奏差异大，需要更多磨合与理解。`);
  }
  if (KE[aEl] === bEl || KE[bEl] === aEl) {
    conflict.push(`日主五行相克，处理分歧时容易各执一词，建议先处理好情绪再谈对错。`);
  }
  if (a.strength !== b.strength) {
    conflict.push(`双方身强身弱不同，一强一弱，相处时需注意谁主导、谁妥协的平衡。`);
  }
  if (conflict.length === 0) {
    conflict.push(`命盘间未见明显冲突，但再契合的关系也需日常经营，勿因顺遂而懈怠。`);
  }

  advice.push(`把「关系」当作共同项目来经营，定期留出完全属于彼此的陪伴时间。`);
  advice.push(`遇到分歧时，先重复对方的话确认理解，再表达自己的感受，避免「对错争执」。`);
  advice.push(`保持各自的成长空间，彼此成就，而不是互相约束，关系才能长久。`);
  advice.push(`用小事积累信任：一件小事做十次，胜过十件大事各做一次。`);

  // 关系适配评语（relation 真实参与解读，不再是死数据）
  const RELATION_CN: Record<string, string> = {
    couple: "情侣/夫妻",
    friends: "朋友",
    work: "同事/合伙人",
    family: "家人",
  };
  const relationFit: string[] = [];
  if (relation === "couple") {
    relationFit.push(`以${RELATION_CN[relation]}关系测算：侧重吸引力与共同经营（吸引力 ${attraction}）。`);
  } else if (relation === "friends") {
    relationFit.push(`以${RELATION_CN[relation]}关系测算：侧重沟通与相处（沟通度 ${communication}）。`);
  } else if (relation === "work") {
    relationFit.push(`以${RELATION_CN[relation]}关系测算：侧重稳定与互补（稳定性 ${stability}）。`);
  } else if (relation === "family") {
    relationFit.push(`以${RELATION_CN[relation]}关系测算：侧重包容与稳定（稳定性 ${stability}）。`);
  }
  if (total >= 75) {
    relationFit.push(`缘分指数较高（${total} 分），无论以何种关系相处都较为顺遂，${RELATION_CN[relation]}尤为合拍。`);
  } else if (total < 60) {
    relationFit.push(`缘分指数偏低（${total} 分），作为${RELATION_CN[relation]}更需耐心经营，可着重互补之处。`);
  }

  return {
    total,
    label,
    dimensions: { attraction, stability, communication, effort },
    complement,
    conflict,
    advice,
    relationFit,
    fiveA: a.five,
    fiveB: b.five,
  };
}

function strongest(f: { wood: number; fire: number; earth: number; metal: number; water: number }): string {
  const arr: [string, number][] = [["木", f.wood], ["火", f.fire], ["土", f.earth], ["金", f.metal], ["水", f.water]];
  return arr.sort((x, y) => y[1] - x[1])[0][0];
}
function weakest(f: { wood: number; fire: number; earth: number; metal: number; water: number }): string {
  const arr: [string, number][] = [["木", f.wood], ["火", f.fire], ["土", f.earth], ["金", f.metal], ["水", f.water]];
  return arr.sort((x, y) => x[1] - y[1])[0][0];
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}