import { useState, useEffect, useMemo, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info, ChevronUp, ChevronDown, Activity, AlertTriangle, ExternalLink, TrendingUp, Zap, Globe2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";
import EmergingTrendsSection from "./EmergingTrendsSection";
import CriticalMomentsSection from "./CriticalMomentsSection";
import { TrendCardProps } from "./TrendCard";
import { CriticalMoment } from "@/hooks/use-critical-moments";
import { AnomalyAlert } from "@/hooks/use-anomaly-alerts";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface TrendRadarProps {
  trends: TrendCardProps[];
  allTrends: TrendCardProps[];
  criticalMoments: CriticalMoment[];
  anomalies?: AnomalyAlert[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onFilterCountry?: (code: string) => void;
  onAnomalyClick?: (id: string) => void;
}

const RADAR_STORAGE_KEY = "globaltalktrend-radar-collapsed";
const RADAR_HEIGHT = 350;

const legendText: Record<string, Record<string, string>> = {
  emerging: {
    pt: "Tendências em aceleração nas últimas 2h — detectadas por crescimento anômalo.",
    en: "Accelerating trends in the last 2h — detected by anomalous growth.",
    es: "Tendencias en aceleración en las últimas 2h — detectadas por crecimiento anómalo.",
  },
  critical: {
    pt: "Momentos de pico anômalo — alta velocidade de propagação multiplataforma.",
    en: "Anomalous peak moments — high multi-platform propagation speed.",
    es: "Momentos de pico anómalo — alta velocidad de propagación multiplataforma.",
  },
  top: {
    pt: "Os 20 assuntos mais discutidos agora — ordenados por volume total.",
    en: "The 20 most discussed topics right now — sorted by total volume.",
    es: "Los 20 temas más discutidos ahora — ordenados por volumen total.",
  },
  weekly: {
    pt: "Evolução semanal por categoria — análise de tendências dos últimos 7 dias.",
    en: "Weekly evolution by category — trend analysis from the last 7 days.",
    es: "Evolución semanal por categoría — análisis de tendencias de los últimos 7 días.",
  },
  anomalies: {
    pt: "Padrões anômalos detectados — picos, viralização e propagação multiplataforma.",
    en: "Anomalous patterns detected — spikes, viralization and multi-platform propagation.",
    es: "Patrones anómalos detectados — picos, viralización y propagación multiplataforma.",
  },
};

const tabDescriptions: Record<string, Record<string, string>> = {
  emerging: { pt: "Tendências em aceleração", en: "Accelerating trends", es: "Tendencias en aceleración" },
  critical: { pt: "Momentos de pico anômalo", en: "Anomalous peak moments", es: "Momentos de pico anómalo" },
  top: { pt: "Assuntos mais discutidos agora", en: "Most discussed right now", es: "Temas más discutidos" },
  weekly: { pt: "Evolução semanal", en: "Weekly evolution", es: "Evolución semanal" },
  anomalies: { pt: "Anomalias detectadas", en: "Detected anomalies", es: "Anomalías detectadas" },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || "";
  if (!text) return null;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed px-3 py-2 border-b border-border/30 flex-shrink-0 bg-muted/30">
      <Info className="w-3 h-3 inline mr-1.5 text-muted-foreground/60" />
      {text}
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

const anomalyTypeInfo: Record<string, { icon: React.ReactNode; label: string; labelEn: string; color: string }> = {
  spike: { icon: <TrendingUp className="w-3 h-3" />, label: "Pico anômalo", labelEn: "Anomalous spike", color: "text-destructive" },
  viral: { icon: <Zap className="w-3 h-3" />, label: "Viralização", labelEn: "Going viral", color: "text-amber-500" },
  multi_platform: { icon: <Globe2 className="w-3 h-3" />, label: "Multiplataforma", labelEn: "Multi-platform", color: "text-blue-500" },
  rapid_growth: { icon: <Activity className="w-3 h-3" />, label: "Crescimento rápido", labelEn: "Rapid growth", color: "text-orange-500" },
};

// Anomaly detail card
function AnomalyCard({ anomaly, lang, onClick }: { anomaly: AnomalyAlert; lang: string; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const info = anomalyTypeInfo[anomaly.type] || anomalyTypeInfo.spike;
  const changeNum = parseFloat(anomaly.trend.change?.replace(/[^0-9.\-]/g, "") || "0");
  const pf = platformIcons[anomaly.trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
  const flag = countryCodeToFlag(anomaly.trend.countryCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-destructive/20 bg-destructive/5 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-destructive/10 transition-colors"
      >
        <span className={`flex-shrink-0 ${info.color}`}>{info.icon}</span>
        <span className="flex-1 min-w-0 text-[11px] font-medium text-foreground truncate">{anomaly.trend.title}</span>
        <span className="text-destructive font-bold text-[10px] whitespace-nowrap">
          {changeNum > 0 ? "+" : ""}{anomaly.trend.change}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-destructive/10 pt-2">
              {/* Why anomaly */}
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{lang === "pt" ? "Por que é uma anomalia?" : "Why is it anomalous?"}</span>
                <br />
                {anomaly.message}
              </div>
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap text-[9px]">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  <span style={{ color: pf.color }}>{pf.emoji}</span> {anomaly.trend.platform}
                </span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold ${info.color} bg-current/10`}
                  style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                  {lang === "pt" ? info.label : info.labelEn}
                </span>
                {flag && <span>{flag}</span>}
                {anomaly.trend.volume && (
                  <span className="text-muted-foreground">💬 {anomaly.trend.volume}</span>
                )}
              </div>
              {/* Sparkline */}
              {anomaly.trend.sparkData?.length > 0 && (
                <div className="h-[40px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={anomaly.trend.sparkData.map((v, i) => ({ i, v }))}>
                      <defs>
                        <linearGradient id={`anomaly-grad-${anomaly.trend.title.slice(0, 10)}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="hsl(var(--destructive))" strokeWidth={1.5} fill={`url(#anomaly-grad-${anomaly.trend.title.slice(0, 10)})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* CTA */}
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="w-full h-7 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                {lang === "pt" ? "Ver na timeline" : "View in timeline"} →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Top Trends Grid
function TopTrendsGrid({ trends, onSelectTrend }: {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
}) {
  const { lang } = useLanguage();
  
  const ranked = useMemo(() => {
    const filtered = trends.filter(t => 
      !["GitHub", "Stack Overflow", "Hacker News"].includes(t.platform) || 
      parseInt(String(t.volume).replace(/[^0-9]/g, "")) > 1000
    );
    return [...filtered]
      .sort((a, b) => {
        const volA = parseInt(String(a.volume).replace(/[^0-9]/g, "")) || 0;
        const volB = parseInt(String(b.volume).replace(/[^0-9]/g, "")) || 0;
        return volB - volA;
      })
      .slice(0, 20);
  }, [trends]);

  if (ranked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Trophy className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-[11px]">{lang === "pt" ? "Carregando top trends..." : "Loading top trends..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {ranked.map((trend, i) => {
        const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
        const flag = countryCodeToFlag(trend.countryCode);
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
        const changeNum = parseFloat(trend.change?.replace(/[^0-9.\-]/g, "") || "0");

        return (
          <motion.a
            key={`top-${trend.platform}-${trend.title.slice(0, 15)}-${i}`}
            href={trend.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!trend.sourceUrl) {
                e.preventDefault();
                onSelectTrend?.(trend);
              }
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.15 }}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-all group cursor-pointer border border-transparent hover:border-border/40"
          >
            <div className="w-6 text-center flex-shrink-0">
              {medal ? (
                <span className="text-sm">{medal}</span>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
              )}
            </div>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: `${pf.color}15`, color: pf.color }}
            >
              {pf.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {trend.title}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                <span className="font-medium">{trend.platform}</span>
                <span>·</span>
                <span>💬 {trend.volume || "—"}</span>
                {flag && <><span>·</span><span>{flag}</span></>}
              </div>
            </div>
            {changeNum !== 0 && (
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                changeNum > 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-destructive/10 text-destructive"
              }`}>
                <TrendingUp className={`w-2.5 h-2.5 ${changeNum < 0 ? "rotate-180" : ""}`} />
                {changeNum > 0 ? "+" : ""}{Math.round(changeNum)}%
              </div>
            )}
            {trend.sourceUrl && (
              <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 transition-colors" />
            )}
          </motion.a>
        );
      })}
    </div>
  );
}

