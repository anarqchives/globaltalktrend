import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://globaltalktrend.lovable.app',
  'https://globaltalktrend.com',
  'https://www.globaltalktrend.com',
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
  { query: "artificial+intelligence", label: "Inteligência Artificial" },
  { query: "climate+change", label: "Mudanças Climáticas" },
  { query: "public+health", label: "Saúde Pública" },
  { query: "quantum+computing", label: "Computação Quântica" },
  { query: "renewable+energy", label: "Energia Renovável" },
];

async function fetchCrossrefTopic(query: string, rows: number): Promise<any[]> {
  try {
    const url = `https://api.crossref.org/works?query=${query}&sort=is-referenced-by-count&order=desc&rows=${rows}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "GlobalTalk/1.0 (mailto:contato@globaltalktrend.com)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.message?.items || [];
  } catch { return []; }
}

function parseDateParts(published: any): string {
  try {
    const parts = published?.["date-parts"]?.[0];
    if (!parts || !parts[0]) return "";
    const y = parts[0];
    const m = (parts[1] || 1).toString().padStart(2, "0");
    const d = (parts[2] || 1).toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch { return ""; }
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

    const results = await Promise.all(
      TOPICS.map(t => fetchCrossrefTopic(t.query, 4))
    );

    const trends: any[] = [];
    results.forEach((items, topicIdx) => {
      items.forEach((item: any) => {
        const title = Array.isArray(item.title) ? item.title[0] : item.title;
        if (!title) return;
        const citations = item["is-referenced-by-count"] || 0;
        if (citations < 5) return;

        const journal = Array.isArray(item["container-title"]) ? item["container-title"][0] : "";
        const doi = item.DOI || "";
        const publishedAt = parseDateParts(item.published || item.created);

        trends.push({
          icon: "📄",
          platform: "Crossref",
          title: title.slice(0, 120),
          category: "Ciência",
          time: "recente",
          volume: `${citations >= 1000 ? `${(citations / 1000).toFixed(1)}K` : citations} citações`,
          change: "+novo",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, (_, i) => Math.round(20 + citations * 0.01 * i + Math.random() * 15)),
          details: `Publicado em ${journal || "Journal"} · ${citations} citações · Tema: ${TOPICS[topicIdx].label}`,
          description: `${citations} citações acadêmicas`,
          sourceUrl: doi ? `https://doi.org/${doi}` : item.URL || "",
          countryCode: "US",
          trustBadge: "scientific",
          publishedAt,
        });
      });
    });

    // Sort by citations and limit
    trends.sort((a, b) => {
      const ca = parseInt(a.volume) || 0;
      const cb = parseInt(b.volume) || 0;
      return cb - ca;
    });
    const limited = trends.slice(0, 15);

    cache = { ts: Date.now(), data: limited };

    return new Response(JSON.stringify({ trends: limited }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Crossref error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
