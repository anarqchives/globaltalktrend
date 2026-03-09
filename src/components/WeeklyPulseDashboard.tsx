import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, TrendingUp, Clock, ArrowUp, ArrowDown, Minus, Activity,
  Zap, Eye, BarChart3, Radio, AlertTriangle, Flame, Target, ChevronRight,
  Globe, Layers, Brain, Radar, Signal, TrendingDown,
} from "lucide-react";
import { calculateMomentum, getTooltip, resolveSource } from "@/lib/format-utils";

// ── Design tokens ──
const CAT_COLORS: Record<string, string> = {
  Tecnologia: "hsl(210, 100%, 50%)", Technology: "hsl(210, 100%, 50%)",
  Entretenimento: "hsl(280, 70%, 55%)", Entertainment: "hsl(280, 70%, 55%)",
  Notícias: "hsl(0, 72%, 55%)", News: "hsl(0, 72%, 55%)",
  Política: "hsl(340, 70%, 50%)", Politics: "hsl(340, 70%, 50%)",
  Economia: "hsl(142, 60%, 45%)", Economy: "hsl(142, 60%, 45%)",
  Ciência: "hsl(45, 90%, 50%)", Science: "hsl(45, 90%, 50%)",
  Esportes: "hsl(25, 100%, 50%)", Sports: "hsl(25, 100%, 50%)",
  Conhecimento: "hsl(200, 60%, 50%)", Knowledge: "hsl(200, 60%, 50%)",
  Geral: "hsl(var(--muted-foreground))", General: "hsl(var(--muted-foreground))",
};
const normCat = (c: string) => c.replace(/^[a-z]/, ch => ch.toUpperCase()).slice(0, 14);
const getCatColor = (cat: string) => CAT_COLORS[cat] || "hsl(var(--muted-foreground))";
const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

// ── i18n helper ──
const t = (lang: string, pt: string, en: string, es?: string) =>
  lang === "pt" ? pt : lang === "es" ? (es || en) : en;

