// AI 分析代理核心：拼提示词 → 调 OpenAI 兼容 /chat/completions → 解析 AI 分析
// 纯函数设计：env 由调用方注入（Cloudflare Pages Functions / 本地测试），不直接读全局
// V3：输出结构化 JSON，每条结论带依据 + 置信度 + 白话解释
//
// 双后端（通过 AI_PROVIDER 切换，默认 ark）：
//   - ark：火山方舟 plan 方案（ark-code-latest，Auto 模式按「效果+速度」自动选模型）
//     OpenAI 兼容 base：https://ark.cn-beijing.volces.com/api/plan/v3
//   - zen：OpenCode Zen（DeepSeek），沿用旧配置
//
// 密钥仅在服务端 env，浏览器/代码仓库不得出现明文。

import type { AiAnalysis, AiAskAnalysis } from "../src/lib/types";

export type AiProvider = "zen" | "ark";

/** 服务端注入的环境变量（Cloudflare Pages secret env / 本地 .dev.vars） */
export interface ZenEnv {
  AI_PROVIDER?: AiProvider;
  ZEN_API_KEY?: string;
  ZEN_BASE_URL?: string;
  ZEN_MODEL?: string;
  ARK_API_KEY?: string;
  ARK_BASE_URL?: string;
  ARK_MODEL?: string;
}

/** 单一后端的解析结果：base 指向 OpenAI 兼容 /chat/completions，model 为模型名或 plan 方案 ID */
export interface ProviderConfig {
  provider: AiProvider;
  key: string;
  base: string;
  model: string;
  /** 是否追加 thinking: disabled（关推理可显著降首字延迟；实测 Zen 与 Ark plan 均接受且有益） */
  thinking: boolean;
}

/** 从 env 解析当前生效的后端。默认 ark（火山方舟 plan / ark-code-latest）。 */
export function resolveProvider(env: ZenEnv): ProviderConfig {
  const provider: AiProvider =
    env.AI_PROVIDER === "zen" || env.AI_PROVIDER === "ark" ? env.AI_PROVIDER : "ark";
  if (provider === "zen") {
    return {
      provider,
      key: env.ZEN_API_KEY ?? "",
      base: env.ZEN_BASE_URL ?? "https://opencode.ai/zen/v1",
      model: env.ZEN_MODEL ?? "deepseek-v4-flash-free",
      thinking: true,
    };
  }
  return {
    provider: "ark",
    key: env.ARK_API_KEY ?? "",
    base: env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/plan/v3",
    model: env.ARK_MODEL ?? "ark-code-latest",
    thinking: true,
  };
}

interface DivineRequest {
  view?: "bazi" | "ziwei" | "career"; // 分析视角，默认 bazi
  /** 紫微视角：前端已排好的星盘序列化文本（iztro 引擎计算，模型勿重复排盘） */
  ziwei?: string;
  input: {
    year: number;
    month: number;
    day: number;
    calendar: string;
    timeMode: string;
    shichenIndex: number;
    hour: number | null;
    minute: number | null;
    location: string;
    lon: number;
    lat: number;
    gender: "male" | "female";
    events: string[];
  };
  pillars: {
    label: string;
    gan: string;
    zhi: string;
    shishen: string;
    hidden: { gan: string; shishen: string }[];
    nayan: string;
    kongwang: string;
  }[];
  dayMaster: string;
  dayMasterElement: string;
  dayMasterYinYang: string;
  animal: string;
  strength: string;
  yongShen: string;
  xiShen: string;
  qiYunAge: number;
  currentDaYun: { gan: string; zhi: string; startYear: number; endYear: number };
  liuNian: { year: number; gan: string; zhi: string; if: string }[];
  // 前端排盘引擎已算好、模型直接用于解读的权威数据（不重复排盘）
  shenSha: string[]; // 神煞（天乙贵人/羊刃/桃花/华盖/驿马/魁罡…）
  five: { wood: number; fire: number; earth: number; metal: number; water: number }; // 五行能量
  taiYuan?: string; // 胎元
  mingGong?: string; // 命宫
  shenGong?: string; // 身宫
}

const SYSTEM_PROMPT = `你是一位融合传统与现代的顶尖中国命理研究者。精通《渊海子平》《滴天髓》《穷通宝鉴》《三命通会》《子平真诠》《神峰通考》《千里命稿》等经典，同时吸收盲派技法与现代心理学视角。你严格遵循传统规则进行推演，绝不编造规则或数据。所有分析仅供文化娱乐与自我反思，不构成任何预言、决策或医疗建议。`;

