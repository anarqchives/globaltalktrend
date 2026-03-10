import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info, ChevronUp, ChevronDown, Activity, AlertTriangle, ExternalLink, TrendingUp, Zap, Globe2, Radio, BarChart3, Eye, Target, Radar, ArrowRight, Sparkles, Clock, Crown, Medal, Award, GripHorizontal, Loader2, Minimize2, Maximize2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import EmergingTrendsSection from "./EmergingTrendsSection";
import CriticalMomentsSection from "./CriticalMomentsSection";
const WeeklyPulseDashboard = lazy(() => import("./WeeklyPulseDashboard"));
import { TrendCardProps } from "./TrendCard";
import { CriticalMoment } from "@/hooks/use-critical-moments";
import { AnomalyAlert } from "@/hooks/use-anomaly-alerts";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import AbbrTooltip from "./AbbrTooltip";

interface TrendRadarProps {
  trends: TrendCardProps[];
  allTrends: TrendCardProps[];
  criticalMoments: CriticalMoment[];
  anomalies?: AnomalyAlert[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onFilterCountry?: (code: string) => void;
  onAnomalyClick?: (id: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const RADAR_STORAGE_KEY = "globaltalktrend-radar-collapsed";

const legendText: Record<string, Record<string, string>> = {
  signals: {
    pt: "Sinais emergentes, anomalias e tendências em aceleração — detectados em tempo real.",
    en: "Emerging signals, anomalies and accelerating trends — detected in real time.",
    es: "Señales emergentes, anomalías y tendencias en aceleración — detectadas en tiempo real.",
  },
  critical: {
    pt: "Eventos críticos — picos de volume, convergência de mídias e propagação geográfica.",
    en: "Critical events — volume spikes, media convergence and geographic spread.",
    es: "Eventos críticos — picos de volumen, convergencia de medios y propagación geográfica.",
  },
  top: {
    pt: "Os 20 assuntos mais discutidos agora — ordenados por volume total.",
    en: "The 20 most discussed topics right now — sorted by total volume.",
    es: "Los 20 temas más discutidos ahora — ordenados por volumen total.",
  },
  weekly: {
    pt: "Painel semanal de inteligência — volume, categorias e tendências dos últimos 7 dias.",
    en: "Weekly intelligence dashboard — volume, categories and trends from the last 7 days.",
    es: "Panel semanal de inteligencia — volumen, categorías y tendencias de los últimos 7 días.",
  },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || "";
  if (!text) return null;
  return (
    <div className="text-[10px] text-muted-foreground/60 leading-relaxed px-3 py-1.5 flex-shrink-0 flex items-center gap-1.5">
      <Info className="w-3 h-3 opacity-30 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function TabLoadingState({ lang }: { lang: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-muted-foreground animate-in fade-in-0 duration-500">
      <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
      <p className="text-[11px] font-medium">{lang === "pt" ? "Carregando dados..." : "Loading data..."}</p>
    </div>
  );
}

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "hsl(0, 72%, 51%)" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "hsl(210, 100%, 40%)" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
  Bluesky: { emoji: "🦋", color: "hsl(200, 100%, 50%)" },
  Mastodon: { emoji: "🐘", color: "hsl(270, 60%, 55%)" },
  "Hacker News": { emoji: "🔶", color: "hsl(25, 100%, 50%)" },
  "The Guardian": { emoji: "📰", color: "hsl(210, 70%, 35%)" },
  GNews: { emoji: "📰", color: "hsl(160, 60%, 45%)" },
  "X (Twitter)": { emoji: "𝕏", color: "hsl(0, 0%, 15%)" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

// ─── TOP TRENDS LEADERBOARD ─────────────────────────────────────────────
function TopTrendsGrid({ trends, onSelectTrend }: { trends: TrendCardProps[]; onSelectTrend?: (trend: TrendCardProps) => void }) {
  const { lang } = useLanguage();

  const ranked = useMemo(() => {
    return [...trends]
      .sort((a, b) => {
        const volA = parseInt(String(a.volume).replace(/[^0-9]/g, "")) || 0;
        const volB = parseInt(String(b.volume).replace(/[^0-9]/g, "")) || 0;
        return volB - volA;
      })
      .slice(0, 20);
  }, [trends]);

  const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";

  if (ranked.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 h-10 border-b border-border/40">
          <span className="text-[13px] font-bold text-foreground">🏆 Top 20 {lang === "pt" ? "agora" : "now"}</span>
          <span className="text-[11px] text-muted-foreground italic">{lang === "pt" ? "ordenado por volume total" : "sorted by total volume"}</span>
        </div>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 border-b border-border/30" style={{ height: i < 3 ? 60 : 52 }}>
            <div className={`w-5 h-5 rounded bg-muted ${shimmerClass}`} />
            <div className={`w-1 rounded-sm bg-muted ${shimmerClass}`} style={{ height: 20 }} />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className={`h-3 rounded bg-muted ${shimmerClass}`} style={{ width: "45%" }} />
              <div className={`h-2.5 rounded bg-muted/60 ${shimmerClass}`} style={{ width: "20%" }} />
            </div>
            <div className={`h-2.5 rounded bg-muted/50 ${shimmerClass}`} style={{ width: 80 }} />
          </div>
        ))}
      </div>
    );
  }

