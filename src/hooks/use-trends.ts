import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "../components/TrendCard";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "../components/FilterBar";
import { categorizeTrend } from "@/lib/categorize-trend";
const CACHE_KEY = "gtt_trends_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

type TrendsCachePayload = {
  ts: number;
  data: TrendCardProps[];
};

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
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data.slice(0, 80) }));
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
    details: "Volume de buscas disparou.",
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
  const [trends, setTrends] = useState<TrendCardProps[]>(cached?.data || fallbackData);
  const [loading, setLoading] = useState(!cached);
  const [isFirstLoad, setIsFirstLoad] = useState(!cached);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const [edgeResult, extraResult, extraSourcesResult, socialTrendsResult, redditItems, blueskyItems, mastodonItems] = await Promise.all([
        withTimeout(
          supabase.functions.invoke("fetch-trends"),
          3500,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        ),
        withTimeout(
          supabase.functions.invoke("fetch-news-extra").catch(() => ({ data: { trends: [] } })),
          2500,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        ),
        withTimeout(
          supabase.functions.invoke("fetch-extra-sources").catch(() => ({ data: { trends: [] } })),
          2500,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        ),
        withTimeout(
          supabase.functions.invoke("fetch-social-trends").catch(() => ({ data: { trends: [] } })),
          2500,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        ),
        withTimeout(fetchRedditClientSide(), 2500, []),
        withTimeout(fetchBlueskyClientSide(), 2500, []),
        withTimeout(fetchMastodonClientSide(), 2500, []),
      ]);
      const edgeTrends: TrendCardProps[] = edgeResult.data?.trends || [];
      const extraTrends: TrendCardProps[] = extraResult.data?.trends || [];
      const extraSourcesTrends: TrendCardProps[] = extraSourcesResult.data?.trends || [];
      const socialTrends: TrendCardProps[] = socialTrendsResult.data?.trends || [];
      const rawTrends = [...edgeTrends, ...extraTrends, ...extraSourcesTrends, ...socialTrends, ...redditItems, ...blueskyItems, ...mastodonItems];
      // Apply unified categorization and trust badges
      const allTrends = rawTrends.map((t) => {
        const category = categorizeTrend(t.title, t.platform, t.category, {
          subreddit: t.category?.startsWith("r/") ? t.category.replace("r/", "") : undefined,
        });
        // Assign trust badge based on platform
        let trustBadge = t.trustBadge;
        if (!trustBadge) {
          if (["World Bank", "IBGE"].includes(t.platform)) trustBadge = "official";
          else if (t.platform === "OpenAlex") trustBadge = "scientific";
          else if (["The Guardian", "BBC", "Reuters"].includes(t.platform)) trustBadge = "international";
          else if (["NewsAPI", "NewsData", "GNews", "Bing News"].includes(t.platform)) trustBadge = "press";
        }
        return { ...t, category, trustBadge };
      });
      if (allTrends.length > 0) {
        setTrends(allTrends);
        setCachedTrends(allTrends);
        // Save snapshots for critical moment detection (fire & forget)
        supabase.functions.invoke("save-trend-snapshots", {
          body: { trends: allTrends.slice(0, 50) },
        }).catch(() => {});
        if (!isFirstLoad) {
          toast({ title: "✅ Atualizado", description: `${allTrends.length} trends de ${new Set(allTrends.map(t => t.platform)).size} fontes` });
        }
        setIsFirstLoad(false);
      }
    } catch (e) {
      console.error("Fetch error:", e);
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

  const filteredTrends = useMemo(() => {
    let result = trends;
    if (filters.country !== "global") {
      result = result.filter((t) => t.countryCode === filters.country);
    }
    if (filters.type === "Redes sociais") result = result.filter((t) => ["Reddit", "Bluesky", "Mastodon", "X (Twitter)"].includes(t.platform));
    else if (filters.type === "Imprensa") result = result.filter((t) => ["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian"].includes(t.platform));
    else if (filters.type === "Buscas (Google)") result = result.filter((t) => t.platform === "Google Trends");
    else if (filters.type === "Dados oficiais") result = result.filter((t) => ["World Bank", "IBGE"].includes(t.platform));
    else if (filters.type === "Ciência") result = result.filter((t) => t.platform === "OpenAlex");
    else if (filters.type === "Tech") result = result.filter((t) => ["Hacker News", "GitHub", "Stack Overflow"].includes(t.platform));
    else if (filters.type === "Enciclopédia") result = result.filter((t) => t.platform === "Wikipedia");
    if (filters.category !== "Todas") {
      result = result.filter((t) => {
        const cat = t.category?.toLowerCase() || "";
        const filterCat = filters.category.toLowerCase();
        return cat === filterCat || cat.includes(filterCat);
      });
    }
    return result;
  }, [trends, filters]);

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

  return { leftTrends, rightTrends, loading, isFirstLoad, filteredTrends, allTrends: trends, fetchTrends, countriesCount };
}
