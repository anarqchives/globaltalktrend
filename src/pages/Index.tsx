import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState, countries } from "@/components/FilterBar";
import GoogleMapView from "@/components/GoogleMapView";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHistory } from "@/hooks/use-history";
import { useGamification } from "@/hooks/use-gamification";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X } from "lucide-react";
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const { trackView } = useHistory(user?.id ?? null);
  const { trackAction } = useGamification(user?.id ?? null);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [expandedTrendId, setExpandedTrendId] = useState<string | null>(null);
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

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 400);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // When a trend is selected from ranking, expand it in timeline and sync map
  const handleSelectTrend = useCallback((trend: TrendCardProps) => {
    const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
    setExpandedTrendId(trendId);
    if (isMobile) setMobileTab("timeline");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [isMobile]);

  // When a card expands, sync map to its country
  const handleCardExpand = useCallback((trend: TrendCardProps) => {
    if (trend.countryCode) {
      // Don't change filters, just let the map know which country to highlight
      setExpandedTrendId(`${trend.platform}-${trend.title.slice(0, 20)}`);
    }
  }, []);

  // Get the country of the currently expanded trend for map sync
  const expandedTrendCountry = useMemo(() => {
    if (!expandedTrendId) return null;
    const trend = filteredTrends.find(t => `${t.platform}-${t.title.slice(0, 20)}` === expandedTrendId);
    return trend?.countryCode?.slice(0, 2).toUpperCase() || null;
  }, [expandedTrendId, filteredTrends]);

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    const segments: { label: string; key: keyof FilterState }[] = [];
    if (filters.country !== "global") {
      const countryLabel = countries.flatMap(g => g.items).find(c => c.value === filters.country)?.label || filters.country;
      segments.push({ label: countryLabel, key: "country" });
    }
    if (filters.category !== "Todas") {
      segments.push({ label: filters.category, key: "category" });
    }
    if (filters.type !== "Todas mídias") {
      segments.push({ label: filters.type, key: "type" });
    }
    if (filters.period !== "Hoje") {
      segments.push({ label: filters.period, key: "period" });
    }
    return segments;
  }, [filters]);

  const clearBreadcrumb = (key: keyof FilterState) => {
    setFilters(f => ({ ...f, [key]: defaultFilters[key] }));
  };

  const renderTimeline = () => (
    <div ref={scrollRef} className="flex flex-col gap-1 p-2 h-full overflow-y-auto scrollbar-thin relative">
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
      </div>

      {/* Breadcrumb showing active filters */}
      {breadcrumbs.length > 0 && (
        <div className="px-2 py-1 flex items-center gap-1 flex-wrap text-[10px]">
          <span className="text-muted-foreground/60">Mostrando:</span>
          {breadcrumbs.map((seg, i) => (
            <span key={seg.key} className="inline-flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {seg.label}
                <button
                  onClick={() => clearBreadcrumb(seg.key)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            </span>
          ))}
        </div>
      )}

      {loading && isFirstLoad
        ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} />)
        : visibleTrends.map((trend, i) => {
            const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
            return (
              <TimelineCard
                key={`${trendId}-${i}`}
                {...trend}
                userId={user?.id}
                onTrackAction={trackAction}
                forceExpanded={expandedTrendId === trendId}
                onClick={() => {
                  handleCardExpand(trend);
                  trackAction("view", 1, { title: trend.title, platform: trend.platform, countryCode: trend.countryCode, category: trend.category });
                }}
                onExpand={(title, platform, metadata) => {
                  trackView(title, platform, metadata);
                  // Sync map to trend's country
                  if (trend.countryCode) {
                    const cc = trend.countryCode.slice(0, 2).toUpperCase();
                    const map = document.querySelector('[data-map-sync]');
                    // We pass the country through a custom event
                    window.dispatchEvent(new CustomEvent('trend-expand-country', { detail: cc }));
                  }
                }}
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
            );
          })}
      {hasMore && (
        <div ref={sentinelRef} className="h-10" />
      )}
      {!hasMore && filteredTrends.length > 0 && (
        <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground/50">
          — {t("noTrends")} —
        </div>
      )}
      {!loading && !isFirstLoad && filteredTrends.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-medium text-foreground">
            {filters.country !== "global"
              ? `${t("noTrends")} — ${countries.flatMap(g => g.items).find(c => c.value === filters.country)?.label?.replace(/^.{2}\s?/, '') || filters.country}`
              : t("noTrends")}
          </p>
          <p className="text-xs text-muted-foreground max-w-[260px]">
            {filters.country !== "global"
              ? "Tente mudar o período ou os filtros, ou volte mais tarde."
              : "Nenhuma trend encontrada com os filtros atuais."}
          </p>
        </div>
      )}

      {showScrollTop && (
        <div className="sticky bottom-4 z-20 flex justify-center">
          <button
            onClick={scrollToTop}
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2"
          >
            ↑ Voltar ao topo
          </button>
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
        filters={filters}
        onApplyFilter={setFilters}
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
                  trends={allTrends}
                  onSelectTrend={handleSelectTrend}
                  highlightCountry={expandedTrendCountry}
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
                  trends={allTrends}
                  onSelectTrend={handleSelectTrend}
                  highlightCountry={expandedTrendCountry}
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