const SHICHEN_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 出生时刻标签（子时/丑时… 或 精确 HH:MM，或 时辰未知） */
function birthTimeLabel(d: DivineRequest): string {
  const t = d.input;
  if (t.timeMode === "shichen") return `${SHICHEN_NAMES[t.shichenIndex] ?? ""}时`;
  if (t.timeMode === "exact" && t.hour !== null) {
    return `${String(t.hour).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}`;
  }
  return "时辰未知";
}

/** 输出格式要求（三个视角共用，保证 AiAnalysis 结构一致） */
const OUTPUT_FMT = `【任务】
1. 用上述已发生事件校准解读（若事件与命盘/大运吻合，指出对应关系；若有偏差，说明可能原因并调整侧重）。
2. 解读须紧扣上文命盘数据，不要凭空编造。
3. 严格输出一个 json 对象（不要 markdown 代码块，不要任何多余文字），结构如下：
{"summary":"一句话总评(30字内)","cards":{"personality":[{"text":"一条结论(20-40字)","basis":"依据(1句)","confidence":0.8}],"career":[],"wealth":[],"love":[],"health":[]},"liuNian":{"2026":"一句","2027":"一句","2028":"一句","2029":"一句","2030":"一句"},"advice":["建议1","建议2","建议3"]}
要求：每个卡片 2-3 条结论，每条 20-40 字，basis 用 1 句基于命盘数据的具体理由，confidence 0-1；解读具体不空泛、结合现代社会现实，不确定时降低 confidence；总输出控制在 1000 字以内，宁精勿滥。`;

/** 八字视角：四柱 + 日主 + 神煞 + 五行 + 三垣 + 大运流年（默认） */
function buildBaziPrompt(d: DivineRequest): string {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines: string[] = [];
  lines.push("【命盘已排定（前端计算，勿重复排盘）】");
  lines.push(
    `出生：${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d)}，${g}，出生地：${d.input.location}（经度${d.input.lon}°）`
  );
  lines.push(
    "已发生事件（用于校准）：" +
      (d.input.events.length ? d.input.events.map((e, i) => `${i + 1}. ${e}`).join(" ") : "无")
  );
  lines.push("");
  lines.push("四柱：");
  for (const p of d.pillars) {
    const hidden = p.hidden.map((h) => h.gan + h.shishen).join("、");
    const kw = p.kongwang ? `，空亡：${p.kongwang}` : "";
    lines.push(`- ${p.label}：${p.gan}${p.zhi}（${p.shishen}），藏干：${hidden}，纳音：${p.nayan}${kw}`);
  }
  lines.push("");
  lines.push(
    `日主：${d.dayMaster}（${d.dayMasterYinYang}${d.dayMasterElement}），生肖：${d.animal}，身${d.strength}，用神：${d.yongShen}，喜神：${d.xiShen}`
  );
  if (d.shenSha?.length) lines.push(`神煞：${d.shenSha.join("、")}`);
  lines.push(
    `五行能量：木${d.five.wood}%、火${d.five.fire}%、土${d.five.earth}%、金${d.five.metal}%、水${d.five.water}%`
  );
  const san = [d.taiYuan && `胎元${d.taiYuan}`, d.mingGong && `命宫${d.mingGong}`, d.shenGong && `身宫${d.shenGong}`].filter(Boolean);
  if (san.length) lines.push(`三垣：${san.join("，")}`);
  lines.push(
    `当前大运：${d.currentDaYun.gan}${d.currentDaYun.zhi}（${d.qiYunAge}岁起运，${d.currentDaYun.startYear}-${d.currentDaYun.endYear}）`
  );
  lines.push(`流年：${d.liuNian.map((l) => `${l.year}年（${l.gan}${l.zhi}，${l.if}）`).join("、")}`);
  lines.push("");
  lines.push(OUTPUT_FMT);
  return lines.join("\n");
}

