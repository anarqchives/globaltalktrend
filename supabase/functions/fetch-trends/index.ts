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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  limited?: boolean;
  details?: string;
  likeRatio?: number;
  commentCount?: number;
  region?: string;
  countryCode?: string;
  sources?: string[];
  sourceUrl?: string;
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}

// Countries to fetch Google Trends for
const GOOGLE_TRENDS_GEOS: { geo: string; region: string }[] = [
  { geo: "BR", region: "Brasil" },
  { geo: "US", region: "EUA" },
  { geo: "GB", region: "Reino Unido" },
  { geo: "DE", region: "Alemanha" },
  { geo: "FR", region: "França" },
  { geo: "JP", region: "Japão" },
  { geo: "IN", region: "Índia" },
  { geo: "MX", region: "México" },
  { geo: "AR", region: "Argentina" },
  { geo: "IT", region: "Itália" },
  { geo: "ES", region: "Espanha" },
  { geo: "KR", region: "Coreia do Sul" },
  { geo: "AU", region: "Austrália" },
  { geo: "CA", region: "Canadá" },
  { geo: "TR", region: "Turquia" },
  { geo: "RU", region: "Rússia" },
  { geo: "ID", region: "Indonésia" },
  { geo: "NG", region: "Nigéria" },
  { geo: "EG", region: "Egito" },
  { geo: "SA", region: "Arábia Saudita" },
  { geo: "PL", region: "Polônia" },
  { geo: "TH", region: "Tailândia" },
  { geo: "CO", region: "Colômbia" },
  { geo: "ZA", region: "África do Sul" },
  { geo: "PH", region: "Filipinas" },
];

function generateHistorical(baseValue: number, label: string): { historicalData: { hour: string; value: number }[]; metricLabel: string } {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

let cachedResponse: Record<string, { data: string; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

// Map lang codes to YouTube/NewsAPI region codes
const langToYTRegion: Record<string, string> = { pt: "BR", en: "US", es: "MX", fr: "FR", de: "DE", it: "IT", ja: "JP", ko: "KR", ar: "SA", hi: "IN", ru: "RU", zh: "CN" };
const langToNewsAPILang: Record<string, string> = { pt: "pt", en: "en", es: "es", fr: "fr", de: "de", it: "it", ar: "ar", ru: "ru", zh: "zh" };

async function fetchYouTubeTrends(lang = "pt"): Promise<TrendItem[]> {
  const API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY not set");
    return [];
  }

  try {
    const regionCode = langToYTRegion[lang] || "BR";
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&relevanceLanguage=${lang}&maxResults=12&key=${API_KEY}`
    );
    if (!res.ok) {
      console.error("YouTube API error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();

    return (data.items || []).map((item: any) => {
      const views = parseInt(item.statistics?.viewCount || "0", 10);
      const likes = parseInt(item.statistics?.likeCount || "0", 10);
      const comments = parseInt(item.statistics?.commentCount || "0", 10);
      const likeRatio = views > 0 ? Math.round((likes / views) * 1000) / 10 : 0;
      const { historicalData, metricLabel } = generateHistorical(views / 24, "views/hora");

      return {
        icon: "▶",
        platform: "YouTube",
        title: item.snippet?.title || "Sem título",
        category: item.snippet?.categoryId === "25" ? "Notícias" : "Entretenimento",
        time: "agora",
        volume: views >= 1_000_000
          ? `${(views / 1_000_000).toFixed(1)}M views`
          : `${(views / 1_000).toFixed(0)}K views`,
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: item.snippet?.description?.slice(0, 200) || "",
        description: item.snippet?.description?.slice(0, 150) || "",
        likeRatio,
        commentCount: comments,
        countryCode: regionCode,
        sourceUrl: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        publishedAt: item.snippet?.publishedAt || "",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return [];
  }
}

function detectCategoryFromGoogleTrend(trend: { title?: string; description?: string }): string {
  const title = (trend.title || "").toLowerCase();
  const description = (trend.description || "").toLowerCase();

  const categories: Record<string, string[]> = {
    Entretenimento: ["filme", "série", "musica", "música", "trailer", "celebridade", "oscar", "netflix"],
    Esportes: ["futebol", "copa", "jogo", "campeonato", "time", "clube", "partida"],
    Tecnologia: ["celular", "smartphone", "app", "software", "iphone", "samsung", "update", "patch", "tech", "arc raiders"],
    Ciência: ["cientista", "pesquisa", "descoberta", "estudo", "universidade", "langosta", "inseto"],
    "Negócios/Finanças": ["inflação", "pib", "bolsa", "mercado", "dólar", "euro", "ações"],
    Cultura: ["história", "cultura", "arte", "exposição", "museu"],
  };

  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some((k) => title.includes(k) || description.includes(k))) {
      return cat;
    }
  }

  return "Geral";
}

async function fetchGoogleTrendsForGeo(geo: string, region: string, maxItems = 3): Promise<TrendItem[]> {
  try {
    const res = await fetch(
      `https://trends.google.com/trending/rss?geo=${geo}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TrendSphere/1.0)",
          "Accept": "application/xml, text/xml, */*",
        },
      }
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const items: TrendItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < maxItems) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || block.match(/<title>(.*?)<\/title>/)?.[1]
        || "Sem título";
      const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || "N/A";
      const newsTitle = block.match(/<ht:news_item_title><!\[CDATA\[(.*?)\]\]>/)?.[1]
        || block.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1] || "";
      
      const newsUrl = block.match(/<ht:news_item_url><!\[CDATA\[(.*?)\]\]>/)?.[1]
        || block.match(/<ht:news_item_url>(.*?)<\/ht:news_item_url>/)?.[1] || "";

      const trafficNum = parseInt(traffic.replace(/[^0-9]/g, "")) || 500;
      const { historicalData, metricLabel } = generateHistorical(trafficNum, "índice de busca");

      const detectedCategory = detectCategoryFromGoogleTrend({
        title,
        description: newsTitle,
      });

      items.push({
        icon: "🔍",
        platform: "Google Trends",
        title,
        category: detectedCategory,
        time: "agora",
        volume: `${traffic} buscas`,
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: newsTitle,
        region,
        countryCode: geo,
        sourceUrl: newsUrl || `https://trends.google.com/trending?geo=${geo}&q=${encodeURIComponent(title)}`,
        historicalData,
        metricLabel,
      });
      count++;
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchAllGoogleTrends(): Promise<TrendItem[]> {
  // Fetch BR with more items (primary), others with wider coverage
  const promises = GOOGLE_TRENDS_GEOS.map(({ geo, region }) =>
    fetchGoogleTrendsForGeo(geo, region, geo === "BR" ? 10 : 6)
  );

  const results = await Promise.allSettled(promises);
  const allItems: TrendItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }
  console.log(`Google Trends multi-geo: found ${allItems.length} items from ${GOOGLE_TRENDS_GEOS.length} countries`);
  return allItems;
}

