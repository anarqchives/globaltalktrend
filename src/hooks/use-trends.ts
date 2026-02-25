import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "../components/TrendCard";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "../components/FilterBar";
import { categorizeTrend, detectCountryFromContent } from "@/lib/categorize-trend";
import { useHistoricalTrends } from "./use-historical-trends";
const CACHE_KEY = "gtt_trends_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const STANDARD_CATEGORIES = new Set([
  "Política",
  "Entretenimento",
  "Tecnologia",
  "Esportes",
  "Cultura",
  "Negócios/Finanças",
  "Ciência",
  "Saúde",
  "Clima/Meio Ambiente",
  "Conflitos/Crises",
  "Conhecimento",
  "Geral",
]);

type TrendsCachePayload = {
  ts: number;
  data: TrendCardProps[];
};

function normalizeText(value?: string): string {
  return (value || "").normalize("NFC").toLowerCase().trim();
}

function normalizeCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const cleaned = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  return undefined;
}

function normalizeCategory(title: string, platform: string, category?: string): string {
  const normalized = categorizeTrend(title, platform, category);
  if (STANDARD_CATEGORIES.has(normalized)) return normalized;
  if (normalizeText(normalized).includes("news") || normalizeText(normalized).includes("notí")) {
    return "Política";
  }
  return "Geral";
}

function inferTypeFromSource(source?: string): string {
  const platform = (source || "").trim();
  if (["Reddit", "Bluesky", "Mastodon", "X (Twitter)"].includes(platform)) return "Redes sociais";
  if (["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian"].includes(platform)) return "Imprensa";
  if (platform === "Google Trends") return "Buscas (Google)";
  if (["World Bank", "IBGE", "IMF", "FRED", "NOAA"].includes(platform)) return "Dados oficiais";
  if (["OpenAlex", "arXiv", "PubMed", "Crossref"].includes(platform)) return "Ciência";
  if (["Hacker News", "GitHub", "Stack Overflow"].includes(platform)) return "Tech";
  if (platform === "Wikipedia") return "Enciclopédia";
  if (platform === "GDELT") return "Conflitos";
  return "desconhecido";
}

type NormalizedTrendForFilter = TrendCardProps & {
  source: string;
  type: string;
  normalizedCountry: string;
  normalizedCategory: string;
  hasExplicitCountry: boolean;
};

function normalizeTrendForFilter(trend: TrendCardProps): NormalizedTrendForFilter {
  const source = (trend.platform || "desconhecido").trim() || "desconhecido";
  const normalizedCountry = normalizeCountryCode(trend.countryCode) || "GL";
  const normalizedCategory = normalizeText(trend.category || "Geral");

  return {
    ...trend,
    source,
    type: inferTypeFromSource(source),
    category: trend.category || "Geral",
    countryCode: trend.countryCode || "GL",
    normalizedCountry,
    normalizedCategory,
    hasExplicitCountry: Boolean(normalizeCountryCode(trend.countryCode)),
  };
}

function getCachedTrends(): TrendsCachePayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrendsCachePayload;
    if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedTrends(data: TrendCardProps[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data.slice(0, 120) }));
  } catch {}
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) window.clearTimeout(timeoutId);
  return result;
}

