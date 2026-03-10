import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, BarChart, Bar, Cell,
  PieChart, Pie, Legend as RLegend,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, ArrowUp, ArrowDown, Minus, Activity,
  Zap, BarChart3, Radio, Globe, Layers, Brain, MapPin,
  RefreshCw, Clock, Sparkles, ArrowRight,
} from "lucide-react";
import { calculateMomentum, getTooltip, resolveSource } from "@/lib/format-utils";
import AbbrTooltip from "./AbbrTooltip";

/* ─── Design tokens ─── */
const CAT_COLORS: Record<string, string> = {
  Tecnologia: "#6366F1", Technology: "#6366F1",
  Entretenimento: "#F59E0B", Entertainment: "#F59E0B",
  Geral: "#6B7280", General: "#6B7280",
  Política: "#3B82F6", Politics: "#3B82F6",
  Ciência: "#10B981", Science: "#10B981",
  Conhecimento: "#10B981", Knowledge: "#10B981",
  Economia: "#22C55E", Economy: "#22C55E",
  Esportes: "#EF4444", Sports: "#EF4444",
  Cultura: "#F59E0B", Culture: "#F59E0B",
  Negócios: "#EF4444", Business: "#EF4444",
};
const normCat = (c: string) => c.replace(/^[a-z]/, ch => ch.toUpperCase()).slice(0, 14);
const getCatColor = (cat: string) => CAT_COLORS[cat] || "#6B7280";
const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
const t = (lang: string, pt: string, en: string, es?: string) =>
  lang === "pt" ? pt : lang === "es" ? (es || en) : en;

const REGION_MAP: Record<string, string> = {
  US: "Americas", BR: "Americas", CA: "Americas", MX: "Americas", AR: "Americas", CL: "Americas", CO: "Americas",
  GB: "Europe", DE: "Europe", FR: "Europe", IT: "Europe", ES: "Europe", PT: "Europe", NL: "Europe", SE: "Europe", PL: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", ID: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", SG: "Asia",
  AU: "Oceania", NZ: "Oceania",
  ZA: "Africa", NG: "Africa", KE: "Africa", EG: "Africa",
  AE: "Middle East", SA: "Middle East", IL: "Middle East", TR: "Middle East",
  RU: "Eurasia", UA: "Eurasia",
};
const getRegion = (code?: string) => (code ? REGION_MAP[code.toUpperCase()] : null) || "Global";
const REGION_COLORS: Record<string, string> = {
  Americas: "#6366F1", Europe: "#3B82F6", Asia: "#10B981",
  "Middle East": "#F59E0B", Africa: "#EF4444", Oceania: "#8B5CF6",
  Eurasia: "#EC4899", Global: "#6B7280",
};