// Weekly Pulse with real data
function WeeklyPulse({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<Array<{
    day: string; politica: number; tecnologia: number; entretenimento: number; esportes: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("trend_snapshots")
          .select("category, snapshot_at, volume_raw")
          .gte("snapshot_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("snapshot_at", { ascending: true });

        if (fetchError) throw fetchError;

        const dayMap = new Map<string, Record<string, number>>();
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        
        (data || []).forEach((row) => {
          const date = new Date(row.snapshot_at);
          const dayKey = dayNames[date.getDay()];
          const cat = (row.category || "Geral").toLowerCase();
          if (!dayMap.has(dayKey)) dayMap.set(dayKey, { politica: 0, tecnologia: 0, entretenimento: 0, esportes: 0 });
          const dayData = dayMap.get(dayKey)!;
          const vol = row.volume_raw || 0;
          if (cat.includes("polít")) dayData.politica += vol;
          else if (cat.includes("tecno")) dayData.tecnologia += vol;
          else if (cat.includes("entret") || cat.includes("cultur")) dayData.entretenimento += vol;
          else if (cat.includes("espor")) dayData.esportes += vol;
        });

        const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        const chartData = orderedDays.map(day => ({
          day,
          politica: Math.round((dayMap.get(day)?.politica || 0) / 1000000),
          tecnologia: Math.round((dayMap.get(day)?.tecnologia || 0) / 1000000),
          entretenimento: Math.round((dayMap.get(day)?.entretenimento || 0) / 1000000),
          esportes: Math.round((dayMap.get(day)?.esportes || 0) / 1000000),
        }));

        setWeeklyData(chartData);
        setError(null);
      } catch (err) {
        console.error("Error fetching weekly data:", err);
        setError("Erro ao carregar dados históricos");
      } finally {
        setLoading(false);
      }
    };
    fetchHistoricalData();
  }, []);

  const insights = useMemo(() => {
    if (weeklyData.length === 0) return { topCategory: "Dados", topValue: 0, growth: 0 };
    const totals = {
      politica: weeklyData.reduce((acc, d) => acc + d.politica, 0),
      tecnologia: weeklyData.reduce((acc, d) => acc + d.tecnologia, 0),
      entretenimento: weeklyData.reduce((acc, d) => acc + d.entretenimento, 0),
      esportes: weeklyData.reduce((acc, d) => acc + d.esportes, 0),
    };
    const maxCategory = Object.entries(totals).reduce((a, b) => a[1] > b[1] ? a : b);
    const categoryLabels: Record<string, string> = {
      politica: "Política", tecnologia: "Tecnologia", entretenimento: "Entretenimento", esportes: "Esportes",
    };
    const recent = weeklyData.slice(-2).reduce((acc, d) => acc + d.politica + d.tecnologia + d.entretenimento + d.esportes, 0);
    const previous = weeklyData.slice(-4, -2).reduce((acc, d) => acc + d.politica + d.tecnologia + d.entretenimento + d.esportes, 0);
    const growth = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
    return { topCategory: categoryLabels[maxCategory[0]] || maxCategory[0], topValue: maxCategory[1], growth };
  }, [weeklyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
        <span className="text-[11px]">{lang === "pt" ? "Carregando dados históricos..." : "Loading historical data..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Activity className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-[11px]">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[11px] font-semibold text-foreground">
        {lang === "pt" ? "Evolução semanal por categoria" : "Weekly evolution by category"}
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "10px" }} />
            <Line type="monotone" dataKey="politica" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} name="Política" />
            <Line type="monotone" dataKey="tecnologia" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2 }} name="Tecnologia" />
            <Line type="monotone" dataKey="entretenimento" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 2 }} name="Entretenimento" />
            <Line type="monotone" dataKey="esportes" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 2 }} name="Esportes" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[9px]">
        {[
          { key: "chart-1", label: "Política" },
          { key: "chart-2", label: "Tecnologia" },
          { key: "chart-3", label: "Entretenimento" },
          { key: "chart-4", label: "Esportes" },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: `hsl(var(--${key}))` }} />
            {label}
          </span>
        ))}
      </div>
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[10px]">
        <span className="mr-1">📈</span>
        <span className="font-medium text-primary">{insights.topCategory}</span>
        <span className="text-muted-foreground">
          {" "}{lang === "pt" ? `foi a categoria mais ativa (${insights.growth > 0 ? "+" : ""}${insights.growth}% vs semana anterior)` : `was the most active (${insights.growth > 0 ? "+" : ""}${insights.growth}% vs previous week)`}
        </span>
      </div>
    </div>
  );
}

