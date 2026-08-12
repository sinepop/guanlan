// 观澜 Guanlan · HTTP 云函数（腾讯云 CloudBase）
// 路径：/api/divine（八字/紫微/career） /api/ask（梅花易数）
// 模型：hunyuan-v3 组 + hy3（消耗小程序成长计划免费额度）
// 防御：origin 白名单 + 输入形状校验（从原 Cloudflare functions 移植）
const cloud = require("@cloudbase/node-sdk");

const ALLOWED_ORIGINS = new Set([
  "https://cyber-divination-7e4.pages.dev",
  "http://localhost:3000",
  "https://localhost:3000",
]);

const VIEWS = new Set(["bazi", "ziwei", "career"]);
const MAX_BODY_BYTES = 256 * 1024;
const MAX_EVENTS = 5;
const MAX_EVENT_LEN = 200;
const MAX_PILLARS = 4;
const MAX_FIELD_LEN = 8;
const MAX_HIDDEN = 3;
const MAX_SHEN_SHA = 12;
const MAX_SHA_LEN = 12;
const MAX_GONG_LEN = 8;
const MAX_ZIWEI_LEN = 3000;

const TRIGRAMS = new Set(["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"]);
const TI_YONG_RELATIONS = new Set([
  "比和（体用同气，平和顺遂）",
  "体生用（我付出，需留意消耗）",
  "用生体（外部相助，吉）",
  "体克用（我有制衡之力，费力但可控）",
  "用克体（外部压制，宜谨慎防损）",
]);
const MAX_QUESTION_LEN = 200;
const MAX_NAME_LEN = 6;
const MAX_FORMULA_LEN = 500;

const SYSTEM_PROMPT = `你是一位融合传统与现代的命理研究者。严格遵循传统规则推演，不编造数据。所有分析仅供文化娱乐与自我反思。`;

const SHICHEN_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const OUTPUT_FMT = `严格输出一个 json（无 markdown），结构：
{"summary":"一句话总评","cards":{"personality":[{"text":"","basis":"","confidence":0.8}],"career":[],"wealth":[],"love":[],"health":[]},"liuNian":{"2026":"","2027":"","2028":"","2029":"","2030":""},"advice":["一","二","三"]}
要求：每张卡片 2 条结论，每条 25 字内；总输出 600 字内；不确定时降低 confidence。`;

const ASK_SYSTEM_PROMPT = `你是一位融合传统与现代的决策咨询师，精通《周易》卦理与梅花易数。你只基于用户提供的卦象与动爻解读，绝不凭空改卦或编造规则。你的解读要落到具体可执行、可检验的行动建议上，语言平实，避免宿命论，强调人的选择空间。所有内容仅供文化娱乐与自我反思，不构成投资、医疗、法律等专业决策依据。`;

const ASK_OUTPUT_FMT = `【任务】
1. 只依据用户给出的本卦、变卦、动爻、体用生克来解读，不要重复推演起卦过程。
2. 结合所问之事给出：当前局势（3-5句）、行动建议（2-3条，每条含依据）、何时再看、风险提示。
3. 严格输出一个 json 对象（不要 markdown 代码块，不要任何多余文字），结构如下：
{"summary":"一句话总评(30字内)","situation":{"text":"当前局势(40-80字)","basis":"依据(1句,基于卦象)","confidence":0.7},"advice":[{"text":"行动建议1(20-40字)","basis":"依据","confidence":0.7}],"timing":{"text":"何时再看(1句)","basis":"依据","confidence":0.6},"risk":"一句风险提示"}
要求：建议要具体、贴合所问之事，杜绝"大吉大利"式空话；不确定时降低 confidence；总输出控制在 600 字以内。`;

// ===== 八字 / 紫微 / career =====

function birthTimeLabel(t) {
  if (t.timeMode === "shichen") return `${SHICHEN_NAMES[t.shichenIndex] ?? ""}时`;
  if (t.timeMode === "exact" && t.hour !== null) {
    return `${String(t.hour).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}`;
  }
  return "时辰未知";
}

function buildBaziPrompt(d) {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines = [];
  lines.push("【命盘】");
  lines.push(`${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d.input)} ${g} ${d.input.location}`);
  lines.push("事件：" + (d.input.events.length ? d.input.events.map((e) => e).join("；") : "无"));
  lines.push("");
  lines.push("四柱：");
  for (const p of d.pillars) {
    lines.push(`- ${p.label}：${p.gan}${p.zhi}（${p.shishen}）`);
  }
  lines.push("");
  lines.push(`日主：${d.dayMaster}${d.dayMasterElement}（${d.dayMasterYinYang}），身${d.strength}，用${d.yongShen}，喜${d.xiShen}`);
  lines.push(`五行：木${d.five.wood}% 火${d.five.fire}% 土${d.five.earth}% 金${d.five.metal}% 水${d.five.water}%`);
  lines.push(`大运：${d.currentDaYun.gan}${d.currentDaYun.zhi}（${d.currentDaYun.startYear}-${d.currentDaYun.endYear}）`);
  if (d.liuNian?.length) lines.push(`流年：${d.liuNian.map((l) => `${l.year}年${l.gan}${l.zhi}`).join("、")}`);
  lines.push("");
  lines.push(OUTPUT_FMT);
  return lines.join("\n");
}

