// Cloudflare Pages Functions：/api/divine POST 代理 → 火山方舟(ark) / OpenCode Zen
// env（ARK_API_KEY / ZEN_API_KEY 等）来自 Pages 项目加密环境变量，浏览器永远接触不到
// 后端切换：AI_PROVIDER=ark（默认，火山方舟 plan / ark-code-latest）| zen（OpenCode Zen）
//
// 防御层（纵深，每层独立生效）：
// 1. 同源白名单：POST 必须带 Origin 且属于本站（curl/脚本无 Origin → 拒绝）
// 2. Cache API 计数限流：每 IP 每分钟 ≤5 次、每小时 ≤30 次（免费层，无 KV 写配额）
// 3. 输入形状：body ≤256KB、events ≤5 条且每条 ≤200 字
import { generateAnalysis, resolveProvider } from "../../lib/zen";
import { ALLOWED_ORIGINS, clientIp, enforceRateLimit, json } from "../_shared";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_EVENTS = 5;
const MAX_EVENT_LEN = 200;
const MAX_PILLARS = 4;
const MAX_FIELD_LEN = 8;
const MAX_HIDDEN = 3;
const MAX_SHEN_SHA = 12; // 神煞数量上限
const MAX_SHA_LEN = 12; // 单个神煞名长度上限
const MAX_GONG_LEN = 8; // 胎元/命宫/身宫长度上限
const MAX_ZIWEI_LEN = 3000; // 紫微星盘序列化文本长度上限（规范约 524 字符，防提示词注入）
const VIEWS = new Set(["bazi", "ziwei", "career"]); // 分析视角白名单（防任意字符串注入）

// pillars 每柱只允许 6 个短字符串字段 + hidden（藏干）小数组，全部限长——防提示词放大
function validPillars(pillars: unknown): pillars is unknown[] {
  if (!Array.isArray(pillars) || pillars.length !== MAX_PILLARS) return false;
  return pillars.every((p) => {
    if (!p || typeof p !== "object") return false;
    const o = p as Record<string, unknown>;
    for (const k of ["label", "gan", "zhi", "shishen", "nayan", "kongwang"] as const) {
      if (typeof o[k] !== "string" || (o[k] as string).length > MAX_FIELD_LEN) return false;
    }
    if (!Array.isArray(o.hidden) || o.hidden.length > MAX_HIDDEN) return false;
    return o.hidden.every((h) => {
      if (!h || typeof h !== "object") return false;
      const ho = h as Record<string, unknown>;
      return typeof ho.gan === "string" && ho.gan.length <= MAX_FIELD_LEN &&
        typeof ho.shishen === "string" && ho.shishen.length <= MAX_FIELD_LEN;
    });
  });
}

// 神煞/五行/三垣/紫微盘：短文本 + 有界数组，防提示词放大
function validExtra(o: Record<string, unknown>): boolean {
  if (o.shenSha !== undefined) {
    if (!Array.isArray(o.shenSha) || o.shenSha.length > MAX_SHEN_SHA) return false;
    if (o.shenSha.some((s) => typeof s !== "string" || s.length > MAX_SHA_LEN)) return false;
  }
  if (o.five !== undefined) {
    const f = o.five as Record<string, unknown>;
    if (!f || typeof f !== "object") return false;
    for (const k of ["wood", "fire", "earth", "metal", "water"] as const) {
      if (typeof f[k] !== "number" || !Number.isFinite(f[k]) || f[k] < 0 || f[k] > 100) return false;
    }
  }
  for (const k of ["taiYuan", "mingGong", "shenGong"] as const) {
    if (o[k] !== undefined && (typeof o[k] !== "string" || o[k].length > MAX_GONG_LEN)) return false;
  }
  // 紫微星盘序列化文本：直接拼进提示词，限长防注入（规范序列化约 524 字符）
  if (o.ziwei !== undefined && (typeof o.ziwei !== "string" || o.ziwei.length > MAX_ZIWEI_LEN)) return false;
  return true;
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
    const limited = await enforceRateLimit(ip, "rl");
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
    const { input, pillars } = data;
    if (!input || typeof input !== "object") {
      return json({ error: "缺少命盘数据" }, 400);
    }
    if (!validPillars(pillars)) {
      return json({ error: "命盘数据格式不合法" }, 400);
    }
    if (!validExtra(data)) {
      return json({ error: "校准数据格式不合法" }, 400);
    }
    if (data.view !== undefined && !VIEWS.has(data.view as string)) {
      return json({ error: "无效的分析视角" }, 400);
    }
    const events = (input as Record<string, unknown>).events;
    if (!Array.isArray(events) || events.length > MAX_EVENTS) {
      return json({ error: "事件数量超限" }, 400);
    }
    if (events.some((e) => typeof e !== "string" || e.length > MAX_EVENT_LEN)) {
      return json({ error: "事件内容超限" }, 400);
    }

    const cfg = resolveProvider(context.env as never);
    if (!cfg.key) {
      return json({ error: `服务端未配置 ${cfg.provider === "ark" ? "ARK_API_KEY" : "ZEN_API_KEY"}` }, 500);
    }

    const analysis = await generateAnalysis(context.env as never, data as never);
    return json({ ok: true, analysis });
  } catch (e) {
    // 内部细节（含上游错误体）不回显给客户端，只返回统一文案
    console.error("api/divine error:", e instanceof Error ? e.message : e);
    return json({ error: "服务繁忙，请稍后再试" }, 502);
  }
}
