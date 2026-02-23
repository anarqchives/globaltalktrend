import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import TrendCard, { TrendCardProps } from "./TrendCard";
import TrendCardSkeleton from "./TrendCardSkeleton";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "./FilterBar";

interface TrendItem extends TrendCardProps {}

interface TrendsSectionProps {
  filters: FilterState;
  onTrendCountsChange: (counts: Record<string, number>) => void;
}

const fallbackData: TrendItem[] = [
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
    details: "Volume de buscas disparou após divulgação de nova pesquisa eleitoral.",
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

async function fetchRedditClientSide(): Promise<TrendItem[]> {
  try {
    const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=5", {
      headers: { "User-Agent": "TrendSphere/1.0" },
    });
    if (!res.ok) {
      console.error("Reddit client error:", res.status);
      return [];
    }
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
        volume: ups >= 1000 ? `${(ups / 1000).toFixed(1)}K upvotes` : `${ups} upvotes`,
        change: `+${post.upvote_ratio ? Math.round(post.upvote_ratio * 100) : 0}%`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10)),
        details: post.selftext?.slice(0, 200) || `${comments} comentários · ${post.subreddit_name_prefixed}`,
        commentCount: comments,
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("Reddit client fetch error:", e);
    return [];
  }
}

const ITEMS_PER_PAGE = 9;

const TrendsSection = ({ filters, onTrendCountsChange }: TrendsSectionProps) => {
  const [trends, setTrends] = useState<TrendItem[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);

      const [edgeResult, redditItems] = await Promise.all([
        supabase.functions.invoke("fetch-trends"),
        fetchRedditClientSide(),
      ]);

      const edgeTrends: TrendItem[] = edgeResult.data?.trends || [];
      const allTrends = [...edgeTrends, ...redditItems];

      if (allTrends.length > 0) {
        setTrends(allTrends);
        setError(null);
        if (!isFirstLoad) {
          toast({
            title: "✅ Dados atualizados",
            description: `${allTrends.length} tendências carregadas de 4 fontes`,
          });
        }
        setIsFirstLoad(false);
      } else {
        setError("Nenhuma tendência encontrada");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }, [isFirstLoad]);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter trends based on current filters
  const filteredTrends = useMemo(() => {
    let result = trends;

    // Filter by type/platform
    if (filters.type === "Redes sociais") {
      result = result.filter((t) => t.platform === "Reddit");
    } else if (filters.type === "Imprensa") {
      result = result.filter((t) => t.platform === "NewsAPI");
    } else if (filters.type === "Buscas (Google)") {
      result = result.filter((t) => t.platform === "Google Trends");
    }

    // Filter by category
    if (filters.category !== "Todas") {
      result = result.filter((t) =>
        t.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    return result;
  }, [trends, filters]);

  // Update trend counts for map
  useEffect(() => {
    // Simulated: assign trends to countries based on data presence
    const counts: Record<string, number> = {};
    // The country from filter represents where we're looking
    if (filters.country !== "global") {
      counts[filters.country] = filteredTrends.length;
    } else {
      // Distribute trends across countries for visualization
      counts["BR"] = filteredTrends.filter((t) => t.platform === "YouTube" || t.platform === "Google Trends").length;
      counts["US"] = filteredTrends.filter((t) => t.platform === "Reddit").length;
      counts["GB"] = filteredTrends.filter((t) => t.platform === "NewsAPI").length;
      counts["JP"] = Math.floor(filteredTrends.length * 0.2);
      counts["IN"] = Math.floor(filteredTrends.length * 0.15);
      counts["DE"] = Math.floor(filteredTrends.length * 0.1);
    }
    onTrendCountsChange(counts);
  }, [filteredTrends, filters.country, onTrendCountsChange]);

  const visibleTrends = filteredTrends.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrends.length;

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 mt-8">
        <h2 className="text-xl font-semibold">🔥 Tendências globais · agora</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              atualizando...
            </span>
          )}
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
          <span className="source-tag text-xs">fontes: YouTube · NewsAPI · Reddit · Google Trends</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        {loading && isFirstLoad
          ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} />)
          : visibleTrends.map((trend, index) => (
              <TrendCard key={`${trend.platform}-${index}`} {...trend} />
            ))}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
            className="px-6 py-2.5 rounded-full bg-secondary text-sm font-medium hover:bg-muted transition-colors"
          >
            Carregar mais ({filteredTrends.length - visibleCount} restantes)
          </button>
        </div>
      )}

      <div
        className="bg-card rounded-2xl p-4 border border-border text-sm text-muted-foreground space-y-2"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <p>
          ⚠️ APIs com acesso restrito exibem dados estimados ou indicadores públicos.
        </p>
        <p>
          <span className="font-medium text-foreground">
            ✅ YouTube · Reddit · NewsAPI · Google Trends
          </span>{" "}
          <span className="ml-2">⚠️ Demais redes: acesso limitado</span>
        </p>
      </div>
    </section>
  );
};

export default TrendsSection;