function buildZiweiPrompt(d) {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines = [];
  lines.push("【星盘已排定（紫微引擎计算，勿重复排盘）】");
  lines.push(`出生：${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d.input)}，${g}，出生地：${d.input.location}（经度${d.input.lon}°）`);
  lines.push("已发生事件（用于校准）：" + (d.input.events.length ? d.input.events.map((e, i) => `${i + 1}. ${e}`).join(" ") : "无"));
  lines.push("");
  lines.push(d.ziwei ?? "（星盘数据缺失）");
  lines.push("");
  lines.push(`流年：${d.liuNian.map((l) => `${l.year}年（${l.gan}${l.zhi}）`).join("、")}`);
  lines.push("");
  lines.push(OUTPUT_FMT);
  return lines.join("\n");
}

function buildCareerPrompt(d) {
  const g = d.input.gender === "male" ? "男" : "女";
  const cal = d.input.calendar === "lunar" ? "农历" : "公历";
  const lines = [];
  lines.push("【命盘已排定（前端计算，勿重复排盘）】");
  lines.push(`出生：${cal}${d.input.year}年${d.input.month}月${d.input.day}日 ${birthTimeLabel(d.input)}，${g}，出生地：${d.input.location}（经度${d.input.lon}°）`);
  lines.push("已发生事件（用于校准）：" + (d.input.events.length ? d.input.events.map((e, i) => `${i + 1}. ${e}`).join(" ") : "无"));
  lines.push("");
  lines.push("四柱：");
  for (const p of d.pillars) {
    const hidden = p.hidden.map((h) => h.gan + h.shishen).join("、");
    const kw = p.kongwang ? `，空亡：${p.kongwang}` : "";
    lines.push(`- ${p.label}：${p.gan}${p.zhi}（${p.shishen}），藏干：${hidden}，纳音：${p.nayan}${kw}`);
  }
  lines.push("");
  lines.push(`日主：${d.dayMaster}（${d.dayMasterYinYang}${d.dayMasterElement}），生肖：${d.animal}，身${d.strength}，用神：${d.yongShen}，喜神：${d.xiShen}`);
  if (d.shenSha?.length) lines.push(`神煞：${d.shenSha.join("、")}`);
  lines.push(`五行能量：木${d.five.wood}%、火${d.five.fire}%、土${d.five.earth}%、金${d.five.metal}%、水${d.five.water}%`);
  const san = [d.taiYuan && `胎元${d.taiYuan}`, d.mingGong && `命宫${d.mingGong}`, d.shenGong && `身宫${d.shenGong}`].filter(Boolean);
  if (san.length) lines.push(`三垣：${san.join("，")}`);
  lines.push(`当前大运：${d.currentDaYun.gan}${d.currentDaYun.zhi}（${d.qiYunAge}岁起运，${d.currentDaYun.startYear}-${d.currentDaYun.endYear}）`);
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

function buildUserPrompt(d) {
  if (d.view === "ziwei") return buildZiweiPrompt(d);
  if (d.view === "career") return buildCareerPrompt(d);
  return buildBaziPrompt(d);
}

// ===== 梅花易数 =====

function buildAskPrompt(d) {
  const lines = [];
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

// ===== JSON 解析与归一化 =====

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI 输出不是有效 JSON");
  }
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

function cardList(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return { text: x, basis: "", confidence: 0.7 };
      if (x && typeof x === "object") {
        const o = x;
        return {
          text: typeof o.text === "string" ? o.text.trim() : "",
          basis: typeof o.basis === "string" ? o.basis.trim() : "",
          confidence: typeof o.confidence === "number" ? clamp(o.confidence) : 0.7,
        };
      }
      return null;
    })
    .filter((x) => !!x && x.text.length > 0)
    .slice(0, 5);
}