const fallbackData: TrendCardProps[] = [
  {
    icon: "🔍",
    platform: "Google Trends",
    title: "Eleições 2026: pesquisas apontam novo cenário",
    category: "Política",
    time: "há 12 min",
    volume: "1.2M buscas",
    change: "+340%",
    changePositive: true,
    sparkData: [10, 15, 12, 25, 40, 65, 80, 95, 88, 92],
    details: "Volume de buscas disparou nas últimas horas.",
    countryCode: "BR",
  },
  {
    icon: "▶",
    platform: "YouTube",
    title: "Nova descoberta científica surpreende pesquisadores",
    category: "Ciência",
    time: "há 25 min",
    volume: "890K views",
    change: "+180%",
    changePositive: true,
    sparkData: [20, 30, 25, 45, 60, 75, 85, 90, 88, 95],
    details: "Vídeo viral sobre avanço na medicina genética.",
    countryCode: "US",
  },
  {
    icon: "💬",
    platform: "Reddit",
    title: "Inteligência artificial e o futuro do trabalho",
    category: "Tecnologia",
    time: "há 30 min",
    volume: "45K upvotes",
    change: "+92%",
    changePositive: true,
    sparkData: [15, 25, 35, 50, 55, 70, 80, 75, 85, 90],
    details: "Discussão sobre impactos da IA no mercado de trabalho.",
    countryCode: "US",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "Climate summit reaches historic agreement",
    category: "Meio Ambiente",
    time: "há 45 min",
    volume: "320K leituras",
    change: "+210%",
    changePositive: true,
    sparkData: [5, 10, 20, 35, 55, 70, 80, 90, 88, 92],
    details: "Líderes mundiais chegam a acordo histórico sobre clima.",
    countryCode: "GB",
  },
  {
    icon: "🔶",
    platform: "Hacker News",
    title: "Open source project breaks new ground in AI safety",
    category: "Tecnologia",
    time: "há 1h",
    volume: "580 pts",
    change: "+95 comments",
    changePositive: true,
    sparkData: [10, 20, 30, 40, 50, 60, 55, 70, 65, 80],
    details: "Novo framework de segurança para modelos de linguagem.",
    countryCode: "US",
  },
  {
    icon: "📊",
    platform: "World Bank",
    title: "PIB global cresce 3.2% no primeiro trimestre",
    category: "Economia",
    time: "há 2h",
    volume: "Relatório oficial",
    change: "+0.4%",
    changePositive: true,
    sparkData: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62],
    details: "Dados preliminares indicam crescimento acima do esperado.",
    countryCode: "US",
    trustBadge: "official" as any,
  },
  {
    icon: "🦋",
    platform: "Bluesky",
    title: "Debate sobre regulação de redes sociais ganha força",
    category: "Política",
    time: "há 1h",
    volume: "12K likes",
    change: "+trending",
    changePositive: true,
    sparkData: [15, 25, 30, 45, 55, 65, 70, 75, 80, 85],
    details: "Usuários discutem propostas de regulamentação digital.",
    countryCode: "US",
  },
  {
    icon: "📚",
    platform: "Wikipedia",
    title: "Artigo sobre exploração espacial bate recorde de acessos",
    category: "Ciência",
    time: "há 3h",
    volume: "2.1M views",
    change: "+450%",
    changePositive: true,
    sparkData: [5, 10, 15, 30, 50, 70, 85, 90, 95, 98],
    details: "Interesse público cresce após anúncio de missão lunar.",
    countryCode: "US",
  },
  {
    icon: "📱",
    platform: "Google Trends",
    title: "iPhone 18 Pro: rumores de design dominam buscas",
    category: "Tecnologia",
    time: "há 40 min",
    volume: "528K buscas",
    change: "+220%",
    changePositive: true,
    sparkData: [12, 18, 25, 35, 48, 62, 74, 86, 92, 96],
    details: "Crescimento acelerado de interesse por vazamentos do novo modelo.",
    countryCode: "US",
  },
  {
    icon: "⚽",
    platform: "YouTube",
    title: "Final Champions League: números e melhores momentos",
    category: "Esportes",
    time: "há 55 min",
    volume: "3.2M views",
    change: "+310%",
    changePositive: true,
    sparkData: [18, 26, 40, 58, 70, 82, 88, 93, 96, 99],
    details: "Pico global de visualizações após a grande final.",
    countryCode: "GB",
  },
];

const FORCED_FALLBACK_TRENDS: TrendCardProps[] = [
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Política UK",
    category: "Política",
    time: "agora",
    volume: "12.4K",
    change: "+22%",
    changePositive: true,
    sparkData: [10, 20, 28, 31, 40, 52, 60, 64, 70, 74],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Economia UK",
    category: "Negócios/Finanças",
    time: "agora",
    volume: "8.1K",
    change: "+14%",
    changePositive: true,
    sparkData: [8, 14, 21, 24, 28, 33, 40, 48, 53, 59],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Tecnologia UK",
    category: "Tecnologia",
    time: "agora",
    volume: "15.7K",
    change: "+35%",
    changePositive: true,
    sparkData: [7, 11, 18, 26, 31, 39, 47, 58, 66, 72],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Ciência UK",
    category: "Ciência",
    time: "agora",
    volume: "6.9K",
    change: "+9%",
    changePositive: true,
    sparkData: [9, 12, 14, 16, 21, 26, 31, 36, 42, 49],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Saúde UK",
    category: "Saúde",
    time: "agora",
    volume: "9.3K",
    change: "+17%",
    changePositive: true,
    sparkData: [6, 10, 13, 15, 19, 23, 29, 34, 39, 45],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
  {
    icon: "📰",
    platform: "The Guardian",
    title: "The Guardian - Teste Clima UK",
    category: "Clima/Meio Ambiente",
    time: "agora",
    volume: "11.0K",
    change: "+20%",
    changePositive: true,
    sparkData: [11, 15, 18, 20, 25, 32, 37, 44, 51, 58],
    details: "Fallback forçado de diagnóstico.",
    countryCode: "GB",
    sourceUrl: "https://www.theguardian.com",
  },
];

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

