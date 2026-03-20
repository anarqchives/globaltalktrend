/**
 * use-trends hook — decomposed version.
 * Core hook only; cache, normalize, social fetchers, and fallbacks extracted.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "../components/TrendCard";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "../components/FilterBar";
import { detectCountryFromContent } from "@/lib/categorize-trend";
import { useHistoricalTrends, saveToHistoricalCollector, getFromHistoricalCollector } from "./use-historical-trends";
import { getSourceInfo, matchesFilterType } from "@/lib/source-map";

import {
  loadSourceHealth, saveSourceHealth, updateSourceHealth,
  saveSourceLastGood, getSourceLastGood,
  saveToPredictiveCache, getFromPredictiveCache,
  getCachedTrends, getStaleCachedTrends, setCachedTrends,
  CACHE_TTL, SourceHealthMap, SourceHealthEntry,
} from "@/lib/trend-cache";

import {
  normalizeText, normalizeCountryCode, ensureTrendCountry,
  normalizeCategory, normalizeTrendForFilter, NormalizedTrendForFilter,
} from "@/lib/trend-normalize";

import {
  fetchRedditClientSide, fetchBlueskyClientSide, fetchMastodonClientSide,
} from "@/lib/social-fetchers";

// ─── Source Priority Groups ────────────────────────────────────────
const SOURCE_GROUPS: Record<string, string[]> = {
  imprensa: ["The Guardian", "NewsAPI", "NewsData", "GNews", "Bing News", "Currents", "Mediastack"],
  social: ["Reddit", "Bluesky", "Mastodon", "X (Twitter)"],
  dados: ["World Bank", "IBGE", "IMF", "FRED", "NOAA", "FMI (IMF)", "OMS (WHO)"],
  ciencia: ["OpenAlex", "arXiv", "PubMed", "Crossref", "Semantic Scholar"],
  tech: ["Hacker News", "GitHub", "Stack Overflow", "Lobsters"],
  busca: ["Google Trends"],
  enciclopedia: ["Wikipedia"],
  conflitos: ["GDELT", "GDELT DOC", "ACLED"],
};

// ─── Fallback Data (real-looking, but clearly labeled — will show only if ALL sources fail) ─
const fallbackData: TrendCardProps[] = [];

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) window.clearTimeout(timeoutId);
  return result;
}

// ─── Main Hook ─────────────────────────────────────────────────────
export function useTrends(filters: FilterState, onTrendCountsChange: (counts: Record<string, number>) => void, lang: string = "pt") {
  const cached = getCachedTrends();
  const cacheAgeMs = cached ? Date.now() - cached.ts : Number.POSITIVE_INFINITY;
  const [trends, setTrends] = useState<TrendCardProps[]>(cached?.data || []);
  const [loading, setLoading] = useState(!cached);
  const [isFirstLoad, setIsFirstLoad] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(cached ? new Date(cached.ts) : null);
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, { ok: boolean; count: number; lastUpdate: Date }>>({});
  const { fetchHistorical } = useHistoricalTrends();

  const fetchTrends = useCallback(async () => {
    try {
      if (import.meta.env.DEV) console.log("📥 Iniciando carregamento de trends");
      setLoading(true);
      let health = loadSourceHealth();

      const invokeFunctionWithLogs = async (
        sourceName: string,
        functionName: string,
        timeoutMs: number
      ) => {
        if (import.meta.env.DEV) console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(
          supabase.functions.invoke(functionName, { body: { lang } }).catch(() => ({ data: { trends: [] } })),
          timeoutMs,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        );
        const fetchedTrends = result.data?.trends || [];
        const count = fetchedTrends.length;
        if (import.meta.env.DEV) console.log(`✅ ${sourceName} retornou:`, count, "itens");
        
        if (count > 0) {
          saveSourceLastGood(functionName, fetchedTrends);
        } else {
          const fb = getSourceLastGood(functionName);
          if (fb.length > 0) {
            if (import.meta.env.DEV) console.log(`♻️ ${sourceName}: usando ${fb.length} itens do último ciclo OK`);
            result.data = { trends: fb };
          }
        }

        const platforms: string[] = (result.data?.trends || []).map((t: TrendCardProps) => String(t.platform || ""));
        const uniquePlatforms = Array.from(new Set(platforms));
        if (uniquePlatforms.length > 0) {
          for (const p of uniquePlatforms) {
            const pCount = platforms.filter((x: string) => x === p).length;
            health = updateSourceHealth(health, p, pCount > 0, pCount);
          }
        } else {
          health = updateSourceHealth(health, sourceName, false, 0);
        }
        
        return result;
      };

      const fetchClientSourceWithLogs = async (
        sourceName: string,
        fetchPromise: Promise<TrendCardProps[]>,
        timeoutMs = 8000
      ) => {
        if (import.meta.env.DEV) console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(fetchPromise, timeoutMs, [] as TrendCardProps[]);
        if (import.meta.env.DEV) console.log(`✅ ${sourceName} retornou:`, result.length, "itens");
        health = updateSourceHealth(health, sourceName, result.length > 0, result.length);
        return result;
      };

      const [
        edgeResult, extraResult, extraSourcesResult, socialTrendsResult, openDataResult,
        redditBskyMastodonResult, gdeltDocResult,
        crossrefResult, semanticResult, whoResult, imfResult, techScienceResult,
        fredResult, theNewsApiResult, currentsMediastackResult,
      ] = await Promise.all([
        invokeFunctionWithLogs("Google Trends", "fetch-trends", 12000),
        invokeFunctionWithLogs("The Guardian/News Extra", "fetch-news-extra", 10000),
        invokeFunctionWithLogs("Fontes Oficiais Extras", "fetch-extra-sources", 10000),
        invokeFunctionWithLogs("Social Trends", "fetch-social-trends", 10000),
        invokeFunctionWithLogs("Open Data", "fetch-open-data", 12000),
        invokeFunctionWithLogs("Reddit/Bluesky/Mastodon", "fetch-reddit-bluesky-mastodon", 12000),
        invokeFunctionWithLogs("GDELT DOC", "fetch-gdelt-trends", 10000),
        invokeFunctionWithLogs("Crossref", "fetch-crossref", 10000),
        invokeFunctionWithLogs("Semantic Scholar", "fetch-semantic-scholar", 10000),
        invokeFunctionWithLogs("OMS Saúde", "fetch-who-data", 8000),
        invokeFunctionWithLogs("FMI Economia", "fetch-imf-data", 8000),
        invokeFunctionWithLogs("Tech/Science Extra", "fetch-tech-science-extra", 8000),
        invokeFunctionWithLogs("FRED Economics", "fetch-fred", 8000),
        invokeFunctionWithLogs("The News API", "fetch-thenewsapi", 10000),
        invokeFunctionWithLogs("Currents/Mediastack", "fetch-currents-mediastack", 10000),
      ]);

      saveSourceHealth(health);

      const edgeTrends: TrendCardProps[] = edgeResult.data?.trends || [];
      const extraTrends: TrendCardProps[] = extraResult.data?.trends || [];
      const extraSourcesTrends: TrendCardProps[] = extraSourcesResult.data?.trends || [];
      const socialTrends: TrendCardProps[] = socialTrendsResult.data?.trends || [];
      const openDataTrends: TrendCardProps[] = openDataResult.data?.trends || [];
      const redditBskyMastodonTrends: TrendCardProps[] = redditBskyMastodonResult.data?.trends || [];
      const gdeltDocTrends: TrendCardProps[] = gdeltDocResult.data?.trends || [];
      const crossrefTrends: TrendCardProps[] = crossrefResult.data?.trends || [];
      const semanticTrends: TrendCardProps[] = semanticResult.data?.trends || [];
      const whoTrends: TrendCardProps[] = whoResult.data?.trends || [];
      const imfTrends: TrendCardProps[] = imfResult.data?.trends || [];
      const techScienceTrends: TrendCardProps[] = techScienceResult.data?.trends || [];
      const fredTrends: TrendCardProps[] = fredResult.data?.trends || [];
      const theNewsApiTrends: TrendCardProps[] = theNewsApiResult.data?.trends || [];
      const currentsMediastackTrends: TrendCardProps[] = currentsMediastackResult.data?.trends || [];

      const rawTrends = [
        ...edgeTrends, ...extraTrends, ...extraSourcesTrends, ...socialTrends, ...openDataTrends,
        ...redditBskyMastodonTrends, ...gdeltDocTrends,
        ...crossrefTrends, ...semanticTrends, ...whoTrends, ...imfTrends, ...techScienceTrends,
        ...fredTrends, ...theNewsApiTrends, ...currentsMediastackTrends,
      ];
      
      if (import.meta.env.DEV) console.log("📦 Total de trends combinadas:", rawTrends.length);

      if (rawTrends.length === 0) {
        const stale = getStaleCachedTrends();
        if (stale.length > 0) {
          if (import.meta.env.DEV) console.log("♻️ Usando cache expirado como fallback:", stale.length, "itens");
          setTrends(stale);
          setLoading(false);
          setIsFirstLoad(false);
          return;
        }
      }

      const allNormalized = rawTrends.map((t) => {
        const category = normalizeCategory(t.title || "Sem título", t.platform || "Unknown", t.category);
        const sourceInfo = getSourceInfo(t.platform || "Unknown");
        const detectedCountry = detectCountryFromContent(t.title || "", t.platform || "Unknown", t.details || t.description || "", t.countryCode);
        const countryCode = normalizeCountryCode(detectedCountry || t.countryCode || sourceInfo.country);

        let trustBadge = t.trustBadge;
        if (!trustBadge) {
          const mt = sourceInfo.mediaType;
          if (mt === "dados-oficiais") trustBadge = "official";
          else if (mt === "ciencia") trustBadge = "scientific";
          else if (["The Guardian", "BBC", "Reuters", "BBC News"].includes(t.platform)) trustBadge = "international";
          else if (mt === "imprensa") trustBadge = "press";
          else if (mt === "conflitos") trustBadge = "verified";
        }

        const normalized = {
          ...t,
          title: (t.title || "Sem título").trim(),
          platform: t.platform || "Unknown",
          category: category || sourceInfo.category || "Geral",
          countryCode,
          trustBadge,
          reliability: sourceInfo.reliability,
        };
        return ensureTrendCountry(normalized);
      });

      const historicalTrends = await withTimeout(fetchHistorical(), 5000, []);

      const seenTitles = new Set<string>();
      const deduped = allNormalized.filter(t => {
        const key = t.title.toLowerCase().trim().slice(0, 80);
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });

      const liveTitleSet = new Set(deduped.map(t => `${t.title}||${t.platform}`));
      const uniqueHistorical = historicalTrends.filter(h => !liveTitleSet.has(`${h.title}||${h.platform}`));

      const scoredLive = deduped.map(t => ({
        ...t,
        relevanceScore: t.relevanceScore ?? 80 + Math.random() * 20,
        firstSeenAt: t.firstSeenAt || new Date().toISOString(),
      }));

      const qualityFilter = (trend: TrendCardProps): boolean => {
        const p = trend.platform.toLowerCase();
        const vol = parseInt((trend.volume || "0").replace(/[^0-9]/g, "")) || 0;
        if (p.includes("stack overflow") && vol < 100) return false;
        if (p.includes("mastodon") && vol < 10) return false;
        if (p.includes("reddit") && vol < 50) return false;
        if (p.includes("bluesky") && vol < 20) return false;
        if (p.includes("github") && vol < 10) return false;
        if (p.includes("hacker news") && vol < 20) return false;
        return true;
      };

      const combinedTrends = [...scoredLive, ...uniqueHistorical].filter(qualityFilter);

      const pressPlatforms = SOURCE_GROUPS.imprensa;
      const imprensaData = combinedTrends.filter((trend) => pressPlatforms.includes(trend.platform));
      if (imprensaData.length === 0) {
        if (import.meta.env.DEV) console.log("📰 Imprensa sem dados - mostrando aviso");
        combinedTrends.unshift({
          icon: "📰", platform: "The Guardian",
          title: "Fontes de imprensa temporariamente indisponíveis",
          category: "Geral", time: "agora", volume: "Sistema", change: "sem dados",
          changePositive: false, sparkData: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          details: "The Guardian e outras fontes podem estar com limite de API. Tente novamente mais tarde.",
          countryCode: "GL", trustBadge: "verified",
        });
      }

      if (combinedTrends.length > 0) {
        saveToHistoricalCollector(combinedTrends);
        setTrends(combinedTrends);
        setCachedTrends(combinedTrends);
        const now = new Date();
        setLastUpdated(now);

        const statusMap: Record<string, { ok: boolean; count: number; lastUpdate: Date }> = {};
        const platformCounts: Record<string, number> = {};
        for (const t of combinedTrends) {
          platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1;
        }
        const allPlatforms = [
          ...SOURCE_GROUPS.imprensa, ...SOURCE_GROUPS.social, ...SOURCE_GROUPS.dados,
          ...SOURCE_GROUPS.ciencia, ...SOURCE_GROUPS.tech, ...SOURCE_GROUPS.busca,
          ...SOURCE_GROUPS.enciclopedia, ...SOURCE_GROUPS.conflitos,
          "YouTube",
        ];
        for (const p of allPlatforms) {
          statusMap[p] = { ok: (platformCounts[p] || 0) > 0, count: platformCounts[p] || 0, lastUpdate: now };
        }
        setSourcesStatus(statusMap);

        supabase.functions.invoke("save-trend-snapshots", {
          body: { trends: allNormalized.slice(0, 120) },
        }).catch(() => {});

        if (!isFirstLoad) {
          toast({ title: "✅ Atualizado", description: `${combinedTrends.length} trends (${allNormalized.length} ao vivo + ${uniqueHistorical.length} históricas)` });
        }
        setIsFirstLoad(false);
      } else {
        console.warn("All data sources returned empty");
        // Show empty — no fake data
        setTrends([]);
        setIsFirstLoad(false);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      if (trends.length <= 1) {
        const stale = getStaleCachedTrends();
        setTrends(stale.length > 0 ? stale : []);
      }
    } finally {
      setLoading(false);
    }
  }, [isFirstLoad, lang]);

  useEffect(() => {
    let intervalId: number | undefined;
    let initialFetchTimer: number | undefined;

    let lastActivity = Date.now();
    const IDLE_THRESHOLD = 30_000;

    const trackActivity = () => { lastActivity = Date.now(); };
    window.addEventListener("mousemove", trackActivity, { passive: true });
    window.addEventListener("scroll", trackActivity, { passive: true });
    window.addEventListener("keydown", trackActivity, { passive: true });
    window.addEventListener("click", trackActivity, { passive: true });

    const smartFetch = () => {
      const idle = Date.now() - lastActivity > IDLE_THRESHOLD;
      if (idle) {
        fetchTrends();
      } else {
        window.setTimeout(() => {
          if (Date.now() - lastActivity > IDLE_THRESHOLD) fetchTrends();
        }, IDLE_THRESHOLD);
      }
    };

    const startPolling = () => {
      intervalId = window.setInterval(smartFetch, 10 * 60 * 1000);
    };

    const handleTrendRefresh = () => fetchTrends();
    window.addEventListener("trend-refresh", handleTrendRefresh);

    if (cacheAgeMs < CACHE_TTL) {
      const remainingMs = CACHE_TTL - cacheAgeMs;
      initialFetchTimer = window.setTimeout(fetchTrends, remainingMs);
      startPolling();
    } else {
      fetchTrends();
      startPolling();
    }

    return () => {
      if (initialFetchTimer) window.clearTimeout(initialFetchTimer);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("trend-refresh", handleTrendRefresh);
      window.removeEventListener("mousemove", trackActivity);
      window.removeEventListener("scroll", trackActivity);
      window.removeEventListener("keydown", trackActivity);
      window.removeEventListener("click", trackActivity);
    };
  }, [fetchTrends, cacheAgeMs]);

  // ─── Filtered Trends with Smart Fallback ─────────────────────────
  const filteredTrends = useMemo(() => {
    const countryFilter = normalizeCountryCode(filters.country) || (filters.country === "global" ? "GL" : undefined);
    const filterCategory = normalizeText(filters.category);

    const normalizedTrends = trends.map(normalizeTrendForFilter);

    const matchesType = (trend: NormalizedTrendForFilter) => {
      return matchesFilterType(trend.source, filters.type);
    };

    const filtered = normalizedTrends.filter((trend) => {
      const matchCountry =
        filters.country === "global" ||
        trend.normalizedCountry === countryFilter;

      const matchCategory =
        filters.category === "Todas" ||
        trend.normalizedCategory === filterCategory ||
        trend.normalizedCategory.startsWith(filterCategory);

      const matchSource = matchesType(trend);

      return matchCountry && matchCategory && matchSource;
    });

    // ── SMART FALLBACK: Hierarchical data recovery (no fake data) ──
    if (filtered.length === 0 && filters.country !== "global" && trends.length > 0) {
      if (import.meta.env.DEV) console.log(`🧠 Zero trends para país ${countryFilter} — iniciando fallback hierárquico`);

      let combined: TrendCardProps[] = [];
      const seenKeys = new Set<string>();

      const addUnique = (items: TrendCardProps[]) => {
        for (const item of items) {
          const key = item.title.toLowerCase().slice(0, 60);
          if (seenKeys.has(key)) continue;
          const itemCountry = normalizeCountryCode(item.countryCode) || "GL";
          if (itemCountry !== countryFilter) continue;
          seenKeys.add(key);
          combined.push(item);
        }
      };

      // Layer 1: localStorage historical collector (same country only)
      const localHistorical = getFromHistoricalCollector(filters.category, filters.country);
      if (localHistorical.length > 0) addUnique(localHistorical);

      // Layer 2: Predictive cache (same country only)
      if (combined.length < 3) {
        const predicted = getFromPredictiveCache(filters);
        if (predicted && predicted.length > 0) addUnique(predicted);
      }

      // Layer 3: Search ALL trends for keyword matches related to the country
      if (combined.length < 3) {
        const countryKeywords: Record<string, string[]> = {
          VE: ["venezuela", "maduro", "caracas", "guaidó", "pdvsa", "chavismo"],
          PS: ["gaza", "palestina", "palestine", "hamas", "cisjordânia", "west bank"],
          UA: ["ucrânia", "ukraine", "kyiv", "zelensky", "kharkiv"],
          RU: ["rússia", "russia", "putin", "kremlin", "moscou"],
          BR: ["brasil", "lula", "bolsonaro", "ibge", "são paulo", "brasília"],
          IL: ["israel", "netanyahu", "tel aviv", "jerusalém", "idf"],
          AR: ["argentina", "milei", "buenos aires"],
          MX: ["méxico", "mexico"],
          CO: ["colômbia", "colombia", "bogotá"],
        };
        const keywords = countryKeywords[countryFilter || ""] || [];
        if (keywords.length > 0) {
          const keywordMatches = normalizedTrends.filter(t => {
            const text = `${t.title} ${t.details || ""}`.toLowerCase();
            return keywords.some(k => text.includes(k));
          });
          for (const match of keywordMatches) {
            const key = match.title.toLowerCase().slice(0, 60);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combined.push({ ...match, countryCode: countryFilter || "GL" });
            }
          }
        }
      }

      if (combined.length > 0) {
        return combined.sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
      }

      // No fake data — return empty and let the UI show an honest empty state
      return [];
    }

    // Same for category-only or combined filters with no results
    if (filtered.length === 0 && trends.length > 0) {
      const hasActiveFilters = filters.category !== "Todas" || filters.type !== "Todas mídias";
      if (hasActiveFilters) {
        // Try relaxing type filter first (keep category)
        if (filters.type !== "Todas mídias" && filters.category !== "Todas") {
          const categoryOnly = normalizedTrends.filter(t => {
            const matchCountry = filters.country === "global" || t.normalizedCountry === countryFilter;
            const matchCategory = t.normalizedCategory === filterCategory || t.normalizedCategory.startsWith(filterCategory);
            return matchCountry && matchCategory;
          });
          if (categoryOnly.length > 0) {
            return categoryOnly.sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
          }
        }
        // No fake data — return empty
        return [];
      }
    }

    if (filtered.length > 0) {
      saveToPredictiveCache(filters, filtered);
    }

    return [...filtered].sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
  }, [trends, filters]);

  const leftTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 0), [filteredTrends]);
  const rightTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 1), [filteredTrends]);

  const countriesCount = useMemo(() => {
    const codes = new Set(trends.map(t => t.countryCode).filter(Boolean));
    return codes.size;
  }, [trends]);

  const trendCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (filters.country !== "global") {
      counts[filters.country] = filteredTrends.length;
    } else {
      for (const trend of filteredTrends) {
        const code = trend.countryCode || "BR";
        counts[code] = (counts[code] || 0) + 1;
      }
      const redditCount = filteredTrends.filter((t) => t.platform === "Reddit").length;
      counts["US"] = (counts["US"] || 0) + redditCount;
      const baselineCountries = ["CN", "NL", "SE", "NO", "UA", "CL", "PE", "VE", "PT", "KE", "MA", "ET", "AE", "NZ", "VN", "PK"];
      for (const cc of baselineCountries) {
        if (!counts[cc]) counts[cc] = 1;
      }
    }
    return counts;
  }, [filteredTrends, filters.country]);

  useEffect(() => {
    onTrendCountsChange(trendCounts);
  }, [trendCounts, onTrendCountsChange]);

  return { leftTrends, rightTrends, loading, isFirstLoad, filteredTrends, allTrends: trends, fetchTrends, countriesCount, lastUpdated, sourcesStatus };
}
