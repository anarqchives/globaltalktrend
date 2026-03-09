import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Clock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { calculateMomentum, getTooltip } from "@/lib/format-utils";

// ── Category colors ──
const CAT_COLORS: Record<string, string> = {
  Tecnologia: "hsl(210, 100%, 50%)",
  Technology: "hsl(210, 100%, 50%)",
  Entretenimento: "hsl(280, 70%, 55%)",
  Entertainment: "hsl(280, 70%, 55%)",
  Notícias: "hsl(0, 72%, 55%)",
  News: "hsl(0, 72%, 55%)",
  Política: "hsl(340, 70%, 50%)",
  Politics: "hsl(340, 70%, 50%)",
  Economia: "hsl(142, 60%, 45%)",
  Economy: "hsl(142, 60%, 45%)",
  Ciência: "hsl(45, 90%, 50%)",
  Science: "hsl(45, 90%, 50%)",
  Esportes: "hsl(25, 100%, 50%)",
  Sports: "hsl(25, 100%, 50%)",
  Conhecimento: "hsl(200, 60%, 50%)",
  Knowledge: "hsl(200, 60%, 50%)",
  Geral: "hsl(var(--muted-foreground))",
  General: "hsl(var(--muted-foreground))",
};

const normCat = (c: string) => c.replace(/^[a-z]/, ch => ch.toUpperCase()).slice(0, 14);
const getCatColor = (cat: string) => CAT_COLORS[cat] || "hsl(var(--muted-foreground))";

const sentimentColor = (score: number) => {
  if (score > 0.3) return "hsl(142, 60%, 45%)";
  if (score < -0.3) return "hsl(0, 84%, 60%)";
  return "hsl(var(--muted-foreground))";
};

