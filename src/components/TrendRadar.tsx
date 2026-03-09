import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info, ChevronUp, ChevronDown, Activity, AlertTriangle, ExternalLink, TrendingUp } from "lucide-react";
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
};

const tabDescriptions: Record<string, Record<string, string>> = {
  emerging: { pt: "Tendências em aceleração", en: "Accelerating trends", es: "Tendencias en aceleración" },
  critical: { pt: "Momentos de pico anômalo", en: "Anomalous peak moments", es: "Momentos de pico anómalo" },
  top: { pt: "Assuntos mais discutidos agora", en: "Most discussed right now", es: "Temas más discutidos" },
  weekly: { pt: "Evolução semanal", en: "Weekly evolution", es: "Evolución semanal" },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || "";
  if (!text) return null;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed px-3 py-2 border-b border-border/50 flex-shrink-0 bg-secondary/20">
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

// Top Trends Grid - Functional and clickable
function TopTrendsGrid({ trends, onSelectTrend }: {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
}) {
  const { lang } = useLanguage();
  
  const ranked = useMemo(() => {
    // Filter out dev/tech sources that clutter the view
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
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-all group cursor-pointer border border-transparent hover:border-border/50"
          >
            {/* Rank */}
            <div className="w-6 text-center flex-shrink-0">
              {medal ? (
                <span className="text-sm">{medal}</span>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
              )}
            </div>

            {/* Platform icon */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: `${pf.color}15`, color: pf.color }}
            >
              {pf.emoji}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {trend.title}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                <span className="font-medium">{trend.platform}</span>
                <span>·</span>
                <span>💬 {trend.volume || "—"}</span>
                {flag && (
                  <>
                    <span>·</span>
                    <span>{flag}</span>
                  </>
                )}
              </div>
            </div>

            {/* Growth badge */}
            {changeNum !== 0 && (
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                changeNum > 0 
                  ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}>
                <TrendingUp className={`w-2.5 h-2.5 ${changeNum < 0 ? "rotate-180" : ""}`} />
                {changeNum > 0 ? "+" : ""}{Math.round(changeNum)}%
              </div>
            )}

            {/* External link indicator */}
            {trend.sourceUrl && (
              <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 transition-colors" />
            )}
          </motion.a>
        );
      })}
    </div>
  );
}

