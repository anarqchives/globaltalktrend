import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://gttmonitor.com",
  "https://www.gttmonitor.com",
  "http://localhost:8080",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovableproject.com") ||
    origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

interface TrendItem {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  details?: string;
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string;
  publishedAt?: string;
  thumbnail?: string;
}

const CACHE_TTL = 5 * 60 * 1000;
let cached: { data: string; ts: number } | null = null;

function spark(): number[] {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 80) + 20);
}

function detectCategory(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  // ⚠️ Entertainment FIRST — catches reality shows before "voto"/"eliminação" trigger politics
  if (/bbb|big brother|paredão|sincerão|reality show|reality tv|masterchef|the voice|a fazenda|survivor|american idol|got talent/i.test(text)) return "Entretenimento";
  if (/movie|music|celebrity|entertainment|film|series|netflix|disney|anime|manga|trailer|concert|oscar|grammy|novela|streaming|hbo/i.test(text)) return "Entretenimento";
  if (/tech|ai |artificial|software|crypto|blockchain|apple|google|microsoft|robot|openai|chatgpt/i.test(text)) return "Tecnologia";
  if (/sport|football|soccer|nba|nfl|tennis|olympic|championship|league|fifa|campeonato|futebol/i.test(text)) return "Esportes";
  if (/health|covid|vaccine|disease|medical|hospital/i.test(text)) return "Saúde";
  if (/economy|market|stock|gdp|inflation|trade|bank|tariff/i.test(text)) return "Negócios/Finanças";
  if (/climate|environment|pollution|carbon|energy/i.test(text)) return "Clima/Meio Ambiente";
  if (/science|research|study|discovery|space|nasa/i.test(text)) return "Ciência";
  if (/politic|election|government|president|congress|parliament/i.test(text)) return "Política";
  return "Geral";
}

function mapCountry(locale: string | undefined): string {
  if (!locale) return "GL";
  const map: Record<string, string> = {
    us: "US", gb: "GB", br: "BR", fr: "FR", de: "DE", es: "ES", it: "IT",
    pt: "PT", ca: "CA", au: "AU", in: "IN", jp: "JP", kr: "KR", mx: "MX",
    ar: "AR", co: "CO", cl: "CL", za: "ZA", ng: "NG", ke: "KE",
  };
  return map[locale.toLowerCase().slice(0, 2)] || "GL";
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(cached.data, { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("THENEWSAPI_KEY");
    if (!apiKey) {
      console.error("THENEWSAPI_KEY not configured");
      return new Response(JSON.stringify({ trends: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const trends: TrendItem[] = [];

    // Fetch top stories
    const urls = [
      `https://api.thenewsapi.com/v1/news/top?api_token=${apiKey}&language=en&limit=10`,
      `https://api.thenewsapi.com/v1/news/top?api_token=${apiKey}&language=pt&limit=8`,
      `https://api.thenewsapi.com/v1/news/top?api_token=${apiKey}&language=es&limit=5`,
    ];

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) { await res.text(); return []; }
        const json = await res.json();
        return json.data || [];
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const article of r.value) {
        if (!article.title) continue;
        const title = article.title;
        const desc = article.description || article.snippet || "";
        const pub = article.published_at || new Date().toISOString();
        const ago = Math.floor((Date.now() - new Date(pub).getTime()) / 3600000);

        trends.push({
          icon: "📰",
          platform: "The News API",
          title,
          category: detectCategory(title, desc),
          time: ago < 1 ? "Agora" : `${ago}h atrás`,
          volume: "Notícia",
          change: "+novo",
          changePositive: true,
          sparkData: spark(),
          details: desc,
          description: desc,
          countryCode: mapCountry(article.locale),
          sourceUrl: article.url,
          trustBadge: "verified",
          publishedAt: pub,
          thumbnail: article.image_url || undefined,
        });
      }
    }

    const body = JSON.stringify({ trends });
    cached = { data: body, ts: Date.now() };
    return new Response(body, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("TheNewsAPI fetch error:", e);
    return new Response(JSON.stringify({ trends: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
  }
});