/** 紫微斗数视角：只解读星盘，不重复排盘 */
function buildZiweiPrompt(d: DivineRequest): string {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines: string[] = [];
  lines.push("【星盘已排定（紫微引擎计算，勿重复排盘）】");
  lines.push(
    `出生：${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d)}，${g}，出生地：${d.input.location}（经度${d.input.lon}°）`
  );
  lines.push(
    "已发生事件（用于校准）：" +
      (d.input.events.length ? d.input.events.map((e, i) => `${i + 1}. ${e}`).join(" ") : "无")
  );
  lines.push("");
  lines.push(d.ziwei ?? "（星盘数据缺失）");
  lines.push("");
  lines.push(`流年：${d.liuNian.map((l) => `${l.year}年（${l.gan}${l.zhi}）`).join("、")}`);
  lines.push("");
  lines.push(OUTPUT_FMT);
  return lines.join("\n");
}

/** 职场事业视角：八字为主，聚焦官杀财星与职业规划 */
function buildCareerPrompt(d: DivineRequest): string {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines: string[] = [];
  lines.push("【命盘已排定（前端计算，勿重复排盘）】");
  lines.push(
    `出生：${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d)}，${g}，出生地：${d.input.location}（经度${d.input.lon}°）`
  );
  lines.push(
    "已发生事件（用于校准）：" +
      (d.input.events.length ? d.input.events.map((e, i) => `${i + 1}. ${e}`).join(" ") : "无")
  );
  lines.push("");
  lines.push("四柱：");
  for (const p of d.pillars) {
    const hidden = p.hidden.map((h) => h.gan + h.shishen).join("、");
    const kw = p.kongwang ? `，空亡：${p.kongwang}` : "";
    lines.push(`- ${p.label}：${p.gan}${p.zhi}（${p.shishen}），藏干：${hidden}，纳音：${p.nayan}${kw}`);
  }
  lines.push("");
  lines.push(
    `日主：${d.dayMaster}（${d.dayMasterYinYang}${d.dayMasterElement}），生肖：${d.animal}，身${d.strength}，用神：${d.yongShen}，喜神：${d.xiShen}`
  );
  if (d.shenSha?.length) lines.push(`神煞：${d.shenSha.join("、")}`);
  lines.push(
    `五行能量：木${d.five.wood}%、火${d.five.fire}%、土${d.five.earth}%、金${d.five.metal}%、水${d.five.water}%`
  );
  const san = [d.taiYuan && `胎元${d.taiYuan}`, d.mingGong && `命宫${d.mingGong}`, d.shenGong && `身宫${d.shenGong}`].filter(Boolean);
  if (san.length) lines.push(`三垣：${san.join("，")}`);
  lines.push(
    `当前大运：${d.currentDaYun.gan}${d.currentDaYun.zhi}（${d.qiYunAge}岁起运，${d.currentDaYun.startYear}-${d.currentDaYun.endYear}）`
  );
  lines.push(`流年：${d.liuNian.map((l) => `${l.year}年（${l.gan}${l.zhi}，${l.if}）`).join("、")}`);
  lines.push("");
  lines.push("【解读重点·职场事业】");
  lines.push("1. 以官杀（事业/贵人或压力）、财星（财富/经营）、印星（技能/名望）、食伤（才华/表达）为纲，结合十神旺衰与大运流年，给出职业定位与规划建议。");
  lines.push("2. 给出适合的行业方向、岗位类型、晋升时机、以及需规避的职场雷区。");
  lines.push("3. 结合已发生事件校准，指出职业上升/瓶颈对应的命理阶段。");
  lines.push("4. 若合作/团队事项，可补充适合的合作对象类型与团队中宜扮演的角色。");
  lines.push(OUTPUT_FMT);
  return lines.join("\n");
}

function buildUserPrompt(d: DivineRequest): string {
  if (d.view === "ziwei") return buildZiweiPrompt(d);
  if (d.view === "career") return buildCareerPrompt(d);
  return buildBaziPrompt(d);
}

export async function generateAnalysis(env: ZenEnv, data: DivineRequest): Promise<AiAnalysis> {
  const cfg = resolveProvider(env);
  if (!cfg.key) {
    throw new Error(`未配置 ${cfg.provider === "ark" ? "ARK_API_KEY" : "ZEN_API_KEY"}`);
  }

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(data) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 2500, // 输出≤1000字 + JSON 结构开销；thinking 已禁用，此上限纯输出预算，过低会截断末尾 liuNian/advice
  };
  if (cfg.thinking) body.thinking = { type: "disabled" }; // deepseek-v4 推理链会耗尽 max_tokens，关闭后直接输出正文

  const t0 = Date.now();
  let analysis = await callOnce(cfg, body);
  // ark-code-latest Auto 模式偶发产出缺 liuNian/advice 的 JSON，重试一次兜底；
  // 但仅当首次够快（<25s）才重试，否则重试也赶不上客户端 60s 超时/Worker 墙钟，徒增 502 风险
  if (!isComplete(analysis) && Date.now() - t0 < 25000) {
    analysis = await callOnce(cfg, body);
  }
  return analysis;
}