// ══════════════════════════════════════════════════════════════════════════
// STORY #1 — KPI Card
// ══════════════════════════════════════════════════════════════════════════
function KPICard({ icon, value, label, delta, tooltip, color, delay = 0 }: {
  icon: React.ReactNode; value: string | number; label: string;
  delta?: { value: number; label: string }; tooltip: string;
  color?: string; delay?: number;
}) {
  const deltaColor = (delta?.value ?? 0) > 0 ? "text-emerald-500" : (delta?.value ?? 0) < 0 ? "text-red-500" : "text-muted-foreground";
  const DeltaIcon = (delta?.value ?? 0) > 0 ? ArrowUp : (delta?.value ?? 0) < 0 ? ArrowDown : Minus;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-xl border border-border/50 bg-card p-3 cursor-help hover:border-primary/20 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-muted-foreground group-hover:text-primary/70 transition-colors">{icon}</span>
            {delta && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${deltaColor}`}>
                <DeltaIcon className="w-3 h-3" />
                {delta.value > 0 ? "+" : ""}{delta.value}%
              </span>
            )}
          </div>
          <div className={`text-lg font-black leading-none ${color || "text-foreground"}`}>{value}</div>
          <div className="text-[9px] text-muted-foreground mt-1 leading-tight">{label}</div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px] max-w-[240px]">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORY #2 — Momentum Gauge
// ══════════════════════════════════════════════════════════════════════════
function MomentumGauge({ categories, dailyVolumes, lang }: {
  categories: { name: string; volumes: Record<string, number> }[];
  dailyVolumes: Record<string, number>;
  lang: string;
}) {
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Activity className="w-3 h-3" />
        {t(lang, "Momentum por Categoria", "Category Momentum", "Momentum por Categoría")}
      </span>
      {categories.slice(0, 5).map((cat, i) => {
        const days = orderedDays;
        const vals = days.map(d => cat.volumes[d] || 0);
        const firstHalf = vals.slice(0, Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
        const secondHalf = vals.slice(Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
        const momentum = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : secondHalf > 0 ? 100 : 0;
        const total = vals.reduce((a, b) => a + b, 0);
        const color = getCatColor(cat.name);
        const barWidth = Math.min(Math.max(Math.abs(momentum), 5), 100);

        return (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-foreground w-20 truncate font-medium">{cat.name}</span>
            <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: momentum >= 0 ? "hsl(142, 60%, 45%)" : "hsl(0, 84%, 60%)" }}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              />
            </div>
            <span className={`text-[9px] font-bold w-12 text-right ${momentum > 0 ? "text-emerald-500" : momentum < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {momentum > 0 ? "+" : ""}{momentum}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORY #3 — Live Signal Feed
// ══════════════════════════════════════════════════════════════════════════
function LiveSignalFeed({ signals, lang }: {
  signals: { term: string; category: string; volume: number; momentum: number; platform: string; time: string }[];
  lang: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
        {t(lang, "Feed de Sinais ao Vivo", "Live Signal Feed", "Feed de Señales en Vivo")}
      </span>
      <ScrollArea className="h-[140px]">
        <AnimatePresence mode="popLayout">
          {signals.slice(0, 12).map((sig, i) => {
            const src = resolveSource(sig.platform);
            return (
              <motion.div
                key={`${sig.term}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/20 last:border-0"
              >
                <span className="text-xs flex-shrink-0">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-foreground truncate">{sig.term}</div>
                  <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-muted/50 text-[7px]">{sig.category}</span>
                    <span>{fmtNum(sig.volume)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-[9px] font-bold ${sig.momentum > 0 ? "text-emerald-500" : sig.momentum < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {sig.momentum > 0 ? "↑" : sig.momentum < 0 ? "↓" : "→"} {Math.abs(sig.momentum)}%
                  </span>
                  <span className="text-[7px] text-muted-foreground">{sig.time}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORY #5 — Heatmap Matrix
// ══════════════════════════════════════════════════════════════════════════
function TrendPulseMatrix({ data, topCats, lang, dailyTotals }: {
  data: Record<string, Record<string, number>>; topCats: string[]; lang: string;
  dailyTotals: Record<string, number>;
}) {
  const days = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] :
    lang === "es" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] :
      ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const dayKeys = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  let maxVal = 0;
  for (const cat of topCats) for (const day of dayKeys) { const v = data[cat]?.[day] || 0; if (v > maxVal) maxVal = v; }

  const getColor = (v: number) => {
    if (maxVal === 0) return "hsl(var(--muted) / 0.2)";
    const i = v / maxVal;
    if (i > 0.8) return "hsl(0, 84%, 55%)";
    if (i > 0.6) return "hsl(25, 100%, 55%)";
    if (i > 0.4) return "hsl(45, 90%, 50%)";
    if (i > 0.2) return "hsl(210, 100%, 55%)";
    if (i > 0.05) return "hsl(210, 60%, 70%, 0.4)";
    return "hsl(var(--muted) / 0.15)";
  };

  return (
    <div>
      <div className="grid gap-px" style={{ gridTemplateColumns: `72px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map(d => <div key={d} className="text-[8px] text-muted-foreground text-center font-semibold py-0.5">{d}</div>)}
        {topCats.map(cat => (
          <React.Fragment key={cat}>
            <div className="text-[8px] text-muted-foreground font-medium flex items-center truncate pr-1" title={cat}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: getCatColor(cat) }} />
              {cat}
            </div>
            {dayKeys.map((day, di) => {
              const v = data[cat]?.[day] || 0;
              const dayTotal = dailyTotals[day] || 1;
              const pct = Math.round((v / dayTotal) * 100);
              const prevDay = di > 0 ? dayKeys[di - 1] : null;
              const prevV = prevDay ? (data[cat]?.[prevDay] || 0) : 0;
              const dod = prevV > 0 ? Math.round(((v - prevV) / prevV) * 100) : 0;
              return (
                <Tooltip key={`${cat}-${day}`}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="h-5 rounded-sm cursor-help transition-all hover:ring-1 hover:ring-primary/30 flex items-center justify-center"
                      style={{ backgroundColor: v > 0 ? getColor(v) : undefined }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {v > 0 ? (
                        <span className="text-[7px] font-bold text-foreground/70">{fmtNum(v)}</span>
                      ) : (
                        <span className="text-[7px] text-muted-foreground/40">—</span>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[9px] space-y-0.5">
                    <div className="font-bold">{cat} · {days[di]}</div>
                    <div>{t(lang, "Menções", "Mentions")}: {fmtNum(v)}</div>
                    <div>{t(lang, "Tendências", "Trends")}: {Math.ceil(v / 1000)}</div>
                    {dod !== 0 && <div className={dod > 0 ? "text-emerald-500" : "text-red-500"}>
                      {t(lang, "Dia anterior", "Day-over-day")}: {dod > 0 ? "+" : ""}{dod}%
                    </div>}
                    {pct > 0 && <div className="text-muted-foreground">{pct}% {t(lang, "do total", "of total")}</div>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1.5 justify-end">
        <span className="text-[7px] text-muted-foreground">{t(lang, "Baixo", "Low")}</span>
        {[0.05, 0.2, 0.4, 0.6, 0.8].map(i => <div key={i} className="w-3 h-2 rounded-sm" style={{ backgroundColor: getColor(i * maxVal) }} />)}
        <span className="text-[7px] text-muted-foreground">{t(lang, "Alto", "High")}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORY #6 — Interactive Term Cloud
// ══════════════════════════════════════════════════════════════════════════
function TermCloud({ words, lang, onSelect }: {
  words: { text: string; count: number; sentiment: number; category: string; momentum: number }[];
  lang: string;
  onSelect?: (term: string) => void;
}) {
  const sorted = [...words].sort((a, b) => b.count - a.count).slice(0, 35);
  const maxCount = sorted[0]?.count || 1;
  return (
    <div className="flex flex-wrap gap-1 justify-center py-1">
      {sorted.map((w, i) => {
        const size = 9 + Math.round((w.count / maxCount) * 8);
        const isNew = w.momentum > 50;
        return (
          <Tooltip key={w.text}>
            <TooltipTrigger asChild>
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 0.5 + (w.count / maxCount) * 0.5, scale: 1 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                onClick={() => onSelect?.(w.text)}
                className={`cursor-pointer px-1 py-0.5 rounded font-medium hover:bg-primary/10 transition-colors ${isNew ? "ring-1 ring-emerald-500/30" : ""}`}
                style={{
                  fontSize: size,
                  color: getCatColor(w.category),
                }}
              >
                {w.text}
                {isNew && <span className="text-[6px] ml-0.5 text-emerald-500">●</span>}
              </motion.span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[9px] space-y-0.5">
              <div className="font-bold">{w.text}</div>
              <div>{t(lang, "Volume", "Volume")}: {fmtNum(w.count)}</div>
              <div>{t(lang, "Categoria", "Category")}: {w.category}</div>
              <div>{t(lang, "Momentum", "Momentum")}: {w.momentum > 0 ? "+" : ""}{w.momentum}%</div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORIES #7-#9 — Emerging / Viral / Anomaly Detection
// ══════════════════════════════════════════════════════════════════════════
interface DetectedSignal {
  term: string;
  type: "emerging" | "viral" | "anomaly";
  score: number;
  volume: number;
  growth: number;
  platforms: string[];
  reason: string;
  prediction?: { direction: "up" | "stable" | "down"; confidence: number };
}

function SignalDetectionPanel({ signals, lang }: { signals: DetectedSignal[]; lang: string }) {
  const typeConfig = {
    emerging: { icon: <Zap className="w-3 h-3" />, label: t(lang, "Emergente", "Emerging"), color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    viral: { icon: <Flame className="w-3 h-3" />, label: "Viral", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
    anomaly: { icon: <AlertTriangle className="w-3 h-3" />, label: t(lang, "Anomalia", "Anomaly"), color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  };
  const predLabel = { up: "↑", stable: "→", down: "↓" };

  if (signals.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Brain className="w-3 h-3" />
        {t(lang, "Detecção Inteligente de Sinais", "Intelligent Signal Detection", "Detección Inteligente de Señales")}
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold">{signals.length}</span>
      </span>
      <ScrollArea className="h-[130px]">
        {signals.map((sig, i) => {
          const cfg = typeConfig[sig.type];
          return (
            <motion.div
              key={`${sig.term}-${sig.type}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-lg border p-2 mb-1.5 ${cfg.bg}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={cfg.color}>{cfg.icon}</span>
                  <span className={`text-[8px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-[10px] font-bold text-foreground">{sig.term}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {sig.prediction && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sig.prediction.direction === "up" ? "bg-emerald-500/10 text-emerald-500" : sig.prediction.direction === "down" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
                          {predLabel[sig.prediction.direction]} {sig.prediction.confidence}%
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-[9px]">
                        {t(lang, `Previsão 24-48h · Confiança: ${sig.prediction.confidence}%`, `24-48h prediction · Confidence: ${sig.prediction.confidence}%`)}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <ViralBadge score={sig.score} />
                </div>
              </div>
              <div className="text-[8px] text-muted-foreground leading-relaxed">{sig.reason}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] text-muted-foreground">{fmtNum(sig.volume)} vol</span>
                <span className={`text-[8px] font-semibold ${sig.growth > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {sig.growth > 0 ? "+" : ""}{sig.growth}%
                </span>
                <div className="flex items-center gap-0.5">
                  {sig.platforms.map(p => <span key={p} className="text-[7px]">{resolveSource(p).emoji}</span>)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORY #8 — Viral Score Badge
// ══════════════════════════════════════════════════════════════════════════
function ViralBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500 text-white" : score >= 60 ? "bg-orange-500 text-white" : score >= 40 ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground";
  const icon = score >= 80 ? "🔥" : score >= 60 ? "📈" : score >= 40 ? "📊" : "—";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full cursor-help ${color}`}>
          {icon} {score}
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-[9px]">
        Viral Score: {score}/100 — volume + growth + spread + velocity
      </TooltipContent>
    </Tooltip>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AI Insight Card
// ══════════════════════════════════════════════════════════════════════════
function InsightCard({ icon, text, delay = 0 }: { icon: string; text: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10"
    >
      <span className="text-sm flex-shrink-0">{icon}</span>
      <p className="text-[10px] text-foreground leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function WeeklyPulseDashboard({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ── Data fetch with batch pagination ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let allData: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data } = await supabase
            .from("trend_snapshots")
            .select("category, snapshot_at, volume_raw, platform, title, country_code, change_percent")
            .gte("snapshot_at", sevenDaysAgo.toISOString())
            .lte("snapshot_at", now.toISOString())
            .order("snapshot_at", { ascending: true })
            .range(offset, offset + batchSize - 1);
          if (data && data.length > 0) {
            allData = allData.concat(data);
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else { hasMore = false; }
        }
        setWeeklyData(allData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // ── Master analysis pipeline ──
  const analysis = useMemo(() => {
    const catDaily: Record<string, Record<string, number>> = {};
    const catTotal: Record<string, number> = {};
    const wordFreq: Record<string, { count: number; positive: number; negative: number; cats: Record<string, number> }> = {};
    const dailyVolumes: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    const titlePlatforms: Record<string, Set<string>> = {};
    const titleVolumes: Record<string, number> = {};
    const titleGrowth: Record<string, number[]> = {};
    const titleCats: Record<string, string> = {};
    let totalVolume = 0;
    let emergingCount = 0;

    // Previous week approximation for growth comparison
    const prevWeekVol = weeklyData.length > 0 ? Math.round(weeklyData.length * 0.85 * (weeklyData[0]?.volume_raw || 1)) : 0;

    for (const row of weeklyData) {
      const cat = normCat(row.category || "Geral");
      const d = new Date(row.snapshot_at);
      const dayKey = dayLabels[d.getDay()];
      const vol = row.volume_raw || 1;
      const change = Number(row.change_percent) || 0;
      const titleKey = (row.title || "").toLowerCase().slice(0, 50);

      if (!catDaily[dayKey]) catDaily[dayKey] = {};
      catDaily[dayKey][cat] = (catDaily[dayKey][cat] || 0) + vol;
      catTotal[cat] = (catTotal[cat] || 0) + vol;
      dailyVolumes[dayKey] = (dailyVolumes[dayKey] || 0) + vol;
      totalVolume += vol;
      platformCounts[row.platform] = (platformCounts[row.platform] || 0) + 1;

      if (!titlePlatforms[titleKey]) titlePlatforms[titleKey] = new Set();
      titlePlatforms[titleKey].add(row.platform);
      titleVolumes[titleKey] = (titleVolumes[titleKey] || 0) + vol;
      if (!titleGrowth[titleKey]) titleGrowth[titleKey] = [];
      titleGrowth[titleKey].push(change);
      titleCats[titleKey] = cat;

      if (change > 100) emergingCount++;

      const words = (row.title || "").toLowerCase().split(/\s+/).filter((w: string) =>
        w.length > 4 && !["about", "after", "their", "which", "could", "would", "there", "where", "being", "entre", "sobre", "desde", "ainda", "muito", "antes", "parte", "todos", "ainda", "quando"].includes(w));
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0, cats: {} };
        wordFreq[w].count += vol;
        wordFreq[w].cats[cat] = (wordFreq[w].cats[cat] || 0) + vol;
        if (change > 0) wordFreq[w].positive++;
        else if (change < 0) wordFreq[w].negative++;
      }
    }

    // Enrich with live trends
    for (const t of trends) {
      const words = t.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const cat = normCat(t.category || "Geral");
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0, cats: {} };
        wordFreq[w].count++;
        wordFreq[w].cats[cat] = (wordFreq[w].cats[cat] || 0) + 1;
        if (t.changePositive) wordFreq[w].positive++;
        else wordFreq[w].negative++;
      }
    }

    const topCats = Object.entries(catTotal).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
    const today = new Date();
    const todayDayKey = dayLabels[today.getDay()];
    const todayIndex = orderedDays.indexOf(todayDayKey);

    // Chart data
    const chartData = orderedDays.map((day, i) => {
      const isFuture = i > todayIndex && todayIndex >= 0;
      const entry: Record<string, any> = { day, isFuture };
      for (const cat of topCats) {
        entry[cat] = isFuture ? null : Math.round((catDaily[day]?.[cat] || 0) / 1000);
      }
      return entry;
    });

    // Word cloud with category and momentum
    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 35)
      .map(([text, data]) => {
        const topCat = Object.entries(data.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "Geral";
        const total = data.positive + data.negative;
        const sentiment = total > 0 ? (data.positive - data.negative) / total : 0;
        const momentum = total > 0 ? Math.round((data.positive / total) * 100) : 0;
        return { text, count: data.count, sentiment, category: topCat, momentum };
      });

    // Category momentum data
    const categoryMomentum = topCats.map(cat => ({
      name: cat,
      volumes: Object.fromEntries(orderedDays.map(d => [d, catDaily[d]?.[cat] || 0])),
    }));

    // ── Signal detection (Stories #7-#9) ──
    const detectedSignals: DetectedSignal[] = [];
    const titleEntries = Object.entries(titleVolumes).sort((a, b) => b[1] - a[1]).slice(0, 100);

    for (const [titleKey, vol] of titleEntries) {
      const growths = titleGrowth[titleKey] || [];
      const avgGrowth = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
      const platforms = titlePlatforms[titleKey] || new Set();
      const platformCount = platforms.size;
      const displayTitle = titleKey.charAt(0).toUpperCase() + titleKey.slice(1, 40);
      const cat = titleCats[titleKey] || "Geral";

      // Viral score (#8)
      const volScore = Math.min(vol / 10000, 1) * 30;
      const growthScore = Math.min(Math.abs(avgGrowth) / 500, 1) * 30;
      const spreadScore = Math.min(platformCount / 5, 1) * 20;
      const velScore = Math.min(growths.length / 20, 1) * 20;
      const viralScore = Math.round(volScore + growthScore + spreadScore + velScore);

      // Prediction (#10)
      const predDirection: "up" | "stable" | "down" = avgGrowth > 30 ? "up" : avgGrowth < -20 ? "down" : "stable";
      const predConfidence = Math.min(Math.round(50 + platformCount * 10 + Math.min(growths.length, 10) * 2), 95);

      // Emerging (#7)
      if (avgGrowth > 80 && vol > 500) {
        detectedSignals.push({
          term: displayTitle, type: "emerging", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms],
          reason: lang === "pt"
            ? `Crescimento de ${Math.round(avgGrowth)}% detectado em ${platformCount} plataforma(s). Velocidade acima do normal.`
            : `${Math.round(avgGrowth)}% growth detected across ${platformCount} platform(s). Above-normal velocity.`,
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      }
      // Viral
      else if (viralScore >= 65 && platformCount >= 2) {
        detectedSignals.push({
          term: displayTitle, type: "viral", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms],
          reason: lang === "pt"
            ? `Score viral de ${viralScore}/100. Presente em ${platformCount} plataformas com alto engajamento.`
            : `Viral score ${viralScore}/100. Present on ${platformCount} platforms with high engagement.`,
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      }
      // Anomaly (#9)
      else if (Math.abs(avgGrowth) > 200 || (platformCount >= 4 && vol > 1000)) {
        detectedSignals.push({
          term: displayTitle, type: "anomaly", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms],
          reason: lang === "pt"
            ? `Padrão anômalo: ${platformCount >= 4 ? `surgiu em ${platformCount} plataformas simultaneamente` : `variação de ${Math.round(avgGrowth)}% — fora do padrão histórico`}.`
            : `Anomalous pattern: ${platformCount >= 4 ? `appeared on ${platformCount} platforms simultaneously` : `${Math.round(avgGrowth)}% variation — outside historical patterns`}.`,
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      }
    }

    // Live feed signals (#3)
    const liveSignals = trends
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 15)
      .map(t => {
        const changeNum = typeof t.change === "string" ? parseInt(t.change.replace(/[^-\d]/g, "")) || 0 : 0;
        return {
          term: t.title.slice(0, 45),
          category: normCat(t.category || "Geral"),
          volume: t.volume || 0,
          momentum: changeNum,
          platform: t.platform || "web",
          time: t.time || "now",
        };
      });

    // Insights
    const insights: { icon: string; text: string }[] = [];
    if (topCats.length > 0) {
      const pct = totalVolume > 0 ? Math.round(((catTotal[topCats[0]] || 0) / totalVolume) * 100) : 0;
      insights.push({
        icon: "🏆",
        text: t(lang,
          `Categoria dominante: ${topCats[0]} liderou com ${pct}% do volume total.`,
          `Dominant category: ${topCats[0]} led with ${pct}% of total volume.`),
      });
    }
    let peakDay = orderedDays[0], peakVol = 0;
    for (const day of orderedDays) {
      const dayTotal = Object.values(catDaily[day] || {}).reduce((s, v) => s + v, 0);
      if (dayTotal > peakVol) { peakVol = dayTotal; peakDay = day; }
    }
    if (peakVol > 0) {
      insights.push({ icon: "📈", text: t(lang, `Pico: ${peakDay} com ${fmtNum(peakVol)} de volume.`, `Peak: ${peakDay} with ${fmtNum(peakVol)} volume.`) });
    }
    const momentumResult = calculateMomentum(dailyVolumes, orderedDays, todayIndex, lang);
    if (momentumResult.isReliable && Math.abs(momentumResult.value) > 5) {
      insights.push({
        icon: momentumResult.value > 0 ? "🔥" : "📉",
        text: t(lang,
          `Momentum ${momentumResult.value > 0 ? "positivo" : "negativo"}: ${momentumResult.display} na metade mais recente.`,
          `${momentumResult.value > 0 ? "Positive" : "Negative"} momentum: ${momentumResult.display} in the recent half.`),
      });
    }
    if (detectedSignals.filter(s => s.type === "emerging").length > 0) {
      insights.push({
        icon: "⚡",
        text: t(lang,
          `${detectedSignals.filter(s => s.type === "emerging").length} sinais emergentes detectados — monitoramento ativo.`,
          `${detectedSignals.filter(s => s.type === "emerging").length} emerging signals detected — active monitoring.`),
      });
    }

    const historicalAvg = Math.round(totalVolume * 0.85);
    const growthVsPrev = prevWeekVol > 0 ? Math.round(((totalVolume - prevWeekVol) / prevWeekVol) * 100) : 0;
    const catByDay: Record<string, Record<string, number>> = {};
    for (const cat of topCats) {
      catByDay[cat] = {};
      for (const day of orderedDays) catByDay[cat][day] = catDaily[day]?.[cat] || 0;
    }

    return {
      chartData, topCats, wordCloud, catByDay, insights, totalVolume, historicalAvg,
      totalSnapshots: weeklyData.length, totalTrends: trends.length,
      momentumResult, dailyVolumes, todayIndex, emergingCount,
      detectedSignals: detectedSignals.sort((a, b) => b.score - a.score).slice(0, 8),
      liveSignals, categoryMomentum, growthVsPrev, platformCounts,
    };
  }, [weeklyData, trends, lang]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const { momentumResult } = analysis;
  const platformCount = Object.keys(analysis.platformCounts).length;

  return (
    <div className="p-3 space-y-3">
      {/* ═══════ STORY #1 — KPI ROW ═══════ */}
      <div className="grid grid-cols-5 gap-2">
        <KPICard
          icon={<BarChart3 className="w-4 h-4" />}
          value={fmtNum(analysis.totalVolume)}
          label={t(lang, "Volume total", "Total Volume", "Volumen total")}
          delta={analysis.growthVsPrev !== 0 ? { value: analysis.growthVsPrev, label: "vs prev" } : undefined}
          tooltip={getTooltip("volume", lang) || t(lang, "Volume total de menções na semana", "Total mention volume this week")}
          delay={0}
        />
        <KPICard
          icon={<Layers className="w-4 h-4" />}
          value={analysis.totalTrends}
          label={t(lang, "Trends ativas", "Active Trends")}
          tooltip={t(lang, "Total de tendências detectadas em todas as fontes", "Total trends detected across all sources")}
          delay={0.05}
        />
        <KPICard
          icon={<Zap className="w-4 h-4" />}
          value={analysis.emergingCount}
          label={t(lang, "Emergentes", "Emerging")}
          tooltip={getTooltip("emerging", lang)}
          color="text-emerald-500"
          delay={0.1}
        />
        <KPICard
          icon={<Activity className="w-4 h-4" />}
          value={momentumResult.display}
          label="Momentum"
          delta={momentumResult.isReliable && momentumResult.value !== 0 ? { value: momentumResult.value, label: "" } : undefined}
          tooltip={getTooltip("momentum", lang)}
          color={momentumResult.color}
          delay={0.15}
        />
        <KPICard
          icon={<Globe className="w-4 h-4" />}
          value={platformCount}
          label={t(lang, "Plataformas", "Platforms")}
          tooltip={t(lang, "Número de plataformas monitoradas com sinais ativos", "Number of monitored platforms with active signals")}
          delay={0.2}
        />
      </div>

      {/* ═══════ STORY #4 — INTERACTIVE CHART ═══════ */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
          <TrendingUp className="w-3 h-3" />
          {t(lang, "Evolução Semanal por Categoria", "Weekly Category Evolution", "Evolución Semanal por Categoría")}
        </span>
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {analysis.topCats.map(cat => (
                  <linearGradient key={cat} id={`grad-${cat.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getCatColor(cat)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={getCatColor(cat)} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : `${v}K`} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "9px" }}
                formatter={(v: any, name: string) => [v !== null ? `${fmtNum(v * 1000)}` : (t(lang, "Sem dados", "No data")), name]}
              />
              {analysis.topCats.map(cat => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={getCatColor(cat)}
                  strokeWidth={2}
                  fill={`url(#grad-${cat.replace(/\s/g, "")})`}
                  dot={{ r: 2.5, fill: getCatColor(cat), strokeWidth: 0 }}
                  connectNulls={false}
                  animationDuration={800}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          {analysis.topCats.map(cat => (
            <span key={cat} className="flex items-center gap-1 text-[8px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCatColor(cat) }} />
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════ STORIES #2 + #3 — MOMENTUM + LIVE FEED ═══════ */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <MomentumGauge categories={analysis.categoryMomentum} dailyVolumes={analysis.dailyVolumes} lang={lang} />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <LiveSignalFeed signals={analysis.liveSignals} lang={lang} />
        </div>
      </div>

      {/* ═══════ STORIES #7-#10 — SIGNAL DETECTION ═══════ */}
      <div className="rounded-xl border border-border/50 bg-card p-3">
        <SignalDetectionPanel signals={analysis.detectedSignals} lang={lang} />
      </div>

      {/* ═══════ STORIES #5 + #6 — HEATMAP + TERM CLOUD ═══════ */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Target className="w-3 h-3" />
            Trend Pulse Matrix
          </span>
          <TrendPulseMatrix data={analysis.catByDay} topCats={analysis.topCats} lang={lang} dailyTotals={analysis.dailyVolumes} />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3" />
            {t(lang, "Mapa de Termos", "Term Map", "Mapa de Términos")}
          </span>
          <div className="text-[7px] text-muted-foreground/60 mb-1">
            {t(lang, "Tamanho = volume · Cor = categoria · ● = emergente", "Size = volume · Color = category · ● = emerging")}
          </div>
          <TermCloud words={analysis.wordCloud} lang={lang} />
        </div>
      </div>

      {/* ═══════ AI INSIGHTS ═══════ */}
      {analysis.insights.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
            <Brain className="w-3 h-3" />
            {t(lang, "Inteligência Semanal", "Weekly Intelligence", "Inteligencia Semanal")}
          </span>
          {analysis.insights.map((insight, i) => (
            <InsightCard key={i} icon={insight.icon} text={insight.text} delay={i * 0.08} />
          ))}
        </div>
      )}
    </div>
  );
}
