import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import AppHeader from "@/components/AppHeader";
import FilterBlock from "@/components/FilterBlock";
import { FilterState } from "@/components/FilterBar";
import TimelineCard from "@/components/TimelineCard";
import TrendCardSkeleton from "@/components/TrendCardSkeleton";
import TransparencyPanel from "@/components/TransparencyPanel";

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
import { X, Map, Newspaper, RefreshCw, FileText, LayoutGrid, List } from "lucide-react";
import ArchiveDrawer from "@/components/ArchiveDrawer";
import TagLegend from "@/components/TagLegend";
import { toast } from "@/hooks/use-toast";
import { useUserActivity } from "@/hooks/use-user-activity";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const GoogleMapView = lazy(() => import("@/components/GoogleMapView"));
import { SavedCollectionsSheet } from "@/components/SavedCollectionsSheet";

const MapFallback = () => (
  <div className="h-[400px] md:h-full w-full flex items-center justify-center bg-muted/30 rounded-2xl">
    <div className="flex items-center gap-3 text-muted-foreground text-sm">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="font-medium">Carregando mapa…</span>
    </div>
  </div>
);

const defaultFilters: FilterState = {
  country: "global", period: "Hoje", category: "Todas", type: "Todas mídias", query: "",
};

function getInitialFilters(): FilterState {
  if (typeof window === "undefined") return defaultFilters;
  const params = new URLSearchParams(window.location.search);
  return {
    country: params.get("country") || defaultFilters.country,
    period: params.get("period") || defaultFilters.period,
    category: params.get("category") || defaultFilters.category,
    type: params.get("type") || defaultFilters.type,
    query: params.get("query") || defaultFilters.query,
  };
}

