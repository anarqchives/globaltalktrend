import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, Flame, Trophy, Info, ChevronUp, ChevronDown, Activity, AlertTriangle, ExternalLink, TrendingUp, Zap, Globe2, Radio, BarChart3, Eye, Target, Radar, ArrowRight, Sparkles, Clock, Crown, Medal, Award } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell } from "recharts";
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
  },
  critical: {
    pt: "Momentos de pico anômalo — alta velocidade de propagação multiplataforma.",
    en: "Anomalous peak moments — high multi-platform propagation speed.",
  },
  top: {
    pt: "Os 20 assuntos mais discutidos agora — ordenados por volume total.",
    en: "The 20 most discussed topics right now — sorted by total volume.",
  },
  weekly: {
    pt: "Painel semanal de inteligência — volume, categorias e tendências dos últimos 7 dias.",
    en: "Weekly intelligence dashboard — volume, categories and trends from the last 7 days.",
  },
  anomalies: {
    pt: "Análise preditiva de padrões — comportamentos anômalos detectados em múltiplas plataformas.",
    en: "Predictive pattern analysis — anomalous behaviors detected across multiple platforms.",
  },
};

function Legend({ tab, lang }: { tab: string; lang: string }) {
  const text = legendText[tab]?.[lang] || legendText[tab]?.en || "";
  if (!text) return null;
  return (
    <div className="text-[10px] text-muted-foreground/80 leading-relaxed px-3 py-1.5 flex-shrink-0 bg-muted/30">
      <Info className="w-3 h-3 inline mr-1.5 opacity-50" />
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

// ─── TOP TRENDS ─────────────────────────────────────────────────────────
function TopTrendsGrid({ trends, onSelectTrend }: { trends: TrendCardProps[]; onSelectTrend?: (trend: TrendCardProps) => void }) {
  const { lang } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const ranked = useMemo(() => {
    return [...trends]
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

  const handleClick = (trend: TrendCardProps, idx: number, e: React.MouseEvent) => {
    // If sourceUrl exists, open it; otherwise toggle expand
    if (trend.sourceUrl) {
      e.stopPropagation();
      window.open(trend.sourceUrl, "_blank", "noopener,noreferrer");
    } else {
      setExpandedIdx(expandedIdx === idx ? null : idx);
    }
  };

  const podiumOrder = ranked.length >= 3 ? [ranked[1], ranked[0], ranked[2]] : ranked.slice(0, 3);
  const podiumOrigIdx = ranked.length >= 3 ? [1, 0, 2] : [0, 1, 2];
  const medals = ["🥇", "🥈", "🥉"];
  const podiumHeights = ["h-16", "h-20", "h-14"];
  const podiumBg = [
    "from-slate-400/20 to-slate-400/5 border-slate-400/30",
    "from-amber-500/20 to-amber-400/5 border-amber-500/40",
    "from-orange-600/15 to-orange-600/5 border-orange-600/25",
  ];

  return (
    <div className="space-y-2">
      {/* Podium - Top 3 visual */}
      <div className="flex items-end justify-center gap-1.5 pb-1">
        {podiumOrder.map((trend, vi) => {
          if (!trend) return null;
          const realIdx = podiumOrigIdx[vi];
          const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
          const changeNum = parseFloat(trend.change?.replace(/[^0-9.\-]/g, "") || "0");
          const isExpanded = expandedIdx === realIdx;

          return (
            <motion.div
              key={`podium-${realIdx}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: vi * 0.06, layout: { duration: 0.2 } }}
              className={`flex-1 max-w-[140px] ${isExpanded ? "max-w-[280px]" : ""}`}
            >
              <button
                onClick={(e) => handleClick(trend, realIdx, e)}
                className={`w-full rounded-t-lg border bg-gradient-to-b ${podiumBg[vi]} p-2 text-left transition-all hover:shadow-md ${podiumHeights[vi]} flex flex-col justify-end`}
              >
                <span className="text-lg leading-none">{medals[realIdx]}</span>
                <p className="text-[10px] font-bold text-foreground line-clamp-2 leading-tight mt-1">{trend.title}</p>
                <div className="flex items-center gap-1 text-[8px] text-muted-foreground mt-0.5">
                  <span style={{ color: pf.color }}>{pf.emoji}</span>
                  <span>{trend.volume || "—"}</span>
                  {changeNum !== 0 && (
                    <span className={changeNum > 0 ? "text-emerald-500 font-bold" : "text-destructive font-bold"}>
                      {changeNum > 0 ? "+" : ""}{Math.round(changeNum)}%
                    </span>
                  )}
                </div>
              </button>
              {/* Expanded details inline */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden border border-t-0 border-border/30 rounded-b-lg bg-card px-2 pb-2"
                  >
                    {trend.description && <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{trend.description}</p>}
                    <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                      {trend.sourceUrl && (
                        <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[8px] font-semibold hover:bg-primary/90 transition-colors">
                          <ExternalLink className="w-2 h-2" /> {lang === "pt" ? "Abrir" : "Open"}
                        </a>
                      )}
                      <button onClick={() => onSelectTrend?.(trend)}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[8px] font-medium hover:bg-secondary/80 transition-colors">
                        Timeline →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Ranking list #4-20 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {ranked.slice(3).map((trend, i) => {
          const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
          const flag = countryCodeToFlag(trend.countryCode);
          const changeNum = parseFloat(trend.change?.replace(/[^0-9.\-]/g, "") || "0");
          const idx = i + 3;
          const isExpanded = expandedIdx === idx;

          return (
            <motion.div
              key={`top-${trend.platform}-${trend.title.slice(0, 15)}-${i}`}
              layout
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, layout: { duration: 0.2 } }}
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className={`rounded-lg border border-border/40 bg-card p-2 cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm ${
                isExpanded ? "col-span-2 shadow-md ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-start gap-1.5">
                <span className={`text-[10px] font-black w-5 flex-shrink-0 pt-0.5 ${idx < 6 ? "text-amber-500" : idx < 10 ? "text-muted-foreground" : "text-muted-foreground/50"}`}>#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-semibold text-foreground leading-tight ${isExpanded ? "" : "line-clamp-1"}`}>{trend.title}</p>
                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground mt-0.5">
                    <span style={{ color: pf.color }}>{pf.emoji}</span>
                    <span>{trend.platform}</span>
                    {flag && <span>{flag}</span>}
                    <span>💬 {trend.volume || "—"}</span>
                  </div>
                </div>
                {changeNum !== 0 && (
                  <span className={`text-[9px] font-bold flex-shrink-0 ${changeNum > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    {changeNum > 0 ? "+" : ""}{Math.round(changeNum)}%
                  </span>
                )}
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
                    <div className="mt-2 pt-1.5 border-t border-border/30 space-y-1.5">
                      {trend.description && <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">{trend.description}</p>}
                      {trend.sparkData && trend.sparkData.length > 2 && (
                        <div className="h-6 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend.sparkData.map(v => ({ v }))}>
                              <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1} fill="hsl(var(--primary))" fillOpacity={0.1} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {trend.sourceUrl && (
                          <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-semibold hover:bg-primary/90 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> {lang === "pt" ? "Abrir fonte" : "Open source"}
                          </a>
                        )}
                        <button onClick={() => onSelectTrend?.(trend)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[9px] font-medium hover:bg-secondary/80 transition-colors">
                          Timeline →
                        </button>
                      </div>
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

// ─── WEEKLY DASHBOARD ───────────────────────────────────────────────────
function WeeklyDashboard({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch7d = async () => {
      try {
        const { data } = await supabase
          .from("trend_snapshots")
          .select("category, snapshot_at, volume_raw, platform, title")
          .gte("snapshot_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("snapshot_at", { ascending: true });
        if (data) setWeeklyData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch7d();
  }, []);

  const stats = useMemo(() => {
    const catCount: Record<string, number> = {};
    const platformCount: Record<string, number> = {};
    const countryCount: Record<string, number> = {};
    const dailyVolume: Record<string, number> = {};
    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (const row of weeklyData) {
      const cat = (row.category || "Geral").replace(/^[a-z]/, (c: string) => c.toUpperCase());
      catCount[cat] = (catCount[cat] || 0) + (row.volume_raw || 1);
      if (row.platform) platformCount[row.platform] = (platformCount[row.platform] || 0) + 1;
      const d = new Date(row.snapshot_at);
      const dayKey = dayLabels[d.getDay()];
      dailyVolume[dayKey] = (dailyVolume[dayKey] || 0) + (row.volume_raw || 0);
    }

    for (const t of trends) {
      const cat = (t.category || "Geral").replace(/^[a-z]/, (c: string) => c.toUpperCase());
      catCount[cat] = (catCount[cat] || 0) + 1;
      platformCount[t.platform] = (platformCount[t.platform] || 0) + 1;
      if (t.countryCode) countryCount[t.countryCode] = (countryCount[t.countryCode] || 0) + 1;
    }

    const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.slice(0, 12), value }));
    const topPlatforms = Object.entries(platformCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
    const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const dailyChart = orderedDays.map(day => ({ day, vol: Math.round((dailyVolume[day] || 0) / 1_000_000) }));
    const topCountries = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const recentHalf = orderedDays.slice(4);
    const olderHalf = orderedDays.slice(0, 4);
    const recentVol = recentHalf.reduce((s, d) => s + (dailyVolume[d] || 0), 0);
    const olderVol = olderHalf.reduce((s, d) => s + (dailyVolume[d] || 0), 0);
    const momentum = olderVol > 0 ? Math.round(((recentVol - olderVol) / olderVol) * 100) : 0;

    return { topCats, topPlatforms, dailyChart, topCountries, momentum, totalSnapshots: weeklyData.length, totalTrends: trends.length };
  }, [weeklyData, trends]);

  const chartColors = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
        <span className="text-[11px]">{lang === "pt" ? "Carregando dados..." : "Loading data..."}</span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: lang === "pt" ? "Tendências ativas" : "Active trends", value: stats.totalTrends, icon: "📊" },
          { label: lang === "pt" ? "Snapshots 7d" : "7d Snapshots", value: stats.totalSnapshots > 999 ? `${(stats.totalSnapshots / 1000).toFixed(1)}k` : stats.totalSnapshots, icon: "📸" },
          { label: lang === "pt" ? "Plataformas" : "Platforms", value: stats.topPlatforms.length, icon: "📡" },
          { label: "Momentum", value: `${stats.momentum > 0 ? "+" : ""}${stats.momentum}%`, icon: stats.momentum > 0 ? "🔥" : "📉" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-card p-2 text-center">
            <span className="text-sm block">{kpi.icon}</span>
            <span className="text-[13px] font-black text-foreground block">{kpi.value}</span>
            <span className="text-[8px] text-muted-foreground">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/40 bg-card p-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            {lang === "pt" ? "Volume diário (M)" : "Daily volume (M)"}
          </span>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyChart} margin={{ top: 2, right: 2, left: -15, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "10px" }} />
                <Bar dataKey="vol" radius={[3, 3, 0, 0]}>
                  {stats.dailyChart.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--primary))`} fillOpacity={0.3 + (i / stats.dailyChart.length) * 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-card p-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
            {lang === "pt" ? "Top categorias" : "Top categories"}
          </span>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topCats} layout="vertical" margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 7 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" width={60} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {stats.topCats.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {stats.topPlatforms.map((p) => (
          <span key={p.name} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-secondary text-secondary-foreground">
            <span style={{ color: platformIcons[p.name]?.color }}>{platformIcons[p.name]?.emoji || "●"}</span>
            {p.name} <span className="text-muted-foreground">({p.value})</span>
          </span>
        ))}
        <span className="text-[9px] text-muted-foreground">·</span>
        {stats.topCountries.map(([code, count]) => (
          <span key={code} className="text-[9px]">
            {countryCodeToFlag(code)} <span className="text-muted-foreground">{count}</span>
          </span>
        ))}
      </div>
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
        ? "Convergência global detectada — múltiplas plataformas em aceleração simultânea. Alta probabilidade de intensificação em 4-8h."
        : "Global convergence detected — simultaneous acceleration across platforms.";
    } else if (countrySet.size >= 3) {
      prediction = lang === "pt"
        ? "Propagação geográfica ativa — anomalias expandindo entre regiões. Monitoramento intensificado."
        : "Active geographic spread — anomalies expanding across regions.";
    } else if (avgChange > 150) {
      prediction = lang === "pt"
        ? "Crescimento acelerado anômalo — possível viralização nas próximas 2-6h."
        : "Anomalous growth — possible viralization in 2-6h.";
    } else {
      prediction = lang === "pt"
        ? "Padrões sob observação — comportamentos atípicos em fontes diversas."
        : "Patterns under observation — atypical behaviors across sources.";
    }

    return { platformCount: platformSet.size, countryCount: countrySet.size, dominantType, avgChange, prediction };
  }, [anomalies, lang]);

  if (anomalies.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-muted-foreground">
        <Radar className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-[11px]">{lang === "pt" ? "Nenhuma anomalia detectada no momento." : "No anomalies detected."}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5">
      {/* Global summary bar */}
      <div className="rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-destructive" />
          <span className="text-[9px] font-black uppercase tracking-wider text-destructive">
            {lang === "pt" ? "Análise Preditiva" : "Predictive Analysis"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>{anomalies.length} {lang === "pt" ? "anomalias" : "anomalies"}</span>
          <span>·</span>
          <span>{patterns.platformCount} {lang === "pt" ? "plataformas" : "platforms"}</span>
          <span>·</span>
          <span>{patterns.countryCount} {lang === "pt" ? "países" : "countries"}</span>
          <span>·</span>
          <span className="font-bold text-destructive">Δ +{patterns.avgChange}%</span>
        </div>
        <p className="text-[9px] text-foreground/70 leading-relaxed basis-full">{patterns.prediction}</p>
      </div>

      {/* Anomaly cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-auto">
        {anomalies.map((anomaly, i) => {
          const info = anomalyTypeInfo[anomaly.type] || anomalyTypeInfo.spike;
          const changeNum = parseFloat(anomaly.trend.change?.replace(/[^0-9.\-]/g, "") || "0");
          const pf = platformIcons[anomaly.trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
          const flag = countryCodeToFlag(anomaly.trend.countryCode);
          const sparkData = anomaly.trend.sparkData?.map((v) => ({ v })) || [];
          const isExpanded = expandedIdx === i;
          const trendId = `${anomaly.trend.platform}-${anomaly.trend.title.slice(0, 20)}`;

          // Smart prediction per card
          const cardPrediction = changeNum > 300
            ? (lang === "pt" ? "Viralização confirmada — ciclo noticioso mainstream em 2-4h." : "Viral pattern confirmed.")
            : changeNum > 150
            ? (lang === "pt" ? "Aceleração acima da média — tração adicional provável." : "Above-average acceleration.")
            : (lang === "pt" ? "Sinal em evolução — monitoramento contínuo ativo." : "Evolving signal — monitoring active.");

          const confidenceLevel = changeNum > 300 ? 92 : changeNum > 150 ? 74 : 51;

          return (
            <motion.div
              key={`anomaly-${anomaly.trend.title.slice(0, 15)}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, layout: { duration: 0.2, type: "spring", stiffness: 300, damping: 30 } }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className={`rounded-lg border border-destructive/15 bg-card p-2.5 cursor-pointer transition-all hover:border-destructive/30 hover:shadow-sm ${
                isExpanded ? "col-span-2 row-span-2 shadow-md ring-1 ring-destructive/15 bg-destructive/5" : ""
              }`}
            >
              {/* Badge + change */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${info.color}`}
                  style={{ backgroundColor: `color-mix(in srgb, currentColor 8%, transparent)` }}>
                  {info.emoji} {info.label}
                </span>
                <span className="text-destructive font-black text-[10px] tabular-nums">+{Math.round(changeNum)}%</span>
              </div>

              {/* Title */}
              <p className={`text-[11px] font-semibold text-foreground leading-tight mb-1 ${isExpanded ? "" : "line-clamp-2 min-h-[28px]"}`}>
                {anomaly.trend.title}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-1 text-[8px] text-muted-foreground flex-wrap mb-1">
                <span style={{ color: pf.color }}>{pf.emoji}</span>
                <span>{anomaly.trend.platform}</span>
                {flag && <span>{flag}</span>}
                {anomaly.trend.volume && <span>💬 {anomaly.trend.volume}</span>}
                <span className={`px-1 py-0 rounded text-[7px] font-bold ${
                  anomaly.severity === "high" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                }`}>
                  {anomaly.severity === "high" ? "ALTO" : "MÉDIO"}
                </span>
              </div>

              {/* Mini sparkline */}
              {!isExpanded && sparkData.length > 2 && (
                <div className="h-3 w-full opacity-50">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area type="monotone" dataKey="v" stroke="hsl(var(--destructive))" strokeWidth={1} fill="hsl(var(--destructive))" fillOpacity={0.15} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Expand indicator */}
              <div className="flex items-center justify-center mt-1">
                {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground/50" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/30" />}
              </div>

              {/* Expanded */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-destructive/10 space-y-2">
                      {/* Why anomaly */}
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">{lang === "pt" ? "Análise: " : "Analysis: "}</span>
                        {anomaly.message}
                      </p>

                      {/* Sparkline large */}
                      {sparkData.length > 2 && (
                        <div className="h-8 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                              <defs>
                                <linearGradient id={`anom-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke="hsl(var(--destructive))" strokeWidth={1.5} fill={`url(#anom-grad-${i})`} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Prediction with confidence */}
                      <div className="rounded-md bg-primary/5 border border-primary/10 px-2 py-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70">
                            {lang === "pt" ? "Previsão" : "Prediction"}
                          </span>
                          <span className="text-[8px] font-bold text-primary/60">{confidenceLevel}% {lang === "pt" ? "confiança" : "confidence"}</span>
                        </div>
                        <p className="text-[10px] text-foreground/80 leading-relaxed">{cardPrediction}</p>
                        {/* Confidence bar */}
                        <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${confidenceLevel}%` }} />
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onAnomalyClick?.(trendId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive text-[9px] font-semibold transition-colors">
                          {lang === "pt" ? "Ver na timeline" : "Timeline"} →
                        </button>
                        {anomaly.trend.sourceUrl && (
                          <a href={anomaly.trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[9px] font-medium hover:bg-secondary/80 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> {lang === "pt" ? "Fonte" : "Source"}
                          </a>
                        )}
                      </div>
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
export default function TrendRadar({ trends, allTrends, criticalMoments, anomalies = [], onSelectTrend, onFilterCountry, onAnomalyClick }: TrendRadarProps) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("emerging");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(RADAR_STORAGE_KEY) === "true";
    return false;
  });

  useEffect(() => {
    localStorage.setItem(RADAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const hasEmerging = trends.length > 3;
  const hasCritical = criticalMoments.length > 0;
  const hasAnomalies = anomalies.length > 0;

  const labels = {
    collapse: lang === "pt" ? "Recolher radar" : "Collapse radar",
    expand: lang === "pt" ? "Expandir radar" : "Expand radar",
  };

  // Tab config with colors
  const tabConfig = [
    { value: "emerging", icon: Sprout, label: "Emerging", activeClass: "data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30", dot: hasEmerging ? "bg-emerald-500" : null, badge: null },
    { value: "critical", icon: Flame, label: "Critical", activeClass: "data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:border-rose-500/30", dot: null, badge: hasCritical ? criticalMoments.length : null },
    { value: "top", icon: Trophy, label: "Top", activeClass: "data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30", dot: null, badge: null },
    { value: "weekly", icon: Activity, label: "Weekly", activeClass: "data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400 data-[state=active]:border-sky-500/30", dot: null, badge: null },
    ...(hasAnomalies ? [{ value: "anomalies", icon: AlertTriangle, label: "Anomalias", activeClass: "data-[state=active]:bg-red-500/15 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 data-[state=active]:border-red-500/30", dot: null, badge: anomalies.length }] : []),
  ];

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
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mr-1 flex items-center gap-1">
            <Radar className="w-3 h-3" /> Trend Radar
          </span>

          <TabsList className="h-7 bg-muted/40 p-0.5 gap-0.5 border border-border/30 rounded-lg">
            {tabConfig.map(tc => {
              const Icon = tc.icon;
              return (
                <Tooltip key={tc.value}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={tc.value}
                      className={`h-6 px-2.5 text-[10px] font-semibold gap-1 rounded-md border border-transparent transition-all ${tc.activeClass}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{tc.label}</span>
                      {tc.dot && <span className={`w-1.5 h-1.5 rounded-full ${tc.dot} animate-pulse`} />}
                      {tc.badge && (
                        <span className="px-1 py-0 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold leading-tight animate-pulse">
                          {tc.badge}
                        </span>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">
                    {legendText[tc.value]?.[lang] || legendText[tc.value]?.en || tc.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>

          <div className="ml-auto flex items-center gap-1">
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
                      <p className="text-[11px]">{lang === "pt" ? "Nenhum sinal emergente detectado no momento." : "No emerging signals detected."}</p>
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
                      <p className="text-[11px]">{lang === "pt" ? "Nenhum alerta crítico no momento." : "No critical alerts."}</p>
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
                  <WeeklyDashboard trends={allTrends} />
                </ScrollArea>
              </TabsContent>

              {hasAnomalies && (
                <TabsContent value="anomalies" className="absolute inset-0 mt-0 flex flex-col data-[state=inactive]:hidden">
                  <Legend tab="anomalies" lang={lang} />
                  <ScrollArea className="flex-1">
                    <AnomaliesPredictive anomalies={anomalies} lang={lang} onAnomalyClick={onAnomalyClick} />
                  </ScrollArea>
                </TabsContent>
              )}
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
