// Cloudflare Pages Functions：/api/ask POST → 梅花易数 AI 解读（真实双后端 ark/zen）
// 起卦一律在前端规则引擎完成（确定性公式），本端点只负责解释结构化卦象 JSON。
// AI 失败/不可用时，前端展示规则卦辞（周易原文白话），绝不伪造 AI。
//
// 防御层：origin 白名单 + 独立限流桶（ask-rl）+ 输入形状校验（卦名/动爻/心念数白名单与边界）
import { generateAskAnalysis } from "../../lib/zen";
import { ALLOWED_ORIGINS, clientIp, enforceRateLimit, json } from "../_shared";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_QUESTION_LEN = 200;
const MAX_NAME_LEN = 6; // 卦名/体用名最多 6 字（如「雷水解」「风火家人」）
const MAX_FORMULA_LEN = 500;

// 八卦名白名单（防提示词注入；体用卦名必须出自先天八卦）
const TRIGRAMS = new Set(["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"]);
// 体用关系是引擎固定枚举，白名单最安全（含括号说明，比 length 上限更精确）
const TI_YONG_RELATIONS = new Set([
  "比和（体用同气，平和顺遂）",
  "体生用（我付出，需留意消耗）",
  "用生体（外部相助，吉）",
  "体克用（我有制衡之力，费力但可控）",
  "用克体（外部压制，宜谨慎防损）",
]);
// 卦名格式：如「雷水解」「风火家人」——只用长度与字形校验（均为汉字）
function validHexName(name: unknown): boolean {
  return typeof name === "string" && /^[一-鿿]{2,6}$/.test(name);
}

export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string | undefined>;
}) {
  try {
    const origin = context.request.headers.get("Origin");
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "禁止的来源" }, 403);
    }

    const ip = clientIp(context.request);
    const limited = await enforceRateLimit(ip, "ask-rl");
    if (limited) {
      return json({ error: "请求过于频繁，请稍后再试" }, 429);
    }

    const size = Number(context.request.headers.get("Content-Length") ?? "0");
    if (size > MAX_BODY_BYTES) {
      return json({ error: "请求体过大" }, 413);
    }

    const body: unknown = await context.request.json();
    if (!body || typeof body !== "object") {
      return json({ error: "无效请求体" }, 400);
    }
    const data = body as Record<string, unknown>;

    if (data.feature !== "meihua_ask") {
      return json({ error: "未知功能" }, 400);
    }
    const q = data.question;
    if (typeof q !== "string" || q.trim().length === 0 || q.length > MAX_QUESTION_LEN) {
      return json({ error: "问题不合法" }, 400);
    }
    const calc = data.calculation as Record<string, unknown> | undefined;
    if (!calc || typeof calc !== "object") {
      return json({ error: "缺少卦象数据" }, 400);
    }

    // 形状校验
    if (!validHexName(calc.mainName) || !validHexName(calc.changedName)) {
      return json({ error: "卦名不合法" }, 400);
    }
    if (typeof calc.mainUpper !== "string" || !TRIGRAMS.has(calc.mainUpper) ||
        typeof calc.mainLower !== "string" || !TRIGRAMS.has(calc.mainLower)) {
      return json({ error: "上下卦不合法" }, 400);
    }
    if (typeof calc.tiGua !== "string" || !TRIGRAMS.has(calc.tiGua) ||
        typeof calc.yongGua !== "string" || !TRIGRAMS.has(calc.yongGua)) {
      return json({ error: "体用卦不合法" }, 400);
    }
    if (typeof calc.movingLine !== "number" || !Number.isInteger(calc.movingLine) || calc.movingLine < 1 || calc.movingLine > 6) {
      return json({ error: "动爻不合法" }, 400);
    }
    if (typeof calc.intention !== "number" || !Number.isInteger(calc.intention) || calc.intention < 1 || calc.intention > 999) {
      return json({ error: "心念数不合法" }, 400);
    }
    if (typeof calc.tiYongRelation !== "string" || !TI_YONG_RELATIONS.has(calc.tiYongRelation)) {
      return json({ error: "体用关系不合法" }, 400);
    }
    if (typeof calc.lunarDate !== "string" || calc.lunarDate.length > 30 ||
        typeof calc.timeZhi !== "string" || calc.timeZhi.length > 2) {
      return json({ error: "起卦时刻不合法" }, 400);
    }
    if (typeof calc.formula !== "string" || calc.formula.length > MAX_FORMULA_LEN) {
      return json({ error: "起卦依据不合法" }, 400);
    }

    const analysis = await generateAskAnalysis(context.env as never, {
      question: q.trim(),
      calculation: {
        mainName: calc.mainName as string,
        changedName: calc.changedName as string,
        movingLine: calc.movingLine as number,
        mainUpper: calc.mainUpper as string,
        mainLower: calc.mainLower as string,
        tiGua: calc.tiGua as string,
        yongGua: calc.yongGua as string,
        tiYongRelation: calc.tiYongRelation as string,
        intention: calc.intention as number,
        lunarDate: calc.lunarDate as string,
        timeZhi: calc.timeZhi as string,
        formula: calc.formula as string,
      },
    });
    return json({ ok: true, analysis });
  } catch (e) {
    console.error("api/ask error:", e instanceof Error ? e.message : e);
    return json({ error: "服务繁忙，请稍后再试" }, 502);
  }
}