const TrendRadar = memo(function TrendRadar({ trends, allTrends, criticalMoments, anomalies = [], onSelectTrend, onFilterCountry, onAnomalyClick }: TrendRadarProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState("emerging");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(RADAR_STORAGE_KEY) === "true";
    return false;
  });

  // Keep stable references to prevent re-renders from parent
  const trendsRef = useRef(trends);
  const allTrendsRef = useRef(allTrends);
  const criticalRef = useRef(criticalMoments);
  const anomaliesRef = useRef(anomalies);

  // Only update refs when data meaningfully changes
  useEffect(() => { trendsRef.current = trends; }, [trends]);
  useEffect(() => { allTrendsRef.current = allTrends; }, [allTrends]);
  useEffect(() => { criticalRef.current = criticalMoments; }, [criticalMoments]);
  useEffect(() => { anomaliesRef.current = anomalies; }, [anomalies]);

  useEffect(() => {
    localStorage.setItem(RADAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const hasEmerging = trends.length > 3;
  const hasCritical = criticalMoments.length > 0;
  const hasAnomalies = anomalies.length > 0;

  const collapseLabels = {
    pt: { collapse: "Recolher radar", expand: "Expandir radar" },
    en: { collapse: "Collapse radar", expand: "Expand radar" },
    es: { collapse: "Contraer radar", expand: "Expandir radar" },
  };
  const labels = collapseLabels[lang as keyof typeof collapseLabels] || collapseLabels.en;

  return (
    <div 
      className="border-b border-border/40 bg-background flex-shrink-0 transition-all duration-300 ease-out overflow-hidden"
      style={{ 
        height: collapsed ? 40 : RADAR_HEIGHT,
        minHeight: collapsed ? 40 : RADAR_HEIGHT,
        maxHeight: collapsed ? 40 : RADAR_HEIGHT,
      }}
    >
      <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
        {/* Header */}
        <div className="px-3 pt-2 pb-1.5 flex items-center gap-2 flex-shrink-0 bg-background z-10">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mr-1">
            Trend Radar
          </span>
          
          <TabsList className="h-7 bg-secondary/50 p-0.5 gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="emerging" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 gap-1">
                  <Sprout className="w-3 h-3" />
                  <span className="hidden sm:inline">Emerging</span>
                  {hasEmerging && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{tabDescriptions.emerging[lang as keyof typeof tabDescriptions.emerging] || tabDescriptions.emerging.en}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="critical" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive gap-1">
                  <Flame className="w-3 h-3" />
                  <span className="hidden sm:inline">Critical</span>
                  {hasCritical && <span className="px-1 py-0 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">{criticalMoments.length}</span>}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{tabDescriptions.critical[lang as keyof typeof tabDescriptions.critical] || tabDescriptions.critical.en}</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="top" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 gap-1">
                  <Trophy className="w-3 h-3" />
                  <span className="hidden sm:inline">Top</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{tabDescriptions.top[lang as keyof typeof tabDescriptions.top] || tabDescriptions.top.en}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="weekly" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 gap-1">
                  <Activity className="w-3 h-3" />
                  <span className="hidden sm:inline">Weekly</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">{tabDescriptions.weekly[lang as keyof typeof tabDescriptions.weekly] || tabDescriptions.weekly.en}</TooltipContent>
            </Tooltip>

            {hasAnomalies && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="anomalies" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="hidden sm:inline">Anomalias</span>
                    <span className="px-1 py-0 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold animate-pulse">{anomalies.length}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">{tabDescriptions.anomalies[lang as keyof typeof tabDescriptions.anomalies] || tabDescriptions.anomalies.en}</TooltipContent>
              </Tooltip>
            )}
          </TabsList>

          <div className="ml-auto flex items-center gap-1">
            {/* Info button - enhanced visibility */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] text-[10px]">
                <p className="font-semibold mb-1">Trend Radar</p>
                <p className="text-muted-foreground">
                  {lang === "pt"
                    ? "Módulo de detecção inteligente que monitora sinais emergentes, alertas críticos e tendências globais em tempo real."
                    : "Intelligent detection module monitoring emerging signals, critical alerts and global trends in real time."}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Collapse button - enhanced visibility */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setCollapsed(c => !c)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
                  aria-label={collapsed ? labels.expand : labels.collapse}
                >
                  {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {collapsed ? labels.expand : labels.collapse}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <TabsContent value="emerging" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                <Legend tab="emerging" lang={lang} />
                <ScrollArea className="flex-1">
                  {hasEmerging ? (
                    <EmergingTrendsSection trends={trends} onSelectTrend={onSelectTrend} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Sprout className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[11px]">{lang === "pt" ? "Nenhum sinal emergente detectado no momento." : "No emerging signals detected at this time."}</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="critical" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                <Legend tab="critical" lang={lang} />
                <ScrollArea className="flex-1">
                  {hasCritical ? (
                    <CriticalMomentsSection moments={criticalMoments} onSelectTrend={onSelectTrend} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Flame className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[11px]">{lang === "pt" ? "Nenhum alerta crítico no momento." : "No critical alerts at this time."}</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="top" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                <Legend tab="top" lang={lang} />
                <ScrollArea className="flex-1">
                  <div className="px-3 py-2">
                    <TopTrendsGrid trends={allTrends} onSelectTrend={onSelectTrend} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="weekly" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                <Legend tab="weekly" lang={lang} />
                <ScrollArea className="flex-1">
                  <WeeklyPulse trends={allTrends} />
                </ScrollArea>
              </TabsContent>

              {hasAnomalies && (
                <TabsContent value="anomalies" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                  <Legend tab="anomalies" lang={lang} />
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {anomalies.map((anomaly, i) => {
                        const trendId = `${anomaly.trend.platform}-${anomaly.trend.title.slice(0, 20)}`;
                        return (
                          <AnomalyCard
                            key={`anomaly-${i}`}
                            anomaly={anomaly}
                            lang={lang}
                            onClick={() => onAnomalyClick?.(trendId)}
                          />
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
});

export default TrendRadar;
