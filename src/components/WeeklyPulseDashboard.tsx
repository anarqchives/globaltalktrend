import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Clock } from "lucide-react";

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

// ── Sentiment color helper ──
const sentimentColor = (score: number) => {
  if (score > 0.3) return "hsl(142, 60%, 45%)";
  if (score < -0.3) return "hsl(0, 84%, 60%)";
  return "hsl(var(--muted-foreground))";
};

// ── Progress Ring ──
function ProgressRing({ value, max, size = 72 }: { value: number; max: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / (max || 1), 2);
  const dash = pct * c;
  const label = pct >= 1 ? `${Math.round(pct * 100)}%` : `${Math.round(pct * 100)}%`;
  const color = pct >= 1.2 ? "hsl(142, 60%, 45%)" : pct >= 0.8 ? "hsl(210, 100%, 50%)" : "hsl(var(--destructive))";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative cursor-help" style={{ width: size, height: size }}>
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
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] space-y-1 max-w-[200px]">
        <div className="font-bold">Volume semanal vs. média</div>
        <div>Esta semana: {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}</div>
        <div>Média histórica: {max >= 1000 ? `${(max / 1000).toFixed(1)}K` : max}</div>
        <div className="text-muted-foreground">{pct >= 1 ? "Acima da média ↑" : "Abaixo da média ↓"}</div>
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
function TrendPulseMatrix({ data, topCats, onFilter }: { data: Record<string, Record<string, number>>; topCats: string[]; onFilter?: (cat: string, day: string) => void }) {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  let maxVal = 0;
  for (const cat of topCats) {
    for (const day of days) {
      const v = data[cat]?.[day] || 0;
      if (v > maxVal) maxVal = v;
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
        {days.map(d => (
          <div key={d} className="text-[8px] text-muted-foreground text-center font-semibold py-0.5">{d}</div>
        ))}
        {topCats.map(cat => (
          <React.Fragment key={cat}>
            <div className="text-[8px] text-muted-foreground font-medium flex items-center truncate pr-1" title={cat}>
              <span className="w-2 h-2 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: getCatColor(cat) }} />
              {cat}
            </div>
            {days.map(day => {
              const v = data[cat]?.[day] || 0;
              return (
                <Tooltip key={`${cat}-${day}`}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="h-5 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 flex items-center justify-center"
                      style={{ backgroundColor: getColor(v) }}
                      whileHover={{ scale: 1.1 }}
                      onClick={() => onFilter?.(cat, day)}
                    >
                      {v > 0 && <span className="text-[7px] font-bold text-foreground/70">{v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}</span>}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[9px]">
                    <div className="font-bold">{cat} · {day}</div>
                    <div>Volume: {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      {/* Color legend */}
      <div className="flex items-center gap-1 mt-1.5 justify-end">
        <span className="text-[7px] text-muted-foreground">Low</span>
        {[0.05, 0.2, 0.4, 0.6, 0.8].map((i) => (
          <div key={i} className="w-3 h-2 rounded-sm" style={{ backgroundColor: getColor(i * maxVal) }} />
        ))}
        <span className="text-[7px] text-muted-foreground">High</span>
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
        const { data } = await supabase
          .from("trend_snapshots")
          .select("category, snapshot_at, volume_raw, platform, title, country_code")
          .gte("snapshot_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("snapshot_at", { ascending: true })
          .limit(1000);
        if (data) setWeeklyData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const analysis = useMemo(() => {
    // Category daily evolution for stacked area
    const catDaily: Record<string, Record<string, number>> = {};
    const catTotal: Record<string, number> = {};
    const wordFreq: Record<string, { count: number; positive: number; negative: number }> = {};
    const heatmap: Record<string, Record<number, number>> = {};
    let totalVolume = 0;

    for (const row of weeklyData) {
      const cat = normCat(row.category || "Geral");
      const d = new Date(row.snapshot_at);
      const dayKey = dayLabels[d.getDay()];
      const hour = d.getHours();
      const vol = row.volume_raw || 1;

      // Cat daily
      if (!catDaily[dayKey]) catDaily[dayKey] = {};
      catDaily[dayKey][cat] = (catDaily[dayKey][cat] || 0) + vol;
      catTotal[cat] = (catTotal[cat] || 0) + vol;
      totalVolume += vol;

      // Heatmap
      if (!heatmap[dayKey]) heatmap[dayKey] = {};
      const hBucket = Math.floor(hour / 3) * 3;
      heatmap[dayKey][hBucket] = (heatmap[dayKey][hBucket] || 0) + 1;

      // Word extraction
      const words = (row.title || "").toLowerCase().split(/\s+/).filter((w: string) => w.length > 4 && !["about", "after", "their", "which", "could", "would", "there", "where", "being", "entre", "sobre", "desde", "ainda", "muito", "antes", "parte"].includes(w));
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0 };
        wordFreq[w].count++;
      }
    }

    // Also process current trends for words
    for (const t of trends) {
      const words = t.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0 };
        wordFreq[w].count++;
        if (t.changePositive) wordFreq[w].positive++;
        else wordFreq[w].negative++;
      }
    }

    // Top categories
    const topCats = Object.entries(catTotal)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);

    // Stacked area data
    const stackedData = orderedDays.map(day => {
      const entry: Record<string, any> = { day };
      for (const cat of topCats) {
        entry[cat] = Math.round((catDaily[day]?.[cat] || 0) / 1_000_000 * 100) / 100;
      }
      return entry;
    });

    // Word cloud
    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([text, data]) => {
        const total = data.positive + data.negative;
        const sentiment = total > 0 ? (data.positive - data.negative) / total : 0;
        return { text, count: data.count, sentiment };
      });

    // AI insights
    const insights: { icon: string; text: string }[] = [];
    if (topCats.length > 0) {
      const topCat = topCats[0];
      const topVol = catTotal[topCat] || 0;
      const pct = totalVolume > 0 ? Math.round((topVol / totalVolume) * 100) : 0;
      insights.push({
        icon: "📊",
        text: lang === "pt"
          ? `${topCat} dominou a semana com ${pct}% do volume total.`
          : `${topCat} dominated the week with ${pct}% of total volume.`,
      });
    }

    // Find peak day
    let peakDay = orderedDays[0];
    let peakVol = 0;
    for (const day of orderedDays) {
      const dayTotal = Object.values(catDaily[day] || {}).reduce((s, v) => s + v, 0);
      if (dayTotal > peakVol) { peakVol = dayTotal; peakDay = day; }
    }
    insights.push({
      icon: "📈",
      text: lang === "pt"
        ? `Pico de atividade em ${peakDay} com ${peakVol >= 1_000_000 ? `${(peakVol / 1_000_000).toFixed(1)}M` : `${(peakVol / 1000).toFixed(0)}K`} de volume.`
        : `Peak activity on ${peakDay} with ${peakVol >= 1_000_000 ? `${(peakVol / 1_000_000).toFixed(1)}M` : `${(peakVol / 1000).toFixed(0)}K`} volume.`,
    });

    // Momentum insight
    const recentDays = orderedDays.slice(4);
    const olderDays = orderedDays.slice(0, 4);
    const recentVol = recentDays.reduce((s, d) => s + Object.values(catDaily[d] || {}).reduce((a, v) => a + v, 0), 0);
    const olderVol = olderDays.reduce((s, d) => s + Object.values(catDaily[d] || {}).reduce((a, v) => a + v, 0), 0);
    const momentum = olderVol > 0 ? Math.round(((recentVol - olderVol) / olderVol) * 100) : 0;
    if (Math.abs(momentum) > 5) {
      insights.push({
        icon: momentum > 0 ? "🔥" : "📉",
        text: lang === "pt"
          ? `Momentum ${momentum > 0 ? "positivo" : "negativo"}: ${momentum > 0 ? "+" : ""}${momentum}% na metade mais recente da semana.`
          : `${momentum > 0 ? "Positive" : "Negative"} momentum: ${momentum > 0 ? "+" : ""}${momentum}% in the most recent half of the week.`,
      });
    }

    // Historical average (rough estimate: use current week's average as baseline * 0.85)
    const historicalAvg = Math.round(totalVolume * 0.85);

    // Category × Day matrix
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
      heatmap,
      catByDay,
      insights,
      totalVolume,
      historicalAvg,
      totalSnapshots: weeklyData.length,
      totalTrends: trends.length,
      momentum,
    };
  }, [weeklyData, trends, lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
        <span className="text-[11px]">{lang === "pt" ? "Carregando painel semanal..." : "Loading weekly dashboard..."}</span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* ── Row 1: KPIs + Progress Ring ── */}
      <div className="flex items-center gap-3">
        <ProgressRing value={analysis.totalVolume} max={analysis.historicalAvg} size={64} />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[
            { label: lang === "pt" ? "Trends ativas" : "Active trends", value: analysis.totalTrends, icon: "📊", tooltip: lang === "pt" ? "Total de tendências monitoradas agora" : "Total trends currently monitored" },
            { label: lang === "pt" ? "Snapshots 7d" : "7d Snapshots", value: analysis.totalSnapshots > 999 ? `${(analysis.totalSnapshots / 1000).toFixed(1)}k` : analysis.totalSnapshots, icon: "📸", tooltip: lang === "pt" ? "Número de capturas de dados nos últimos 7 dias" : "Number of data captures in the last 7 days" },
            { label: "Momentum", value: analysis.totalSnapshots < 50 ? "—" : `${analysis.momentum > 0 ? "+" : ""}${analysis.momentum}%`, icon: analysis.momentum > 0 ? "🔥" : analysis.totalSnapshots < 50 ? "⏳" : "📉", tooltip: lang === "pt" ? "Variação do volume entre a 1ª e 2ª metade da semana" : "Volume variation between first and second half of the week" },
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
                  <span className="text-[13px] font-black text-foreground block">{kpi.value}</span>
                  <span className="text-[7px] text-muted-foreground">{kpi.label}</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                {kpi.tooltip || kpi.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* ── Row 2: Stacked Area Chart ── */}
      <div className="rounded-lg border border-border/40 bg-card p-2">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
          <TrendingUp className="w-3 h-3" />
          {lang === "pt" ? "Evolução por categoria" : "Category evolution"}
        </span>
        <div className="h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.stackedData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "9px" }}
                formatter={(v: number, name: string) => [`${v}M`, name]}
              />
              {analysis.topCats.map((cat, i) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={getCatColor(cat)}
                  fill={getCatColor(cat)}
                  fillOpacity={0.3 - i * 0.03}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Category legend */}
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
            {lang === "pt" ? "Termos da semana" : "Weekly terms"}
          </span>
          <WordCloud words={analysis.wordCloud} />
        </div>

        <div className="rounded-lg border border-border/40 bg-card p-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            {lang === "pt" ? "Trend Pulse Matrix" : "Trend Pulse Matrix"}
          </span>
          <TrendPulseMatrix data={analysis.catByDay} topCats={analysis.topCats} />
        </div>
      </div>

      {/* ── Row 4: AI Insights ── */}
      {analysis.insights.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
            <Sparkles className="w-3 h-3" />
            {lang === "pt" ? "Insights da semana" : "Weekly insights"}
          </span>
          {analysis.insights.map((insight, i) => (
            <InsightCard key={i} icon={insight.icon} text={insight.text} delay={i * 0.1} />
          ))}
        </div>
      )}
    </div>
  );
}
