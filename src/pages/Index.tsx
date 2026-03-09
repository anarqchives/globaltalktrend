import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useTimelineColumns } from "@/hooks/use-timeline-columns";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState, countries } from "@/components/FilterBar";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import TrendRadar from "@/components/TrendRadar";
import TransparencyPanel from "@/components/TransparencyPanel";
import TemporalHeatmap from "@/components/TemporalHeatmap";
import { TrendCardProps } from "@/components/TrendCard";
import { useTrends } from "@/hooks/use-trends";
import { useTranslatedTrends, TranslatedTrendCardProps } from "@/hooks/use-translated-trends";
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
import { ChevronRight, X, Map, Newspaper, LayoutList, LayoutGrid, RefreshCw, Camera } from "lucide-react";
import TagLegend from "@/components/TagLegend";
import WatchlistPanel from "@/components/WatchlistPanel";
import OnboardingFlow, { hasCompletedOnboarding } from "@/components/OnboardingFlow";
import { useUserActivity } from "@/hooks/use-user-activity";
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
  const [compactMode, setCompactMode] = useState(false);
  const timelinePanelRef = useRef<HTMLDivElement>(null);
  const { timelineRef: gridRef, columns: gridColumns } = useTimelineColumns();

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
  const [emergingDismissed, setEmergingDismissed] = useState(false);
  const [heatmapDismissed, setHeatmapDismissed] = useState(false);

  // Reset dismissed state when new critical moments appear
  useEffect(() => {
    if (criticalMoments.length > 0) setCriticalDismissed(false);
  }, [criticalMoments.length]);

  // Translate trends content based on selected language
  const { translatedTrends, isTranslating } = useTranslatedTrends(rawFilteredTrends, lang);

  // Filter for multiplatform if selected
  const filteredTrends = useMemo(() => {
    // Helper: normalize a title key for multiplatform matching
    const normKey = (title: string) => title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);

    if (filters.type === "Multiplataforma") {
      // Use ORIGINAL titles (before translation) for cross-platform matching
      const getOriginalKey = (t: TranslatedTrendCardProps) => normKey((t as any)._originalTitle || t.title);

      // First try cluster-based detection
      if (multiplatformTitles.size > 0) {
        const result = translatedTrends.filter(t => {
          const key = getOriginalKey(t);
          return multiplatformTitles.has(key);
        });
        if (result.length > 0) return result;
      }

      // Fallback: Jaccard similarity on ALL trends using original titles
      const allNormTitles = allTrends.map(t => ({
        norm: normKey(t.title),
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
        const result = translatedTrends.filter(t => {
          const key = getOriginalKey(t);
          return multiKeys.has(key);
        });
        if (result.length > 0) return result;
      }

      // FALLBACK: If no multiplatform trends found, return all category-filtered trends
      // instead of showing empty state
      console.log("⚠️ Nenhuma trend multiplataforma encontrada — mostrando todas as trends filtradas");
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
    "Reddit": 3, "Bluesky": 3, "Mastodon": 3, "X (Twitter)": 3, "YouTube": 4,
    "Hacker News": 5, "Stack Overflow": 5, "GitHub": 5,
    "Wikipedia": 6, "OpenAlex": 6, "World Bank": 6, "IBGE": 6,
    "Google Trends": 99,
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
  const [timeSinceLastFetch, setTimeSinceLastFetch] = useState(0);
  const [updatePending, setUpdatePending] = useState(false);
  const isActive = useUserActivity(30000);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
    setTimeSinceLastFetch(0);
    setUpdatePending(false);
  }, [fetchTrends]);

  // Smart Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSinceLastFetch((prev) => prev + 10);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeSinceLastFetch >= 90) {
      const hasExpandedCard = expandedTrendId !== null;
      const hasUserScrolled = scrollRef.current && scrollRef.current.scrollTop > 150;
      if (!isActive && !hasExpandedCard && !hasUserScrolled) {
        console.log("🔄 Usuário inativo, sem cards abertos e sem scroll. Atualizando timeline...");
        fetchTrends().then(() => {
          setTimeSinceLastFetch(0);
          setUpdatePending(false);
        });
      } else if (!updatePending) {
        setUpdatePending(true);
      }
    }
  }, [timeSinceLastFetch, isActive, expandedTrendId, fetchTrends, updatePending]);

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

  // Smart masonry: use CSS columns for gap-free layout
  const gridStyle = useMemo(() => ({
    columnCount: gridColumns,
    columnGap: compactMode ? '8px' : '12px',
  }), [gridColumns, compactMode]);

  const cardWrapperStyle = useMemo(() => ({
    breakInside: 'avoid' as const,
    marginBottom: compactMode ? '8px' : '12px',
  }), [compactMode]);

  const renderTimeline = () => (
    <div ref={(el) => { (scrollRef as any).current = el; (gridRef as any).current = el; }} className={`flex flex-col gap-1 p-2 h-full overflow-y-auto overflow-x-hidden scrollbar-thin relative transition-opacity duration-200 w-full max-w-full ${filterTransitioning ? 'opacity-60' : 'opacity-100'}`}>
      <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-10">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {t("timeline")}
        </span>
        <div className="flex items-center gap-2">
          {updatePending && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-colors animate-pulse"
              title="Atualização pausada por atividade. Clique para atualizar."
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar Agora
            </button>
          )}
          <TagLegend />
          <div className="flex items-center bg-secondary rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => setCompactMode(false)}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${!compactMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Modo expandido"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCompactMode(true)}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${compactMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Modo compacto"
            >
              <LayoutList className="w-3 h-3" />
            </button>
          </div>
        </div>
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
        ? Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} index={i} />)
        : (() => {
            const renderCard = (trend: TrendCardProps, i: number) => {
              const trendId = `${trend.platform}-${trend.title.slice(0, 20)}`;
              const originalTitle = (trend as any)._originalTitle || trend.title;
              const normalizedKey = originalTitle.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
              const isMulti = multiplatformTitles.has(normalizedKey);
              const matchingCluster = isMulti ? clusters.find(c => c.trends.some(ct => ct.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50) === normalizedKey)) || null : null;
              return (
                <div key={`${trendId}-${i}`} id={`trend-card-${trendId}`} style={cardWrapperStyle} className={highlightedTrendId === trendId ? 'animate-highlight-pulse rounded-xl' : ''}>
                <TimelineCard
                  {...trend}
                  compact={compactMode}
                  staggerIndex={i}
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
                    <motion.div
                      className="px-2 py-1.5 mt-1"
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <span className="text-[11px] font-bold text-destructive uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        🔥 Agora
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({agora.length})</span>
                      </span>
                    </motion.div>
                    <div style={gridStyle}>
                        {agora.map((trend) => renderCard(trend, globalIndex++))}
                    </div>
                  </>
                )}
                {ultimas2h.length > 0 && (
                  <>
                    <motion.div
                      className="px-2 py-1.5 mt-2"
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                    >
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                        ⏳ Últimas 2 horas
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({ultimas2h.length})</span>
                      </span>
                    </motion.div>
                    <div style={gridStyle}>
                        {ultimas2h.map((trend) => renderCard(trend, globalIndex++))}
                    </div>
                  </>
                )}
                {ultimas24h.length > 0 && (
                  <>
                    <motion.div
                      className="px-2 py-1.5 mt-2"
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                    >
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        📅 Últimas 24 horas
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">({ultimas24h.length})</span>
                      </span>
                    </motion.div>
                    <div style={gridStyle}>
                        {ultimas24h.map((trend) => renderCard(trend, globalIndex++))}
                    </div>
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
            saveFilter(name.trim(), filters);
          }
        }}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Gradient divider between filter and radar */}
        <div className="section-gradient-divider" />
        {/* Trend Radar */}
        <TrendRadar
          trends={filteredTrends}
          allTrends={allTrends}
          criticalMoments={criticalMoments}
          anomalies={anomalies}
          onSelectTrend={handleSelectTrend}
          onFilterCountry={(code) => setFilters(f => ({ ...f, country: code }))}
          onAnomalyClick={handleAnomalyClick}
        />

        {/* Gradient divider between radar and content */}
        <div className="section-gradient-divider" />

        {isMobile ? (
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewMode === "timeline" ? renderTimeline() : (
                <div className="h-full">{renderMap()}</div>
              )}
            </div>
            <motion.button
              onClick={() => setViewMode(v => v === "timeline" ? "map" : "timeline")}
              className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.15)] active:scale-95 transition-transform touch-manipulation"
              whileTap={{ scale: 0.93 }}
              style={{ minHeight: 48, minWidth: 48 }}
            >
              {viewMode === "timeline" ? (
                <><Map className="w-4 h-4" /> {t("map")}</>
              ) : (
                <><Newspaper className="w-4 h-4" /> {t("timeline")}</>
              )}
            </motion.button>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={65} minSize={25} maxSize={85}>
               <div className="h-full min-h-0 overflow-hidden" ref={timelinePanelRef}>
                {renderTimeline()}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={15} maxSize={60}>
              <div className="h-full">{renderMap()}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

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