/** 判断输出是否完整：至少一个卡片结论 + liuNian 与 advice 均非空 */
function isComplete(a: AiAnalysis): boolean {
  const hasCard = Object.values(a.cards).some((arr) => arr.some((c) => c.text));
  return hasCard && Object.values(a.liuNian).some((v) => v) && a.advice.length > 0;
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI 输出不是有效 JSON");
  }
}

function cardList(v: unknown): { text: string; basis: string; confidence: number }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return { text: x, basis: "", confidence: 0.7 };
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return {
          text: typeof o.text === "string" ? o.text.trim() : "",
          basis: typeof o.basis === "string" ? o.basis.trim() : "",
          confidence: typeof o.confidence === "number" ? clamp(o.confidence) : 0.7,
        };
      }
      return null;
    })
    .filter((x): x is { text: string; basis: string; confidence: number } => !!x && x.text.length > 0)
    .slice(0, 5);
}

function strArr(v: unknown, max = 5): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .slice(0, max)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalize(raw: unknown): AiAnalysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const cards = (o.cards ?? {}) as Record<string, unknown>;
  const liu = (o.liuNian ?? {}) as Record<string, unknown>;
  return {
    summary: typeof o.summary === "string" ? o.summary.trim() : "",
    cards: {
      personality: cardList(cards.personality),
      career: cardList(cards.career),
      wealth: cardList(cards.wealth),
      love: cardList(cards.love),
      health: cardList(cards.health),
    },
    liuNian: {
      2026: typeof liu["2026"] === "string" ? liu["2026"] : "",
      2027: typeof liu["2027"] === "string" ? liu["2027"] : "",
      2028: typeof liu["2028"] === "string" ? liu["2028"] : "",
      2029: typeof liu["2029"] === "string" ? liu["2029"] : "",
      2030: typeof liu["2030"] === "string" ? liu["2030"] : "",
    },
    advice: strArr(o.advice),
  };
}

// ===== 问一事 / 梅花易数 AI 解读分支 =====

export interface AskRequest {
  question: string;
  calculation: {
    mainName: string;
    changedName: string;
    movingLine: number;
    mainUpper: string;
    mainLower: string;
    tiGua: string;
    yongGua: string;
    tiYongRelation: string;
    intention: number;
    lunarDate: string;
    timeZhi: string;
    formula: string;
  };
}

const ASK_SYSTEM_PROMPT = `你是一位融合传统与现代的决策咨询师，精通《周易》卦理与梅花易数。你只基于用户提供的卦象与动爻解读，绝不凭空改卦或编造规则。你的解读要落到具体可执行、可检验的行动建议上，语言平实，避免宿命论，强调人的选择空间。所有内容仅供文化娱乐与自我反思，不构成投资、医疗、法律等专业决策依据。`;

const ASK_OUTPUT_FMT = `【任务】
1. 只依据用户给出的本卦、变卦、动爻、体用生克来解读，不要重复推演起卦过程。
2. 结合所问之事给出：当前局势（3-5句）、行动建议（2-3条，每条含依据）、何时再看、风险提示。
3. 严格输出一个 json 对象（不要 markdown 代码块，不要任何多余文字），结构如下：
{"summary":"一句话总评(30字内)","situation":{"text":"当前局势(40-80字)","basis":"依据(1句,基于卦象)","confidence":0.7},"advice":[{"text":"行动建议1(20-40字)","basis":"依据","confidence":0.7}],"timing":{"text":"何时再看(1句)","basis":"依据","confidence":0.6},"risk":"一句风险提示"}
要求：建议要具体、贴合所问之事，杜绝"大吉大利"式空话；不确定时降低 confidence；总输出控制在 600 字以内。`;