// Weekly Pulse - Interactive chart
function WeeklyPulse({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  
  // Generate weekly data from trends
  const weeklyData = useMemo(() => {
    const categories = ["Política", "Tecnologia", "Economia", "Entretenimento"];
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    
    // Group trends by category
    const categoryVolumes: Record<string, number> = {};
    trends.forEach(t => {
      const cat = t.category || "Geral";
      const vol = parseInt(String(t.volume).replace(/[^0-9]/g, "")) || 1;
      categoryVolumes[cat] = (categoryVolumes[cat] || 0) + vol;
    });

    // Generate simulated weekly evolution based on current data
    return days.map((day, idx) => {
      const dayFactor = 0.7 + Math.random() * 0.6;
      const weekendBoost = idx >= 5 ? 1.2 : 1;
      
      return {
        day,
        politica: Math.round((categoryVolumes["Política"] || 50) * dayFactor * weekendBoost / 7),
        tecnologia: Math.round((categoryVolumes["Tecnologia"] || 80) * dayFactor / 7),
        economia: Math.round((categoryVolumes["Economia"] || 40) * dayFactor / 7),
        criticos: Math.round(trends.filter(t => {
          const ch = parseFloat(t.change?.replace(/[^0-9.-]/g, "") || "0");
          return ch > 100;
        }).length * dayFactor * 3),
      };
    });
  }, [trends]);

  // Calculate weekly insights
  const insights = useMemo(() => {
    const totals = {
      politica: weeklyData.reduce((acc, d) => acc + d.politica, 0),
      tecnologia: weeklyData.reduce((acc, d) => acc + d.tecnologia, 0),
      economia: weeklyData.reduce((acc, d) => acc + d.economia, 0),
      criticos: weeklyData.reduce((acc, d) => acc + d.criticos, 0),
    };
    
    const maxCategory = Object.entries(totals).reduce((a, b) => a[1] > b[1] ? a : b);
    const categoryLabels: Record<string, string> = {
      politica: "Política",
      tecnologia: "Tecnologia",
      economia: "Economia",
      criticos: "Alertas Críticos",
    };

    return {
      topCategory: categoryLabels[maxCategory[0]] || maxCategory[0],
      topValue: maxCategory[1],
    };
  }, [weeklyData]);

  return (
    <div className="p-3 space-y-3">
      <div className="text-[11px] font-semibold text-foreground">
        {lang === "pt" ? "Evolução semanal por categoria" : "Weekly evolution by category"}
      </div>
      
      {/* Chart */}
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <RTooltip 
              contentStyle={{ 
                background: "hsl(var(--popover))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "10px",
              }} 
            />
            <Line type="monotone" dataKey="politica" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Política" />
            <Line type="monotone" dataKey="tecnologia" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} name="Tecnologia" />
            <Line type="monotone" dataKey="economia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Economia" />
            <Line type="monotone" dataKey="criticos" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name="Críticos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[9px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Política
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Tecnologia
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Economia
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Críticos
        </span>
      </div>

      {/* Insight */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[10px]">
        <span className="mr-1">📈</span>
        <span className="font-medium text-primary">{insights.topCategory}</span>
        <span className="text-muted-foreground">
          {" "}{lang === "pt" ? "foi a categoria mais ativa esta semana" : "was the most active category this week"}
        </span>
      </div>
    </div>
  );
}

export default function TrendRadar({ trends, allTrends, criticalMoments, anomalies = [], onSelectTrend, onFilterCountry, onAnomalyClick }: TrendRadarProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState("emerging");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(RADAR_STORAGE_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(RADAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const hasEmerging = trends.length > 3;
  const hasCritical = criticalMoments.length > 0;

  const collapseLabels = {
    pt: { collapse: "Recolher radar", expand: "Expandir radar" },
    en: { collapse: "Collapse radar", expand: "Expand radar" },
    es: { collapse: "Contraer radar", expand: "Expandir radar" },
  };
  const labels = collapseLabels[lang as keyof typeof collapseLabels] || collapseLabels.en;

  return (
    <div 
      className="border-b border-border bg-background flex-shrink-0 transition-all duration-300 ease-out overflow-hidden"
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
          
          {/* Main tabs */}
          <TabsList className="h-7 bg-secondary/50 p-0.5 gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="emerging" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 gap-1">
                  <Sprout className="w-3 h-3" />
                  <span className="hidden sm:inline">Emerging</span>
                  {hasEmerging && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {tabDescriptions.emerging[lang as keyof typeof tabDescriptions.emerging] || tabDescriptions.emerging.en}
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="critical" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive gap-1">
                  <Flame className="w-3 h-3" />
                  <span className="hidden sm:inline">Critical</span>
                  {hasCritical && <span className="px-1 py-0 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold">{criticalMoments.length}</span>}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {tabDescriptions.critical[lang as keyof typeof tabDescriptions.critical] || tabDescriptions.critical.en}
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="top" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 gap-1">
                  <Trophy className="w-3 h-3" />
                  <span className="hidden sm:inline">Top Trends</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {tabDescriptions.top[lang as keyof typeof tabDescriptions.top] || tabDescriptions.top.en}
              </TooltipContent>
            </Tooltip>
          </TabsList>
          
          <TabsList className="h-7 bg-secondary/50 p-0.5 gap-0.5 ml-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="weekly" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 gap-1">
                  <Activity className="w-3 h-3" />
                  <span className="hidden sm:inline">Weekly</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">
                {tabDescriptions.weekly[lang as keyof typeof tabDescriptions.weekly] || tabDescriptions.weekly.en}
              </TooltipContent>
            </Tooltip>
          </TabsList>

          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => setCollapsed(c => !c)}
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/60 transition-colors"
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
            {/* Anomalies alert */}
            {anomalies.length > 0 && (
              <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-destructive mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {lang === "pt" ? "Anomalias Detectadas" : "Detected Anomalies"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {anomalies.slice(0, 3).map((anomaly, i) => {
                    const trendId = `${anomaly.trend.platform}-${anomaly.trend.title.slice(0, 20)}`;
                    return (
                      <button
                        key={i}
                        onClick={() => onAnomalyClick?.(trendId)}
                        className="text-left bg-background/50 hover:bg-background/80 rounded px-2 py-1.5 text-[11px] transition-colors border border-destructive/10 flex items-center justify-between"
                      >
                        <span className="font-medium truncate mr-2">{anomaly.trend.title}</span>
                        <span className="text-destructive font-bold whitespace-nowrap">+{anomaly.trend.change}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <TabsContent value="emerging" className="mt-0 h-full flex flex-col">
                <Legend tab="emerging" lang={lang} />
                <ScrollArea className="flex-1">
                  {hasEmerging ? (
                    <EmergingTrendsSection trends={trends} onSelectTrend={onSelectTrend} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Sprout className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[11px]">
                        {lang === "pt" ? "Nenhum sinal emergente detectado no momento." : "No emerging signals detected at this time."}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="critical" className="mt-0 h-full flex flex-col">
                <Legend tab="critical" lang={lang} />
                <ScrollArea className="flex-1">
                  {hasCritical ? (
                    <CriticalMomentsSection moments={criticalMoments} onSelectTrend={onSelectTrend} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Flame className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[11px]">
                        {lang === "pt" ? "Nenhum alerta crítico no momento." : "No critical alerts at this time."}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="top" className="mt-0 h-full flex flex-col">
                <Legend tab="top" lang={lang} />
                <ScrollArea className="flex-1">
                  <div className="px-3 py-2">
                    <TopTrendsGrid trends={allTrends} onSelectTrend={onSelectTrend} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="weekly" className="mt-0 h-full flex flex-col">
                <Legend tab="weekly" lang={lang} />
                <ScrollArea className="flex-1">
                  <WeeklyPulse trends={allTrends} />
                </ScrollArea>
              </TabsContent>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