async function fetchNewsAPI(lang = "pt"): Promise<TrendItem[]> {
  const API_KEY = Deno.env.get("NEWSAPI_KEY");
  if (!API_KEY) {
    console.error("NEWSAPI_KEY not set - skipping NewsAPI");
    return [];
  }

  try {
    const newsLang = langToNewsAPILang[lang] || "pt";
    let url = `https://newsapi.org/v2/top-headlines?language=${newsLang}&pageSize=12&apiKey=${API_KEY}`;
    let res = await fetch(url);
    let data = await res.json();
    if (!res.ok || !data.articles?.length) {
      // Fallback to English
      url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=12&apiKey=${API_KEY}`;
      res = await fetch(url);
      data = await res.json();
    }

    return (data.articles || []).map((article: any) => {
      const sourceName = article.source?.name || "fonte desconhecida";
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 5), "artigos publicados");

      return {
        icon: "📰",
        platform: "NewsAPI",
        title: article.title || "Sem título",
        category: "Notícias",
        time: "agora",
        volume: sourceName,
        change: "+novo",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
        details: article.description || "",
        description: article.description?.slice(0, 150) || "",
        sources: [sourceName],
        sourceUrl: article.url || "",
        thumbnail: article.urlToImage || "",
        publishedAt: article.publishedAt || "",
        countryCode: "US",
        historicalData,
        metricLabel,
        trustBadge: "international",
      };
    });
  } catch (e) {
    console.error("NewsAPI fetch error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let lang = "pt";
    try { const body = await req.json(); lang = body?.lang || "pt"; } catch { /* no body */ }
    
    const cacheKey = `trends_${lang}`;
    const cached = cachedResponse[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("Serving cached response for lang:", lang);
      return new Response(cached.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [youtube, news, googleTrends] = await Promise.all([
      fetchYouTubeTrends(lang),
      fetchNewsAPI(lang),
      fetchAllGoogleTrends(),
    ]);
    const trends = [...youtube, ...news, ...googleTrends];
    const responseData = JSON.stringify({ trends });

    cachedResponse[cacheKey] = { data: responseData, timestamp: Date.now() };

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch trends", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
