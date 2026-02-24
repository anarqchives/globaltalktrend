import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  countryCode?: string;
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
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchNewsData(): Promise<TrendItem[]> {
  const key = Deno.env.get("NEWSDATA_API_KEY");
  if (!key) { console.log("NEWSDATA_API_KEY not set"); return []; }
  try {
    const res = await fetch(`https://newsdata.io/api/1/latest?apikey=${key}&language=pt,en&size=5`);
    if (!res.ok) { console.error("NewsData error:", res.status); return []; }
    const data = await res.json();
    return (data.results || []).map((a: any) => {
      const src = a.source_name || a.source_id || "NewsData";
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 15 + 5), "artigos");
      return {
        icon: "📰",
        platform: "NewsData",
        title: a.title || "Sem título",
        category: (a.category || ["Notícias"])[0] || "Notícias",
        time: "agora",
        volume: src,
        change: "+novo",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
        details: a.description?.slice(0, 200) || "",
        description: a.description?.slice(0, 150) || "",
        sourceUrl: a.link || "",
        thumbnail: a.image_url || "",
        publishedAt: a.pubDate || "",
        countryCode: (a.country || ["US"])[0]?.toUpperCase() || "US",
        historicalData,
        metricLabel,
        trustBadge: "international",
      };
    });
  } catch (e) { console.error("NewsData fetch error:", e); return []; }
}

async function fetchGNews(): Promise<TrendItem[]> {
  const key = Deno.env.get("GNEWS_API_KEY");
  if (!key) { console.log("GNEWS_API_KEY not set"); return []; }
  try {
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?lang=pt&max=5&apikey=${key}`);
    if (!res.ok) {
      // Fallback to English
      const res2 = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&max=5&apikey=${key}`);
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return mapGNewsArticles(data2.articles || []);
    }
    const data = await res.json();
    return mapGNewsArticles(data.articles || []);
  } catch (e) { console.error("GNews fetch error:", e); return []; }
}

function mapGNewsArticles(articles: any[]): TrendItem[] {
  return articles.map((a: any) => {
    const src = a.source?.name || "GNews";
    const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 12 + 3), "artigos");
    return {
      icon: "🗞️",
      platform: "GNews",
      title: a.title || "Sem título",
      category: "Notícias",
      time: "agora",
      volume: src,
      change: "+novo",
      changePositive: true,
      sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
      details: a.description?.slice(0, 200) || "",
      description: a.description?.slice(0, 150) || "",
      sourceUrl: a.url || "",
      thumbnail: a.image || "",
      publishedAt: a.publishedAt || "",
      countryCode: "BR",
      historicalData,
      metricLabel,
      trustBadge: "international",
    };
  });
}

async function fetchBingNews(): Promise<TrendItem[]> {
  const key = Deno.env.get("BING_NEWS_API_KEY");
  if (!key) { console.log("BING_NEWS_API_KEY not set"); return []; }
  try {
    const res = await fetch("https://api.bing.microsoft.com/v7.0/news/trendingtopics?mkt=pt-BR&count=5", {
      headers: { "Ocp-Apim-Subscription-Key": key },
    });
    if (!res.ok) {
      // Fallback: try top news
      const res2 = await fetch("https://api.bing.microsoft.com/v7.0/news?mkt=en-US&count=5", {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return (data2.value || []).map((a: any) => {
        const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 10 + 5), "menções");
        return {
          icon: "🔎",
          platform: "Bing News",
          title: a.name || "Sem título",
          category: a.category || "Notícias",
          time: "agora",
          volume: a.provider?.[0]?.name || "Bing",
          change: "+novo",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
          details: a.description?.slice(0, 200) || "",
          sourceUrl: a.url || "",
          countryCode: "US",
          historicalData,
          metricLabel,
          trustBadge: "international",
        };
      });
    }
    const data = await res.json();
    return (data.value || []).map((topic: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 10), "buscas");
      return {
        icon: "🔎",
        platform: "Bing News",
        title: topic.name || topic.query?.text || "Sem título",
        category: "Trending",
        time: "agora",
        volume: topic.image?.url ? "com imagem" : "trending",
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: topic.newsSearchUrl ? `Pesquisar: ${topic.name}` : "",
        sourceUrl: topic.webSearchUrl || topic.newsSearchUrl || "",
        countryCode: "BR",
        historicalData,
        metricLabel,
        trustBadge: "international",
      };
    });
  } catch (e) { console.error("Bing News fetch error:", e); return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      return new Response(cachedResponse.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [newsData, gnews, bing] = await Promise.all([
      fetchNewsData(),
      fetchGNews(),
      fetchBingNews(),
    ]);
    
    const trends = [...newsData, ...gnews, ...bing];
    console.log(`fetch-news-extra: ${newsData.length} NewsData, ${gnews.length} GNews, ${bing.length} Bing`);
    
    const responseData = JSON.stringify({ trends });
    cachedResponse = { data: responseData, timestamp: Date.now() };

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-news-extra:", error);
    return new Response(
      JSON.stringify({ error: "Failed", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
