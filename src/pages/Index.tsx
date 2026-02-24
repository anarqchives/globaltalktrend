import { useState, useRef, useCallback, useEffect } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState } from "@/components/FilterBar";
import GoogleMapView from "@/components/GoogleMapView";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

const INITIAL_COUNT = 20;
const LOAD_MORE_COUNT = 10;

// Read filters from URL params on load
function getInitialFilters(): FilterState {
  if (typeof window === "undefined") return defaultFilters;
  const params = new URLSearchParams(window.location.search);
  return {
    country: params.get("country") || defaultFilters.country,
    period: params.get("period") || defaultFilters.period,
    category: params.get("category") || defaultFilters.category,
    type: params.get("type") || defaultFilters.type,
  };
}

const Index = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [activeTrend, setActiveTrend] = useState<TrendCardProps | null>(null);
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline");
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { filteredTrends, allTrends, loading, isFirstLoad, fetchTrends, countriesCount } = useTrends(filters, setTrendCounts);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country !== defaultFilters.country) params.set("country", filters.country);
    if (filters.period !== defaultFilters.period) params.set("period", filters.period);
    if (filters.category !== defaultFilters.category) params.set("category", filters.category);
    if (filters.type !== defaultFilters.type) params.set("type", filters.type);
    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [filters]);

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [filters]);

  const visibleTrends = filteredTrends.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrends.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filteredTrends.length));
        }
      },
      { root: scrollRef.current, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, filteredTrends.length]);

  const handleMapClick = (code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
  }, [fetchTrends]);

  const renderTimeline = () => (
    <div ref={scrollRef} className="flex flex-col gap-1 p-2 h-full overflow-y-auto scrollbar-thin">
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
      </div>
      {loading && isFirstLoad
        ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} />)
        : visibleTrends.map((trend, i) => (
            <TimelineCard
              key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              {...trend}
              onClick={() => setActiveTrend(trend)}
              onFilterPlatform={(p) => {
                const map: Record<string, string> = {
                  "Reddit": "Redes sociais",
                  "Bluesky": "Redes sociais",
                  "Mastodon": "Redes sociais",
                  "NewsAPI": "Imprensa",
                  "NewsData": "Imprensa",
                  "GNews": "Imprensa",
                  "Bing News": "Imprensa",
                  "The Guardian": "Imprensa",
                  "Google Trends": "Buscas (Google)",
                  "YouTube": "Todas mídias",
                  "World Bank": "Dados oficiais",
                  "IBGE": "Dados oficiais",
                  "OpenAlex": "Ciência",
                };
                setFilters((f) => ({ ...f, type: map[p] || "Todas mídias" }));
              }}
            />
          ))}
      {hasMore && (
        <div ref={sentinelRef} className="h-10" />
      )}
      {!hasMore && filteredTrends.length > 0 && (
        <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground/50">
          — {t("noTrends")} —
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TrendHeader
        totalTrends={filteredTrends.length}
        countriesCount={countriesCount}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div className="flex border-b border-border bg-card/80 backdrop-blur-sm">
              <button
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  mobileTab === "timeline"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileTab("timeline")}
              >
                {t("timeline")}
              </button>
              <button
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  mobileTab === "map"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileTab("map")}
              >
                {t("map")}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {mobileTab === "timeline" ? (
                renderTimeline()
              ) : (
                <GoogleMapView
                  trendCounts={trendCounts}
                  selectedCountry={filters.country}
                  onSelectCountry={handleMapClick}
                  activeTrend={activeTrend}
                  onDismissTrend={() => setActiveTrend(null)}
                  trends={allTrends}
                />
              )}
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={38} minSize={25} maxSize={55}>
              {renderTimeline()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={62}>
              <div className="h-full bg-secondary/10">
                <GoogleMapView
                  trendCounts={trendCounts}
                  selectedCountry={filters.country}
                  onSelectCountry={handleMapClick}
                  activeTrend={activeTrend}
                  onDismissTrend={() => setActiveTrend(null)}
                  trends={allTrends}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default Index;
