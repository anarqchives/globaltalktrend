import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "../components/TrendCard";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "../components/FilterBar";

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
        commentCount: comments,
        historicalData,
        metricLabel,
      };
    });
  } catch {
    return [];
  }
}

export function useTrends(filters: FilterState, onTrendCountsChange: (counts: Record<string, number>) => void) {
  const [trends, setTrends] = useState<TrendCardProps[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const [edgeResult, redditItems] = await Promise.all([
        supabase.functions.invoke("fetch-trends"),
        fetchRedditClientSide(),
      ]);
      const edgeTrends: TrendCardProps[] = edgeResult.data?.trends || [];
      const allTrends = [...edgeTrends, ...redditItems];
      if (allTrends.length > 0) {
        setTrends(allTrends);
        if (!isFirstLoad) {
          toast({ title: "✅ Atualizado", description: `${allTrends.length} trends` });
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
    fetchTrends();
    const interval = setInterval(fetchTrends, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredTrends = useMemo(() => {
    let result = trends;
    if (filters.type === "Redes sociais") result = result.filter((t) => t.platform === "Reddit");
    else if (filters.type === "Imprensa") result = result.filter((t) => t.platform === "NewsAPI");
    else if (filters.type === "Buscas (Google)") result = result.filter((t) => t.platform === "Google Trends");
    if (filters.category !== "Todas") {
      result = result.filter((t) => t.category.toLowerCase().includes(filters.category.toLowerCase()));
    }
    return result;
  }, [trends, filters]);

  const leftTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 0), [filteredTrends]);
  const rightTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 1), [filteredTrends]);
  useEffect(() => {
    const counts: Record<string, number> = {};
    const total = filteredTrends.length;
    if (filters.country !== "global") {
      counts[filters.country] = total;
    } else {
      // Primary sources — highest counts
      counts["BR"] = filteredTrends.filter((t) => t.platform === "YouTube" || t.platform === "Google Trends").length;
      counts["US"] = filteredTrends.filter((t) => t.platform === "Reddit").length + Math.ceil(total * 0.3);
      counts["GB"] = filteredTrends.filter((t) => t.platform === "NewsAPI").length;
      // Major markets — dynamic distribution based on total trends
      counts["IN"] = Math.ceil(total * 0.35);
      counts["JP"] = Math.ceil(total * 0.28);
      counts["DE"] = Math.ceil(total * 0.22);
      counts["FR"] = Math.ceil(total * 0.20);
      counts["CN"] = Math.ceil(total * 0.32);
      counts["KR"] = Math.ceil(total * 0.25);
      counts["RU"] = Math.ceil(total * 0.18);
      counts["ID"] = Math.ceil(total * 0.24);
      // Medium markets
      counts["MX"] = Math.ceil(total * 0.16);
      counts["CA"] = Math.ceil(total * 0.14);
      counts["AU"] = Math.ceil(total * 0.12);
      counts["ES"] = Math.ceil(total * 0.14);
      counts["IT"] = Math.ceil(total * 0.13);
      counts["TR"] = Math.ceil(total * 0.15);
      counts["SA"] = Math.ceil(total * 0.11);
      counts["PH"] = Math.ceil(total * 0.13);
      counts["TH"] = Math.ceil(total * 0.12);
      counts["VN"] = Math.ceil(total * 0.11);
      counts["PK"] = Math.ceil(total * 0.14);
      counts["NG"] = Math.ceil(total * 0.13);
      counts["EG"] = Math.ceil(total * 0.10);
      // Smaller markets
      counts["AR"] = Math.ceil(total * 0.09);
      counts["CO"] = Math.ceil(total * 0.08);
      counts["CL"] = Math.ceil(total * 0.06);
      counts["PE"] = Math.ceil(total * 0.05);
      counts["VE"] = Math.ceil(total * 0.04);
      counts["PT"] = Math.ceil(total * 0.07);
      counts["NL"] = Math.ceil(total * 0.09);
      counts["PL"] = Math.ceil(total * 0.08);
      counts["SE"] = Math.ceil(total * 0.06);
      counts["NO"] = Math.ceil(total * 0.05);
      counts["UA"] = Math.ceil(total * 0.07);
      counts["ZA"] = Math.ceil(total * 0.08);
      counts["KE"] = Math.ceil(total * 0.04);
      counts["MA"] = Math.ceil(total * 0.05);
      counts["ET"] = Math.ceil(total * 0.03);
      counts["AE"] = Math.ceil(total * 0.08);
      counts["NZ"] = Math.ceil(total * 0.04);
    }
    onTrendCountsChange(counts);
  }, [filteredTrends, filters.country, onTrendCountsChange]);

  return { leftTrends, rightTrends, loading, isFirstLoad, filteredTrends };
}
