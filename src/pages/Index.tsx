import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense, type ElementRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { ChevronRight, X, Map, Newspaper, RefreshCw, ChevronsUp, ChevronsDown, Radar, MapPin, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [allExpanded, setAllExpanded] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);
  // Panel visibility for collapsible sections
  const [panelVisibility, setPanelVisibility] = useState({
    radar: true,
    timeline: true,
    map: true,
  });
  const togglePanel = (panel: "radar" | "timeline" | "map") =>
    setPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));
  const timelinePanelRef = useRef<HTMLDivElement>(null);
  const radarPanelRef = useRef<ElementRef<typeof ResizablePanel>>(null);
  const [radarCollapsed, setRadarCollapsed] = useState(() => {
    try { return localStorage.getItem("radar-collapsed") === "true"; } catch { return false; }
  });
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user?.id && !hasCompletedOnboarding(user.id)) {
      setShowOnboarding(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (criticalMoments.length > 0) setCriticalDismissed(false);
  }, [criticalMoments.length]);

  const { translatedTrends, isTranslating } = useTranslatedTrends(rawFilteredTrends, lang);

  const filteredTrends = useMemo(() => {
    const normKey = (title: string) => title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);

    if (filters.type === "Multiplataforma") {
      const getOriginalKey = (t: TranslatedTrendCardProps) => normKey((t as any)._originalTitle || t.title);

      if (multiplatformTitles.size > 0) {
        const result = translatedTrends.filter(t => {
          const key = getOriginalKey(t);
          return multiplatformTitles.has(key);
        });
        if (result.length > 0) return result;
      }

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

      return translatedTrends;
    }
    return translatedTrends;
  }, [translatedTrends, filters.type, multiplatformTitles, allTrends]);

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
      const m = trend.time?.match?.(/(\d+)\s*(min|h|hora)/i);
      if (m) {
        const val = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === "min") return now - val * 60 * 1000;
        return now - val * ONE_HOUR;
      }
      return now - 12 * ONE_HOUR;
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
    setHighlightedTrendId(trendId);
    setViewMode("timeline");
    setTimeout(() => {
      const el = document.getElementById(`trend-card-${trendId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTimeout(() => setHighlightedTrendId(null), 2500);
    }, 150);
  }, []);

  const handleAnomalyClick = useCallback((trendId: string) => {
    setExpandedTrendId(trendId);
    setHighlightedTrendId(trendId);
    setTimeout(() => {
      const el = document.getElementById(`trend-card-${trendId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
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

  const gridStyle = useMemo(() => ({
    columnCount: gridColumns,
    columnGap: compactMode ? '8px' : '12px',
  }), [gridColumns, compactMode]);

  const cardWrapperStyle = useMemo(() => ({
    breakInside: 'avoid' as const,
    marginBottom: compactMode ? '8px' : '12px',
  }), [compactMode]);

  const renderTimeline = () => (
    <div ref={(el) => { (scrollRef as any).current = el; (gridRef as any).current = el; }} className={`flex flex-col gap-0.5 p-2 h-full overflow-y-auto overflow-x-hidden scrollbar-thin relative transition-opacity duration-200 w-full max-w-full ${filterTransitioning ? 'opacity-60' : 'opacity-100'}`}>
      {/* Timeline header with controls */}
      <div className="px-1.5 h-8 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 rounded-md">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t("timeline")}
        </span>
        <div className="flex items-center gap-1">
          {updatePending && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors animate-pulse"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              {lang === "pt" ? "Atualizar" : "Update"}
            </button>
          )}
          <TagLegend />
          {/* Single unified view toggle — segmented control */}
          <div className="flex items-center bg-muted/40 rounded-md p-0.5 gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setAllExpanded(true); setAllCollapsed(false); setCompactMode(false); }}
                  className={`flex items-center justify-center w-6 h-6 rounded transition-all ${allExpanded && !compactMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ChevronsDown className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{lang === "pt" ? "Expandir todos" : "Expand all"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setAllCollapsed(true); setAllExpanded(false); setCompactMode(true); }}
                  className={`flex items-center justify-center w-6 h-6 rounded transition-all ${allCollapsed || compactMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ChevronsUp className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{lang === "pt" ? "Compactar todos" : "Collapse all"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Watchlist Panel */}
      {user && (
        <WatchlistPanel trends={filteredTrends} onSelectTrend={handleSelectTrend} />
      )}

      {breadcrumbs.length > 0 && (
        <div className="px-1.5 py-0.5 flex items-center gap-1 flex-wrap text-[9px]">
          <span className="text-muted-foreground/50">{t("showing")}:</span>
          {breadcrumbs.map((seg, i) => (
            <span key={seg.key} className="inline-flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="w-2 h-2 text-muted-foreground/30" />}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                {seg.label}
                <button onClick={() => clearBreadcrumb(seg.key)} className="ml-0.5 hover:text-destructive transition-colors">
                  <X className="w-2 h-2" />
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
                  forceExpanded={allExpanded || expandedTrendId === trendId}
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
                      className="px-1.5 py-1 mt-0.5"
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-wide flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        🔥 Agora
                        <span className="text-[9px] font-normal text-muted-foreground ml-0.5">({agora.length})</span>
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
                      className="px-1.5 py-1 mt-1"
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                    >
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                        ⏳ Últimas 2h
                        <span className="text-[9px] font-normal text-muted-foreground ml-0.5">({ultimas2h.length})</span>
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
                      className="px-1.5 py-1 mt-1"
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.08 }}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        📅 24h
                        <span className="text-[9px] font-normal text-muted-foreground ml-0.5">({ultimas24h.length})</span>
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
        <div className="flex flex-col items-center py-3 gap-1.5">
          <span className="text-[10px] text-muted-foreground/40">— {t("noTrends")} —</span>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
             <span className="w-1 h-1 rounded-full bg-green-500" />
              {t("lastUpdate")}: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <button onClick={() => setTransparencyOpen(true)} className="text-[9px] text-primary hover:underline cursor-pointer">
            🔍 {t("viewSourceStatus")}
          </button>
        </div>
      )}
      {!loading && !isFirstLoad && filteredTrends.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2 animate-fade-in">
          <span className="text-3xl">🔍</span>
          <p className="text-xs font-medium text-foreground">
            {filters.country !== "global"
              ? `Nenhuma tendência encontrada para ${countries.flatMap(g => g.items).find(c => c.value === filters.country)?.label?.replace(/^.{2}\s?/, '') || filters.country}`
              : t("noTrends")}
          </p>
          <p className="text-[10px] text-muted-foreground max-w-[260px]">
            {(() => {
              const cc = filters.country.toUpperCase();
              const limitedCountries: Record<string, string> = {
                CN: "A China possui plataformas próprias (WeChat, Weibo). Mostrando cobertura via SCMP, Xinhua e China Daily.",
                RU: "A Rússia possui plataformas próprias (VK, Yandex). Mostrando cobertura via TASS, RT e Moscow Times.",
                KP: "Cobertura extremamente limitada. Fontes: KCNA via agregadores internacionais.",
                IR: "Cobertura limitada. Mostrando menções em fontes internacionais.",
              };
              if (filters.country !== "global" && limitedCountries[cc]) return limitedCountries[cc];
              if (filters.country !== "global") return "As fontes disponíveis podem não estar cobrindo este país no momento. Tente ampliar o período.";
              return t("noTrendsCurrentFilters");
            })()}
          </p>
          <button
            onClick={() => setFilters(defaultFilters)}
            className="mt-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium hover:bg-primary/90 transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {showScrollTop && (
        <div className="sticky bottom-3 z-20 flex justify-center">
          <button
            onClick={scrollToTop}
            className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2"
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

  // Count closed panels
  const closedPanels = [!panelVisibility.radar, !panelVisibility.timeline, !panelVisibility.map].filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden w-full max-w-[100vw]">
      {/* Fixed Header */}
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

      {/* Fixed Filters */}
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

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isMobile ? (
          <>
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
            {/* Timeline/Map */}
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
          </>
        ) : (
          <div className="flex-1 min-h-0 flex">
            {/* Closed panel tabs — sleek vertical sidebar */}
            <AnimatePresence>
              {closedPanels > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 32, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex flex-col bg-muted/10 border-r border-border/20 py-2 gap-1 flex-shrink-0 overflow-hidden"
                >
                  {!panelVisibility.radar && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => togglePanel("radar")}
                          className="flex flex-col items-center justify-center py-3 text-primary/60 hover:text-primary hover:bg-primary/5 transition-all rounded-r-md mx-0.5"
                        >
                          <Radar className="w-3.5 h-3.5" />
                          <span className="text-[7px] font-bold uppercase tracking-wider mt-1" style={{ writingMode: "vertical-lr" }}>Radar</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px]">{lang === "pt" ? "Abrir Radar" : "Open Radar"}</TooltipContent>
                    </Tooltip>
                  )}
                  {!panelVisibility.timeline && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => togglePanel("timeline")}
                          className="flex flex-col items-center justify-center py-3 text-primary/60 hover:text-primary hover:bg-primary/5 transition-all rounded-r-md mx-0.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-[7px] font-bold uppercase tracking-wider mt-1" style={{ writingMode: "vertical-lr" }}>Timeline</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px]">{lang === "pt" ? "Abrir Timeline" : "Open Timeline"}</TooltipContent>
                    </Tooltip>
                  )}
                  {!panelVisibility.map && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => togglePanel("map")}
                          className="flex flex-col items-center justify-center py-3 text-primary/60 hover:text-primary hover:bg-primary/5 transition-all rounded-r-md mx-0.5"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[7px] font-bold uppercase tracking-wider mt-1" style={{ writingMode: "vertical-lr" }}>{lang === "pt" ? "Mapa" : "Map"}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px]">{lang === "pt" ? "Abrir Mapa" : "Open Map"}</TooltipContent>
                    </Tooltip>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {!panelVisibility.radar && !panelVisibility.timeline && !panelVisibility.map ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">{lang === "pt" ? "Clique nas abas laterais para reabrir os painéis." : "Click the side tabs to reopen panels."}</p>
                </div>
              ) : (
                <ResizablePanelGroup
                  direction="vertical"
                  className="flex-1 min-h-0 [&>div]:transition-[flex-grow] [&>div]:duration-300 [&>div]:ease-[cubic-bezier(0.4,0,0.2,1)]"
                  key={`v-${panelVisibility.radar}-${panelVisibility.timeline}-${panelVisibility.map}`}
                >
                  {/* Radar Panel — resizable vertically */}
                  {panelVisibility.radar && (
                    <>
                      <ResizablePanel
                        ref={radarPanelRef}
                        defaultSize={30}
                        minSize={8}
                        maxSize={70}
                        collapsible
                        collapsedSize={3}
                        onCollapse={() => { setRadarCollapsed(true); try { localStorage.setItem("radar-collapsed", "true"); } catch {} }}
                        onExpand={() => { setRadarCollapsed(false); try { localStorage.setItem("radar-collapsed", "false"); } catch {} }}
                      >
                        <div className="h-full border-b border-border/20 bg-muted/8">
                          <TrendRadar
                            trends={filteredTrends}
                            allTrends={allTrends}
                            criticalMoments={criticalMoments}
                            anomalies={anomalies}
                            onSelectTrend={handleSelectTrend}
                            onFilterCountry={(code) => setFilters(f => ({ ...f, country: code }))}
                            onAnomalyClick={handleAnomalyClick}
                            onClose={() => togglePanel("radar")}
                            isCollapsed={radarCollapsed}
                            onToggleCollapse={() => {
                              const panel = radarPanelRef.current;
                              if (!panel) return;
                              if (radarCollapsed) panel.expand();
                              else panel.collapse();
                            }}
                          />
                        </div>
                      </ResizablePanel>
                      {(panelVisibility.timeline || panelVisibility.map) && (
                        <ResizableHandle withHandle />
                      )}
                    </>
                  )}

                  {/* Timeline + Map — resizable horizontally inside */}
                  {(panelVisibility.timeline || panelVisibility.map) && (
                    <ResizablePanel defaultSize={panelVisibility.radar ? 70 : 100} minSize={20}>
                      <ResizablePanelGroup direction="horizontal" className="h-full" key={`h-${panelVisibility.timeline}-${panelVisibility.map}`}>
                        {panelVisibility.timeline && (
                          <>
                            <ResizablePanel defaultSize={panelVisibility.map ? 65 : 100} minSize={25} maxSize={panelVisibility.map ? 85 : 100}>
                              <div className="h-full min-h-0 overflow-hidden relative" ref={timelinePanelRef}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => togglePanel("timeline")}
                                      className="absolute top-2 right-3 z-20 w-6 h-6 rounded-full flex items-center justify-center bg-muted/60 hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/30 shadow-sm backdrop-blur-sm transition-all duration-200"
                                    >
                                      <X className="w-3 h-3" strokeWidth={2.5} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-[10px]">{lang === "pt" ? "Fechar Timeline" : "Close Timeline"}</TooltipContent>
                                </Tooltip>
                                {renderTimeline()}
                              </div>
                            </ResizablePanel>
                            {panelVisibility.map && <ResizableHandle withHandle />}
                          </>
                        )}
                        {panelVisibility.map && (
                          <ResizablePanel defaultSize={panelVisibility.timeline ? 35 : 100} minSize={15} maxSize={panelVisibility.timeline ? 60 : 100}>
                            <div className="h-full relative">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => togglePanel("map")}
                                    className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center bg-muted/60 hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/30 shadow-sm backdrop-blur-sm transition-all duration-200"
                                  >
                                    <X className="w-3 h-3" strokeWidth={2.5} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-[10px]">{lang === "pt" ? "Fechar Mapa" : "Close Map"}</TooltipContent>
                              </Tooltip>
                              {renderMap()}
                            </div>
                          </ResizablePanel>
                        )}
                      </ResizablePanelGroup>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              )}
            </div>
          </div>
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

      {/* Onboarding Flow */}
      {showOnboarding && user?.id && (
        <OnboardingFlow userId={user.id} onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
};

export default Index;