function strArr(v, max = 5) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .slice(0, max)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(raw) {
  const o = raw ?? {};
  const cards = o.cards ?? {};
  const liu = o.liuNian ?? {};
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

function isComplete(a) {
  const hasCard = Object.values(a.cards).some((arr) => arr.some((c) => c.text));
  return hasCard && Object.values(a.liuNian).some((v) => v) && a.advice.length > 0;
}

function normalizeAsk(raw) {
  const o = raw ?? {};
  const situ = o.situation ?? {};
  const timing = o.timing ?? {};
  const adv = Array.isArray(o.advice)
    ? o.advice
        .map((x) => {
          if (typeof x === "string") return { text: x, basis: "", confidence: 0.7 };
          const obj = x ?? {};
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

function isCompleteAsk(a) {
  return !!a.summary && !!a.situation.text && a.advice.length >= 2;
}

// ===== 模型调用（hunyuan-v3 组 + hy3，消耗成长计划免费额度） =====
//
// 第一性原理（根因）：
// CloudBase HTTP 网关（tcbgw）默认上游超时确实 15s（不可改），
// 但实测调 divine 总在 ~10-12s 触发 model_timeout，
// 真正的根因是 @cloudbase/node-sdk 的 cloud.init() 默认 timeout=15000ms，
// AI generateText 走 node-sdk 内部 HTTP，超时由它控制。
// 修复：cloud.init 显式传 timeout=50000，给混元充足时间。
// 注意：网关 15s 上限还在，所以单次调用最长 14s 就要返回（保留 1s 余量）。

const MODEL_TIMEOUT_MS = 13500;  // 单次 LLM 调用守卫（实测混元八字 prompt ~10-12s，留 1.5s 余量到网关 15s 上限）
const SDK_TIMEOUT_MS = 50000;    // node-sdk 自身超时（确保 SDK 不抢先超时）

async function callModel(systemPrompt, userPrompt, maxTokens) {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV, timeout: SDK_TIMEOUT_MS });
  const model = app.ai().createModel("hunyuan-v3");
  const body = {
    model: "hy3",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  };
  // 超时守卫：超时抛错让上层 catch 走降级路径
  let timer;
  const timeoutP = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("model_timeout")), MODEL_TIMEOUT_MS);
  });
  try {
    const res = await Promise.race([model.generateText(body), timeoutP]);
    clearTimeout(timer);
    return res.text;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ===== 输入校验（移植自原 Cloudflare functions） =====

function validPillars(pillars) {
  if (!Array.isArray(pillars) || pillars.length !== MAX_PILLARS) return false;
  return pillars.every((p) => {
    if (!p || typeof p !== "object") return false;
    const o = p;
    for (const k of ["label", "gan", "zhi", "shishen", "nayan", "kongwang"]) {
      if (typeof o[k] !== "string" || o[k].length > MAX_FIELD_LEN) return false;
    }
    if (!Array.isArray(o.hidden) || o.hidden.length > MAX_HIDDEN) return false;
    return o.hidden.every((h) => {
      if (!h || typeof h !== "object") return false;
      const ho = h;
      return typeof ho.gan === "string" && ho.gan.length <= MAX_FIELD_LEN &&
        typeof ho.shishen === "string" && ho.shishen.length <= MAX_FIELD_LEN;
    });
  });
}

function validExtra(o) {
  if (o.shenSha !== undefined) {
    if (!Array.isArray(o.shenSha) || o.shenSha.length > MAX_SHEN_SHA) return false;
    if (o.shenSha.some((s) => typeof s !== "string" || s.length > MAX_SHA_LEN)) return false;
  }
  if (o.five !== undefined) {
    const f = o.five;
    if (!f || typeof f !== "object") return false;
    for (const k of ["wood", "fire", "earth", "metal", "water"]) {
      if (typeof f[k] !== "number" || !Number.isFinite(f[k]) || f[k] < 0 || f[k] > 100) return false;
    }
  }
  for (const k of ["taiYuan", "mingGong", "shenGong"]) {
    if (o[k] !== undefined && (typeof o[k] !== "string" || o[k].length > MAX_GONG_LEN)) return false;
  }
  if (o.ziwei !== undefined && (typeof o.ziwei !== "string" || o.ziwei.length > MAX_ZIWEI_LEN)) return false;
  return true;
}

function validHexName(name) {
  return typeof name === "string" && /^[\u4e00-\u9fff]{2,6}$/.test(name);
}

// ===== HTTP 处理 =====

function json(statusCode, payload, origin) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(payload),
  };
}

async function handleDivine(body, origin) {
  const data = body;
  const { input, pillars } = data;
  if (!input || typeof input !== "object") return json(400, { error: "缺少命盘数据" }, origin);
  if (!validPillars(pillars)) return json(400, { error: "命盘数据格式不合法" }, origin);
  if (!validExtra(data)) return json(400, { error: "校准数据格式不合法" }, origin);
  if (data.view !== undefined && !VIEWS.has(data.view)) return json(400, { error: "无效的分析视角" }, origin);
  const events = input.events;
  if (!Array.isArray(events) || events.length > MAX_EVENTS) return json(400, { error: "事件数量超限" }, origin);
  if (events.some((e) => typeof e !== "string" || e.length > MAX_EVENT_LEN)) return json(400, { error: "事件内容超限" }, origin);

  const t0 = Date.now();
  try {
    const content = await callModel(SYSTEM_PROMPT, buildUserPrompt(data), 800);
    const analysis = normalize(parseJson(content));
    console.log("divine ok", { duration: Date.now() - t0, summaryLen: analysis.summary.length });
    return json(200, { ok: true, analysis }, origin);
  } catch (e) {
    // 诊断：把真实错误类型 + 耗时 + 消息抛给客户端（生产诊断阶段，永久保留以防回归）
    const errName = e instanceof Error ? e.name : typeof e;
    const errMsg = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    console.error("divine model error:", errName, errMsg, "duration:", Date.now() - t0);
    return json(502, { ok: false, error: "服务繁忙，请稍后再试", _diag: { name: errName, msg: errMsg, duration: Date.now() - t0 } }, origin);
  }
}

