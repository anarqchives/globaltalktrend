import { useState, useRef, useCallback, useEffect } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState } from "@/components/FilterBar";
import WorldMapPlaceholder from "@/components/WorldMapPlaceholder";
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

const INITIAL_COUNT = 10;
const LOAD_MORE_COUNT = 5;

const Index = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [activeTrend, setActiveTrend] = useState<TrendCardProps | null>(null);
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline");
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { filteredTrends, loading, isFirstLoad } = useTrends(filters, setTrendCounts);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [filters]);

  const visibleTrends = filteredTrends.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrends.length;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, filteredTrends.length));
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, filteredTrends.length]);

  const handleMapClick = (code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  };

  const renderTimeline = () => (
    <div ref={scrollRef} className="flex flex-col gap-1 p-2 h-full overflow-y-auto scrollbar-thin">
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {visibleTrends.length}/{filteredTrends.length}
        </span>
      </div>
      {loading && isFirstLoad
        ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} />)
        : visibleTrends.map((trend, i) => (
            <TimelineCard
              key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              {...trend}
              onClick={() => setActiveTrend(trend)}
            />
          ))}
      {/* Sentinel for infinite scroll */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TrendHeader />
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Main layout */}
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
                <WorldMapPlaceholder
                  trendCounts={trendCounts}
                  selectedCountry={filters.country}
                  onSelectCountry={handleMapClick}
                  activeTrend={activeTrend}
                  onDismissTrend={() => setActiveTrend(null)}
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
                <WorldMapPlaceholder
                  trendCounts={trendCounts}
                  selectedCountry={filters.country}
                  onSelectCountry={handleMapClick}
                  activeTrend={activeTrend}
                  onDismissTrend={() => setActiveTrend(null)}
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