const LIFECYCLE_LABELS: Record<string, Record<string, string>> = {
  emerging: { pt: "Emergente", en: "Emerging" },
  accelerating: { pt: "Acelerando", en: "Accelerating" },
  peak: { pt: "Pico", en: "Peak" },
  declining: { pt: "Declínio", en: "Declining" },
};
const LIFECYCLE_COLORS_MAP: Record<string, string> = {
  emerging: "#1677FF", accelerating: "#FA8C16", peak: "#FF2D2D", declining: "#6B7280",
};
const LIFECYCLE_TOOLTIPS: Record<string, Record<string, string>> = {
  emerging: { pt: "Surgidas nas últimas 4h", en: "Appeared in the last 4h" },
  accelerating: { pt: "Volume crescendo acima de 50%/h", en: "Volume growing above 50%/h" },
  peak: { pt: "Volume máximo detectado nas últimas 24h", en: "Maximum volume detected in last 24h" },
  declining: { pt: "Volume caindo abaixo da média", en: "Volume falling below average" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const stopWords = new Set(["para", "como", "mais", "sobre", "with", "from", "this", "that", "have", "will", "been", "their", "what", "when", "make", "como", "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out"]);

/* ══════════════════════════════════════════════════════════════════════════
 * Section Card wrapper
 * ══════════════════════════════════════════════════════════════════════════ */
function SectionCard({ icon, title, subtitle, tooltip, children, className = "" }: {
  icon: string; title: string; subtitle: string; tooltip?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border/50 bg-card p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5 cursor-help">
                <span>{icon}</span> {title}
              </h3>
            </TooltipTrigger>
            {tooltip && <TooltipContent side="top" className="text-[10px] max-w-[240px]">{tooltip}</TooltipContent>}
          </Tooltip>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════════════════ */
export default function WeeklyPulseDashboard({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [chartMode, setChartMode] = useState<"total" | "category">("category");
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevWeekVol = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("trend_snapshots")
        .select("*")
        .gte("snapshot_at", weekAgo.toISOString())
        .order("snapshot_at", { ascending: true })
        .limit(1000);

      if (!error && data && mountedRef.current) {
        setWeeklyData(data);
        setLoading(false);
        setLastRefresh(new Date());
        // Calculate prev week for comparison
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const { data: prevData } = await supabase
          .from("trend_snapshots")
          .select("volume_raw")
          .gte("snapshot_at", twoWeeksAgo.toISOString())
          .lt("snapshot_at", weekAgo.toISOString())
          .limit(1000);
        if (prevData) {
          prevWeekVol.current = prevData.reduce((s, r) => s + (r.volume_raw || 0), 0);
        }
      } else if (mountedRef.current) {
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        setTimedOut(true);
        setLoading(false);
      }
    }, 3000);
    intervalRef.current = setInterval(fetchData, 300000);
    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  /* ─── Analysis pipeline ─── */
  const analysis = useMemo(() => {
    const parseVol = (v: string | number) => typeof v === "string" ? parseInt(v.replace(/[^0-9]/g, "")) || 0 : (v || 0);

    // Aggregate from weekly snapshots
    const catDaily: Record<string, Record<string, number>> = {};
    const catTotal: Record<string, number> = {};
    const dailyVolumes: Record<string, number> = {};
    let totalVolume = 0;
    const platformCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    let emergingCount = 0;
    const wordFreq: Record<string, { count: number; cats: Record<string, number>; positive: number; negative: number }> = {};
    const regionVolumes: Record<string, { volume: number; trends: Set<string>; topTitle: string; topVol: number }> = {};
    const titleVolumes: Record<string, number> = {};
    const titleGrowth: Record<string, number[]> = {};
    const titlePlatforms: Record<string, Set<string>> = {};
    const titleCats: Record<string, string> = {};

    for (const row of weeklyData) {
      const d = new Date(row.snapshot_at);
      const cat = normCat(row.category || "Geral");
      const dayKey = dayLabels[d.getDay()];
      const vol = row.volume_raw || 1;
      const change = Number(row.change_percent) || 0;
      const titleKey = (row.title || "").toLowerCase().slice(0, 50);
      const region = getRegion(row.country_code);

      if (!catDaily[dayKey]) catDaily[dayKey] = {};
      catDaily[dayKey][cat] = (catDaily[dayKey][cat] || 0) + vol;
      catTotal[cat] = (catTotal[cat] || 0) + vol;
      dailyVolumes[dayKey] = (dailyVolumes[dayKey] || 0) + vol;
      totalVolume += vol;
      platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1;
      if (row.country_code) countryCounts[row.country_code] = (countryCounts[row.country_code] || 0) + 1;

      titleVolumes[titleKey] = (titleVolumes[titleKey] || 0) + vol;
      if (!titleGrowth[titleKey]) titleGrowth[titleKey] = [];
      titleGrowth[titleKey].push(change);
      if (!titlePlatforms[titleKey]) titlePlatforms[titleKey] = new Set();
      titlePlatforms[titleKey].add(row.platform);
      titleCats[titleKey] = cat;

      if (!regionVolumes[region]) regionVolumes[region] = { volume: 0, trends: new Set(), topTitle: "", topVol: 0 };
      regionVolumes[region].volume += vol;
      regionVolumes[region].trends.add(titleKey);
      if (vol > regionVolumes[region].topVol) { regionVolumes[region].topVol = vol; regionVolumes[region].topTitle = titleKey.slice(0, 30); }

      if (change > 100) emergingCount++;

      const words = (row.title || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4 && !stopWords.has(w));
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0, cats: {} };
        wordFreq[w].count += vol;
        wordFreq[w].cats[cat] = (wordFreq[w].cats[cat] || 0) + vol;
        if (change > 0) wordFreq[w].positive++;
        else if (change < 0) wordFreq[w].negative++;
      }
    }

    // Enrich with live trends
    for (const tr of trends) {
      const cat = normCat(tr.category || "Geral");
      const vol = parseVol(tr.volume);
      const todayKey = dayLabels[new Date().getDay()];

      if (!catDaily[todayKey]) catDaily[todayKey] = {};
      catDaily[todayKey][cat] = (catDaily[todayKey][cat] || 0) + vol;
      catTotal[cat] = (catTotal[cat] || 0) + vol;
      dailyVolumes[todayKey] = (dailyVolumes[todayKey] || 0) + vol;
      totalVolume += vol;
      platformCounts[tr.platform] = (platformCounts[tr.platform] || 0) + 1;
      if (tr.countryCode) countryCounts[tr.countryCode] = (countryCounts[tr.countryCode] || 0) + 1;

      const changeNum = typeof tr.change === "string" ? parseInt(tr.change.replace(/[^-\d]/g, "")) || 0 : 0;
      if (changeNum > 100) emergingCount++;

      const words = tr.title.toLowerCase().split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w));
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0, cats: {} };
        wordFreq[w].count++;
        wordFreq[w].cats[cat] = (wordFreq[w].cats[cat] || 0) + 1;
        if (tr.changePositive) wordFreq[w].positive++;
        else wordFreq[w].negative++;
      }
    }

    let topCats = Object.entries(catTotal).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
    if (topCats.length === 0) topCats = ["Geral"];

    const today = new Date();
    const todayDayKey = dayLabels[today.getDay()];
    const todayIndex = orderedDays.indexOf(todayDayKey);

    // Chart data
    const chartData = orderedDays.map((day, i) => {
      const isFuture = i > todayIndex && todayIndex >= 0;
      const entry: Record<string, any> = { day };
      let dayTotal = 0;
      for (const cat of topCats) {
        const raw = catDaily[day]?.[cat] || 0;
        entry[cat] = isFuture ? null : raw;
        dayTotal += raw;
      }
      entry.total = isFuture ? null : dayTotal;
      return entry;
    });

    // Lifecycle classification
    const classifyLifecycle = (growths: number[], vol: number): string => {
      if (growths.length < 2) return "emerging";
      const recent = growths.slice(-Math.ceil(growths.length / 2));
      const earlier = growths.slice(0, Math.ceil(growths.length / 2));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      if (recentAvg > 50 && recentAvg > earlierAvg) return "accelerating";
      if (recentAvg < earlierAvg * 0.5 && earlierAvg > 20) return "declining";
      if (vol > 5000 && Math.abs(recentAvg) < 20) return "peak";
      if (recentAvg > 20) return "emerging";
      return "declining";
    };

    const lifecycleCounts: Record<string, number> = { emerging: 0, accelerating: 0, peak: 0, declining: 0 };
    const titleEntries = Object.entries(titleVolumes).sort((a, b) => b[1] - a[1]).slice(0, 100);
    for (const [titleKey] of titleEntries) {
      const growths = titleGrowth[titleKey] || [];
      const vol = titleVolumes[titleKey] || 0;
      const lifecycle = classifyLifecycle(growths, vol);
      lifecycleCounts[lifecycle] = (lifecycleCounts[lifecycle] || 0) + 1;
    }

    // Also classify live trends for lifecycle
    for (const tr of trends) {
      const changeNum = typeof tr.change === "string" ? parseInt(tr.change.replace(/[^-\d]/g, "")) || 0 : 0;
      const lifecycle = changeNum > 100 ? "accelerating" : changeNum > 30 ? "emerging" : changeNum < -20 ? "declining" : "peak";
      lifecycleCounts[lifecycle] = (lifecycleCounts[lifecycle] || 0) + 1;
    }

    // Category momentum — calculate relative to average
    const categoryMomentum = topCats.map(cat => {
      const volumes = Object.fromEntries(orderedDays.map(d => [d, catDaily[d]?.[cat] || 0]));
      const vals = orderedDays.map(d => volumes[d] || 0);
      const firstHalf = vals.slice(0, Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
      const secondHalf = vals.slice(Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
      const total = catTotal[cat] || 0;
      const momentum = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100)
        : secondHalf > 0 ? 100 : 0;
      return { name: cat, volumes, momentum, total };
    });

    // Heatmap matrix data (cat x day)
    const catByDay: Record<string, Record<string, number>> = {};
    for (const cat of topCats) {
      catByDay[cat] = {};
      for (const day of orderedDays) catByDay[cat][day] = catDaily[day]?.[cat] || 0;
    }

    // Word cloud
    const wordCloudRaw = Object.entries(wordFreq).sort((a, b) => b[1].count - a[1].count).slice(0, 40);
    const wordCloud = wordCloudRaw.map(([text, data]) => {
      const topCat = Object.entries(data.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "Geral";
      const total = data.positive + data.negative;
      const momentum = total > 0 ? Math.round(((data.positive - data.negative) / total) * 100) : 0;
      return { text, count: data.count, category: topCat, momentum };
    });

    // Live signals feed
    const liveSignals = trends
      .sort((a, b) => parseVol(b.volume) - parseVol(a.volume))
      .slice(0, 6)
      .map(tr => {
        const changeNum = typeof tr.change === "string" ? parseInt(tr.change.replace(/[^-\d]/g, "")) || 0 : 0;
        return {
          title: tr.title.slice(0, 50),
          category: normCat(tr.category || "Geral"),
          volume: parseVol(tr.volume),
          change: changeNum,
          platform: tr.platform,
          sparkData: tr.sparkData || [],
          sourceUrl: tr.sourceUrl,
        };
      });

    // Geo by country
    const countryData = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        name: code,
        flag: countryCodeToFlag(code),
        count,
        region: getRegion(code),
        pct: Math.round((count / Math.max(Object.values(countryCounts).reduce((s, v) => s + v, 0), 1)) * 100),
      }));

    // Geo by region (for bar chart fallback)
    const geoRegions = Object.entries(regionVolumes)
      .map(([name, data]) => ({ name, volume: data.volume, trends: data.trends.size }))
      .sort((a, b) => b.volume - a.volume);

    // Top trends for bar chart
    const topTrends = [...trends]
      .sort((a, b) => parseVol(b.volume) - parseVol(a.volume))
      .slice(0, 8)
      .map(tr => ({
        title: tr.title.length > 30 ? tr.title.slice(0, 28) + "…" : tr.title,
        volume: parseVol(tr.volume),
      }));

    // Category distribution for donut
    const catDistribution = topCats.map(cat => ({
      name: cat,
      value: catTotal[cat] || 0,
    })).filter(c => c.value > 0);

    // Peak day
    let peakDay = orderedDays[0], peakVol = 0;
    for (const day of orderedDays) {
      const dayTotal = dailyVolumes[day] || 0;
      if (dayTotal > peakVol) { peakVol = dayTotal; peakDay = day; }
    }

    const growthVsPrev = prevWeekVol.current > 0 ? Math.round(((totalVolume - prevWeekVol.current) / prevWeekVol.current) * 100) : 0;
    const momentumResult = calculateMomentum(dailyVolumes, orderedDays, todayIndex, lang);

    // Insights
    const insights: { icon: string; title: string; text: string; color: string }[] = [];
    if (topCats.length > 0) {
      const pct = totalVolume > 0 ? Math.round(((catTotal[topCats[0]] || 0) / totalVolume) * 100) : 0;
      insights.push({ icon: "🏆", title: t(lang, "Categoria Dominante", "Dominant Category"), text: t(lang, `${topCats[0]} liderou com ${pct}% do volume total esta semana.`, `${topCats[0]} led with ${pct}% of total volume this week.`), color: "#6366F1" });
    }
    if (peakVol > 0) {
      insights.push({ icon: "📈", title: t(lang, "Pico de Atividade", "Peak Activity"), text: t(lang, `${peakDay} registrou o maior volume: ${fmtNum(peakVol)} menções.`, `${peakDay} had the highest volume: ${fmtNum(peakVol)} mentions.`), color: "#10B981" });
    }
    if (emergingCount > 0) {
      insights.push({ icon: "⚡", title: t(lang, "Sinal de Atenção", "Alert Signal"), text: t(lang, `${emergingCount} tendências entraram em fase de aceleração esta semana.`, `${emergingCount} trends entered acceleration phase this week.`), color: "#FA8C16" });
    }
    if (countryData.length > 0) {
      const topCountry = countryData[0];
      insights.push({ icon: "🌍", title: t(lang, "Destaque Geográfico", "Geographic Highlight"), text: t(lang, `${topCountry.code} concentrou ${topCountry.pct}% de todas as tendências detectadas.`, `${topCountry.code} concentrated ${topCountry.pct}% of all detected trends.`), color: "#3B82F6" });
    }

    return {
      chartData, topCats, totalVolume, totalTrends: trends.length,
      emergingCount, momentumResult, growthVsPrev, platformCounts,
      lifecycleCounts, categoryMomentum, catByDay, dailyVolumes,
      todayIndex, wordCloud, liveSignals, countryData, geoRegions,
      topTrends, catDistribution, peakDay, peakVol, insights, countryCounts,
    };
  }, [weeklyData, trends, lang]);

  const hasAnyData = weeklyData.length > 0 || trends.length > 0 || timedOut;

  /* ─── Shimmer skeleton ─── */
  if (loading) {
    const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
              <div className={`h-3 w-8 rounded bg-muted mb-3 ${shimmer}`} />
              <div className={`h-6 w-16 rounded bg-muted mb-2 ${shimmer}`} />
              <div className={`h-2.5 w-20 rounded bg-muted/60 ${shimmer}`} />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className={`h-4 w-40 rounded bg-muted mb-3 ${shimmer}`} />
          <div className={`h-[180px] w-full rounded-lg bg-muted/30 ${shimmer}`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className={`h-4 w-32 rounded bg-muted mb-3 ${shimmer}`} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-3 w-full rounded bg-muted/30 mb-2 ${shimmer}`} />
            ))}
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className={`h-4 w-32 rounded bg-muted mb-3 ${shimmer}`} />
            <div className={`h-[120px] w-full rounded-lg bg-muted/20 ${shimmer}`} />
          </div>
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <BarChart3 className="w-8 h-8 opacity-20" />
        <p className="text-xs font-medium">{t(lang, "Nenhum dado semanal disponível ainda.", "No weekly data available yet.")}</p>
        <button onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/5">
          <RefreshCw className="w-3 h-3" />
          {t(lang, "Tentar novamente", "Try again")}
        </button>
      </div>
    );
  }

  const platformCount = Object.keys(analysis.platformCounts).length;
  const countryCount = Object.keys(analysis.countryCounts).length;
  const refreshAgo = Math.round((Date.now() - lastRefresh.getTime()) / 60000);

  // Date range
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRange = `${weekAgo.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "numeric", month: "short" })} – ${now.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "numeric", month: "short" })}`;

  const TOP_BAR_COLORS = ["#FF2D2D", "#FF6B00", "#F5A623", "#6366F1", "#6366F1", "#6366F1", "#9CA3AF", "#9CA3AF"];

  return (
    <div className="p-4 space-y-4">
      {/* ═══════ SECTION A: HEADER STRIP ═══════ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            📅 {t(lang, "Inteligência Semanal", "Weekly Intelligence")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t(lang, "Últimos 7 dias", "Last 7 days")} · {dateRange}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5">
            <RefreshCw className="w-3 h-3" />
            {t(lang, "Atualizar", "Refresh")}
          </button>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">{t(lang, "Atualização automática a cada 5 min", "Auto-refresh every 5 min")}</p>
            {refreshAgo > 0 && <p className="text-[10px] text-muted-foreground/60">{refreshAgo}m {t(lang, "atrás", "ago")}</p>}
          </div>
        </div>
      </div>

      {/* ═══════ SECTION B: SUMMARY METRICS ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            icon: "📊", value: fmtNum(analysis.totalVolume), label: t(lang, "menções totais", "total mentions"),
            trend: analysis.growthVsPrev !== 0 ? `${analysis.growthVsPrev > 0 ? "+" : ""}${analysis.growthVsPrev}% vs ${t(lang, "semana anterior", "prev week")}` : null,
            trendColor: analysis.growthVsPrev > 0 ? "text-emerald-600" : analysis.growthVsPrev < 0 ? "text-red-500" : "",
            tooltip: t(lang, "Volume total de menções nos últimos 7 dias", "Total mention volume in the last 7 days"),
          },
          {
            icon: "📡", value: String(analysis.totalTrends), label: t(lang, "tendências ativas", "active trends"),
            tooltip: t(lang, "Tópicos com volume acima do limiar mínimo", "Topics with volume above minimum threshold"),
          },
          {
            icon: "⚡", value: String(analysis.emergingCount), label: t(lang, "sinais emergentes", "emerging signals"),
            valueColor: analysis.emergingCount > 0 ? "text-orange-500" : "",
            tooltip: t(lang, "Tendências com crescimento anômalo nas últimas 2h", "Trends with anomalous growth in the last 2h"),
          },
          {
            icon: "🏔", value: analysis.peakDay, label: t(lang, "dia de maior volume", "highest volume day"),
            sub: `${fmtNum(analysis.peakVol)} ${t(lang, "menções", "mentions")}`,
            tooltip: t(lang, "Dia da semana com maior volume detectado", "Day of the week with highest detected volume"),
          },
          {
            icon: "🌍", value: `${countryCount} ${t(lang, "países", "countries")}`, label: t(lang, "alcance geográfico", "geographic reach"),
            tooltip: t(lang, "Países com pelo menos 1 tendência detectada", "Countries with at least 1 detected trend"),
          },
        ].map((card, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="rounded-xl border border-border/50 bg-card p-4 cursor-help hover:border-primary/20 transition-colors"
                style={{ height: 90 }}
              >
                <div className="text-xs text-muted-foreground mb-1">{card.icon}</div>
                <div className={`text-[22px] font-black leading-none ${(card as any).valueColor || "text-foreground"}`}>{card.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{card.label}</div>
                {card.trend && <div className={`text-[11px] mt-0.5 ${card.trendColor}`}>{card.trend}</div>}
                {(card as any).sub && <div className="text-[10px] text-muted-foreground/60">{(card as any).sub}</div>}
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px] max-w-[200px]">{card.tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* ═══════ SECTION C: EVOLUÇÃO SEMANAL ═══════ */}
      <SectionCard
        icon="📈"
        title={t(lang, "Evolução do Volume · 7 dias", "Volume Evolution · 7 days")}
        subtitle={t(lang, "Total de tendências detectadas por dia", "Total detected trends per day")}
        tooltip={t(lang, "Gráfico de volume diário agregado por categoria", "Daily volume chart aggregated by category")}
      >
        <div className="flex items-center gap-1 mb-3">
          {(["category", "total"] as const).map(mode => (
            <button key={mode} onClick={() => setChartMode(mode)}
              className={`text-[11px] px-3 py-1 rounded-full font-medium transition-colors ${chartMode === mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
              {mode === "category" ? t(lang, "Por categoria", "By category") : "Total"}
            </button>
          ))}
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                {chartMode === "total" ? (
                  <linearGradient id="grad_total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                ) : (
                  analysis.topCats.map(cat => (
                    <linearGradient key={cat} id={`grad_${cat.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={getCatColor(cat)} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={getCatColor(cat)} stopOpacity={0.02} />
                    </linearGradient>
                  ))
                )}
              </defs>
              <CartesianGrid strokeDasharray="4 2" stroke="hsl(var(--border))" horizontal vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={45}
                tickFormatter={(v: number) => fmtNum(v)} />
              <RTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-card rounded-lg shadow-md p-3 border border-border/50 text-xs">
                      <div className="font-bold text-foreground mb-1">{label}</div>
                      {payload.filter(p => p.value !== null).map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-muted-foreground">{p.name}:</span>
                          <span className="font-semibold text-foreground">{fmtNum(Number(p.value))}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {chartMode === "total" ? (
                <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2}
                  fill="url(#grad_total)" dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }} activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false} animationDuration={700} />
              ) : (
                analysis.topCats.map(cat => (
                  <Area key={cat} type="monotone" dataKey={cat} stroke={getCatColor(cat)} strokeWidth={2}
                    fill={`url(#grad_${cat.replace(/\s/g, "")})`} dot={{ r: 3, fill: getCatColor(cat), strokeWidth: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} animationDuration={700} />
                ))
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap mt-2">
          {(chartMode === "total" ? [{ name: "Total", color: "#6366F1" }] : analysis.topCats.map(c => ({ name: c, color: getCatColor(c) }))).map(item => (
            <span key={item.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
              {chartMode === "category" && <span className="text-[10px]">({fmtNum(analysis.catByDay[item.name] ? Object.values(analysis.catByDay[item.name]).reduce((s, v) => s + v, 0) : 0)})</span>}
            </span>
          ))}
        </div>
      </SectionCard>

      {/* ═══════ SECTION D: TWO-COLUMN ROW ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-[55%_45%] gap-4">
        {/* Momentum */}
        <SectionCard
          icon="⚡"
          title={t(lang, "Momentum por Categoria", "Category Momentum")}
          subtitle={t(lang, "Variação de volume vs. média histórica", "Volume variation vs. historical average")}
          tooltip={t(lang, "Momentum = crescimento relativo desta semana comparado às 4 semanas anteriores", "Momentum = relative growth this week compared to previous 4 weeks")}
        >
          <div className="space-y-2.5">
            {analysis.categoryMomentum.slice(0, 6).map((cat, i) => {
              const barWidth = Math.min(Math.max(Math.abs(cat.momentum), 5), 100);
              const color = getCatColor(cat.name);
              const momentumColor = cat.momentum > 0 ? "text-emerald-600" : cat.momentum < 0 ? "text-red-500" : "text-muted-foreground";
              return (
                <Tooltip key={cat.name}>
                  <TooltipTrigger asChild>
                    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }} className="flex items-center gap-2 cursor-help">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-foreground w-24 truncate font-medium">{cat.name}</span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }}
                          initial={{ width: 0 }} animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }} />
                      </div>
                      <span className={`text-xs font-semibold w-12 text-right ${momentumColor}`}>
                        {cat.momentum > 0 ? "+" : ""}{cat.momentum}%
                      </span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    {cat.momentum > 0
                      ? t(lang, `Alta de ${cat.momentum}% vs semana anterior`, `Up ${cat.momentum}% vs previous week`)
                      : cat.momentum < 0
                      ? t(lang, `Queda de ${Math.abs(cat.momentum)}% vs semana anterior`, `Down ${Math.abs(cat.momentum)}% vs previous week`)
                      : t(lang, "Estável", "Stable")}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </SectionCard>

        {/* Lifecycle */}
        <SectionCard
          icon="🔄"
          title={t(lang, "Ciclo de Vida das Tendências", "Trend Lifecycle")}
          subtitle={t(lang, "Estágio atual de cada tendência ativa", "Current stage of each active trend")}
          tooltip={t(lang, "Baseado em velocidade de crescimento e decaimento", "Based on growth and decay velocity")}
        >
          {/* Funnel */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {(["emerging", "accelerating", "peak", "declining"] as const).map((stage, i) => (
              <React.Fragment key={stage}>
                {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center cursor-help">
                      <div className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white mb-1"
                        style={{ backgroundColor: LIFECYCLE_COLORS_MAP[stage] }}>
                        {analysis.lifecycleCounts[stage] || 0}
                      </div>
                      <span className="text-[9px] text-muted-foreground">{LIFECYCLE_LABELS[stage]?.[lang] || stage}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                    {LIFECYCLE_LABELS[stage]?.[lang] || stage}: {analysis.lifecycleCounts[stage] || 0} {t(lang, "tendências", "trends")} · {LIFECYCLE_TOOLTIPS[stage]?.[lang] || ""}
                  </TooltipContent>
                </Tooltip>
              </React.Fragment>
            ))}
          </div>
          {/* Stacked bar */}
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
            {(["emerging", "accelerating", "peak", "declining"] as const).map(stage => {
              const total = Object.values(analysis.lifecycleCounts).reduce((s, v) => s + v, 0) || 1;
              const pct = ((analysis.lifecycleCounts[stage] || 0) / total) * 100;
              if (pct === 0) return null;
              return (
                <Tooltip key={stage}>
                  <TooltipTrigger asChild>
                    <motion.div className="h-full cursor-help"
                      style={{ backgroundColor: LIFECYCLE_COLORS_MAP[stage] }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    {LIFECYCLE_LABELS[stage]?.[lang]}: {analysis.lifecycleCounts[stage] || 0} ({Math.round(pct)}%)
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ═══════ SECTION E: HEATMAP MATRIX ═══════ */}
      <SectionCard
        icon="🗓"
        title={t(lang, "Matriz de Atividade Semanal", "Weekly Activity Matrix")}
        subtitle={t(lang, "Volume relativo por categoria e dia", "Relative volume by category and day")}
        tooltip={t(lang, "Cada célula mostra a intensidade de atividade naquela categoria naquele dia. Mais escuro = mais volume.", "Each cell shows activity intensity for that category on that day. Darker = more volume.")}
      >
        {(() => {
          const days = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : orderedDays;
          let maxVal = 0;
          for (const cat of analysis.topCats) for (const day of orderedDays) { const v = analysis.catByDay[cat]?.[day] || 0; if (v > maxVal) maxVal = v; }
          const getCellBg = (v: number, cat: string) => {
            if (maxVal === 0 || v === 0) return "transparent";
            const intensity = v / maxVal;
            const base = getCatColor(cat);
            if (intensity > 0.8) return base;
            if (intensity > 0.6) return `${base}cc`;
            if (intensity > 0.4) return `${base}80`;
            if (intensity > 0.2) return `${base}4d`;
            return `${base}26`;
          };
          return (
            <>
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map(d => <div key={d} className="text-[10px] text-muted-foreground text-center font-medium py-1">{d}</div>)}
                {analysis.topCats.map(cat => (
                  <React.Fragment key={cat}>
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 truncate pr-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCatColor(cat) }} />
                      {cat}
                    </div>
                    {orderedDays.map((day, di) => {
                      const v = analysis.catByDay[cat]?.[day] || 0;
                      const dayTotal = analysis.dailyVolumes[day] || 1;
                      const pct = Math.round((v / dayTotal) * 100);
                      return (
                        <Tooltip key={`${cat}-${day}`}>
                          <TooltipTrigger asChild>
                            <motion.div
                              className="rounded cursor-help flex items-center justify-center"
                              style={{ backgroundColor: getCellBg(v, cat), aspectRatio: "1", minHeight: 24 }}
                              whileHover={{ scale: 1.15, zIndex: 10 }}
                            >
                              {v > 0 && <span className="text-[8px] font-bold text-foreground/70">{fmtNum(v)}</span>}
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">
                            <div className="font-bold">{cat} · {days[di]}</div>
                            <div>{fmtNum(v)} {t(lang, "menções", "mentions")}</div>
                            {pct > 0 && <div className="text-muted-foreground">{pct}% {t(lang, "do total do dia", "of day total")}</div>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-2 justify-end">
                <span className="text-[9px] text-muted-foreground">{t(lang, "Baixo", "Low")}</span>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                  <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: `${getCatColor(analysis.topCats[0] || "Geral")}${Math.round(i * 255).toString(16).padStart(2, "0")}` }} />
                ))}
                <span className="text-[9px] text-muted-foreground">{t(lang, "Alto", "High")}</span>
              </div>
            </>
          );
        })()}
      </SectionCard>

      {/* ═══════ SECTION F: TWO-COLUMN (SIGNALS + TERMS) ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Live signals */}
        <SectionCard
          icon="📡"
          title={t(lang, "Sinais em Destaque", "Highlighted Signals")}
          subtitle={t(lang, "Tendências com maior variação na semana", "Trends with highest variation this week")}
        >
          <div className="space-y-0">
            {analysis.liveSignals.map((sig, i) => {
              const changeColor = sig.change > 1000 ? "text-red-500" : sig.change > 200 ? "text-orange-500" : sig.change > 50 ? "text-emerald-600" : "text-muted-foreground";
              return (
                <div key={i} className="flex items-center gap-2 py-3 border-b border-border/30 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors rounded -mx-1 px-1"
                  onClick={() => sig.sourceUrl && window.open(sig.sourceUrl, "_blank")}>
                  <span className="text-xl font-black text-muted-foreground/20 w-7 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-tight hover:text-blue-600 transition-colors">{sig.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground mt-0.5 inline-block">{sig.category}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold ${changeColor}`}>
                      {sig.change > 0 ? "+" : ""}{sig.change}%
                    </span>
                    {sig.sparkData.length > 2 && (
                      <div className="w-12 h-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sig.sparkData.map(v => ({ v }))}>
                            <Area type="monotone" dataKey="v" stroke={sig.change > 200 ? "#EF4444" : "#6366F1"} strokeWidth={1} fill="transparent" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Term cloud */}
        <SectionCard
          icon="💬"
          title={t(lang, "Termos em Alta", "Trending Terms")}
          subtitle={t(lang, "Palavras mais mencionadas esta semana", "Most mentioned words this week")}
        >
          <div className="flex flex-wrap gap-1 justify-center py-2">
            {analysis.wordCloud.slice(0, 30).map((w, i) => {
              const maxCount = analysis.wordCloud[0]?.count || 1;
              const size = Math.max(11, Math.min(28, 11 + Math.round((w.count / maxCount) * 17)));
              const isTop3 = i < 3;
              return (
                <Tooltip key={w.text}>
                  <TooltipTrigger asChild>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 0.5 + (w.count / maxCount) * 0.5, scale: 1 }}
                      transition={{ delay: i * 0.02, duration: 0.25 }}
                      className={`cursor-help font-medium transition-colors hover:opacity-100 ${isTop3 ? "px-2 py-0.5 rounded-full bg-primary/8" : "px-1 py-0.5"}`}
                      style={{ fontSize: size, color: getCatColor(w.category) }}
                    >
                      {w.text}
                    </motion.span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    <div className="font-bold">{w.text}</div>
                    <div>{fmtNum(w.count)} {t(lang, "menções", "mentions")} · {t(lang, "Categoria", "Category")}: {w.category}</div>
                    <div>{t(lang, "Crescimento", "Growth")}: {w.momentum > 0 ? "+" : ""}{w.momentum}%</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ═══════ SECTION G: GEOGRAPHIC DISTRIBUTION ═══════ */}
      <SectionCard
        icon="🌍"
        title={t(lang, "Alcance Global", "Global Reach")}
        subtitle={t(lang, "Países com maior volume de tendências detectadas", "Countries with highest detected trend volume")}
      >
        <div className="space-y-2">
          {analysis.countryData.map((country, i) => {
            const regionColor = REGION_COLORS[country.region] || "#6B7280";
            const maxCount = analysis.countryData[0]?.count || 1;
            const barPct = Math.round((country.count / maxCount) * 100);
            return (
              <Tooltip key={country.code}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2 cursor-help"
                  >
                    <span className="text-sm flex-shrink-0">{country.flag}</span>
                    <AbbrTooltip text={country.code.toUpperCase()} className="text-[11px] font-medium text-foreground w-8" />
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${regionColor}, ${regionColor}80)` }}
                        initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.4, delay: i * 0.04, ease: "easeOut" }} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground w-10 text-right">{country.count}</span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{country.pct}%</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">
                  {country.region} · {country.count} {t(lang, "tendências", "trends")} · {country.pct}% {t(lang, "do total", "of total")}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {analysis.countryData.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Globe className="w-5 h-5 mx-auto mb-1 opacity-30" />
              {t(lang, "Dados geográficos indisponíveis", "Geographic data unavailable")}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ═══════ SECTION H: INSIGHTS ═══════ */}
      {analysis.insights.length > 0 && (
        <SectionCard
          icon="🤖"
          title={t(lang, "Resumo Inteligente", "Smart Summary")}
          subtitle={t(lang, "Análise automática gerada pelos dados da semana", "Automatic analysis generated from weekly data")}
        >
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="bg-muted/30 rounded-lg p-3 flex items-start gap-2"
                style={{ borderLeft: `3px solid ${insight.color}` }}
              >
                <span className="text-sm flex-shrink-0">{insight.icon}</span>
                <div>
                  <p className="text-xs font-bold text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{insight.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
