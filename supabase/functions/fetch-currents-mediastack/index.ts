import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://gttmonitor.com', 'https://www.gttmonitor.com',
  'http://localhost:8080', 'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}

function generateHistorical(baseValue: number, label: string) {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    data.push({ hour: hourStr, value: Math.round(baseValue * progress * noise) });
  }
  return { historicalData: data, metricLabel: label };
}

function sparkRandom() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

function inferCategory(title: string, description?: string): string {
  const text = `${title} ${description || ""}`.toLowerCase();
  if (/politi|elect|govern|congress|senat|trump|biden|lula|macron|guerra|war|conflict|sanction/i.test(text)) return "Geopolítica";
  if (/tech|ai|artificial|robot|software|cyber|chip|quantum|startup|app\b/i.test(text)) return "Tecnologia";
  if (/econom|market|stock|gdp|inflation|trade|tariff|dollar|euro|crypto|bitcoin/i.test(text)) return "Economia";
  if (/health|medic|virus|vaccin|hospital|disease|cancer|drug|pharma|who\b/i.test(text)) return "Ciências";
  if (/sport|football|soccer|nba|nfl|olympic|champion|tennis|f1|formula/i.test(text)) return "Esportes";
  if (/film|movie|music|album|concert|series|netflix|disney|award|oscar/i.test(text)) return "Entretenimento";
  if (/cultur|art|museum|book|festival|fashion|language|heritage/i.test(text)) return "Cultura";
  return "Geral";
}

function detectCountry(title: string, source?: string): string | undefined {
  const text = `${title} ${source || ""}`.toLowerCase();
  const map: Record<string, string> = {
    "brasil": "BR", "brazil": "BR", "eua": "US", "united states": "US", "usa": "US",
    "china": "CN", "russia": "RU", "india": "IN", "japan": "JP", "uk": "GB",
    "france": "FR", "germany": "DE", "spain": "ES", "italy": "IT", "mexico": "MX",
    "argentina": "AR", "colombia": "CO", "canada": "CA", "australia": "AU",
    "south korea": "KR", "turkey": "TR", "saudi": "SA", "israel": "IL",
    "ukraine": "UA", "iran": "IR", "iraq": "IQ", "nigeria": "NG",
  };
  for (const [kw, code] of Object.entries(map)) {
    if (text.includes(kw)) return code;
  }
  return undefined;
}

// ── Currents API ──
async function fetchCurrents(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("CURRENTS_API_KEY");
  if (!key) {
    console.log("⚠️ CURRENTS_API_KEY not configured, skipping Currents");
    return [];
  }
  try {
    const langMap: Record<string, string> = { pt: "pt", en: "en", es: "es", fr: "fr", de: "de" };
    const apiLang = langMap[lang] || "en";
    const res = await fetch(
      `https://api.currentsapi.services/v1/latest-news?language=${apiLang}&apiKey=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      console.error(`Currents API error: ${res.status}`);
      await res.text();
      return [];
    }
    const data = await res.json();
    const articles = data.news || [];
    console.log(`📰 Currents retornou: ${articles.length} artigos`);
    return articles.slice(0, 15).map((a: any) => {
      const cat = inferCategory(a.title, a.description);
      const country = detectCountry(a.title, a.author);
      const hist = generateHistorical(50 + Math.floor(Math.random() * 50), "Relevância");
      return {
        icon: "📰",
        platform: "Currents",
        title: a.title || "Sem título",
        category: cat,
        time: a.published ? new Date(a.published).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
        volume: "–",
        change: "–",
        changePositive: true,
        sparkData: sparkRandom(),
        details: a.description || "",
        description: a.description || "",
        countryCode: country,
        sourceUrl: a.url || "",
        trustBadge: "press",
        publishedAt: a.published || new Date().toISOString(),
        ...hist,
      };
    });
  } catch (e) {
    console.error("Currents fetch error:", e);
    return [];
  }
}

// ── Mediastack API ──
async function fetchMediastack(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("MEDIASTACK_ACCESS_KEY");
  if (!key) {
    console.log("⚠️ MEDIASTACK_ACCESS_KEY not configured, skipping Mediastack");
    return [];
  }
  try {
    const langMap: Record<string, string> = { pt: "pt", en: "en", es: "es", fr: "fr", de: "de", it: "it" };
    const apiLang = langMap[lang] || "en";
    const res = await fetch(
      `http://api.mediastack.com/v1/news?access_key=${key}&languages=${apiLang}&limit=15&sort=published_desc`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      console.error(`Mediastack API error: ${res.status}`);
      await res.text();
      return [];
    }
    const data = await res.json();
    const articles = data.data || [];
    console.log(`📰 Mediastack retornou: ${articles.length} artigos`);
    return articles.slice(0, 15).map((a: any) => {
      const cat = a.category ? a.category.charAt(0).toUpperCase() + a.category.slice(1) : inferCategory(a.title, a.description);
      const country = a.country ? a.country.toUpperCase() : detectCountry(a.title, a.source);
      const hist = generateHistorical(40 + Math.floor(Math.random() * 60), "Relevância");
      return {
        icon: "📡",
        platform: "Mediastack",
        title: a.title || "Sem título",
        category: cat,
        time: a.published_at ? new Date(a.published_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
        volume: "–",
        change: "–",
        changePositive: true,
        sparkData: sparkRandom(),
        details: a.description || "",
        description: a.description || "",
        countryCode: typeof country === "string" ? country.substring(0, 2) : undefined,
        sourceUrl: a.url || "",
        trustBadge: "press",
        publishedAt: a.published_at || new Date().toISOString(),
        ...hist,
      };
    });
  } catch (e) {
    console.error("Mediastack fetch error:", e);
    return [];
  }
}

// ── Cache ──
let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      return new Response(cachedResponse.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    let lang = "pt";
    try {
      const body = await req.json();
      lang = body.lang || "pt";
    } catch { /* default */ }

    const [currentsItems, mediastackItems] = await Promise.all([
      fetchCurrents(lang),
      fetchMediastack(lang),
    ]);

    console.log(`fetch-currents-mediastack: ${currentsItems.length} Currents, ${mediastackItems.length} Mediastack`);

    const trends = [...currentsItems, ...mediastackItems];
    const body = JSON.stringify({ trends });
    cachedResponse = { data: body, timestamp: Date.now() };

    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-currents-mediastack error:", e);
    return new Response(JSON.stringify({ error: "Failed", trends: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
