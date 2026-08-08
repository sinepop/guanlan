// Cloudflare Pages Functions 共享工具：origin 白名单 / IP / 限流 / 响应构造
// 下划线前缀：不暴露为路由，仅供 /api/* 复用
declare const caches: { default: Cache };

export const ALLOWED_ORIGINS = new Set([
  "https://cyber-divination-7e4.pages.dev",
  "http://localhost:3000",
  "http://localhost:3100",
]);

export function clientIp(req: Request): string {
  return (req.headers.get("CF-Connecting-IP") ?? "unknown").replace(/[^0-9a-f.:]/g, "");
}

export function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Cache API 计数限流：每分钟 ≤5、每小时 ≤30。
 * namespace 分桶：divine 用 "rl"、ask 用 "ask-rl"，互不影响。
 * 限流设施故障时放行（不误杀），由上游 API 429 兜底。
 */
export async function enforceRateLimit(ip: string, namespace = "rl"): Promise<boolean> {
  try {
    const cache = caches.default;
    const now = Date.now();
    const minKey = `${namespace}:${Math.floor(now / 60000)}:${ip}`;
    const hourKey = `${namespace}:${Math.floor(now / 3600000)}:${ip}`;
    const minCount = await cacheCount(cache, minKey);
    const hourCount = await cacheCount(cache, hourKey);
    if (minCount >= 5 || hourCount >= 30) return true;
    await bumpCount(cache, minKey, 60);
    await bumpCount(cache, hourKey, 3600);
    return false;
  } catch {
    return false;
  }
}

async function cacheCount(cache: Cache, key: string): Promise<number> {
  const res = await cache.match(new Request(`https://internal/rate/${key}`));
  if (!res) return 0;
  const n = Number(await res.text());
  return Number.isFinite(n) ? n : 0;
}

async function bumpCount(cache: Cache, key: string, ttlSeconds: number): Promise<void> {
  const url = `https://internal/rate/${key}`;
  const prev = await cache.match(new Request(url));
  const n = prev ? Number(await prev.text()) + 1 : 1;
  await cache.put(
    new Request(url),
    new Response(String(n), { headers: { "Cache-Control": `s-maxage=${ttlSeconds}` } })
  );
}
