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
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string;
  thumbnail?: string;
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
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

function sparkRandom() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ── Hacker News ──
async function fetchHackerNews(): Promise<TrendItem[]> {
  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!res.ok) return [];
    const ids: number[] = await res.json();
    const top = ids.slice(0, 8);

    const items = await Promise.all(
      top.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (!r.ok) return null;
        return r.json();
      })
    );

    return items.filter(Boolean).map((item: any) => {
      const score = item.score || 0;
      const comments = item.descendants || 0;
      const { historicalData, metricLabel } = generateHistorical(score / 24, "pontos/hora");
      return {
        icon: "🔶",
        platform: "Hacker News",
        title: item.title || "Sem título",
        category: "Tecnologia",
        time: "agora",
        volume: score >= 1000 ? `${(score / 1000).toFixed(1)}K pts` : `${score} pts`,
        change: `+${comments} comments`,
        changePositive: true,
        sparkData: sparkRandom(),
        details: item.text?.replace(/<[^>]*>/g, "").slice(0, 200) || `${comments} comentários no Hacker News`,
        description: `${score} pontos · ${comments} comentários`,
        sourceUrl: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        countryCode: "US",
        trustBadge: "verified",
        publishedAt: item.time ? new Date(item.time * 1000).toISOString() : "",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("HackerNews fetch error:", e);
    return [];
  }
}

// ── Wikipedia Most Read ──
async function fetchWikipediaTrending(): Promise<TrendItem[]> {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");

    const res = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${d}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data.items?.[0]?.articles || [];

    // Filter out main page and special pages
    const filtered = articles
      .filter((a: any) => !["Main_Page", "Special:Search", "-"].includes(a.article))
      .slice(0, 8);

    return filtered.map((a: any) => {
      const views = a.views || 0;
      const { historicalData, metricLabel } = generateHistorical(views / 24, "views/hora");
      const title = a.article.replace(/_/g, " ");
      return {
        icon: "📖",
        platform: "Wikipedia",
        title,
        category: "Cultura",
        time: "ontem",
        volume: views >= 1000000
          ? `${(views / 1000000).toFixed(1)}M views`
          : views >= 1000
          ? `${(views / 1000).toFixed(0)}K views`
          : `${views} views`,
        change: "+trending",
        changePositive: true,
        sparkData: sparkRandom(),
        details: `Artigo "${title}" foi um dos mais acessados na Wikipedia ontem com ${views.toLocaleString()} visualizações.`,
        description: `${views.toLocaleString()} visualizações ontem`,
        sourceUrl: `https://en.wikipedia.org/wiki/${a.article}`,
        countryCode: "US",
        publishedAt: yesterday.toISOString(),
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("Wikipedia fetch error:", e);
    return [];
  }
}

// ── Stack Overflow Hot Questions ──
async function fetchStackOverflow(): Promise<TrendItem[]> {
  try {
    const res = await fetch(
      "https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=6&filter=withbody"
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map((q: any) => {
      const score = q.score || 0;
      const answers = q.answer_count || 0;
      const views = q.view_count || 0;
      const { historicalData, metricLabel } = generateHistorical(views / 24, "views/hora");
      const tags = (q.tags || []).slice(0, 3).join(", ");
      return {
        icon: "💻",
        platform: "Stack Overflow",
        title: q.title?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"') || "Pergunta",
        category: "Tecnologia",
        time: "agora",
        volume: views >= 1000 ? `${(views / 1000).toFixed(1)}K views` : `${views} views`,
        change: `+${answers} respostas`,
        changePositive: answers > 0,
        sparkData: sparkRandom(),
        details: `Tags: ${tags}. Score: ${score}, ${answers} respostas, ${views.toLocaleString()} views.`,
        description: `${tags} · ${score} votos · ${answers} respostas`,
        sourceUrl: q.link || "",
        countryCode: "US",
        trustBadge: "verified",
        publishedAt: q.creation_date ? new Date(q.creation_date * 1000).toISOString() : "",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("StackOverflow fetch error:", e);
    return [];
  }
}

// ── GitHub Trending (scraping the JSON endpoint) ──
async function fetchGitHubTrending(): Promise<TrendItem[]> {
  try {
    // GitHub doesn't have an official trending API, but we can use the search API
    // to find recently created repos with most stars
    const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const res = await fetch(
      `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=6`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "GlobalTalkTrends/1.0",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map((repo: any) => {
      const stars = repo.stargazers_count || 0;
      const forks = repo.forks_count || 0;
      const { historicalData, metricLabel } = generateHistorical(stars / 24, "stars/hora");
      return {
        icon: "🐙",
        platform: "GitHub",
        title: `${repo.full_name}`,
        category: "Tecnologia",
        time: "esta semana",
        volume: stars >= 1000 ? `${(stars / 1000).toFixed(1)}K ⭐` : `${stars} ⭐`,
        change: `+${forks} forks`,
        changePositive: true,
        sparkData: sparkRandom(),
        details: repo.description?.slice(0, 200) || `${repo.language || "Multi-language"} · ${stars.toLocaleString()} stars`,
        description: repo.description?.slice(0, 150) || "",
        sourceUrl: repo.html_url || "",
        countryCode: "US",
        trustBadge: "verified",
        publishedAt: repo.created_at || "",
        thumbnail: repo.owner?.avatar_url || "",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("GitHub fetch error:", e);
    return [];
  }
}

// ── RSS Bridge (Twitter fallback) ──
async function fetchRSSBridge(): Promise<TrendItem[]> {
  const instances = [
    "https://rss-bridge.org/bridge01/",
    "https://rss-bridge.bb8.fun/",
  ];

  for (const baseUrl of instances) {
    try {
      const url = `${baseUrl}?action=display&bridge=TwitterV2Bridge&context=By+keyword&search=trending+OR+viral+OR+breaking&norep=on&noretweet=on&format=Json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];

      return items.slice(0, 5).map((item: any) => {
        const { historicalData, metricLabel } = generateHistorical(
          Math.floor(Math.random() * 50 + 10),
          "interações"
        );
        const content = (item.content_text || item.title || "").slice(0, 100);
        return {
          icon: "𝕏",
          platform: "X (Twitter)",
          title: content || "Post em destaque",
          category: "Social",
          time: "agora",
          volume: "—",
          change: "+trending",
          changePositive: true,
          sparkData: sparkRandom(),
          details: (item.content_text || "").slice(0, 200),
          description: content,
          sourceUrl: item.url || "",
          countryCode: "US",
          publishedAt: item.date_published || "",
          historicalData,
          metricLabel,
        };
      });
    } catch (e) {
      console.error(`RSS Bridge instance failed (${baseUrl}):`, e);
      continue;
    }
  }
  return [];
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

    const [hackerNews, wikipedia, stackoverflow, github, rssBridge] = await Promise.all([
      fetchHackerNews(),
      fetchWikipediaTrending(),
      fetchStackOverflow(),
      fetchGitHubTrending(),
      fetchRSSBridge(),
    ]);

    const trends = [...hackerNews, ...wikipedia, ...stackoverflow, ...github, ...rssBridge];
    console.log(
      `fetch-social-trends: ${hackerNews.length} HN, ${wikipedia.length} Wiki, ${stackoverflow.length} SO, ${github.length} GH, ${rssBridge.length} RSS`
    );

    const responseData = JSON.stringify({ trends });
    cachedResponse = { data: responseData, timestamp: Date.now() };

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-social-trends:", error);
    return new Response(
      JSON.stringify({ error: "Failed", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