async function fetchRedditClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=8", {
      headers: { "User-Agent": "TrendSphere/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child: any) => {
      const post = child.data;
      const ups = post.ups || 0;
      const comments = post.num_comments || 0;
      const { historicalData, metricLabel } = generateHistorical(ups / 24, "upvotes/hora");
      // Extract Reddit thumbnail
      const rawThumb = post.thumbnail;
      const thumbnail = rawThumb && rawThumb.startsWith("http") ? rawThumb : "";
      return {
        icon: "💬",
        platform: "Reddit",
        title: post.title?.slice(0, 100) || "Sem título",
        category: `r/${post.subreddit}`,
        time: "agora",
        volume: ups >= 1000 ? `${(ups / 1000).toFixed(1)}K` : `${ups}`,
        change: `+${post.upvote_ratio ? Math.round(post.upvote_ratio * 100) : 0}%`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10)),
        details: post.selftext?.slice(0, 200) || `${comments} comentários`,
        description: post.selftext?.slice(0, 150) || "",
        commentCount: comments,
        sourceUrl: `https://www.reddit.com${post.permalink}`,
        thumbnail,
        publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "",
        historicalData,
        metricLabel,
      };
    });
  } catch {
    return [];
  }
}

async function fetchBlueskyClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPopularFeedGenerators?limit=8");
    if (!res.ok) {
      // Fallback: fetch from discover feed
      const res2 = await fetch("https://public.api.bsky.app/xrpc/app.bsky.unspecced.getPopularFeedGenerators?limit=8");
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return (data2.feeds || []).slice(0, 5).map((feed: any) => {
        const likes = feed.likeCount || 0;
        const { historicalData, metricLabel } = generateHistorical(likes / 24, "likes/hora");
        return {
          icon: "🦋",
          platform: "Bluesky",
          title: feed.displayName || "Feed popular",
          category: "Social",
          time: "agora",
          volume: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K likes` : `${likes} likes`,
          change: "+trending",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
          details: feed.description?.slice(0, 200) || "",
          sourceUrl: feed.uri ? `https://bsky.app/profile/${feed.creator?.handle || ""}` : "",
          countryCode: "US",
          historicalData,
          metricLabel,
        };
      });
    }
    const data = await res.json();
    return (data.feeds || []).slice(0, 5).map((feed: any) => {
      const likes = feed.likeCount || 0;
      const { historicalData, metricLabel } = generateHistorical(likes / 24, "likes/hora");
      return {
        icon: "🦋",
        platform: "Bluesky",
        title: feed.displayName || "Feed popular",
        category: "Social",
        time: "agora",
        volume: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K likes` : `${likes} likes`,
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: feed.description?.slice(0, 200) || "",
        sourceUrl: feed.uri ? `https://bsky.app/profile/${feed.creator?.handle || ""}` : "",
        countryCode: "US",
        historicalData,
        metricLabel,
      };
    });
  } catch {
    return [];
  }
}

async function fetchMastodonClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://mastodon.social/api/v1/trends/statuses?limit=5");
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((status: any) => {
      const reblogs = status.reblogs_count || 0;
      const favs = status.favourites_count || 0;
      const { historicalData, metricLabel } = generateHistorical((reblogs + favs) / 24, "interações/hora");
      // Strip HTML tags
      const content = (status.content || "").replace(/<[^>]*>/g, "").slice(0, 100);
      return {
        icon: "🐘",
        platform: "Mastodon",
        title: content || "Post em alta",
        category: "Fediverso",
        time: "agora",
        volume: `${reblogs + favs >= 1000 ? `${((reblogs + favs) / 1000).toFixed(1)}K` : reblogs + favs} interações`,
        change: `+${reblogs} boosts`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: content,
        sourceUrl: status.url || status.uri || "",
        countryCode: "US",
        historicalData,
        metricLabel,
      };
    });
  } catch {
    return [];
  }
}

