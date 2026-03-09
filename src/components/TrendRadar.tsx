import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info, ChevronUp, ChevronDown, Activity, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
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
const RADAR_HEIGHT = 350; // Fixed height in pixels

const legendText: Record<string, Record<string, string>> = {
  emerging: {
    pt: "Emerging Signals: Tendências em aceleração.",
    en: "Emerging Signals: Accelerating trends.",
    es: "Emerging Signals: Tendencias en aceleración.",
  },
  critical: {
    pt: "Critical Alerts: Momentos de pico anômalo.",
    en: "Critical Alerts: Anomalous peak moments.",
    es: "Critical Alerts: Momentos de pico anómalo.",
  },
  top: {
    pt: "Top Trends: Assuntos mais discutidos agora.",
    en: "Top Trends: Most discussed topics right now.",
    es: "Top Trends: Temas más discutidos ahora.",
  },
  weekly: {
    pt: "Weekly Pulse: Evolução semanal das principais tendências.",
    en: "Weekly Pulse: Weekly evolution of top trends.",
    es: "Weekly Pulse: Evolución semanal de tendencias principales.",
  },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || legendText[tab]?.pt || "";
  if (!text) return null;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed px-3 py-2 border-b border-border/50 flex-shrink-0">
      <Info className="w-3 h-3 inline mr-1 text-muted-foreground/60" />
      {text}
    </div>
  );
}

export default function TrendRadar({ trends, allTrends, criticalMoments, onSelectTrend, onFilterCountry }: TrendRadarProps) {
  const { lang, t } = useLanguage();
  const [tab, setTab] = useState("emerging");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(RADAR_STORAGE_KEY) === "true";
    }
    return false;
  });

  // Persist collapse state
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
        {/* Header - Fixed height, always visible */}
        <div className="px-3 pt-2 pb-1.5 flex items-center gap-2 flex-shrink-0 bg-background z-10">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mr-1">
            Trend Radar
          </span>
          <TabsList className="h-7 bg-secondary/50 p-0.5 gap-0.5">
            <TabsTrigger value="emerging" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 gap-1">
              <Sprout className="w-3 h-3" />
              <span className="hidden sm:inline">Emerging</span>
              {hasEmerging && <span className="px-1 py-0 rounded-full bg-emerald-500/20 text-[8px] font-bold">•</span>}
            </TabsTrigger>
            <TabsTrigger value="critical" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive gap-1">
              <Flame className="w-3 h-3" />
              <span className="hidden sm:inline">Critical</span>
              {hasCritical && <span className="px-1 py-0 rounded-full bg-destructive/20 text-[8px] font-bold">{criticalMoments.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="top" className="h-6 px-2.5 text-[10px] font-semibold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 gap-1">
              <Trophy className="w-3 h-3" />
              <span className="hidden sm:inline">Top Trends</span>
            </TabsTrigger>
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

        {/* Content - Scrollable area with fixed height */}
        {!collapsed && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="emerging" className="mt-0 h-full flex flex-col">
              <Legend tab="emerging" lang={lang} />
              <ScrollArea className="flex-1">
                {hasEmerging ? (
                  <EmergingTrendsSection trends={trends} onSelectTrend={onSelectTrend} />
                ) : (
                  <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
                    {lang === "pt" ? "Nenhum sinal emergente detectado no momento." : "No emerging signals detected at this time."}
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="critical" className="mt-0 h-full flex flex-col">
              <Legend tab="critical" lang={lang} />
              <ScrollArea className="flex-1">
                {hasCritical ? (
                  <CriticalMomentsSection moments={criticalMoments} onSelectTrend={onSelectTrend} />
                ) : (
                  <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
                    {lang === "pt" ? "Nenhum alerta crítico no momento." : "No critical alerts at this time."}
                  </p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="top" className="mt-0 h-full flex flex-col">
              <Legend tab="top" lang={lang} />
              <ScrollArea className="flex-1">
                <div className="px-3 py-2">
                  <TopTrendsGrid trends={allTrends} onSelectTrend={onSelectTrend} onFilterCountry={onFilterCountry} />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  );
}

// Inline Top Trends grid (not the floating panel)
import { useMemo } from "react";
import { TrendingUp, Radio, Clock, ExternalLink, Globe } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

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
  "Bing News": { emoji: "📰", color: "hsl(190, 80%, 40%)" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

function TopTrendsGrid({ trends, onSelectTrend, onFilterCountry }: {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onFilterCountry?: (code: string) => void;
}) {
  const ranked = useMemo(() => {
    return [...trends]
      .sort((a, b) => {
        const volA = parseInt(String(a.volume).replace(/[^0-9]/g, "")) || 0;
        const volB = parseInt(String(b.volume).replace(/[^0-9]/g, "")) || 0;
        return volB - volA;
      })
      .slice(0, 20);
  }, [trends]);

  if (ranked.length === 0) return <p className="text-[11px] text-muted-foreground py-2">No trends available.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {ranked.map((trend, i) => {
        const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
        const flag = countryCodeToFlag(trend.countryCode);
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
        const sparkData = trend.historicalData?.slice(-8) || [];

        return (
          <motion.button
            key={`top-${trend.platform}-${trend.title.slice(0, 15)}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => onSelectTrend?.(trend)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-all text-left group"
          >
            <span className="text-[10px] font-bold text-muted-foreground w-5 text-right flex-shrink-0">
              {medal || `${i + 1}`}
            </span>
            <span className="flex-shrink-0 text-[11px]" style={{ color: pf.color }}>{pf.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{trend.title}</p>
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                <span>{trend.platform}</span>
                {flag && <span>{flag}</span>}
                <span>💬 {trend.volume || "—"}</span>
                {trend.change && (
                  <span className={`font-bold ${trend.changePositive ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {trend.change}
                  </span>
                )}
              </div>
            </div>
            {sparkData.length > 2 && (
              <div className="flex-shrink-0 w-12 h-3 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <Area type="monotone" dataKey="value" stroke={pf.color} strokeWidth={1} fill={pf.color} fillOpacity={0.15} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
