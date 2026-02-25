import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState, countries } from "@/components/FilterBar";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import CriticalMomentsSection from "@/components/CriticalMomentsSection";
import TransparencyPanel from "@/components/TransparencyPanel";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useCriticalMoments } from "@/hooks/use-critical-moments";
import { useAnomalyAlerts } from "@/hooks/use-anomaly-alerts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { useHistory } from "@/hooks/use-history";
import { useGamification } from "@/hooks/use-gamification";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// Lazy load the heavy map component
const GoogleMapView = lazy(() => import("@/components/GoogleMapView"));

const MapFallback = () => (
  <div className="h-full flex items-center justify-center bg-secondary/10">
    <div className="flex items-center gap-3 text-muted-foreground text-sm">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="font-medium">Carregando mapa…</span>
    </div>
  </div>
);

// Mobile floating coffee button
const MobileCoffeeButton = () => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-mobile-coffee]')) setExpanded(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [expanded]);

  return (
    <div className="fixed bottom-5 right-4 z-50 md:hidden" data-mobile-coffee>
      {expanded && (
        <div className="mb-2 p-4 rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.1)] w-56 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-[13px] font-medium text-foreground mb-3">
            Apoie a melhoria contínua da ferramenta
          </p>
          <a
            href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold transition-colors shadow-sm"
          >
            ☕ Apoie
          </a>
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-12 h-12 rounded-full bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.12)] flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-transform focus:outline-none"
        title="Apoie o projeto"
      >
        ☕
      </button>
    </div>
  );
};

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
  const { config: modeConfig, mode } = useUserMode();
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
  const [_mobileTab, _setMobileTab] = useState<"timeline" | "map">("timeline"); // kept for compat
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { filteredTrends: rawFilteredTrends, allTrends, loading, isFirstLoad, fetchTrends, countriesCount, lastUpdated, sourcesStatus } = useTrends(filters, setTrendCounts);
  const criticalMoments = useCriticalMoments(allTrends);
  const { anomalies, totalCount: anomalyCount, dismiss: dismissAnomaly } = useAnomalyAlerts(allTrends);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  // Reset dismissed state when new critical moments appear
  useEffect(() => {
    if (criticalMoments.length > 0) setCriticalDismissed(false);
  }, [criticalMoments.length]);

  // Apply mode-based sorting
  const filteredTrends = useMemo(() => {
    if (mode === "cidadao") return rawFilteredTrends;
    return [...rawFilteredTrends].sort((a, b) => modeConfig.sortWeight(b) - modeConfig.sortWeight(a));
  }, [rawFilteredTrends, mode, modeConfig]);

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

  // Brief loading flash when filters change
  const [filterTransitioning, setFilterTransitioning] = useState(false);
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    if (JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters)) {
      setFilterTransitioning(true);
      const timer = setTimeout(() => setFilterTransitioning(false), 300);
      prevFiltersRef.current = filters;
      return () => clearTimeout(timer);
    }
  }, [filters]);

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

  const handleSelectTrend = useCallback((trend: TrendCardProps) => {
    const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
    setExpandedTrendId(trendId);
    if (isMobile) _setMobileTab("timeline");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [isMobile]);

  const handleCardExpand = useCallback((trend: TrendCardProps) => {
    const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
    setExpandedTrendId(prev => prev === trendId ? null : trendId);
  }, []);

  const expandedTrendCountry = useMemo(() => {
    if (!expandedTrendId) return null;
    const trend = filteredTrends.find(t => `${t.platform}-${t.title.slice(0, 20)}` === expandedTrendId);
    return trend?.countryCode?.slice(0, 2).toUpperCase() || null;
  }, [expandedTrendId, filteredTrends]);

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
    <div ref={scrollRef} className={`flex flex-col gap-1 p-2 h-full overflow-y-auto overflow-x-hidden scrollbar-thin relative transition-opacity duration-200 w-full max-w-full ${filterTransitioning ? 'opacity-60' : 'opacity-100'}`}>
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
      </div>

      {breadcrumbs.length > 0 && (
        <div className="px-2 py-1 flex items-center gap-1 flex-wrap text-[10px]">
          <span className="text-muted-foreground/60">{t("showing")}:</span>
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

      {(loading && isFirstLoad && filteredTrends.length === 0)
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
                  trackAction("view", 1, { title: trend.title, platform: trend.platform, countryCode: trend.countryCode, category: trend.category });
                }}
                onExpand={(title, platform, metadata) => {
                  trackView(title, platform, metadata);
                  if (trend.countryCode) {
                    const cc = trend.countryCode.slice(0, 2).toUpperCase();
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
        <div className="flex flex-col items-center py-4 gap-2">
          <span className="text-[11px] text-muted-foreground/50">
            — {t("noTrends")} —
          </span>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {t("lastUpdate")}: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <button
            onClick={() => setTransparencyOpen(true)}
            className="text-[10px] text-primary hover:underline cursor-pointer"
          >
            🔍 {t("viewSourceStatus")}
          </button>
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
               ? t("tryChangingFilters")
               : t("noTrendsCurrentFilters")}
           </p>
        </div>
      )}

      {showScrollTop && (
        <div className="sticky bottom-4 z-20 flex justify-center">
          <button
            onClick={scrollToTop}
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2"
          >
            ↑ {t("backToTop")}
          </button>
        </div>
      )}
    </div>
  );

  const renderMap = () => (
    <Suspense fallback={<MapFallback />}>
      <GoogleMapView
        trendCounts={trendCounts}
        selectedCountry={filters.country}
        onSelectCountry={handleMapClick}
        trends={allTrends}
        onSelectTrend={handleSelectTrend}
        highlightCountry={expandedTrendCountry}
      />
    </Suspense>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden w-full max-w-[100vw]">
      <TrendHeader
        totalTrends={filteredTrends.length}
        countriesCount={countriesCount}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        filters={filters}
        onApplyFilter={setFilters}
        anomalyCount={anomalyCount}
        anomalies={anomalies}
        onDismissAnomaly={dismissAnomaly}
        onOpenTransparency={() => setTransparencyOpen(true)}
      />
      <FilterBar filters={filters} onChange={setFilters} />

      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full min-h-0 flex flex-col">
            {/* Critical Moments inline on mobile */}
            {!loading && criticalMoments.length > 0 && filteredTrends.length > 1 && !criticalDismissed && (
              <CriticalMomentsSection
                moments={criticalMoments}
                onSelectTrend={handleSelectTrend}
                onClose={() => setCriticalDismissed(true)}
              />
            )}
            {/* Mobile: timeline only, no map */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderTimeline()}
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={!loading && criticalMoments.length > 0 && !criticalDismissed ? 28 : 38} minSize={25} maxSize={55}>
              {renderTimeline()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            {/* Critical Moments as horizontal panel on desktop */}
            {!loading && criticalMoments.length > 0 && filteredTrends.length > 1 && !criticalDismissed && (
              <>
                <ResizablePanel defaultSize={20} minSize={14} maxSize={30}>
                  <CriticalMomentsSection
                    moments={criticalMoments}
                    onSelectTrend={handleSelectTrend}
                    onClose={() => setCriticalDismissed(true)}
                    horizontal
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            <ResizablePanel defaultSize={!loading && criticalMoments.length > 0 && !criticalDismissed ? 52 : 62}>
              <div className="h-full bg-secondary/10">
                {renderMap()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Mobile floating coffee button */}
      {isMobile && <MobileCoffeeButton />}

      {/* Transparency Panel */}
      <TransparencyPanel
        open={transparencyOpen}
        onClose={() => setTransparencyOpen(false)}
        sourcesStatus={sourcesStatus}
        lastUpdated={lastUpdated}
        totalTrends={filteredTrends.length}
      />
    </div>
  );
};

export default Index;