  const getRankColor = (idx: number) => {
    if (idx === 0) return "#FF2D2D";
    if (idx === 1) return "#FF6B00";
    if (idx === 2) return "#F5A623";
    if (idx < 10) return "#6366F1";
    return "#D1D5DB";
  };

  const getBarHeight = (idx: number) => {
    if (idx === 0) return 32;
    if (idx === 1) return 28;
    if (idx === 2) return 24;
    if (idx < 10) return Math.round(20 - (idx - 3) * 1.14);
    return 10;
  };

  const getGrowthTag = (trend: TrendCardProps) => {
    const change = trend.change || "";
    if (change.includes("novo") || change.includes("new")) return { label: "+novo", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" };
    if (change.includes("trending") || change.includes("alta")) return { label: "+trending", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" };
    if (change.includes("boost")) return { label: "+boosts", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" };
    const num = parseFloat(change.replace(/[^0-9.\-]/g, "") || "0");
    if (num > 50) return { label: "+trending", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" };
    if (num > 0) return { label: "+novo", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" };
    return null;
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-border/40">
        <span className="text-[13px] font-bold text-foreground">🏆 Top 20 {lang === "pt" ? "agora" : "now"}</span>
        <span className="text-[11px] text-muted-foreground italic">{lang === "pt" ? "ordenado por volume total" : "sorted by total volume"}</span>
      </div>

      {/* Leaderboard rows */}
      {ranked.map((trend, idx) => {
        const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
        const flag = countryCodeToFlag(trend.countryCode);
        const rankColor = getRankColor(idx);
        const barH = getBarHeight(idx);
        const growthTag = getGrowthTag(trend);
        const isTop3 = idx < 3;

        const top3Bg = isTop3
          ? idx === 0 ? "linear-gradient(90deg, #FF2D2D08 0%, transparent 60%)"
            : idx === 1 ? "linear-gradient(90deg, #FF6B0008 0%, transparent 60%)"
            : "linear-gradient(90deg, #F5A62308 0%, transparent 60%)"
          : undefined;

        return (
          <motion.div
            key={`top-${trend.platform}-${trend.title.slice(0, 20)}-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03, ease: [0, 0, 0.2, 1] }}
            onClick={() => onSelectTrend?.(trend)}
            className={`group flex items-center gap-0 px-4 cursor-pointer transition-colors duration-[120ms] ease-out
              hover:bg-muted/50
              ${idx < ranked.length - 1 ? "border-b border-border/30" : ""}`}
            style={{
              height: isTop3 ? 60 : 52,
              background: top3Bg,
            }}
          >
            {/* Rank */}
            <div className="w-9 flex-shrink-0 flex items-center justify-end pr-1">
              {isTop3 ? (
                <span className="text-lg leading-none">{medals[idx]}</span>
              ) : (
                <span className="text-[13px] font-bold" style={{ color: "#D1D5DB" }}>
                  {idx + 1}
                </span>
              )}
            </div>

            {/* Volume bar */}
            <div className="flex items-center justify-center mx-3 flex-shrink-0" style={{ width: 4 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.3, delay: idx * 0.03 + 0.1, ease: "easeOut" }}
                className="rounded-sm transition-transform duration-[120ms] group-hover:scale-x-150"
                style={{ width: 4, backgroundColor: rankColor }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-1">
              <p className={`font-semibold text-foreground truncate group-hover:text-[#2563EB] transition-colors duration-[120ms] ${isTop3 ? "text-[15px] font-bold" : "text-[14px]"}`}>
                {trend.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pf.color }} />
                <span className="text-[11px] text-muted-foreground">{trend.platform}</span>
                {flag && (
                  <>
                    <span className="text-muted-foreground/30 text-[11px]">·</span>
                    <span className="text-[11px]">{flag}</span>
                    {trend.countryCode && <span className="text-[11px] text-muted-foreground uppercase">{trend.countryCode}</span>}
                  </>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="w-[120px] flex-shrink-0 text-right mr-3">
              <p className="text-[12px] font-semibold truncate" style={{ color: rankColor }}>
                {trend.volume || "—"}
              </p>
              {growthTag && (
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full ${growthTag.bg} ${growthTag.text} mt-0.5`}>
                  {growthTag.label}
                </span>
              )}
            </div>

            {/* Sparkline */}
            <div className="w-[72px] h-7 flex-shrink-0 relative">
              {trend.sparkData && trend.sparkData.length > 2 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend.sparkData.map(v => ({ v }))}>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={rankColor}
                        strokeWidth={1.5}
                        fill={rankColor}
                        fillOpacity={0.08}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <span
                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full animate-pulse"
                    style={{ width: 4, height: 4, backgroundColor: rankColor }}
                  />
                </>
              ) : (
                <div className="w-full h-full rounded bg-muted/30" />
              )}
            </div>

            {/* Hover arrow */}
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-[120ms] ml-2 flex-shrink-0" />
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── ANOMALIES PREDICTIVE ───────────────────────────────────────────────
function AnomaliesPredictive({ anomalies, lang, onAnomalyClick }: {
  anomalies: AnomalyAlert[]; lang: string; onAnomalyClick?: (id: string) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const anomalyTypeInfo: Record<string, { emoji: string; label: string; color: string }> = {
    spike: { emoji: "📈", label: lang === "pt" ? "Pico anômalo" : "Anomalous spike", color: "text-destructive" },
    viral: { emoji: "⚡", label: lang === "pt" ? "Viralização" : "Going viral", color: "text-amber-500" },
    multi_platform: { emoji: "🌐", label: lang === "pt" ? "Multiplataforma" : "Multi-platform", color: "text-blue-500" },
    rapid_growth: { emoji: "🚀", label: lang === "pt" ? "Crescimento rápido" : "Rapid growth", color: "text-orange-500" },
  };

  const patterns = useMemo(() => {
    const platformSet = new Set<string>();
    const countrySet = new Set<string>();
    const typeCount: Record<string, number> = {};
    let totalChange = 0;

    for (const a of anomalies) {
      platformSet.add(a.trend.platform);
      if (a.trend.countryCode) countrySet.add(a.trend.countryCode);
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
      totalChange += parseFloat(a.trend.change?.replace(/[^0-9.\-]/g, "") || "0");
    }

    const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "spike";
    const avgChange = anomalies.length > 0 ? Math.round(totalChange / anomalies.length) : 0;

    let prediction = "";
    if (platformSet.size >= 3 && avgChange > 200) {
      prediction = lang === "pt"
        ? "Convergência global detectada — múltiplas plataformas em aceleração simultânea."
        : "Global convergence detected — simultaneous acceleration across platforms.";
    } else if (countrySet.size >= 3) {
      prediction = lang === "pt"
        ? "Propagação geográfica ativa — anomalias expandindo entre regiões."
        : "Active geographic spread — anomalies expanding across regions.";
    } else if (avgChange > 150) {
      prediction = lang === "pt"
        ? "Crescimento acelerado anômalo — possível viralização nas próximas 2-6h."
        : "Anomalous accelerated growth — possible viralization in the next 2-6h.";
    } else {
      prediction = lang === "pt"
        ? "Monitorando padrões incomuns — sem convergência detectada ainda."
        : "Monitoring unusual patterns — no convergence detected yet.";
    }

    return { platformCount: platformSet.size, countryCount: countrySet.size, dominantType, avgChange, prediction };
  }, [anomalies, lang]);

  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <AlertTriangle className="w-6 h-6 mb-2 opacity-20" />
        <p className="text-[10px]">{lang === "pt" ? "Nenhuma anomalia detectada." : "No anomalies detected."}</p>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-1.5">
      {/* Prediction card */}
      <div className="rounded-xl bg-primary/5 p-2.5">
        <div className="flex items-start gap-1.5">
          <Target className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[9px] font-bold text-primary uppercase tracking-wide">
              {lang === "pt" ? "Previsão" : "Prediction"}
            </p>
            <p className="text-[9px] text-foreground/80 leading-relaxed mt-0.5">{patterns.prediction}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] text-muted-foreground">{patterns.platformCount} plat.</span>
              <span className="text-[8px] text-muted-foreground">{patterns.countryCount} reg.</span>
              <span className="text-[8px] text-muted-foreground">Δ {patterns.avgChange}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {anomalies.map((anomaly, i) => {
          const info = anomalyTypeInfo[anomaly.type] || anomalyTypeInfo.spike;
          const pf = platformIcons[anomaly.trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
          const isExpanded = expandedIdx === i;
          const changeNum = parseFloat(anomaly.trend.change?.replace(/[^0-9.\-]/g, "") || "0");
          const flag = countryCodeToFlag(anomaly.trend.countryCode);

          const whyText = lang === "pt"
            ? `${info.label}: +${Math.round(changeNum)}% de variação detectada em ${anomaly.trend.platform}`
            : `${info.label}: +${Math.round(changeNum)}% variation detected on ${anomaly.trend.platform}`;

          const whereParts = [anomaly.trend.platform];
          if (flag) whereParts.push(`${flag} ${anomaly.trend.countryCode}`);

          return (
            <motion.div
              key={`anomaly-${i}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className={`rounded-xl bg-card p-2 cursor-pointer transition-all hover:shadow-md flex flex-col gap-1 ${isExpanded ? "ring-1 ring-primary/10" : ""}`}
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              {/* WHAT */}
              <div>
                <p className="text-[10px] font-bold text-foreground leading-tight line-clamp-2">{anomaly.trend.title}</p>
                <p className="text-[8px] text-muted-foreground/70 mt-0.5">
                  {anomaly.trend.category || "Geral"} · {anomaly.trend.platform}
                </p>
              </div>

              {/* WHY */}
              <div className="rounded-lg bg-amber-500/6 px-1.5 py-0.5">
                <p className="text-[8px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  {whyText}
                </p>
              </div>

              {/* WHERE */}
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Globe2 className="w-2.5 h-2.5 flex-shrink-0" />
                {whereParts.join(" · ")}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/10">
                <span className={`text-[8px] font-bold ${info.color}`}>{info.emoji} {info.label}</span>
                <button
                  onClick={(ev) => { ev.stopPropagation(); onAnomalyClick?.(`${anomaly.trend.platform}-${anomaly.trend.title.slice(0, 20)}`); }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[8px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Eye className="w-2 h-2" /> Timeline
                </button>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 pt-1.5 border-t border-border/10 space-y-1">
                      {anomaly.trend.description && (
                        <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">{anomaly.trend.description}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function TrendRadar({ trends, allTrends, criticalMoments, anomalies = [], onSelectTrend, onFilterCountry, onAnomalyClick, onClose, isCollapsed: externalCollapsed, onToggleCollapse }: TrendRadarProps) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("signals");
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(RADAR_STORAGE_KEY) === "true";
    return true;
  });
  
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setCollapsed = onToggleCollapse || (() => setInternalCollapsed(c => !c));

  const [unseenCritical, setUnseenCritical] = useState(0);
  const prevCriticalCountRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(RADAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const totalAlertItems = criticalMoments.length + anomalies.length;

  useEffect(() => {
    if (totalAlertItems > prevCriticalCountRef.current && tab !== "critical") {
      setUnseenCritical(totalAlertItems);
    }
    prevCriticalCountRef.current = totalAlertItems;
  }, [totalAlertItems, tab]);

  useEffect(() => {
    if (tab === "critical") setUnseenCritical(0);
  }, [tab]);

  const hasEmerging = trends.length > 3;
  const hasCritical = criticalMoments.length > 0;
  const hasAnomalies = anomalies.length > 0;
  const hasSignals = hasEmerging || hasAnomalies;

  const labels = {
    collapse: lang === "pt" ? "Recolher" : "Collapse",
    expand: lang === "pt" ? "Expandir" : "Expand",
  };

  const tabConfig = [
    {
      value: "signals",
      icon: Sprout,
      label: lang === "pt" ? "Sinais" : "Signals",
      activeColor: "emerald",
      dot: hasSignals ? "bg-emerald-500" : null,
      badge: hasAnomalies ? anomalies.length : null,
      pulse: false,
    },
    {
      value: "critical",
      icon: Flame,
      label: lang === "pt" ? "Crítico" : "Critical",
      activeColor: "rose",
      dot: null,
      badge: unseenCritical > 0 ? unseenCritical : (hasCritical ? criticalMoments.length : null),
      pulse: unseenCritical > 0,
    },
    {
      value: "top",
      icon: Trophy,
      label: "Top",
      activeColor: "amber",
      dot: null,
      badge: null,
      pulse: false,
    },
    {
      value: "weekly",
      icon: Activity,
      label: lang === "pt" ? "Semana" : "Weekly",
      activeColor: "sky",
      dot: null,
      badge: null,
      pulse: false,
    },
  ];

  const activeColorMap: Record<string, string> = {
    emerald: "data-[state=active]:bg-emerald-500/8 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400",
    rose: "data-[state=active]:bg-rose-500/8 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400",
    amber: "data-[state=active]:bg-amber-500/8 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400",
    sky: "data-[state=active]:bg-sky-500/8 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400",
  };

  return (
    <div className="flex flex-col overflow-hidden h-full bg-card/30">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full min-h-0">
        {/* Unified header bar */}
        <div className="px-4 h-10 flex items-center gap-3 flex-shrink-0 bg-secondary/30 border-b border-border/50">
          {/* Label */}
          <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
            <Radar className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest hidden sm:inline">Radar</span>
          </div>

          {/* Tabs — segmented */}
          <TabsList className="h-7 bg-secondary/60 p-0.5 gap-0 rounded-lg flex-shrink-0">
            {tabConfig.map(tc => {
              const Icon = tc.icon;
              return (
                <TabsTrigger
                  key={tc.value}
                  value={tc.value}
                  className={`h-6 px-3 text-[10px] font-semibold gap-1.5 rounded-md border-none transition-all duration-200 data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground ${activeColorMap[tc.activeColor]} data-[state=active]:shadow-sm`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tc.label}</span>
                  {tc.dot && <span className={`w-1.5 h-1.5 rounded-full ${tc.dot} animate-pulse`} />}
                  {tc.badge && (
                    <span className={`px-1.5 py-px rounded-full bg-destructive text-destructive-foreground text-[7px] font-bold leading-none ${tc.pulse ? "animate-pulse" : ""}`}>
                      {tc.badge}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Controls */}
          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground/60 hover:text-primary hover:bg-primary/8 transition-all duration-200"
                  aria-label={collapsed ? labels.expand : labels.collapse}
                >
                  {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {collapsed ? labels.expand : labels.collapse}
              </TooltipContent>
            </Tooltip>
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    className="w-6 h-6 rounded-lg flex items-center justify-center bg-secondary/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200"
                    aria-label={lang === "pt" ? "Fechar Radar" : "Close Radar"}
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  {lang === "pt" ? "Fechar" : "Close"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className={`overflow-hidden flex-1 min-h-0 transition-opacity duration-200 ease-out ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          style={{ flexGrow: collapsed ? 0 : 1 }}
        >
          <div className="h-full relative">
            <TabsContent value="signals" className="absolute inset-0 mt-0 overflow-y-auto scrollbar-thin data-[state=inactive]:hidden animate-in fade-in-0 duration-200">
              <Legend tab="signals" lang={lang} />
              {!hasSignals && !hasEmerging ? (
                <TabLoadingState lang={lang} />
              ) : (
                <>
                  {hasAnomalies && (
                    <div className="mb-1">
                      <div className="px-4 py-2" style={{ background: 'hsl(0 100% 97%)', borderBottom: '2px solid #FF4D4F' }}>
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#CF1322', letterSpacing: '0.5px' }}>
                          <AbbrTooltip text="ANOMALIAS">
                            ⚡ {lang === "pt" ? "ANOMALIAS" : "ANOMALIES"} · {anomalies.length}
                          </AbbrTooltip>
                        </span>
                      </div>
                      <AnomaliesPredictive anomalies={anomalies} lang={lang} onAnomalyClick={onAnomalyClick} />
                    </div>
                  )}
                  {hasEmerging ? (
                    <div>
                      <div className="px-4 py-2" style={{ background: 'hsl(220 100% 97%)', borderBottom: '2px solid #4096FF' }}>
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#1D39C4', letterSpacing: '0.5px' }}>
                          <AbbrTooltip text="SINAIS EMERGENTES">
                            📡 {lang === "pt" ? "SINAIS EMERGENTES" : "EMERGING SIGNALS"}
                          </AbbrTooltip>
                        </span>
                      </div>
                      <EmergingTrendsSection trends={trends} onSelectTrend={onSelectTrend} />
                    </div>
                  ) : !hasAnomalies && (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Sprout className="w-6 h-6 mb-1.5 opacity-20" />
                      <p className="text-[10px]">{lang === "pt" ? "Nenhum sinal detectado." : "No signals detected."}</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="critical" className="absolute inset-0 mt-0 overflow-y-auto scrollbar-thin data-[state=inactive]:hidden animate-in fade-in-0 duration-200">
              <Legend tab="critical" lang={lang} />
              {hasCritical ? (
                <CriticalMomentsSection moments={criticalMoments} onSelectTrend={onSelectTrend} />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Flame className="w-6 h-6 mb-1.5 opacity-20" />
                  <p className="text-[10px] text-center px-4">
                    {lang === "pt" ? "Nenhum evento crítico detectado." : "No critical events detected."}
                  </p>
                  {allTrends.length > 0 && (
                    <div className="mt-2 w-full px-4">
                      <p className="text-[8px] text-muted-foreground/50 mb-1 text-center">
                        {lang === "pt" ? "Tendências ativas:" : "Active trends:"}
                      </p>
                      <div className="space-y-0.5">
                        {allTrends.slice(0, 3).map((t, i) => (
                          <div key={i} className="flex items-center gap-1 text-[9px] text-muted-foreground/70 bg-secondary/40 rounded-lg px-2 py-1">
                            <span className="font-medium text-foreground/60 truncate flex-1">{t.title}</span>
                            <span className="text-[8px] text-muted-foreground/50">{t.platform}</span>
                            {t.change && <span className="text-emerald-500 font-bold text-[8px]">{t.change}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="top" className="absolute inset-0 mt-0 overflow-y-auto scrollbar-thin data-[state=inactive]:hidden animate-in fade-in-0 duration-200">
              <Legend tab="top" lang={lang} />
              <div className="px-2 py-1.5">
                <TopTrendsGrid trends={allTrends} onSelectTrend={onSelectTrend} />
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="absolute inset-0 mt-0 overflow-y-auto scrollbar-thin data-[state=inactive]:hidden animate-in fade-in-0 duration-200">
              <Legend tab="weekly" lang={lang} />
              <Suspense fallback={<TabLoadingState lang={lang} />}>
                <WeeklyPulseDashboard trends={allTrends} />
              </Suspense>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}