function buildAskPrompt(d: AskRequest): string {
  const lines: string[] = [];
  lines.push("【起卦已完成（前端规则引擎计算，勿重复起卦）】");
  lines.push(`所问之事：${d.question}`);
  lines.push(`起卦时刻：${d.calculation.lunarDate} ${d.calculation.timeZhi}时`);
  lines.push(`本卦：${d.calculation.mainName}（上${d.calculation.mainUpper}下${d.calculation.mainLower}）；变卦：${d.calculation.changedName}；`);
  lines.push(`动爻：第${d.calculation.movingLine}爻动；体卦：${d.calculation.tiGua}；用卦：${d.calculation.yongGua}；体用关系：${d.calculation.tiYongRelation}`);
  lines.push(`起卦依据：${d.calculation.formula}`);
  lines.push(`心念数：${d.calculation.intention}`);
  lines.push("");
  lines.push(ASK_OUTPUT_FMT);
  return lines.join("\n");
}

/** 问一事 AI 解读：解析 AiAskAnalysis（复用 callOnceRaw + 重试-once + thinking disabled） */
export async function generateAskAnalysis(env: ZenEnv, data: AskRequest): Promise<AiAskAnalysis> {
  const cfg = resolveProvider(env);
  if (!cfg.key) {
    throw new Error(`未配置 ${cfg.provider === "ark" ? "ARK_API_KEY" : "ZEN_API_KEY"}`);
  }
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: ASK_SYSTEM_PROMPT },
      { role: "user", content: buildAskPrompt(data) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1600,
  };
  if (cfg.thinking) body.thinking = { type: "disabled" };
  const t0 = Date.now();
  let analysis = await callOnceRaw(cfg, body, normalizeAsk);
  if (!isCompleteAsk(analysis) && Date.now() - t0 < 25000) {
    analysis = await callOnceRaw(cfg, body, normalizeAsk);
  }
  return analysis;
}

/** 单次调用并解析为任意结构化结果（业务解析器由调用方注入） */
async function callOnceRaw<T>(
  cfg: ProviderConfig,
  body: Record<string, unknown>,
  parse: (parsed: unknown) => T
): Promise<T> {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    throw new Error(`${cfg.provider} API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Zen API 返回空内容");

  const parsed = parseJson(content);
  if (typeof process !== "undefined" && process.env.ZEN_DEBUG) console.error("[zen-debug]", JSON.stringify({ content, parsed }).slice(0, 3000));
  return parse(parsed);
}

/** 现有 callOnce 改为薄包装：解析为 AiAnalysis */
async function callOnce(cfg: ProviderConfig, body: Record<string, unknown>): Promise<AiAnalysis> {
  return callOnceRaw(cfg, body, normalize);
}

function isCompleteAsk(a: AiAskAnalysis): boolean {
  return !!a.summary && !!a.situation.text && a.advice.length >= 2;
}

function normalizeAsk(raw: unknown): AiAskAnalysis {
  const o = (raw ?? {}) as Record<string, unknown>;
  const situ = (o.situation ?? {}) as Record<string, unknown>;
  const timing = (o.timing ?? {}) as Record<string, unknown>;
  const adv = Array.isArray(o.advice)
    ? o.advice
        .map((x) => {
          if (typeof x === "string") return { text: x, basis: "", confidence: 0.7 };
          const obj = (x ?? {}) as Record<string, unknown>;
          return {
            text: typeof obj.text === "string" ? obj.text.trim() : "",
            basis: typeof obj.basis === "string" ? obj.basis.trim() : "",
            confidence: typeof obj.confidence === "number" ? clamp(obj.confidence) : 0.7,
          };
        })
        .filter((x) => !!x.text)
        .slice(0, 4)
    : [];
  return {
    summary: typeof o.summary === "string" ? o.summary.trim() : "",
    situation: {
      text: typeof situ.text === "string" ? situ.text.trim() : "",
      basis: typeof situ.basis === "string" ? situ.basis.trim() : "",
      confidence: typeof situ.confidence === "number" ? clamp(situ.confidence) : 0.7,
    },
    advice: adv,
    timing: {
      text: typeof timing.text === "string" ? timing.text.trim() : "",
      basis: typeof timing.basis === "string" ? timing.basis.trim() : "",
      confidence: typeof timing.confidence === "number" ? clamp(timing.confidence) : 0.6,
    },
    risk: typeof o.risk === "string" ? o.risk.trim() : "",
  };
}