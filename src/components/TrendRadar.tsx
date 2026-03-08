import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EmergingTrendsSection from "./EmergingTrendsSection";
import CriticalMomentsSection from "./CriticalMomentsSection";
import GlobalRanking from "./GlobalRanking";
import { TrendCardProps } from "./TrendCard";
import { CriticalMoment } from "@/hooks/use-critical-moments";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrendRadarProps {
  trends: TrendCardProps[];
  allTrends: TrendCardProps[];
  criticalMoments: CriticalMoment[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onFilterCountry?: (code: string) => void;
}

const legendText: Record<string, Record<string, string>> = {
  emerging: {
    pt: "Sinais Emergentes representam tópicos que começaram a ganhar atenção incomum nas últimas horas, detectados em múltiplas plataformas.",
    en: "Emerging Signals represent topics that began gaining unusual attention within the last hours based on signals detected across multiple platforms.",
    es: "Las Señales Emergentes representan temas que comenzaron a ganar atención inusual en las últimas horas.",
  },
  critical: {
    pt: "Alertas Críticos representam tópicos em crescimento explosivo confirmado em múltiplas fontes de informação.",
    en: "Critical Alerts represent topics experiencing rapid global growth across multiple information sources.",
    es: "Las Alertas Críticas representan temas en crecimiento explosivo confirmado en múltiples fuentes.",
  },
  top: {
    pt: "Top Trends mostram os tópicos com maior atenção global no período selecionado, considerando volume, fontes e abrangência geográfica.",
    en: "Top Trends show the topics receiving the highest global attention across multiple sources.",
    es: "Las Top Trends muestran los temas con mayor atención global en el período seleccionado.",
  },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || legendText[tab]?.pt || "";
  if (!text) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-[10px] text-muted-foreground leading-relaxed px-3 pb-2 border-b border-border/50"
    >
      <Info className="w-3 h-3 inline mr-1 text-muted-foreground/60" />
      {text}
    </motion.p>
  );
}

export default function TrendRadar({ trends, allTrends, criticalMoments, onSelectTrend, onFilterCountry }: TrendRadarProps) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("emerging");

  const hasEmerging = trends.length > 3;
  const hasCritical = criticalMoments.length > 0;

  return (
    <div className="border-b border-border">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="px-3 pt-2 pb-0 flex items-center gap-2">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-auto p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors">
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
        </div>

        <AnimatePresence mode="wait">
          <TabsContent value="emerging" className="mt-0">
            <Legend tab="emerging" lang={lang} />
            {hasEmerging ? (
              <EmergingTrendsSection trends={trends} onSelectTrend={onSelectTrend} />
            ) : (
              <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
                {lang === "pt" ? "Nenhum sinal emergente detectado no momento." : "No emerging signals detected at this time."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="critical" className="mt-0">
            <Legend tab="critical" lang={lang} />
            {hasCritical ? (
              <CriticalMomentsSection moments={criticalMoments} onSelectTrend={onSelectTrend} />
            ) : (
              <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
                {lang === "pt" ? "Nenhum alerta crítico no momento." : "No critical alerts at this time."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="top" className="mt-0">
            <Legend tab="top" lang={lang} />
            <div className="px-3 py-2">
              <TopTrendsGrid trends={allTrends} onSelectTrend={onSelectTrend} onFilterCountry={onFilterCountry} />
            </div>
          </TabsContent>
        </AnimatePresence>
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