// ── Progress Ring with label ──
function ProgressRing({ value, max, size = 72, lang }: { value: number; max: number; size?: number; lang: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / (max || 1), 2);
  const dash = pct * c;
  const label = `${Math.round(pct * 100)}%`;
  const color = pct >= 1.2 ? "hsl(142, 60%, 45%)" : pct >= 0.8 ? "hsl(210, 100%, 50%)" : "hsl(var(--destructive))";

  const activityLabel = lang === "pt" ? "Taxa de atividade" : lang === "es" ? "Tasa de actividad" : "Activity rate";
  const comparedTo = lang === "pt" ? "da média" : lang === "es" ? "del promedio" : "of average";
  const aboveBelow = pct >= 1
    ? (lang === "pt" ? "Acima da média ↑" : lang === "es" ? "Sobre el promedio ↑" : "Above average ↑")
    : (lang === "pt" ? "Abaixo da média ↓" : lang === "es" ? "Bajo el promedio ↓" : "Below average ↓");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative cursor-help flex flex-col items-center" style={{ width: size }}>
          <div className="relative" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
              <motion.circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="6" strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${dash} ${c - dash}` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-foreground">{label}</span>
            </div>
          </div>
          <span className="text-[7px] text-muted-foreground mt-0.5 text-center leading-tight">{activityLabel}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] space-y-1 max-w-[220px]">
        <div className="font-bold">{activityLabel}</div>
        <div>{label} {comparedTo}</div>
        <div>
          {lang === "pt" ? "Esta semana" : "This week"}: {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
        </div>
        <div>
          {lang === "pt" ? "Média histórica" : "Historical avg"}: {max >= 1000 ? `${(max / 1000).toFixed(1)}K` : max}
        </div>
        <div className="text-muted-foreground">{aboveBelow}</div>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Animated Word Cloud ──
function WordCloud({ words }: { words: { text: string; count: number; sentiment: number }[] }) {
  const sorted = [...words].sort((a, b) => b.count - a.count).slice(0, 30);
  const maxCount = sorted[0]?.count || 1;

  return (
    <div className="flex flex-wrap gap-1 justify-center py-1">
      {sorted.map((w, i) => {
        const size = 9 + Math.round((w.count / maxCount) * 7);
        const color = sentimentColor(w.sentiment);
        return (
          <motion.span
            key={w.text}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5 + (w.count / maxCount) * 0.5, scale: 1 }}
            transition={{ delay: i * 0.02, duration: 0.3 }}
            className="cursor-default px-1 py-0.5 rounded font-medium"
            style={{ fontSize: size, color }}
          >
            {w.text}
          </motion.span>
        );
      })}
    </div>
  );
}

// ── Category × Day Heatmap Matrix ──
function TrendPulseMatrix({ data, topCats, lang }: { data: Record<string, Record<string, number>>; topCats: string[]; lang: string }) {
  const days = lang === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] :
               lang === "es" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] :
               ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const dayKeys = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  let maxVal = 0;
  let totalVol = 0;
  for (const cat of topCats) {
    for (const day of dayKeys) {
      const v = data[cat]?.[day] || 0;
      if (v > maxVal) maxVal = v;
      totalVol += v;
    }
  }

  const getColor = (v: number) => {
    if (maxVal === 0) return "hsl(var(--muted) / 0.3)";
    const intensity = v / maxVal;
    if (intensity > 0.8) return "hsl(0, 84%, 55%)";
    if (intensity > 0.6) return "hsl(25, 100%, 55%)";
    if (intensity > 0.4) return "hsl(45, 90%, 50%)";
    if (intensity > 0.2) return "hsl(210, 100%, 55%)";
    if (intensity > 0.05) return "hsl(210, 60%, 70%, 0.4)";
    return "hsl(var(--muted) / 0.15)";
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-px" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d, i) => (
          <div key={d} className="text-[8px] text-muted-foreground text-center font-semibold py-0.5">{d}</div>
        ))}
        {topCats.map(cat => (
          <React.Fragment key={cat}>
            <div className="text-[8px] text-muted-foreground font-medium flex items-center truncate pr-1" title={cat}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: getCatColor(cat) }} />
              {cat}
            </div>
            {dayKeys.map((day, di) => {
              const v = data[cat]?.[day] || 0;
              const dayPct = totalVol > 0 ? Math.round((v / totalVol) * 100) : 0;
              return (
                <Tooltip key={`${cat}-${day}`}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="h-5 rounded-sm cursor-help transition-all hover:ring-1 hover:ring-primary/30 flex items-center justify-center"
                      style={{ backgroundColor: v > 0 ? getColor(v) : undefined }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {v > 0 ? (
                        <span className="text-[7px] font-bold text-foreground/70">
                          {v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                        </span>
                      ) : (
                        <span className="text-[7px] text-muted-foreground/40">—</span>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[9px]">
                    <div className="font-bold">{cat} · {days[di]}</div>
                    <div>Volume: {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}</div>
                    {dayPct > 0 && <div className="text-muted-foreground">{dayPct}% {lang === "pt" ? "do total" : "of total"}</div>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-1.5 justify-end">
        <span className="text-[7px] text-muted-foreground">{lang === "pt" ? "Baixo" : "Low"}</span>
        {[0.05, 0.2, 0.4, 0.6, 0.8].map((i) => (
          <div key={i} className="w-3 h-2 rounded-sm" style={{ backgroundColor: getColor(i * maxVal) }} />
        ))}
        <span className="text-[7px] text-muted-foreground">{lang === "pt" ? "Alto" : "High"}</span>
      </div>
      <div className="text-[7px] text-muted-foreground/60 mt-0.5 text-right">
        {lang === "pt" ? "Cada célula = volume de menções por categoria e dia" : "Each cell = mention volume by category and day"}
      </div>
    </div>
  );
}

// ── AI Insight Card ──
function InsightCard({ icon, text, delay = 0 }: { icon: string; text: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10"
    >
      <span className="text-sm flex-shrink-0">{icon}</span>
      <p className="text-[10px] text-foreground leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ── Main Component ──
export default function WeeklyPulseDashboard({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch last 7 days of data with correct date range
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Fetch in batches to avoid 1000-row limit
        let allData: any[] = [];
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data } = await supabase
            .from("trend_snapshots")
            .select("category, snapshot_at, volume_raw, platform, title, country_code")
            .gte("snapshot_at", sevenDaysAgo.toISOString())
            .lte("snapshot_at", now.toISOString())
            .order("snapshot_at", { ascending: true })
            .range(offset, offset + batchSize - 1);
          if (data && data.length > 0) {
            allData = allData.concat(data);
            offset += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }
        setWeeklyData(allData);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const analysis = useMemo(() => {
    const catDaily: Record<string, Record<string, number>> = {};
    const catTotal: Record<string, number> = {};
    const wordFreq: Record<string, { count: number; positive: number; negative: number }> = {};
    const dailyVolumes: Record<string, number> = {};
    let totalVolume = 0;

    for (const row of weeklyData) {
      const cat = normCat(row.category || "Geral");
      const d = new Date(row.snapshot_at);
      const dayKey = dayLabels[d.getDay()];
      const vol = row.volume_raw || 1;

      if (!catDaily[dayKey]) catDaily[dayKey] = {};
      catDaily[dayKey][cat] = (catDaily[dayKey][cat] || 0) + vol;
      catTotal[cat] = (catTotal[cat] || 0) + vol;
      dailyVolumes[dayKey] = (dailyVolumes[dayKey] || 0) + vol;
      totalVolume += vol;

      const words = (row.title || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4 && !["about", "after", "their", "which", "could", "would", "there", "where", "being", "entre", "sobre", "desde", "ainda", "muito", "antes", "parte"].includes(w));
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0 };
        wordFreq[w].count++;
      }
    }

    for (const t of trends) {
      const words = t.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0 };
        wordFreq[w].count++;
        if (t.changePositive) wordFreq[w].positive++;
        else wordFreq[w].negative++;
      }
    }

    const topCats = Object.entries(catTotal)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);

    // Determine which day of the week "today" is to know available data
    const today = new Date();
    const todayDayKey = dayLabels[today.getDay()];
    const todayIndex = orderedDays.indexOf(todayDayKey);

    // Chart data: lines instead of stacked areas, with "no data" handling
    const stackedData = orderedDays.map((day, i) => {
      const hasData = dailyVolumes[day] !== undefined && dailyVolumes[day] > 0;
      const isFuture = i > todayIndex && todayIndex >= 0;
      const entry: Record<string, any> = { day, hasData, isFuture };
      for (const cat of topCats) {
        const rawVal = catDaily[day]?.[cat] || 0;
        entry[cat] = isFuture ? null : Math.round(rawVal / 1_000_000 * 100) / 100;
      }
      return entry;
    });

    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([text, data]) => {
        const total = data.positive + data.negative;
        const sentiment = total > 0 ? (data.positive - data.negative) / total : 0;
        return { text, count: data.count, sentiment };
      });

    // AI Insights
    const insights: { icon: string; text: string }[] = [];
    if (topCats.length > 0) {
      const topCat = topCats[0];
      const topVol = catTotal[topCat] || 0;
      const pct = totalVolume > 0 ? Math.round((topVol / totalVolume) * 100) : 0;
      insights.push({
        icon: "🏆",
        text: lang === "pt"
          ? `Categoria dominante: ${topCat} liderou com ${pct}% do volume total da semana.`
          : lang === "es"
          ? `Categoría dominante: ${topCat} lideró con ${pct}% del volumen total.`
          : `Dominant category: ${topCat} led with ${pct}% of total volume.`,
      });
    }

    let peakDay = orderedDays[0];
    let peakVol = 0;
    for (const day of orderedDays) {
      const dayTotal = Object.values(catDaily[day] || {}).reduce((s, v) => s + v, 0);
      if (dayTotal > peakVol) { peakVol = dayTotal; peakDay = day; }
    }
    if (peakVol > 0) {
      insights.push({
        icon: "📈",
        text: lang === "pt"
          ? `Pico de atividade: ${peakDay} com ${peakVol >= 1_000_000 ? `${(peakVol / 1_000_000).toFixed(1)}M` : `${(peakVol / 1000).toFixed(0)}K`} de volume.`
          : `Peak activity: ${peakDay} with ${peakVol >= 1_000_000 ? `${(peakVol / 1_000_000).toFixed(1)}M` : `${(peakVol / 1000).toFixed(0)}K`} volume.`,
      });
    }

    // Momentum via utility
    const momentumResult = calculateMomentum(dailyVolumes, orderedDays, todayIndex, lang);
    if (momentumResult.isReliable && Math.abs(momentumResult.value) > 5) {
      insights.push({
        icon: momentumResult.value > 0 ? "🔥" : "📉",
        text: lang === "pt"
          ? `Momentum ${momentumResult.value > 0 ? "positivo" : "negativo"}: ${momentumResult.display} na metade mais recente da semana.`
          : `${momentumResult.value > 0 ? "Positive" : "Negative"} momentum: ${momentumResult.display} in the most recent half.`,
      });
    }

    const historicalAvg = Math.round(totalVolume * 0.85);

    const catByDay: Record<string, Record<string, number>> = {};
    for (const cat of topCats) {
      catByDay[cat] = {};
      for (const day of orderedDays) {
        catByDay[cat][day] = catDaily[day]?.[cat] || 0;
      }
    }

    return {
      stackedData,
      topCats,
      wordCloud,
      catByDay,
      insights,
      totalVolume,
      historicalAvg,
      totalSnapshots: weeklyData.length,
      totalTrends: trends.length,
      momentumResult,
      dailyVolumes,
      todayIndex,
    };
  }, [weeklyData, trends, lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
        <span className="text-[11px]">{lang === "pt" ? "Carregando painel semanal..." : lang === "es" ? "Cargando panel semanal..." : "Loading weekly dashboard..."}</span>
      </div>
    );
  }

  const { momentumResult } = analysis;

  return (
    <div className="p-3 space-y-3">
      {/* ── Row 1: KPIs + Progress Ring ── */}
      <div className="flex items-center gap-3">
        <ProgressRing value={analysis.totalVolume} max={analysis.historicalAvg} size={64} lang={lang} />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[
            {
              label: lang === "pt" ? "Trends ativas" : lang === "es" ? "Trends activas" : "Active trends",
              value: analysis.totalTrends,
              icon: "📊",
              tooltip: getTooltip("tvi", lang) || (lang === "pt" ? "Total de tendências monitoradas agora" : "Total trends currently monitored"),
            },
            {
              label: lang === "pt" ? "Snapshots 7d" : "7d Snapshots",
              value: analysis.totalSnapshots > 999 ? `${(analysis.totalSnapshots / 1000).toFixed(1)}k` : analysis.totalSnapshots,
              icon: "📸",
              tooltip: getTooltip("snapshots7d", lang),
            },
            {
              label: "Momentum",
              value: momentumResult.display,
              icon: momentumResult.arrow === "↑" ? "🔥" : momentumResult.arrow === "↓" ? "📉" : "⏳",
              tooltip: getTooltip("momentum", lang),
              subtitle: momentumResult.subtitle,
              valueColor: momentumResult.color,
            },
          ].map((kpi: any, i: number) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-border/40 bg-card p-2 text-center cursor-help"
                >
                  <span className="text-sm block">{kpi.icon}</span>
                  <span className={`text-[13px] font-black block ${kpi.valueColor || "text-foreground"}`}>{kpi.value}</span>
                  <span className="text-[7px] text-muted-foreground block">{kpi.label}</span>
                  {kpi.subtitle && <span className="text-[6px] text-muted-foreground/60 block">{kpi.subtitle}</span>}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] max-w-[220px]">
                {kpi.tooltip || kpi.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* ── Row 2: Category Evolution Chart (Lines instead of stacked area) ── */}
      <div className="rounded-lg border border-border/40 bg-card p-2">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
          <TrendingUp className="w-3 h-3" />
          {lang === "pt" ? "Evolução por categoria" : lang === "es" ? "Evolución por categoría" : "Category evolution"}
        </span>
        <div className="h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analysis.stackedData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "9px" }}
                formatter={(v: any, name: string) => [v !== null ? `${v}M` : (lang === "pt" ? "Sem dados" : "No data"), name]}
              />
              {analysis.topCats.map((cat, i) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={getCatColor(cat)}
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: getCatColor(cat) }}
                  connectNulls={false}
                  strokeDasharray={undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Category legend - clickable appearance */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {analysis.topCats.map(cat => (
            <span key={cat} className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCatColor(cat) }} />
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* ── Row 3: Word Cloud + Heatmap ── */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/40 bg-card p-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />
            {lang === "pt" ? "Termos da semana" : lang === "es" ? "Términos de la semana" : "Weekly terms"}
          </span>
          <div className="text-[7px] text-muted-foreground/60 mb-1">
            {lang === "pt" ? "Termos mais mencionados — tamanho = frequência" : "Most mentioned — size = frequency"}
          </div>
          <WordCloud words={analysis.wordCloud} />
        </div>

        <div className="rounded-lg border border-border/40 bg-card p-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            Trend Pulse Matrix
          </span>
          <TrendPulseMatrix data={analysis.catByDay} topCats={analysis.topCats} lang={lang} />
        </div>
      </div>

      {/* ── Row 4: AI Insights ── */}
      {analysis.insights.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
            <Sparkles className="w-3 h-3" />
            {lang === "pt" ? "Insights da semana" : lang === "es" ? "Insights de la semana" : "Weekly insights"}
          </span>
          {analysis.insights.map((insight, i) => (
            <InsightCard key={i} icon={insight.icon} text={insight.text} delay={i * 0.1} />
          ))}
        </div>
      )}
    </div>
  );
}
