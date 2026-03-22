const ipCounts = new Map<string, { count: number; reset: number }>();
const LIMIT = 30;
const WINDOW_MS = 60_000;

export function checkRateLimit(req: Request): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const now = Date.now();
  const entry = ipCounts.get(ip);

  if (!entry || now > entry.reset) {
    ipCounts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return null;
  }
  entry.count++;
  if (entry.count > LIMIT) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'application/json' }
    });
  }
  return null;
}
