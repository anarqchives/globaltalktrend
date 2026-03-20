import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const ALLOWED_ORIGINS = [
  'https://gttmonitor.com',
  'https://www.gttmonitor.com',
  'http://localhost:8080',
  'http://localhost:5173',
];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}
let cache: { ts: number; data: any[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;
const TOPICS = [
  { query: "artificial intelligence", field: "Computer Science" },
  { query: "climate change", field: "Environmental Science" },
  { query: "gene therapy", field: "Biology" },
  { query: "quantum computing", field: "Physics" },
  { query: "mental health", field: "Psychology" },
];
async function fetchTopic(query: string): Promise<any[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,year,citationCount,url,journal,publicationDate,tldr&year=2025-2026&sort=citationCount:desc`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "GlobalTalk/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch { return []; }
}
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify({ trends: cache.data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const results = await Promise.all(TOPICS.map(t => fetchTopic(t.query)));
    const trends: any[] = [];
    results.forEach((papers, idx) => {
      papers.forEach((paper: any) => {
        if (!paper.title || (paper.citationCount || 0) < 10) return;
        const citations = paper.citationCount || 0;
        const journalName = paper.journal?.name || "Preprint";
        const tldr = paper.tldr?.text || "";
        trends.push({
          icon: "🔬",
          platform: "Semantic Scholar",
          title: paper.title.slice(0, 120),
          category: "Ciência",
          time: "recente",
          volume: `${citations >= 1000 ? `${(citations / 1000).toFixed(1)}K` : citations} citações`,
          change: "+citado",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, (_, i) => Math.round(15 + citations * 0.005 * i + Math.random() * 20)),
          details: tldr || `${citations} citações · ${journalName} · Campo: ${TOPICS[idx].field}`,
          description: tldr.slice(0, 150) || `${citations} citações acadêmicas`,
          sourceUrl: paper.url || "",
          countryCode: "US",
          trustBadge: "scientific",
          publishedAt: paper.publicationDate || "",
        });
      });
    });
    trends.sort((a, b) => {
      const ca = parseInt(a.volume) || 0;
      const cb = parseInt(b.volume) || 0;
      return cb - ca;
    });
    const limited = trends.slice(0, 12);
    cache = { ts: Date.now(), data: limited };
    return new Response(JSON.stringify({ trends: limited }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Semantic Scholar error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
