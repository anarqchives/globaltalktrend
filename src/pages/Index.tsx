import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState, countries } from "@/components/FilterBar";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import CriticalMomentsSection from "@/components/CriticalMomentsSection";
import TransparencyPanel from "@/components/TransparencyPanel";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useTranslatedTrends } from "@/hooks/use-translated-trends";
import { useCriticalMoments } from "@/hooks/use-critical-moments";
import { useAnomalyAlerts } from "@/hooks/use-anomaly-alerts";
import { useCrossPlatform } from "@/hooks/use-cross-platform";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHistory } from "@/hooks/use-history";
import { useGamification } from "@/hooks/use-gamification";
import { useSavedCards } from "@/hooks/use-saved-cards";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, X, Map, Newspaper } from "lucide-react";
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

// MobileCoffeeButton removed — now in header

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
  const { t, lang } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "map">("timeline");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const { trackView } = useHistory(user?.id ?? null);
  const { trackAction } = useGamification(user?.id ?? null);
  const { saveCard } = useSavedCards(user?.id ?? null);
  const { saveFilter } = useSavedFilters(user?.id ?? null);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const [expandedTrendId, setExpandedTrendId] = useState<string | null>(null);
  const [highlightedTrendId, setHighlightedTrendId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { filteredTrends: rawFilteredTrends, allTrends, loading, isFirstLoad, fetchTrends, countriesCount, lastUpdated, sourcesStatus } = useTrends(filters, setTrendCounts, lang);
  const criticalMoments = useCriticalMoments(rawFilteredTrends.length > 5 ? rawFilteredTrends : allTrends);
  const { anomalies, totalCount: anomalyCount, dismiss: dismissAnomaly } = useAnomalyAlerts(allTrends);
  const { multiplatformTitles, clusters } = useCrossPlatform(allTrends);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  // Reset dismissed state when new critical moments appear
  useEffect(() => {
    if (criticalMoments.length > 0) setCriticalDismissed(false);
  }, [criticalMoments.length]);

  // Translate trends content based on selected language
  const { translatedTrends, isTranslating } = useTranslatedTrends(rawFilteredTrends, lang);

  // Filter for multiplatform if selected
  const filteredTrends = useMemo(() => {
    if (filters.type === "Multiplataforma") {
      // Use cross-platform clusters to identify multiplatform trends
      // If no clusters found, use similarity-based fallback on allTrends
      if (multiplatformTitles.size > 0) {
        return translatedTrends.filter(t => {
          const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
          return multiplatformTitles.has(key);
        });
      }
      // Fallback: find trends whose platform type appears >=2 times for similar titles
      // Group all trends (not just filtered) by similarity to find cross-platform ones
      const allNormTitles = allTrends.map(t => ({
        norm: t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50),
        platform: t.platform,
      }));
      const multiKeys = new Set<string>();
      for (let i = 0; i < allNormTitles.length; i++) {
        const platforms = new Set<string>();
        platforms.add(allNormTitles[i].platform);
        const wordsI = new Set(allNormTitles[i].norm.split(/\s+/).filter(w => w.length > 3));
        for (let j = 0; j < allNormTitles.length; j++) {
          if (i === j) continue;
          const wordsJ = new Set(allNormTitles[j].norm.split(/\s+/).filter(w => w.length > 3));
          let common = 0;
          for (const w of wordsI) if (wordsJ.has(w)) common++;
          if (wordsI.size > 0 && common / Math.max(wordsI.size, wordsJ.size) > 0.4) {
            platforms.add(allNormTitles[j].platform);
          }
        }
        if (platforms.size >= 2) multiKeys.add(allNormTitles[i].norm);
      }
      if (multiKeys.size > 0) {
        return translatedTrends.filter(t => {
          const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
          return multiKeys.has(key);
        });
      }
      // Still empty — return all trends with a note
      return translatedTrends;
    }
    return translatedTrends;
  }, [translatedTrends, filters.type, multiplatformTitles, allTrends]);

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

  // Group visible trends by recency sections
  const SOURCE_PRIORITY: Record<string, number> = {
    "The Guardian": 1, "NPR": 1, "NewsAPI": 2, "GNews": 2, "Bing News": 2, "NewsData": 2,
    "Google Trends": 3, "YouTube": 4, "Reddit": 5, "Bluesky": 5, "Mastodon": 5,
    "World Bank": 6, "IBGE": 6, "OpenAlex": 6, "Wikipedia": 7,
  };

  const groupedTrends = useMemo(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const TWO_HOURS = 2 * ONE_HOUR;

    const getTimestamp = (trend: TrendCardProps) => {
      if (trend.publishedAt) return new Date(trend.publishedAt).getTime();
      if (trend.firstSeenAt) return new Date(trend.firstSeenAt).getTime();
      // Parse relative time from trend.time
      const m = trend.time?.match?.(/(\d+)\s*(min|h|hora)/i);
      if (m) {
        const val = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === "min") return now - val * 60 * 1000;
        return now - val * ONE_HOUR;
      }
      return now - 12 * ONE_HOUR; // default to 12h ago
    };

    const sortByPriority = (a: TrendCardProps, b: TrendCardProps) => {
      const pa = SOURCE_PRIORITY[a.platform] || 4;
      const pb = SOURCE_PRIORITY[b.platform] || 4;
      return pa - pb;
    };

    const agora: TrendCardProps[] = [];
    const ultimas2h: TrendCardProps[] = [];
    const ultimas24h: TrendCardProps[] = [];

    for (const trend of visibleTrends) {
      const ts = getTimestamp(trend);
      const diff = now - ts;
      if (diff < ONE_HOUR) agora.push(trend);
      else if (diff < TWO_HOURS) ultimas2h.push(trend);
      else ultimas24h.push(trend);
    }

    agora.sort(sortByPriority);
    ultimas2h.sort(sortByPriority);
    ultimas24h.sort(sortByPriority);

    return { agora, ultimas2h, ultimas24h };
  }, [visibleTrends]);

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

  // Auto-refresh every 60 seconds (non-intrusive: doesn't reset scroll or expanded state)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrends();
    }, 60_000);
    return () => clearInterval(interval);
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
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAnomalyClick = useCallback((trendId: string) => {
    setExpandedTrendId(trendId);
    setHighlightedTrendId(trendId);
    // Scroll to the card after a brief delay to allow render
    setTimeout(() => {
      const el = document.getElementById(`trend-card-${trendId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      // Clear highlight after animation
      setTimeout(() => setHighlightedTrendId(null), 2500);
    }, 100);
  }, []);

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
        : (() => {
            const renderCard = (trend: TrendCardProps, i: number) => {
              const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
              const normalizedKey = trend.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
              const isMulti = multiplatformTitles.has(normalizedKey);
              const matchingCluster = isMulti ? clusters.find(c => c.trends.some(ct => ct.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50) === normalizedKey)) || null : null;
              return (
                <div key={`${trendId}-${i}`} id={`trend-card-${trendId}`} className={`animate-fade-in ${highlightedTrendId === trendId ? 'animate-highlight-pulse rounded-xl' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                <TimelineCard
                  {...trend}
                  userId={user?.id}
                  onTrackAction={trackAction}
                  forceExpanded={expandedTrendId === trendId}
                  isMultiplatform={isMulti}
                  crossPlatformCluster={matchingCluster}
                  onSaveCard={saveCard}
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
                      "OpenAlex": "Dados oficiais",
                    };
                    setFilters((f) => ({ ...f, type: map[p] || "Todas mídias" }));
                  }}
                />
                </div>
              );
            };

            const { agora, ultimas2h, ultimas24h } = groupedTrends;
            let globalIndex = 0;

            return (
              <>
                {agora.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 mt-1">
                      <span className="text-[11px] font-bold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        🔥 Agora
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({agora.length})</span>
                      </span>
                    </div>
                    {agora.map((trend) => renderCard(trend, globalIndex++))}
                  </>
                )}
                {ultimas2h.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 mt-2">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                        ⏳ Últimas 2 horas
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({ultimas2h.length})</span>
                      </span>
                    </div>
                    {ultimas2h.map((trend) => renderCard(trend, globalIndex++))}
                  </>
                )}
                {ultimas24h.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 mt-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        📅 Últimas 24 horas
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({ultimas24h.length})</span>
                      </span>
                    </div>
                    {ultimas24h.map((trend) => renderCard(trend, globalIndex++))}
                  </>
                )}
              </>
            );
          })()}
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
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3 animate-fade-in">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-medium text-foreground">
            {filters.country !== "global"
              ? `Nenhuma tendência encontrada para ${countries.flatMap(g => g.items).find(c => c.value === filters.country)?.label?.replace(/^.{2}\s?/, '') || filters.country}`
              : t("noTrends")}
          </p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            {(() => {
              const cc = filters.country.toUpperCase();
              const limitedCountries: Record<string, string> = {
                CN: "A China possui plataformas próprias (WeChat, Weibo). Mostrando cobertura via SCMP, Xinhua e China Daily.",
                RU: "A Rússia possui plataformas próprias (VK, Yandex). Mostrando cobertura via TASS, RT e Moscow Times.",
                KP: "Cobertura extremamente limitada. Fontes: KCNA via agregadores internacionais.",
                IR: "Cobertura limitada. Mostrando menções em fontes internacionais.",
              };
              if (filters.country !== "global" && limitedCountries[cc]) return limitedCountries[cc];
              if (filters.country !== "global") return "As fontes disponíveis podem não estar cobrindo este país no momento. Tente ampliar o período, selecionar outra categoria ou escolher outro país.";
              return t("noTrendsCurrentFilters");
            })()}
          </p>
          <button
            onClick={() => setFilters(defaultFilters)}
            className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Limpar todos os filtros
          </button>
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
        onAnomalyClick={handleAnomalyClick}
      />
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onForceReset={() => setFilters(defaultFilters)}
        isLoggedIn={!!user}
        onSaveFilter={() => {
          const name = prompt("Nome do filtro:");
          if (name?.trim()) {
            import("@/hooks/use-saved-filters").then(() => {
              // Dispatch custom event for header to pick up
              window.dispatchEvent(new CustomEvent("save-filter-inline", { detail: { name: name.trim(), filters } }));
            });
          }
        }}
      />

      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full min-h-0 flex flex-col relative">
            {/* Critical Moments inline on mobile */}
            {!loading && criticalMoments.length > 0 && filteredTrends.length > 1 && !criticalDismissed && (
              <CriticalMomentsSection
                moments={criticalMoments}
                onSelectTrend={handleSelectTrend}
                onClose={() => setCriticalDismissed(true)}
              />
            )}
            {/* Mobile: toggle between timeline and map */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewMode === "timeline" ? renderTimeline() : (
                <div className="h-full">{renderMap()}</div>
              )}
            </div>
            {/* Floating toggle button */}
            <button
              onClick={() => setViewMode(v => v === "timeline" ? "map" : "timeline")}
              className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary/90 transition-all"
            >
              {viewMode === "timeline" ? (
                <><Map className="w-3.5 h-3.5" /> {t("map")}</>
              ) : (
                <><Newspaper className="w-3.5 h-3.5" /> {t("timeline")}</>
              )}
            </button>
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

      {/* Mobile coffee button removed — now in header */}

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