const Index = () => {
  const { t, lang } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "map">("timeline");
  const [compactMode, setCompactMode] = useState(false);
  const [gridColumns, setGridColumns] = useState(2);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [panelVisibility, setPanelVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem("map-panel-open");
      const isMobileInit = window.innerWidth < 768;
      const mapOpen = saved !== null ? saved === "true" : !isMobileInit;
      return { timeline: true, map: mapOpen };
    } catch {
      return { timeline: true, map: true };
    }
  });
  const togglePanel = (panel: "timeline" | "map") => {
    setPanelVisibility(prev => {
      const next = { ...prev, [panel]: !prev[panel] };
      if (panel === "map") {
        try { localStorage.setItem("map-panel-open", String(next.map)); } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const { trackView } = useHistory(user?.id ?? null);
  const { trackAction } = useGamification(user?.id ?? null);
  const { cards: savedCards, removeCard, saveCard } = useSavedCards(user?.id ?? null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const { saveFilter } = useSavedFilters(user?.id ?? null);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const { filteredTrends: rawFilteredTrends, allTrends, loading, isFirstLoad, fetchTrends, countriesCount, lastUpdated, sourcesStatus } = useTrends(filters, setTrendCounts, lang);
  const criticalMoments = useCriticalMoments(rawFilteredTrends.length > 5 ? rawFilteredTrends : allTrends);
  const { anomalies, totalCount: anomalyCount, dismiss: dismissAnomaly } = useAnomalyAlerts(allTrends);
  const { multiplatformTitles, clusters } = useCrossPlatform(allTrends);
  const [transparencyOpen, setTransparencyOpen] = useState(false);

  const [trendContexts, setTrendContexts] = useState<Record<string, string>>({});
  const { translatedTrends, isTranslating } = useTranslatedTrends(rawFilteredTrends, lang);

  // Responsive grid columns
  useEffect(() => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width || 0;
      if (w >= 900) setGridColumns(3);
      else if (w >= 500) setGridColumns(2);
      else setGridColumns(1);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Lazy context fetching
  const contextFetchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const trendsNeedingContext = translatedTrends
      .filter(t => {
        const desc = (t.details || t.description || "").toLowerCase().trim();
        const ttl = t.title.toLowerCase().trim();
        const needsCtx = !desc || desc === ttl || desc.startsWith(ttl.slice(0, 30));
        return needsCtx && !contextFetchedRef.current.has(t.title) && !trendContexts[t.title];
      })
      .slice(0, 15);
    if (trendsNeedingContext.length === 0) return;
    trendsNeedingContext.forEach(t => contextFetchedRef.current.add(t.title));
    supabase.functions.invoke("analyze-trend-context", {
      body: {
        trends: trendsNeedingContext.map(t => ({
          title: t.title, platform: t.platform, category: t.category,
          volume: t.volume, countryCode: t.countryCode,
        })),
        lang,
      }
    }).then(({ data }) => {
      if (data?.contexts) {
        const newContexts: Record<string, string> = {};
        for (const ctx of data.contexts) {
          if (ctx.title && ctx.context) newContexts[ctx.title] = ctx.context;
        }
        if (Object.keys(newContexts).length > 0) setTrendContexts(prev => ({ ...prev, ...newContexts }));
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translatedTrends, lang]);

  const filteredTrends = useMemo(() => {
    const normKey = (title: string) => title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
    let baseTrends = translatedTrends;
    if (filters.type === "Multiplataforma") {
      const getOriginalKey = (t: TranslatedTrendCardProps) => normKey((t as any)._originalTitle || t.title);
      if (multiplatformTitles.size > 0) baseTrends = translatedTrends.filter(t => multiplatformTitles.has(getOriginalKey(t)));
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      return baseTrends.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }
    return baseTrends;
  }, [translatedTrends, filters.type, filters.query, multiplatformTitles]);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.country !== defaultFilters.country) params.set("country", filters.country);
    if (filters.period !== defaultFilters.period) params.set("period", filters.period);
    if (filters.category !== defaultFilters.category) params.set("category", filters.category);
    if (filters.type !== defaultFilters.type) params.set("type", filters.type);
    if (filters.query) params.set("query", filters.query);
    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [filters]);

  // Relevance scoring + interleaving
  const diversifiedTrends = useMemo(() => {
    const isGT = (t: TrendCardProps) => t.platform?.toLowerCase().includes("google trends");
    const now = Date.now();
    const ONE_HOUR = 3600000;
    const getAge = (t: TrendCardProps): number => {
      if (t.publishedAt) return (now - new Date(t.publishedAt).getTime()) / ONE_HOUR;
      if (t.firstSeenAt) return (now - new Date(t.firstSeenAt).getTime()) / ONE_HOUR;
      return 12;
    };
    const getScore = (t: TrendCardProps): number => {
      const volStr = (t.volume || "0").toLowerCase();
      let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
      if (volStr.includes("m")) vol *= 1_000_000;
      else if (volStr.includes("k")) vol *= 1_000;
      const volNorm = Math.min(vol / 10000, 100);
      const ch = Math.abs(parseFloat(t.change?.replace(/[^0-9.\-]/g, "") || "0"));
      const growthNorm = Math.min(ch, 100);
      const normalizedKey = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
      const isMulti = multiplatformTitles.has(normalizedKey);
      if (vol === 0 && ch === 0) return -1000;
      return (volNorm * 0.3) + (growthNorm * 0.4) + (isMulti ? 150 : 0) + ((t.sources?.length || 1) * 10) - (getAge(t) * 10);
    };
    const scored = filteredTrends.map(t => ({ t, score: getScore(t) })).filter(s => s.score > -500);
    scored.sort((a, b) => b.score - a.score);
    const nonGT = scored.filter(s => !isGT(s.t)).map(s => s.t);
    const gt = scored.filter(s => isGT(s.t)).map(s => s.t);
    const result: TrendCardProps[] = [];
    let gtIdx = 0, nonGTCount = 0;
    for (const t of nonGT) {
      result.push(t);
      nonGTCount++;
      if (nonGTCount % 4 === 0 && gtIdx < gt.length) result.push(gt[gtIdx++]);
    }
    while (gtIdx < gt.length) result.push(gt[gtIdx++]);
    return result;
  }, [filteredTrends, multiplatformTitles]);

  // Virtualizer
  const rowCount = useMemo(() => Math.ceil(diversifiedTrends.length / gridColumns), [diversifiedTrends.length, gridColumns]);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => compactMode ? 100 : 220,
    overscan: 4,
  });

  const handleMapClick = useCallback((code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const isActive = useUserActivity(30000);
  const timeSinceLastFetchRef = useRef(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
    timeSinceLastFetchRef.current = 0;
    setUpdatePending(false);
  }, [fetchTrends]);

  useEffect(() => {
    const interval = setInterval(() => {
      timeSinceLastFetchRef.current += 10;
      if (timeSinceLastFetchRef.current >= 90) {
        if (!isActive && expandedCardIndex === null) {
          fetchTrends().then(() => { timeSinceLastFetchRef.current = 0; setUpdatePending(false); });
        } else if (!updatePending) setUpdatePending(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive, expandedCardIndex, fetchTrends, updatePending]);

  const filterTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(() => setFilters(newFilters), 300);
  }, []);

  // Card click → toggle inline expansion
  const handleCardClick = useCallback((index: number) => {
    setExpandedCardIndex(prev => prev === index ? null : index);
    const trend = diversifiedTrends[index];
    if (trend) trackView(trend.title, trend.platform, { volume: trend.volume, category: trend.category, countryCode: trend.countryCode });
  }, [diversifiedTrends, trackView]);

  const handleSelectTrend = useCallback((trend: TrendCardProps) => {
    const idx = diversifiedTrends.findIndex(t => t.platform === trend.platform && t.title === trend.title);
    if (idx >= 0) setExpandedCardIndex(prev => prev === idx ? null : idx);
  }, [diversifiedTrends]);

  const expandedTrendCountry = useMemo(() => {
    if (expandedCardIndex === null) return null;
    const trend = diversifiedTrends[expandedCardIndex];
    return trend?.countryCode?.slice(0, 2).toUpperCase() || null;
  }, [expandedCardIndex, diversifiedTrends]);

  // Resilient fallback
  useEffect(() => {
    if (!loading && !isFirstLoad && filteredTrends.length === 0) {
      if (filters.period === "Hoje" || filters.period === "Últimas 24h") {
        const timer = setTimeout(() => {
          toast({
            title: lang === "pt" ? "🔭 Resiliência Ativada" : "🔭 Fallback Activated",
            description: lang === "pt" ? "Poucos resultados. Ampliando para Última Semana." : "Few results. Expanding to Last Week."
          });
          setFilters(f => ({ ...f, period: "Última semana" }));
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, isFirstLoad, filteredTrends.length, filters.period, lang]);

  const renderTimeline = () => (
    <div ref={timelineContainerRef} className="h-full flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}>
        

        {/* Timeline header */}
        <div className="px-3 py-2 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{t("timeline")}</span>
            <span className="text-[9px] text-muted-foreground/40">({diversifiedTrends.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            {updatePending && (
              <button onClick={handleRefresh} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-muted-foreground hover:bg-muted transition-colors">
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                {lang === "pt" ? "Atualizar" : "Update"}
              </button>
            )}
            <TagLegend />
            <div className="flex items-center overflow-hidden rounded-[10px] border border-border">
              <button
                onClick={() => setCompactMode(false)}
                title={lang === "pt" ? "Expandido" : "Expanded"}
                className={`flex items-center justify-center w-7 h-[26px] transition-all ${!compactMode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid size={12} />
              </button>
              <button
                onClick={() => setCompactMode(true)}
                title={lang === "pt" ? "Comprimido" : "Compressed"}
                className={`flex items-center justify-center w-7 h-[26px] transition-all ${compactMode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List size={12} />
              </button>
            </div>
            {!isMobile && (
              <button onClick={() => togglePanel("timeline")} className="flex items-center justify-center rounded-[10px] bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-7 h-7">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Virtualized grid */}
        {(loading && isFirstLoad && diversifiedTrends.length === 0)
          ? <div className="p-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>{Array.from({ length: 6 }).map((_, i) => <TrendCardSkeleton key={i} index={i} />)}</div>
          : (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }} className="px-2 sm:px-3">
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * gridColumns;
                return (
                  <div key={virtualRow.key}
                    ref={rowVirtualizer.measureElement} data-index={virtualRow.index}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`, padding: '3px 0', display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, 1fr)`, gap: '6px' }}
                  >
                    {Array.from({ length: gridColumns }).map((_, colIdx) => {
                      const trendIdx = startIdx + colIdx;
                      const trend = diversifiedTrends[trendIdx];
                      if (!trend) return <div key={colIdx} />;
                      const originalTitle = (trend as any)._originalTitle || trend.title;
                      const normalizedKey = originalTitle.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
                      const isMulti = multiplatformTitles.has(normalizedKey);
                      const aiContext = trendContexts[trend.title] || trendContexts[(trend as any)._originalTitle];
                      return (
                        <TimelineCard key={trendIdx} {...trend} compact={compactMode}
                          staggerIndex={trendIdx < 10 ? trendIdx : 0}
                          isMultiplatform={isMulti}
                          isSelected={expandedCardIndex === trendIdx}
                          onSaveCard={saveCard}
                          onClick={() => handleCardClick(trendIdx)}
                          onFilterPlatform={(p) => {
                            const map: Record<string, string> = {
                              "Reddit": "Redes sociais", "Bluesky": "Redes sociais", "Mastodon": "Redes sociais",
                              "NewsAPI": "Imprensa", "NewsData": "Imprensa", "GNews": "Imprensa", "Bing News": "Imprensa", "The Guardian": "Imprensa",
                              "Google Trends": "Buscas (Google)", "YouTube": "Todas mídias",
                              "World Bank": "Dados oficiais", "IBGE": "Dados oficiais", "OpenAlex": "Dados oficiais",
                            };
                            setFilters((f) => ({ ...f, type: map[p] || "Todas mídias" }));
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

        {!loading && !isFirstLoad && diversifiedTrends.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-[10px] font-medium text-foreground">{t("noTrends")}</p>
            <button onClick={() => setFilters(defaultFilters)} className="mt-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[9px] font-medium hover:bg-primary/90 transition-colors">
              {lang === "pt" ? "Limpar filtros" : "Clear filters"}
            </button>
          </div>
        )}

        {diversifiedTrends.length > 0 && lastUpdated && (
          <div className="flex flex-col items-center py-4 gap-1">
            <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              {t("lastUpdate")}: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <button onClick={() => setTransparencyOpen(true)} className="text-[8px] text-primary hover:underline cursor-pointer">
              🔍 {t("viewSourceStatus")}
            </button>
          </div>
        )}
      </div>
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
        onClose={!isMobile ? () => togglePanel("map") : undefined}
      />
    </Suspense>
  );

  const closedPanelsList = (["timeline", "map"] as const).filter(p => !panelVisibility[p]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden w-full max-w-[100vw]">
      <AppHeader />
      <FilterBlock filters={filters} onChange={handleFilterChange} onReset={() => setFilters(defaultFilters)} onSaveFilter={user ? () => {
        const name = prompt(lang === "pt" ? "Nome do filtro:" : "Filter name:");
        if (name) saveFilter(name, filters);
      } : undefined} />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isMobile ? (
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div className="flex-1 min-h-0 overflow-hidden">
              {viewMode === "timeline" ? renderTimeline() : <div className="h-full">{renderMap()}</div>}
            </div>
            <button
              onClick={() => setViewMode(v => v === "timeline" ? "map" : "timeline")}
              className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-foreground text-background text-[10px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.15)] active:scale-95 transition-transform touch-manipulation"
              style={{ minHeight: 48, minWidth: 48 }}
            >
              {viewMode === "timeline" ? <><Map className="w-4 h-4" /> {t("map")}</> : <><Newspaper className="w-4 h-4" /> {t("timeline")}</>}
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex">
            <ArchiveDrawer closedPanels={closedPanelsList as any} onRestore={(panel: any) => togglePanel(panel)} />
            <div className="flex-1 min-h-0 flex flex-col">
              {!panelVisibility.timeline && !panelVisibility.map ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p className="text-[10px]">{lang === "pt" ? "Todos os painéis foram arquivados." : "All panels archived."}</p>
                </div>
              ) : (
                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0" key={`h-${panelVisibility.timeline}-${panelVisibility.map}-${compactMode}`}>
                  {panelVisibility.timeline && (
                    <>
                      <ResizablePanel defaultSize={panelVisibility.map ? (compactMode ? 30 : 42) : 100} minSize={20} maxSize={panelVisibility.map ? 65 : 100}>
                        <div className="h-full min-h-0 overflow-hidden relative">{renderTimeline()}</div>
                      </ResizablePanel>
                      {panelVisibility.map && <ResizableHandle withHandle />}
                    </>
                  )}
                  {panelVisibility.map && (
                    <ResizablePanel defaultSize={panelVisibility.timeline ? (compactMode ? 70 : 58) : 100} minSize={15} maxSize={panelVisibility.timeline ? 80 : 100}>
                      <div className="h-full relative">{renderMap()}</div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              )}
            </div>
          </div>
        )}
      </div>

      <TransparencyPanel
        open={transparencyOpen}
        onClose={() => setTransparencyOpen(false)}
        sourcesStatus={sourcesStatus}
        lastUpdated={lastUpdated}
        totalTrends={filteredTrends.length}
      />
      <SavedCollectionsSheet
        open={collectionsOpen}
        onOpenChange={setCollectionsOpen}
        cards={savedCards}
        removeCard={removeCard}
      />
    </div>
  );
};

export default Index;