async function handleAsk(body, origin) {
  const data = body;
  if (data.feature !== "meihua_ask") return json(400, { error: "未知功能" }, origin);
  const q = data.question;
  if (typeof q !== "string" || q.trim().length === 0 || q.length > MAX_QUESTION_LEN) {
    return json(400, { error: "问题不合法" }, origin);
  }
  const calc = data.calculation;
  if (!calc || typeof calc !== "object") return json(400, { error: "缺少卦象数据" }, origin);

  if (!validHexName(calc.mainName) || !validHexName(calc.changedName)) return json(400, { error: "卦名不合法" }, origin);
  if (typeof calc.mainUpper !== "string" || !TRIGRAMS.has(calc.mainUpper) ||
      typeof calc.mainLower !== "string" || !TRIGRAMS.has(calc.mainLower)) return json(400, { error: "上下卦不合法" }, origin);
  if (typeof calc.tiGua !== "string" || !TRIGRAMS.has(calc.tiGua) ||
      typeof calc.yongGua !== "string" || !TRIGRAMS.has(calc.yongGua)) return json(400, { error: "体用卦不合法" }, origin);
  if (typeof calc.movingLine !== "number" || !Number.isInteger(calc.movingLine) || calc.movingLine < 1 || calc.movingLine > 6) {
    return json(400, { error: "动爻不合法" }, origin);
  }
  if (typeof calc.intention !== "number" || !Number.isInteger(calc.intention) || calc.intention < 1 || calc.intention > 999) {
    return json(400, { error: "心念数不合法" }, origin);
  }
  if (typeof calc.tiYongRelation !== "string" || !TI_YONG_RELATIONS.has(calc.tiYongRelation)) {
    return json(400, { error: "体用关系不合法" }, origin);
  }
  if (typeof calc.lunarDate !== "string" || calc.lunarDate.length > 30 ||
      typeof calc.timeZhi !== "string" || calc.timeZhi.length > 2) {
    return json(400, { error: "起卦时刻不合法" }, origin);
  }
  if (typeof calc.formula !== "string" || calc.formula.length > MAX_FORMULA_LEN) {
    return json(400, { error: "起卦依据不合法" }, origin);
  }

  const req = {
    question: q.trim(),
    calculation: calc,
  };
  try {
    // 网关 15s 上限内只够调一次
    const content = await callModel(ASK_SYSTEM_PROMPT, buildAskPrompt(req), 800);
    const analysis = normalizeAsk(parseJson(content));
    return json(200, { ok: true, analysis }, origin);
  } catch (e) {
    console.error("ask model error:", e instanceof Error ? e.message : e);
    return json(502, { error: "服务繁忙，请稍后再试" }, origin);
  }
}

async function handleRequest(event) {
  const origin = event.headers?.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { error: "禁止的来源" }, origin);
  }
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true }, origin);
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "仅支持 POST" }, origin);
  }

  const bodyStr = event.body || "";
  if (bodyStr.length > MAX_BODY_BYTES) {
    return json(413, { error: "请求体过大" }, origin);
  }
  let body;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    return json(400, { error: "无效请求体" }, origin);
  }
  if (!body || typeof body !== "object") {
    return json(400, { error: "无效请求体" }, origin);
  }

  const path = event.path || "/";
  if (path.endsWith("/divine")) return handleDivine(body, origin);
  if (path.endsWith("/ask")) return handleAsk(body, origin);
  return json(404, { error: "未知路径" }, origin);
}

// Web 函数模式（scf_bootstrap 启动本文件，HTTP server 监听 PORT）
const http = require("http");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyStr = Buffer.concat(chunks).toString("utf8");
  const event = {
    path: url.pathname,
    httpMethod: req.method,
    headers: req.headers,
    body: bodyStr,
  };
  const result = await handleRequest(event);
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
});

const port = parseInt(process.env.PORT, 10) || 9000;
server.listen(port, "0.0.0.0", () => {
  console.log(`guanlan-ai listening on ${port}`);
});

exports.main = handleRequest;
