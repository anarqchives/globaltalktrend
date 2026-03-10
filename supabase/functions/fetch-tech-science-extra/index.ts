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
  };
}

let cache: { ts: number; data: any[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchLobsters(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch("https://lobste.rs/hottest.json", {
      headers: { "User-Agent": "GlobalTalk/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).slice(0, 8).map((item: any) => ({
      icon: "🦞",
      platform: "Lobsters",
      title: (item.title || "").slice(0, 120),
      category: "Tecnologia",
      time: "recente",
      volume: `${item.score || 0} pontos`,
      change: `+${item.comment_count || 0} comments`,
      changePositive: true,
      sparkData: Array.from({ length: 10 }, (_, i) => Math.round(20 + (item.score || 10) * 0.5 * (i / 10) + Math.random() * 15)),
      details: `${item.comment_count || 0} comentários · Tags: ${(item.tags || []).join(", ")}`,
      description: (item.description || "").slice(0, 150),
      sourceUrl: item.url || item.short_id_url || "",
      countryCode: "US",
      trustBadge: "verified",
    }));
  } catch { return []; }
}

async function fetchArxiv(): Promise<any[]> {
  try {
    const url = "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=8";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "GlobalTalk/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();

    // Parse Atom XML with regex
    const entries: any[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const id = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || "";
      const categories = Array.from(entry.matchAll(/category term="([^"]+)"/g)).map(m => m[1]);

      if (title) {
        entries.push({
          icon: "📄",
          platform: "arXiv",
          title: title.slice(0, 120),
          category: "Ciência",
          time: "recente",
          volume: "Preprint",
          change: "+novo",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, (_, i) => Math.round(10 + i * 5 + Math.random() * 20)),
          details: summary.slice(0, 200),
          description: summary.slice(0, 150),
          sourceUrl: id,
          countryCode: "US",
          trustBadge: "scientific",
          publishedAt: published,
        });
      }
    }
    return entries.slice(0, 8);
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

    const [lobsters, arxiv] = await Promise.all([fetchLobsters(), fetchArxiv()]);
    const trends = [...lobsters, ...arxiv];

    cache = { ts: Date.now(), data: trends };

    return new Response(JSON.stringify({ trends }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tech/Science extra error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