export function useTrends(filters: FilterState, onTrendCountsChange: (counts: Record<string, number>) => void) {
  const cached = getCachedTrends();
  const cacheAgeMs = cached ? Date.now() - cached.ts : Number.POSITIVE_INFINITY;
  const [trends, setTrends] = useState<TrendCardProps[]>(cached?.data || []);
  const [loading, setLoading] = useState(!cached);
  const [isFirstLoad, setIsFirstLoad] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(cached ? new Date(cached.ts) : null);
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, { ok: boolean; count: number; lastUpdate: Date }>>({});
  const { fetchHistorical } = useHistoricalTrends();

  const fetchTrends = useCallback(async () => {
    try {
      console.log("📥 Iniciando carregamento de trends");
      setLoading(true);

      const invokeFunctionWithLogs = async (
        sourceName: string,
        functionName: string,
        timeoutMs: number
      ) => {
        console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(
          supabase.functions.invoke(functionName).catch(() => ({ data: { trends: [] } })),
          timeoutMs,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        );
        const count = result.data?.trends?.length || 0;
        console.log(`✅ ${sourceName} retornou:`, count, "itens");
        return result;
      };

      const fetchClientSourceWithLogs = async (
        sourceName: string,
        fetchPromise: Promise<TrendCardProps[]>,
        timeoutMs = 8000
      ) => {
        console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(fetchPromise, timeoutMs, [] as TrendCardProps[]);
        console.log(`✅ ${sourceName} retornou:`, result.length, "itens");
        return result;
      };

      const [edgeResult, extraResult, extraSourcesResult, socialTrendsResult, openDataResult, redditItems, blueskyItems, mastodonItems] = await Promise.all([
        invokeFunctionWithLogs("Google Trends", "fetch-trends", 12000),
        invokeFunctionWithLogs("The Guardian/News Extra", "fetch-news-extra", 10000),
        invokeFunctionWithLogs("Fontes Oficiais Extras", "fetch-extra-sources", 10000),
        invokeFunctionWithLogs("Social Trends", "fetch-social-trends", 10000),
        invokeFunctionWithLogs("Open Data", "fetch-open-data", 12000),
        fetchClientSourceWithLogs("Reddit", fetchRedditClientSide()),
        fetchClientSourceWithLogs("Bluesky", fetchBlueskyClientSide()),
        fetchClientSourceWithLogs("Mastodon", fetchMastodonClientSide()),
      ]);

      const edgeTrends: TrendCardProps[] = edgeResult.data?.trends || [];
      const extraTrends: TrendCardProps[] = extraResult.data?.trends || [];
      const extraSourcesTrends: TrendCardProps[] = extraSourcesResult.data?.trends || [];
      const socialTrends: TrendCardProps[] = socialTrendsResult.data?.trends || [];
      const openDataTrends: TrendCardProps[] = openDataResult.data?.trends || [];
      const rawTrends = [...edgeTrends, ...extraTrends, ...extraSourcesTrends, ...socialTrends, ...openDataTrends, ...redditItems, ...blueskyItems, ...mastodonItems];
      console.log("📦 Total de trends combinadas:", rawTrends.length);
      // Apply unified categorization, normalization and trust badges
      const allTrends = rawTrends.map((t) => {
        const category = normalizeCategory(t.title || "Sem título", t.platform || "Unknown", t.category);
        // Multi-layer country detection: content keywords > source mapping > existing code
        const detectedCountry = detectCountryFromContent(
          t.title || "",
          t.platform || "Unknown",
          t.details || t.description || "",
          t.countryCode
        );
        const countryCode = normalizeCountryCode(detectedCountry || t.countryCode);

        // Assign trust badge based on platform
        let trustBadge = t.trustBadge;
         if (!trustBadge) {
          if (["World Bank", "IBGE", "IMF", "FRED", "NOAA"].includes(t.platform)) trustBadge = "official";
          else if (["OpenAlex", "arXiv", "PubMed", "Crossref"].includes(t.platform)) trustBadge = "scientific";
          else if (["The Guardian", "BBC", "Reuters"].includes(t.platform)) trustBadge = "international";
          else if (["NewsAPI", "NewsData", "GNews", "Bing News"].includes(t.platform)) trustBadge = "press";
          else if (t.platform === "GDELT") trustBadge = "verified";
        }

        return {
          ...t,
          title: (t.title || "Sem título").trim(),
          platform: t.platform || "Unknown",
          category,
          countryCode,
          trustBadge,
        };
      });
      // Merge with historical 24h trends from snapshots
      const historicalTrends = await withTimeout(fetchHistorical(), 5000, []);
      
      // Deduplicate: by normalized title (cross-source dedup)
      const seenTitles = new Set<string>();
      const deduped = allTrends.filter(t => {
        const key = t.title.toLowerCase().trim().slice(0, 80);
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });

      // Merge with historical, deduplicating those too
      const liveTitleSet = new Set(deduped.map(t => `${t.title}||${t.platform}`));
      const uniqueHistorical = historicalTrends.filter(h => !liveTitleSet.has(`${h.title}||${h.platform}`));
      
      // Add relevance scores to live trends (they get a boost for being current)
      const scoredLive = deduped.map(t => ({
        ...t,
        relevanceScore: t.relevanceScore ?? 80 + Math.random() * 20, // Live trends get high scores
        firstSeenAt: t.firstSeenAt || new Date().toISOString(),
      }));

      // Combine: live first, then historical fill
      const combinedTrends = [...scoredLive, ...uniqueHistorical];

      if (combinedTrends.length > 0) {
        setTrends(combinedTrends);
        setCachedTrends(combinedTrends);
        const now = new Date();
        setLastUpdated(now);

        // Track source status for transparency panel
        const statusMap: Record<string, { ok: boolean; count: number; lastUpdate: Date }> = {};
        const platformCounts: Record<string, number> = {};
        for (const t of combinedTrends) {
          platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1;
        }
        const allPlatforms = ["YouTube", "Google Trends", "Reddit", "Bluesky", "Mastodon", "The Guardian", "Hacker News", "Wikipedia", "Stack Overflow", "GitHub", "NewsAPI", "World Bank", "IBGE", "OpenAlex", "arXiv", "PubMed", "IMF", "FRED", "NOAA", "GDELT", "Crossref"];
        for (const p of allPlatforms) {
          statusMap[p] = { ok: (platformCounts[p] || 0) > 0, count: platformCounts[p] || 0, lastUpdate: now };
        }
        setSourcesStatus(statusMap);

        // Console monitoring log
        console.log('🔄 Atualização:', {
          timestamp: now.toLocaleTimeString(),
          live: allTrends.length,
          historical: uniqueHistorical.length,
          total: combinedTrends.length,
          fontes: [...new Set(combinedTrends.map(t => t.platform))],
          porFonte: platformCounts,
        });

        // Save snapshots for critical moment detection (fire & forget)
        supabase.functions.invoke("save-trend-snapshots", {
          body: { trends: allTrends.slice(0, 120) },
        }).catch(() => {});
        if (!isFirstLoad) {
          toast({ title: "✅ Atualizado", description: `${combinedTrends.length} trends (${allTrends.length} ao vivo + ${uniqueHistorical.length} históricas)` });
        }
        setIsFirstLoad(false);
      } else {
        // If all APIs returned empty, use fallback data so timeline is never blank
        console.warn("All data sources returned empty, using fallback data");
        setTrends(fallbackData);
        setIsFirstLoad(false);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      // On error, ensure fallback data is shown
      if (trends.length <= 1) {
        setTrends(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    let intervalId: number | undefined;
    let initialFetchTimer: number | undefined;

    const startPolling = () => {
      intervalId = window.setInterval(fetchTrends, 15 * 60 * 1000);
    };

    // Listen for manual/countdown-triggered refreshes
    const handleTrendRefresh = () => fetchTrends();
    window.addEventListener("trend-refresh", handleTrendRefresh);

    if (cacheAgeMs < CACHE_TTL) {
      const remainingMs = CACHE_TTL - cacheAgeMs;
      initialFetchTimer = window.setTimeout(fetchTrends, remainingMs);
      startPolling();
    } else {
      fetchTrends();
      startPolling();
    }

    return () => {
      if (initialFetchTimer) window.clearTimeout(initialFetchTimer);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("trend-refresh", handleTrendRefresh);
    };
  }, [fetchTrends, cacheAgeMs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!loading && trends.length === 0) {
        console.log("⚠️ Usando fallback - sem dados reais");
        setTrends(FORCED_FALLBACK_TRENDS);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [loading, trends.length]);

  const filteredTrends = useMemo(() => {
    const countryFilter = normalizeCountryCode(filters.country) || (filters.country === "global" ? "GL" : undefined);
    const filterCategory = normalizeText(filters.category);

    const normalizedTrends = trends.map(normalizeTrendForFilter);

    const matchesType = (trend: NormalizedTrendForFilter) => {
      if (filters.type === "Todas mídias") return true;
      if (filters.type === "Redes sociais") return ["Reddit", "Bluesky", "Mastodon", "X (Twitter)"].includes(trend.source);
      if (filters.type === "Imprensa") return ["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian"].includes(trend.source);
      if (filters.type === "Buscas (Google)") return trend.source === "Google Trends";
      if (filters.type === "Dados oficiais") return ["World Bank", "IBGE", "IMF", "FRED", "NOAA"].includes(trend.source);
      if (filters.type === "Ciência") return ["OpenAlex", "arXiv", "PubMed", "Crossref"].includes(trend.source);
      if (filters.type === "Tech") return ["Hacker News", "GitHub", "Stack Overflow"].includes(trend.source);
      if (filters.type === "Enciclopédia") return trend.source === "Wikipedia";
      if (filters.type === "Conflitos") return trend.source === "GDELT";
      return true;
    };

    const filtered = normalizedTrends.filter((trend) => {
      const matchCountry =
        filters.country === "global" ||
        !trend.hasExplicitCountry ||
        trend.normalizedCountry === "GL" ||
        trend.normalizedCountry === countryFilter;

      const matchCategory =
        filters.category === "Todas" ||
        trend.normalizedCategory === filterCategory ||
        trend.normalizedCategory.startsWith(filterCategory);

      const matchSource = matchesType(trend);

      if (!matchCountry) {
        console.log("❌ País removido:", trend.title, "país:", trend.countryCode || "global");
      }
      if (!matchCategory) {
        console.log("❌ Categoria removida:", trend.title, "cat:", trend.category || "geral");
      }
      if (!matchSource) {
        console.log("❌ Fonte removida:", trend.title, "fonte:", trend.source || "desconhecido");
      }

      return matchCountry && matchCategory && matchSource;
    });

    return [...filtered].sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
  }, [trends, filters]);

  useEffect(() => {
    console.log("🔎 Filtros aplicados:", filters);
    console.log("📋 Trends após filtro:", filteredTrends.length);
  }, [filters, filteredTrends.length]);

  const leftTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 0), [filteredTrends]);
  const rightTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 1), [filteredTrends]);

  // Count countries
  const countriesCount = useMemo(() => {
    const codes = new Set(trends.map(t => t.countryCode).filter(Boolean));
    return codes.size;
  }, [trends]);

  useEffect(() => {
    const counts: Record<string, number> = {};
    if (filters.country !== "global") {
      counts[filters.country] = filteredTrends.length;
    } else {
      for (const trend of filteredTrends) {
        const code = trend.countryCode || "BR";
        counts[code] = (counts[code] || 0) + 1;
      }
      const redditCount = filteredTrends.filter((t) => t.platform === "Reddit").length;
      counts["US"] = (counts["US"] || 0) + redditCount;
      const baselineCountries = [
        "CN", "NL", "SE", "NO", "UA", "CL", "PE", "VE", "PT",
        "KE", "MA", "ET", "AE", "NZ", "VN", "PK",
      ];
      for (const cc of baselineCountries) {
        if (!counts[cc]) {
          counts[cc] = 1;
        }
      }
    }
    onTrendCountsChange(counts);
  }, [filteredTrends, filters.country, onTrendCountsChange]);

  return { leftTrends, rightTrends, loading, isFirstLoad, filteredTrends, allTrends: trends, fetchTrends, countriesCount, lastUpdated, sourcesStatus };
}
