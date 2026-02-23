import { useState } from "react";
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

const Index = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [activeTrend, setActiveTrend] = useState<TrendCardProps | null>(null);
  const [mobileTab, setMobileTab] = useState<"timeline" | "map">("timeline");
  const isMobile = useIsMobile();

  const { filteredTrends, loading, isFirstLoad } = useTrends(filters, setTrendCounts);

  const handleMapClick = (code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  };

  const renderTimeline = () => (
    <div className="flex flex-col gap-1 p-2 h-full overflow-y-auto scrollbar-thin">
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
        <span className="text-[10px] text-muted-foreground">{filteredTrends.length}</span>
      </div>
      {loading && isFirstLoad
        ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} />)
        : filteredTrends.map((trend, i) => (
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

      {/* Main layout */}
      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          /* Mobile: tabs */
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
          /* Desktop: resizable 2-column */
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
              {renderTimeline()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65}>
              <WorldMapPlaceholder
                trendCounts={trendCounts}
                selectedCountry={filters.country}
                onSelectCountry={handleMapClick}
                activeTrend={activeTrend}
                onDismissTrend={() => setActiveTrend(null)}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default Index;
