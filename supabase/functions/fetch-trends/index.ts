import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  limited?: boolean;
  details?: string;
  // Enriched metrics
  likeRatio?: number;
  commentCount?: number;
  region?: string;
  sources?: string[];
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}

// Generate simulated 24h historical data with a realistic curve
function generateHistorical(baseValue: number, label: string): { historicalData: { hour: string; value: number }[]; metricLabel: string } {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    // Create a rising curve with some noise
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchYouTubeTrends(): Promise<TrendItem[]> {
  const API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=BR&maxResults=5&key=${API_KEY}`
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
        likeRatio,
        commentCount: comments,
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return [];
  }
}

async function fetchGoogleTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch(
      "https://trends.google.com/trending/rss?geo=BR",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TrendSphere/1.0)",
          "Accept": "application/xml, text/xml, */*",
        },
      }
    );
    if (!res.ok) {
      console.error("Google Trends RSS error:", res.status, await res.text());
      return [];
    }
    const xml = await res.text();
    
    const items: TrendItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < 5) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
        || block.match(/<title>(.*?)<\/title>/)?.[1] 
        || "Sem título";
      const traffic = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || "N/A";
      const newsTitle = block.match(/<ht:news_item_title><!\[CDATA\[(.*?)\]\]>/)?.[1] 
        || block.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1] || "";
      const newsSource = block.match(/<ht:news_item_source>(.*?)<\/ht:news_item_source>/)?.[1] || "Tendência";
      
      // Parse traffic number for historical generation
      const trafficNum = parseInt(traffic.replace(/[^0-9]/g, "")) || 500;
      const { historicalData, metricLabel } = generateHistorical(trafficNum, "índice de busca");

      items.push({
        icon: "🔍",
        platform: "Google Trends",
        title,
        category: newsSource,
        time: "agora",
        volume: `${traffic} buscas`,
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: newsTitle,
        region: "Brasil",
        historicalData,
        metricLabel,
      });
      count++;
    }
    
    console.log(`Google Trends: found ${items.length} items`);
    return items;
  } catch (e) {
    console.error("Google Trends fetch error:", e);
    return [];
  }
}

async function fetchNewsAPI(): Promise<TrendItem[]> {
  const API_KEY = Deno.env.get("NEWSAPI_KEY");
  
  if (!API_KEY) {
    console.error("NEWSAPI_KEY not set - skipping NewsAPI");
    return [];
  }

  try {
    let url = `https://newsapi.org/v2/top-headlines?country=br&pageSize=5&apiKey=${API_KEY}`;
    
    let res = await fetch(url);
    let data = await res.json();
    if (!res.ok || !data.articles?.length) {
      url = `https://newsapi.org/v2/top-headlines?language=pt&pageSize=5&apiKey=${API_KEY}`;
      res = await fetch(url);
      data = await res.json();
    }
    if (!res.ok || !data.articles?.length) {
      url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey=${API_KEY}`;
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
        sources: [sourceName],
        historicalData,
        metricLabel,
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
    // Cache check
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      console.log("Serving cached response");
      return new Response(cachedResponse.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [youtube, news, googleTrends] = await Promise.all([
      fetchYouTubeTrends(),
      fetchNewsAPI(),
      fetchGoogleTrends(),
    ]);
    const trends = [...youtube, ...news, ...googleTrends];
    const responseData = JSON.stringify({ trends });

    // Update cache
    cachedResponse = { data: responseData, timestamp: Date.now() };

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
