import { useState } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState } from "@/components/FilterBar";
import WorldMapPlaceholder from "@/components/WorldMapPlaceholder";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useIsMobile } from "@/hooks/use-mobile";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

const Index = () => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [activeTrend, setActiveTrend] = useState<TrendCardProps | null>(null);
  const [mobileTab, setMobileTab] = useState<"left" | "right">("left");
  const isMobile = useIsMobile();

  const { leftTrends, rightTrends, loading, isFirstLoad } = useTrends(filters, setTrendCounts);

  const handleMapClick = (code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  };

  const renderColumn = (items: TrendCardProps[], label: string) => (
    <div className="flex flex-col gap-1 p-2">
      <div className="px-2 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      {loading && isFirstLoad
        ? Array.from({ length: 4 }).map((_, i) => <TrendCardSkeleton key={i} />)
        : items.map((trend, i) => (
            <TimelineCard
              key={`${trend.platform}-${i}`}
              {...trend}
              onClick={() => setActiveTrend(trend)}
            />
          ))}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TrendHeader />
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left column */}
        {!isMobile && (
          <div className="w-1/4 border-r border-border overflow-y-auto scrollbar-thin">
            {renderColumn(leftTrends, "Tendências")}
          </div>
        )}

        {/* Center - fixed map */}
        <div className={`${isMobile ? "w-full" : "w-1/2"} relative bg-secondary/20`}>
          <WorldMapPlaceholder
            trendCounts={trendCounts}
            selectedCountry={filters.country}
            onSelectCountry={handleMapClick}
            activeTrend={activeTrend}
            onDismissTrend={() => setActiveTrend(null)}
          />

          {/* Mobile tabs */}
          {isMobile && (
            <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border">
              <div className="flex border-b border-border">
                <button
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${mobileTab === "left" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                  onClick={() => setMobileTab("left")}
                >
                  Tendências
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${mobileTab === "right" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                  onClick={() => setMobileTab("right")}
                >
                  Mais trends
                </button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto scrollbar-thin">
                {mobileTab === "left"
                  ? renderColumn(leftTrends, "Tendências")
                  : renderColumn(rightTrends, "Mais trends")}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        {!isMobile && (
          <div className="w-1/4 border-l border-border overflow-y-auto scrollbar-thin">
            {renderColumn(rightTrends, "Mais trends")}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
