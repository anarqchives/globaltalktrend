import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip as RTooltip, CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, TrendingUp, ArrowUp, ArrowDown, Minus, Activity,
  Zap, BarChart3, Radio, AlertTriangle, Flame, Target,
  Globe, Layers, Brain, MapPin, GitBranch, Orbit, Timer, Eye,
  ChevronLeft, RefreshCw, Clock, Search,
} from "lucide-react";
import { calculateMomentum, getTooltip, resolveSource } from "@/lib/format-utils";

/* ─── Design tokens ─── */
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
const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n));
const t = (lang: string, pt: string, en: string, es?: string) =>
  lang === "pt" ? pt : lang === "es" ? (es || en) : en;

const REGION_MAP: Record<string, string> = {
  US: "Americas", BR: "Americas", CA: "Americas", MX: "Americas", AR: "Americas", CL: "Americas", CO: "Americas",
  GB: "Europe", DE: "Europe", FR: "Europe", IT: "Europe", ES: "Europe", PT: "Europe", NL: "Europe", SE: "Europe", PL: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", ID: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", SG: "Asia",
  AU: "Oceania", NZ: "Oceania",
  ZA: "Africa", NG: "Africa", KE: "Africa", EG: "Africa",
  AE: "Middle East", SA: "Middle East", IL: "Middle East", TR: "Middle East", PS: "Middle East",
  RU: "Eurasia", UA: "Eurasia",
};
const getRegion = (code?: string) => (code ? REGION_MAP[code.toUpperCase()] : null) || "Global";
const LIFECYCLE_LABELS: Record<string, Record<string, string>> = {
  emerging: { pt: "Emergente", en: "Emerging", es: "Emergente" },
  accelerating: { pt: "Acelerando", en: "Accelerating", es: "Acelerando" },
  peak: { pt: "Pico", en: "Peak", es: "Pico" },
  declining: { pt: "Declínio", en: "Declining", es: "Declive" },
};
const LIFECYCLE_COLORS: Record<string, string> = {
  emerging: "text-emerald-500", accelerating: "text-amber-500", peak: "text-red-500", declining: "text-muted-foreground",
};
const LIFECYCLE_ICONS: Record<string, string> = {
  emerging: "🌱", accelerating: "🚀", peak: "🔥", declining: "📉",
};

/* ─── Types ─── */
interface DetectedSignal {
  term: string;
  type: "emerging" | "viral" | "anomaly";
  score: number;
  volume: number;
  growth: number;
  platforms: string[];
  reason: string;
  prediction?: { direction: "up" | "stable" | "down"; confidence: number };
  lifecycle: string;
  category: string;
}

interface NarrativeCluster {
  id: string;
  label: string;
  terms: string[];
  volume: number;
  category: string;
  momentum: number;
  platforms: string[];
  lifecycle: string;
}

/* ══════════════════════════════════════════════════════════════════════════
 * KPI Card
 * ══════════════════════════════════════════════════════════════════════════ */
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
          className="rounded-xl border border-border/50 bg-card p-2.5 cursor-help hover:border-primary/20 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground group-hover:text-primary/70 transition-colors">{icon}</span>
            {delta && (
              <span className={`flex items-center gap-0.5 text-[9px] font-semibold ${deltaColor}`}>
                <DeltaIcon className="w-2.5 h-2.5" />
                {delta.value > 0 ? "+" : ""}{delta.value}%
              </span>
            )}
          </div>
          <div className={`text-base font-black leading-none ${color || "text-foreground"}`}>{value}</div>
          <div className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px] max-w-[240px]">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Momentum Gauge
 * ══════════════════════════════════════════════════════════════════════════ */
function MomentumGauge({ categories, lang }: {
  categories: { name: string; volumes: Record<string, number> }[];
  lang: string;
}) {
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Activity className="w-3 h-3" />
        {t(lang, "Momentum por Categoria", "Category Momentum", "Momentum por Categoría")}
      </span>
      {categories.slice(0, 5).map((cat, i) => {
        const vals = orderedDays.map(d => cat.volumes[d] || 0);
        const firstHalf = vals.slice(0, Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
        const secondHalf = vals.slice(Math.ceil(vals.length / 2)).reduce((a, b) => a + b, 0);
        const momentum = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : secondHalf > 0 ? 100 : 0;
        const barWidth = Math.min(Math.max(Math.abs(momentum), 5), 100);
        return (
          <motion.div key={cat.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCatColor(cat.name) }} />
            <span className="text-[9px] text-foreground w-20 truncate font-medium">{cat.name}</span>
            <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: momentum >= 0 ? "hsl(142, 60%, 45%)" : "hsl(0, 84%, 60%)" }}
                initial={{ width: 0 }} animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.6, delay: i * 0.08 }} />
            </div>
            <span className={`text-[9px] font-bold w-11 text-right ${momentum > 0 ? "text-emerald-500" : momentum < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {momentum > 0 ? "+" : ""}{momentum}%
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Live Signal Feed
 * ══════════════════════════════════════════════════════════════════════════ */
function LiveSignalFeed({ signals, lang }: {
  signals: { term: string; category: string; volume: number; momentum: number; platform: string; time: string; lifecycle: string }[];
  lang: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
        {t(lang, "Feed de Sinais ao Vivo", "Live Signal Feed", "Feed de Señales en Vivo")}
      </span>
      <ScrollArea className="h-[120px]">
        <AnimatePresence mode="popLayout">
          {signals.slice(0, 10).map((sig, i) => {
            const src = resolveSource(sig.platform);
            const lcColor = LIFECYCLE_COLORS[sig.lifecycle] || "text-muted-foreground";
            const lcIcon = LIFECYCLE_ICONS[sig.lifecycle] || "📊";
            return (
              <motion.div key={`${sig.term}-${i}`} initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/20 last:border-0">
                <span className="text-xs flex-shrink-0">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-foreground truncate">{sig.term}</div>
                  <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-muted/50 text-[7px]">{sig.category}</span>
                    <span>{fmtNum(sig.volume)}</span>
                    <span className={`text-[7px] ${lcColor}`}>{lcIcon}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-bold flex-shrink-0 ${sig.momentum > 0 ? "text-emerald-500" : sig.momentum < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {sig.momentum > 0 ? "↑" : sig.momentum < 0 ? "↓" : "→"} {Math.abs(sig.momentum)}%
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Heatmap Matrix
 * ══════════════════════════════════════════════════════════════════════════ */
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
    if (i > 0.8) return "hsl(0, 84%, 55%)"; if (i > 0.6) return "hsl(25, 100%, 55%)";
    if (i > 0.4) return "hsl(45, 90%, 50%)"; if (i > 0.2) return "hsl(210, 100%, 55%)";
    if (i > 0.05) return "hsl(210, 60%, 70%, 0.4)"; return "hsl(var(--muted) / 0.15)";
  };
  return (
    <div>
      <div className="grid gap-px" style={{ gridTemplateColumns: `68px repeat(${days.length}, 1fr)` }}>
        <div />{days.map(d => <div key={d} className="text-[7px] text-muted-foreground text-center font-semibold py-0.5">{d}</div>)}
        {topCats.map(cat => (
          <React.Fragment key={cat}>
            <div className="text-[7px] text-muted-foreground font-medium flex items-center truncate pr-1" title={cat}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: getCatColor(cat) }} />{cat}
            </div>
            {dayKeys.map((day, di) => {
              const v = data[cat]?.[day] || 0;
              const dayTotal = dailyTotals[day] || 1;
              const pct = Math.round((v / dayTotal) * 100);
              const prevDay = di > 0 ? dayKeys[di - 1] : null;
              const prevV = prevDay ? (data[cat]?.[prevDay] || 0) : 0;
              const dod = prevV > 0 ? Math.round(((v - prevV) / prevV) * 100) : 0;
              return (
                <Tooltip key={`${cat}-${day}`}><TooltipTrigger asChild>
                  <motion.div className="h-4 rounded-sm cursor-help hover:ring-1 hover:ring-primary/30 flex items-center justify-center"
                    style={{ backgroundColor: v > 0 ? getColor(v) : undefined }} whileHover={{ scale: 1.1 }}>
                    {v > 0 ? <span className="text-[6px] font-bold text-foreground/70">{fmtNum(v)}</span>
                      : <span className="text-[6px] text-muted-foreground/40">—</span>}
                  </motion.div></TooltipTrigger>
                  <TooltipContent side="top" className="text-[9px] space-y-0.5">
                    <div className="font-bold">{cat} · {days[di]}</div>
                    <div>Volume: {fmtNum(v)}</div>
                    {dod !== 0 && <div className={dod > 0 ? "text-emerald-500" : "text-red-500"}>DoD: {dod > 0 ? "+" : ""}{dod}%</div>}
                    {pct > 0 && <div className="text-muted-foreground">{pct}% {t(lang, "do total", "of total", "del total")}</div>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1 justify-end">
        <span className="text-[6px] text-muted-foreground">{t(lang, "Baixo", "Low", "Bajo")}</span>
        {[0.05, 0.2, 0.4, 0.6, 0.8].map(i => <div key={i} className="w-2.5 h-1.5 rounded-sm" style={{ backgroundColor: getColor(i * maxVal) }} />)}
        <span className="text-[6px] text-muted-foreground">{t(lang, "Alto", "High", "Alto")}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Term Cloud with drill-down
 * ══════════════════════════════════════════════════════════════════════════ */
function TermCloud({ words, lang }: {
  words: { text: string; count: number; category: string; momentum: number; relatedTerms: string[] }[];
  lang: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sorted = [...words].sort((a, b) => b.count - a.count).slice(0, 30);
  const maxCount = sorted[0]?.count || 1;
  const selectedWord = sorted.find(w => w.text === selected);

  return (
    <div>
      <div className="flex flex-wrap gap-0.5 justify-center py-1">
        {sorted.map((w, i) => {
          const size = 8 + Math.round((w.count / maxCount) * 7);
          const isNew = w.momentum > 50;
          const isSelected = w.text === selected;
          return (
            <motion.span key={w.text} initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 0.5 + (w.count / maxCount) * 0.5, scale: isSelected ? 1.15 : 1 }}
              transition={{ delay: i * 0.015, duration: 0.25 }}
              onClick={() => setSelected(isSelected ? null : w.text)}
              className={`cursor-pointer px-1 py-0.5 rounded font-medium transition-colors ${isSelected ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted/30"} ${isNew ? "ring-1 ring-emerald-500/20" : ""}`}
              style={{ fontSize: size, color: getCatColor(w.category) }}>
              {w.text}{isNew && <span className="text-[5px] ml-0.5 text-emerald-500">●</span>}
            </motion.span>
          );
        })}
      </div>
      <AnimatePresence>
        {selectedWord && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-1 p-1.5 rounded-lg bg-muted/20 border border-border/30 text-[8px]">
            <div className="font-bold text-foreground mb-0.5">{selectedWord.text}</div>
            <div className="text-muted-foreground">
              {t(lang, "Categoria", "Category", "Categoría")}: {selectedWord.category} · Volume: {fmtNum(selectedWord.count)} ·
              Momentum: {selectedWord.momentum > 0 ? "+" : ""}{selectedWord.momentum}%
            </div>
            {selectedWord.relatedTerms.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {selectedWord.relatedTerms.slice(0, 5).map(rt => (
                  <span key={rt} className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[7px] cursor-pointer hover:bg-primary/20"
                    onClick={() => setSelected(rt)}>{rt}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Narrative Clusters
 * ══════════════════════════════════════════════════════════════════════════ */
function NarrativeClusters({ clusters, lang }: { clusters: NarrativeCluster[]; lang: string }) {
  if (clusters.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <GitBranch className="w-3 h-3" />
        {t(lang, "Clusters Narrativos", "Narrative Clusters", "Clusters Narrativos")}
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold">{clusters.length}</span>
      </span>
      <ScrollArea className="h-[110px]">
        {clusters.map((cluster, i) => {
          const lcLabel = LIFECYCLE_LABELS[cluster.lifecycle]?.[lang] || cluster.lifecycle;
          const lcColor = LIFECYCLE_COLORS[cluster.lifecycle] || "text-muted-foreground";
          const lcIcon = LIFECYCLE_ICONS[cluster.lifecycle] || "📊";
          return (
            <motion.div key={cluster.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg border border-border/30 bg-card/50 p-2 mb-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Orbit className="w-3 h-3 text-primary/60" />
                  <span className="text-[10px] font-bold text-foreground">{cluster.label}</span>
                  <span className="px-1 py-0.5 rounded bg-muted/50 text-[7px] text-muted-foreground">{cluster.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[8px] font-semibold ${lcColor}`}>{lcIcon} {lcLabel}</span>
                  <span className={`text-[8px] font-bold ${cluster.momentum > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {cluster.momentum > 0 ? "+" : ""}{cluster.momentum}%
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-0.5 mb-1">
                {cluster.terms.slice(0, 6).map(term => (
                  <span key={term} className="px-1 py-0.5 rounded bg-primary/5 text-[7px] text-foreground/70">{term}</span>
                ))}
                {cluster.terms.length > 6 && <span className="text-[7px] text-muted-foreground">+{cluster.terms.length - 6}</span>}
              </div>
              <div className="flex items-center gap-2 text-[7px] text-muted-foreground">
                <span>{fmtNum(cluster.volume)} vol</span>
                <span>·</span>
                <div className="flex items-center gap-0.5">
                  {cluster.platforms.slice(0, 4).map(p => <span key={p}>{resolveSource(p).emoji}</span>)}
                  {cluster.platforms.length > 4 && <span>+{cluster.platforms.length - 4}</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Geographic Distribution
 * ══════════════════════════════════════════════════════════════════════════ */
function GeoDistribution({ regions, lang }: {
  regions: { name: string; volume: number; trends: number; topTrend: string }[];
  lang: string;
}) {
  const maxVol = regions[0]?.volume || 1;
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {t(lang, "Distribuição Geográfica", "Geographic Distribution", "Distribución Geográfica")}
      </span>
      {regions.slice(0, 6).map((r, i) => (
        <Tooltip key={r.name}>
          <TooltipTrigger asChild>
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2 cursor-help">
              <span className="text-[9px] text-foreground w-16 truncate font-medium">{r.name}</span>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary/60" initial={{ width: 0 }}
                  animate={{ width: `${(r.volume / maxVol) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06 }} />
              </div>
              <span className="text-[8px] text-muted-foreground font-medium w-8 text-right">{fmtNum(r.volume)}</span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent className="text-[9px]">
            <div className="font-bold">{r.name}</div>
            <div>{r.trends} trends · {fmtNum(r.volume)} vol</div>
            <div className="text-muted-foreground">{t(lang, "Top", "Top")}: {r.topTrend}</div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Lifecycle Overview
 * ══════════════════════════════════════════════════════════════════════════ */
function LifecycleOverview({ counts, lang }: { counts: Record<string, number>; lang: string }) {
  const stages = ["emerging", "accelerating", "peak", "declining"];
  const total = stages.reduce((s, k) => s + (counts[k] || 0), 0) || 1;
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {t(lang, "Ciclo de Vida das Tendências", "Trend Lifecycle", "Ciclo de Vida")}
      </span>
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
        {stages.map(stage => {
          const pct = ((counts[stage] || 0) / total) * 100;
          if (pct === 0) return null;
          const colors: Record<string, string> = { emerging: "bg-emerald-500", accelerating: "bg-amber-500", peak: "bg-red-500", declining: "bg-muted-foreground/40" };
          return <motion.div key={stage} className={`${colors[stage]} h-full`}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
            title={`${LIFECYCLE_LABELS[stage]?.[lang] || stage}: ${counts[stage] || 0}`} />;
        })}
      </div>
      <div className="flex items-center gap-3 justify-center">
        {stages.map(s => (
          <span key={s} className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
            {LIFECYCLE_ICONS[s]} {LIFECYCLE_LABELS[s]?.[lang] || s}: <b>{counts[s] || 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Signal Detection Panel
 * ══════════════════════════════════════════════════════════════════════════ */
function SignalDetectionPanel({ signals, lang }: { signals: DetectedSignal[]; lang: string }) {
  const typeLabels: Record<string, Record<string, string>> = {
    emerging: { pt: "Emergente", en: "Emerging", es: "Emergente" },
    viral: { pt: "Viral", en: "Viral", es: "Viral" },
    anomaly: { pt: "Anomalia", en: "Anomaly", es: "Anomalía" },
  };
  const typeIcons: Record<string, React.ReactNode> = {
    emerging: <Zap className="w-3 h-3 text-emerald-500" />,
    viral: <Flame className="w-3 h-3 text-orange-500" />,
    anomaly: <AlertTriangle className="w-3 h-3 text-red-500" />,
  };
  const predLabel: Record<string, string> = { up: "↑", stable: "→", down: "↓" };
  if (signals.length === 0) return (
    <div className="text-center py-4 text-[9px] text-muted-foreground">
      <Search className="w-4 h-4 mx-auto mb-1 opacity-40" />
      {t(lang, "Nenhum sinal significativo detectado", "No significant signals detected", "Ninguna señal significativa detectada")}
    </div>
  );
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Eye className="w-3 h-3" />
        {t(lang, "Detecção de Sinais", "Signal Detection", "Detección de Señales")}
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[8px] font-bold animate-pulse">
          {signals.length}
        </span>
      </span>
      <ScrollArea className="h-[160px]">
        {signals.map((sig, i) => {
          const lcColor = LIFECYCLE_COLORS[sig.lifecycle] || "text-muted-foreground";
          return (
            <motion.div key={`${sig.term}-${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-2 rounded-lg border border-border/30 bg-card/50 mb-1.5 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  {typeIcons[sig.type]}
                  <span className="text-[10px] font-bold text-foreground">{sig.term}</span>
                  <span className={`text-[7px] px-1 py-0.5 rounded-full font-semibold ${sig.type === "emerging" ? "bg-emerald-500/10 text-emerald-600" : sig.type === "viral" ? "bg-orange-500/10 text-orange-600" : "bg-red-500/10 text-red-600"}`}>
                    {typeLabels[sig.type]?.[lang] || sig.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[7px] ${lcColor}`}>{LIFECYCLE_ICONS[sig.lifecycle]}</span>
                  {sig.prediction && (
                    <Tooltip><TooltipTrigger asChild>
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full ${sig.prediction.direction === "up" ? "bg-emerald-500/10 text-emerald-500" : sig.prediction.direction === "down" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
                        {predLabel[sig.prediction.direction]} {sig.prediction.confidence}%
                      </span>
                    </TooltipTrigger>
                      <TooltipContent className="text-[9px]">{t(lang, `Previsão 24-48h · Confiança: ${sig.prediction.confidence}%`, `24-48h prediction · Confidence: ${sig.prediction.confidence}%`)}</TooltipContent>
                    </Tooltip>
                  )}
                  <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full ${sig.score >= 70 ? "bg-red-500 text-white" : sig.score >= 50 ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {sig.score}
                  </span>
                </div>
              </div>
              <div className="text-[7px] text-muted-foreground leading-relaxed">{sig.reason}</div>
              <div className="flex items-center gap-2 mt-0.5 text-[7px] text-muted-foreground">
                <span>{fmtNum(sig.volume)}</span>
                <span className={sig.growth > 0 ? "text-emerald-500" : "text-red-500"}>{sig.growth > 0 ? "+" : ""}{sig.growth}%</span>
                <span>{sig.platforms.slice(0, 3).map(p => resolveSource(p).emoji).join("")}</span>
                <span className="text-muted-foreground/60">{sig.category}</span>
              </div>
            </motion.div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Story #2 — 24h Drill-Down Chart
 * ══════════════════════════════════════════════════════════════════════════ */
function HourlyDrillDown({ dayKey, dayLabel, hourlyData, topCats, lang, onClose }: {
  dayKey: string; dayLabel: string;
  hourlyData: Record<string, Record<string, number>>;
  topCats: string[]; lang: string; onClose: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}h`);
  let maxHourVal = 0;
  const chartData = hours.map(h => {
    const entry: Record<string, any> = { hour: h };
    let hourTotal = 0;
    for (const cat of topCats) {
      const v = hourlyData[h]?.[cat] || 0;
      entry[cat] = v;
      hourTotal += v;
    }
    entry.total = hourTotal;
    if (hourTotal > maxHourVal) maxHourVal = hourTotal;
    return entry;
  });

  // Find spike hours (>2x average)
  const avgHourVol = chartData.reduce((s, d) => s + (d.total || 0), 0) / 24;
  const spikeHours = chartData.filter(d => d.total > avgHourVol * 2).map(d => d.hour);

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border border-primary/20 bg-card p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={onClose} className="p-0.5 rounded hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-foreground">
            {t(lang, `Drill-down 24h · ${dayLabel}`, `24h Drill-down · ${dayLabel}`)}
          </span>
        </div>
        {spikeHours.length > 0 && (
          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5" />
            {spikeHours.length} {t(lang, "picos", "spikes", "picos")}
          </span>
        )}
      </div>
      <div className="h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hour" tick={{ fontSize: 6, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
              interval={2} />
            <YAxis tick={{ fontSize: 6, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => fmtNum(v)} />
            <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "9px" }}
              formatter={(v: any, name: string) => [fmtNum(Number(v)), name]} />
            {topCats.map(cat => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={getCatColor(cat)} radius={0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {spikeHours.length > 0 && (
        <div className="text-[7px] text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
          {t(lang, "Picos detectados em", "Spikes detected at", "Picos detectados en")}: {spikeHours.join(", ")}
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * AI Insight Card
 * ══════════════════════════════════════════════════════════════════════════ */
function InsightCard({ icon, text, delay = 0 }: { icon: string; text: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
      <span className="text-sm flex-shrink-0">{icon}</span>
      <p className="text-[9px] text-foreground leading-relaxed">{text}</p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════════════════ */
export default function WeeklyPulseDashboard({ trends }: { trends: TrendCardProps[] }) {
  const { lang } = useLanguage();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDownDay, setDrillDownDay] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
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
        if (data && data.length > 0) { allData = allData.concat(data); offset += batchSize; hasMore = data.length === batchSize; }
        else { hasMore = false; }
      }
      setWeeklyData(allData);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchData();
    refreshTimerRef.current = setInterval(fetchData, 5 * 60 * 1000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [fetchData]);

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const orderedDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  /* ══════════════════════════════════════════════════════════════════════════
   * MASTER ANALYSIS PIPELINE
   * ══════════════════════════════════════════════════════════════════════════ */
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
    const titleCountries: Record<string, Set<string>> = {};
    const regionVolumes: Record<string, { volume: number; trends: Set<string>; topTitle: string; topVol: number }> = {};
    // Hourly data for drill-down
    const hourlyByCatByDay: Record<string, Record<string, Record<string, number>>> = {};
    let totalVolume = 0;
    let emergingCount = 0;

    const prevWeekVol = weeklyData.length > 0 ? Math.round(weeklyData.length * 0.85 * (weeklyData[0]?.volume_raw || 1)) : 0;
    const stopWords = new Set(["about", "after", "their", "which", "could", "would", "there", "where", "being", "entre", "sobre", "desde", "ainda", "muito", "antes", "parte", "todos", "quando", "other", "first", "these", "those", "under", "every", "right", "great"]);

    for (const row of weeklyData) {
      const cat = normCat(row.category || "Geral");
      const d = new Date(row.snapshot_at);
      const dayKey = dayLabels[d.getDay()];
      const hourKey = `${String(d.getHours()).padStart(2, "0")}h`;
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

      // Hourly drill-down data
      if (!hourlyByCatByDay[dayKey]) hourlyByCatByDay[dayKey] = {};
      if (!hourlyByCatByDay[dayKey][hourKey]) hourlyByCatByDay[dayKey][hourKey] = {};
      hourlyByCatByDay[dayKey][hourKey][cat] = (hourlyByCatByDay[dayKey][hourKey][cat] || 0) + vol;

      if (!titlePlatforms[titleKey]) titlePlatforms[titleKey] = new Set();
      titlePlatforms[titleKey].add(row.platform);
      titleVolumes[titleKey] = (titleVolumes[titleKey] || 0) + vol;
      if (!titleGrowth[titleKey]) titleGrowth[titleKey] = [];
      titleGrowth[titleKey].push(change);
      titleCats[titleKey] = cat;
      if (!titleCountries[titleKey]) titleCountries[titleKey] = new Set();
      if (row.country_code) titleCountries[titleKey].add(row.country_code);

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
    const parseVol = (v: string | number) => typeof v === "string" ? parseInt(v.replace(/[^0-9]/g, "")) || 0 : (v || 0);
    for (const tr of trends) {
      const words = tr.title.toLowerCase().split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w));
      const cat = normCat(tr.category || "Geral");
      for (const w of words) {
        if (!wordFreq[w]) wordFreq[w] = { count: 0, positive: 0, negative: 0, cats: {} };
        wordFreq[w].count++;
        wordFreq[w].cats[cat] = (wordFreq[w].cats[cat] || 0) + 1;
        if (tr.changePositive) wordFreq[w].positive++;
        else wordFreq[w].negative++;
      }
    }

    let topCats = Object.entries(catTotal).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
    
    // Fallback: if no weekly snapshot data, derive categories from live trends
    if (topCats.length === 0 && trends.length > 0) {
      const trendCatCounts: Record<string, number> = {};
      for (const tr of trends) {
        const cat = normCat(tr.category || "Geral");
        trendCatCounts[cat] = (trendCatCounts[cat] || 0) + 1;
      }
      topCats = Object.entries(trendCatCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
      // Populate catDaily with today's data from trends
      const todayKey = dayLabels[new Date().getDay()];
      if (!catDaily[todayKey]) catDaily[todayKey] = {};
      for (const tr of trends) {
        const cat = normCat(tr.category || "Geral");
        const vol = parseVol(tr.volume);
        catDaily[todayKey][cat] = (catDaily[todayKey][cat] || 0) + vol;
        catTotal[cat] = (catTotal[cat] || 0) + vol;
        dailyVolumes[todayKey] = (dailyVolumes[todayKey] || 0) + vol;
        totalVolume += vol;
      }
    }

    const today = new Date();
    const todayDayKey = dayLabels[today.getDay()];
    const todayIndex = orderedDays.indexOf(todayDayKey);

    // Chart data
    const chartData = orderedDays.map((day, i) => {
      const isFuture = i > todayIndex && todayIndex >= 0;
      const entry: Record<string, any> = { day, isFuture, _dayKey: day };
      for (const cat of topCats) {
        entry[cat] = isFuture ? null : Math.round((catDaily[day]?.[cat] || 0) / 1000);
      }
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

    // Signal detection
    const detectedSignals: DetectedSignal[] = [];
    const titleEntries = Object.entries(titleVolumes).sort((a, b) => b[1] - a[1]).slice(0, 100);

    for (const [titleKey, vol] of titleEntries) {
      const growths = titleGrowth[titleKey] || [];
      const avgGrowth = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
      const platforms = titlePlatforms[titleKey] || new Set();
      const platformCount = platforms.size;
      const displayTitle = titleKey.charAt(0).toUpperCase() + titleKey.slice(1, 40);
      const cat = titleCats[titleKey] || "Geral";
      const lifecycle = classifyLifecycle(growths, vol);
      lifecycleCounts[lifecycle] = (lifecycleCounts[lifecycle] || 0) + 1;

      const volScore = Math.min(vol / 10000, 1) * 30;
      const growthScore = Math.min(Math.abs(avgGrowth) / 500, 1) * 30;
      const spreadScore = Math.min(platformCount / 5, 1) * 20;
      const velScore = Math.min(growths.length / 20, 1) * 20;
      const viralScore = Math.round(volScore + growthScore + spreadScore + velScore);

      const predDirection: "up" | "stable" | "down" = avgGrowth > 30 ? "up" : avgGrowth < -20 ? "down" : "stable";
      const predConfidence = Math.min(Math.round(50 + platformCount * 10 + Math.min(growths.length, 10) * 2), 95);

      if (avgGrowth > 80 && vol > 500) {
        detectedSignals.push({
          term: displayTitle, type: "emerging", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms], lifecycle, category: cat,
          reason: t(lang,
            `Crescimento de ${Math.round(avgGrowth)}% em ${platformCount} plataforma(s). Velocidade acima do normal.`,
            `${Math.round(avgGrowth)}% growth across ${platformCount} platform(s). Above-normal velocity.`,
            `Crecimiento de ${Math.round(avgGrowth)}% en ${platformCount} plataforma(s).`),
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      } else if (viralScore >= 65 && platformCount >= 2) {
        detectedSignals.push({
          term: displayTitle, type: "viral", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms], lifecycle, category: cat,
          reason: t(lang,
            `Score viral ${viralScore}/100. Presente em ${platformCount} plataformas.`,
            `Viral score ${viralScore}/100. Present on ${platformCount} platforms.`,
            `Score viral ${viralScore}/100. Presente en ${platformCount} plataformas.`),
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      } else if (Math.abs(avgGrowth) > 200 || (platformCount >= 4 && vol > 1000)) {
        detectedSignals.push({
          term: displayTitle, type: "anomaly", score: viralScore, volume: vol,
          growth: Math.round(avgGrowth), platforms: [...platforms], lifecycle, category: cat,
          reason: t(lang,
            `Padrão anômalo: ${platformCount >= 4 ? `${platformCount} plataformas simultâneas` : `variação de ${Math.round(avgGrowth)}%`}.`,
            `Anomalous: ${platformCount >= 4 ? `${platformCount} simultaneous platforms` : `${Math.round(avgGrowth)}% variation`}.`,
            `Patrón anómalo: ${platformCount >= 4 ? `${platformCount} plataformas simultáneas` : `variación de ${Math.round(avgGrowth)}%`}.`),
          prediction: { direction: predDirection, confidence: predConfidence },
        });
      }
    }

    // Narrative clustering
    const titleWords: Record<string, Set<string>> = {};
    for (const [titleKey] of titleEntries) {
      titleWords[titleKey] = new Set(titleKey.split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w)));
    }
    const jaccard = (a: Set<string>, b: Set<string>): number => {
      if (a.size === 0 || b.size === 0) return 0;
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      return inter / (a.size + b.size - inter);
    };

    const clustered = new Set<string>();
    const narrativeClusters: NarrativeCluster[] = [];
    const sortedTitles = titleEntries.map(([k]) => k);

    for (const titleKey of sortedTitles) {
      if (clustered.has(titleKey)) continue;
      const members = [titleKey];
      clustered.add(titleKey);
      const wordsA = titleWords[titleKey];
      if (!wordsA || wordsA.size === 0) continue;

      for (const otherKey of sortedTitles) {
        if (clustered.has(otherKey)) continue;
        const wordsB = titleWords[otherKey];
        if (!wordsB) continue;
        if (jaccard(wordsA, wordsB) >= 0.35) {
          members.push(otherKey);
          clustered.add(otherKey);
        }
      }

      if (members.length >= 2) {
        const clusterVol = members.reduce((s, m) => s + (titleVolumes[m] || 0), 0);
        const clusterGrowths = members.flatMap(m => titleGrowth[m] || []);
        const avgG = clusterGrowths.length > 0 ? clusterGrowths.reduce((a, b) => a + b, 0) / clusterGrowths.length : 0;
        const clusterPlatforms = new Set<string>();
        members.forEach(m => (titlePlatforms[m] || new Set()).forEach(p => clusterPlatforms.add(p)));
        const primaryCat = titleCats[members[0]] || "Geral";
        const lifecycle = classifyLifecycle(clusterGrowths, clusterVol);

        narrativeClusters.push({
          id: members[0],
          label: members[0].charAt(0).toUpperCase() + members[0].slice(1, 35),
          terms: members.map(m => m.slice(0, 25)),
          volume: clusterVol,
          category: primaryCat,
          momentum: Math.round(avgG),
          platforms: [...clusterPlatforms],
          lifecycle,
        });
      }
    }
    narrativeClusters.sort((a, b) => b.volume - a.volume);

    // Word cloud
    const wordCloudRaw = Object.entries(wordFreq).sort((a, b) => b[1].count - a[1].count).slice(0, 40);
    const wordCloud = wordCloudRaw.map(([text, data]) => {
      const topCat = Object.entries(data.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "Geral";
      const total = data.positive + data.negative;
      const momentum = total > 0 ? Math.round((data.positive / total) * 100) : 0;
      const relatedTerms = wordCloudRaw
        .filter(([t2]) => t2 !== text)
        .filter(([, d2]) => Object.keys(data.cats).some(c => d2.cats[c]))
        .slice(0, 5).map(([t2]) => t2);
      return { text, count: data.count, category: topCat, momentum, relatedTerms };
    });

    // Category momentum
    const categoryMomentum = topCats.map(cat => ({
      name: cat,
      volumes: Object.fromEntries(orderedDays.map(d => [d, catDaily[d]?.[cat] || 0])),
    }));

    // Live feed
    const liveSignals = trends
      .sort((a, b) => parseVol(b.volume) - parseVol(a.volume))
      .slice(0, 12)
      .map(tr => {
        const changeNum = typeof tr.change === "string" ? parseInt(tr.change.replace(/[^-\d]/g, "")) || 0 : 0;
        const lifecycle = changeNum > 100 ? "accelerating" : changeNum > 30 ? "emerging" : changeNum < -20 ? "declining" : "peak";
        return {
          term: tr.title.slice(0, 40),
          category: normCat(tr.category || "Geral"),
          volume: parseVol(tr.volume),
          momentum: changeNum,
          platform: tr.platform || "web",
          time: tr.time || "now",
          lifecycle,
        };
      });

    // Geo
    const geoRegions = Object.entries(regionVolumes)
      .map(([name, data]) => ({
        name, volume: data.volume,
        trends: data.trends.size,
        topTrend: data.topTitle.charAt(0).toUpperCase() + data.topTitle.slice(1),
      }))
      .sort((a, b) => b.volume - a.volume);

    // Insights
    const insights: { icon: string; text: string }[] = [];
    if (topCats.length > 0) {
      const pct = totalVolume > 0 ? Math.round(((catTotal[topCats[0]] || 0) / totalVolume) * 100) : 0;
      insights.push({ icon: "🏆", text: t(lang, `Categoria dominante: ${topCats[0]} (${pct}% do volume).`, `Dominant category: ${topCats[0]} (${pct}% of volume).`, `Categoría dominante: ${topCats[0]} (${pct}% del volumen).`) });
    }
    let peakDay = orderedDays[0], peakVol = 0;
    for (const day of orderedDays) {
      const dayTotal = Object.values(catDaily[day] || {}).reduce((s, v) => s + v, 0);
      if (dayTotal > peakVol) { peakVol = dayTotal; peakDay = day; }
    }
    if (peakVol > 0) insights.push({ icon: "📈", text: t(lang, `Pico de atividade: ${peakDay} (${fmtNum(peakVol)} menções).`, `Peak activity: ${peakDay} (${fmtNum(peakVol)} mentions).`, `Pico de actividad: ${peakDay} (${fmtNum(peakVol)} menciones).`) });

    const momentumResult = calculateMomentum(dailyVolumes, orderedDays, todayIndex, lang);
    if (momentumResult.isReliable && Math.abs(momentumResult.value) > 5) {
      insights.push({ icon: momentumResult.value > 0 ? "🔥" : "📉", text: t(lang, `Momentum semanal: ${momentumResult.display}.`, `Weekly momentum: ${momentumResult.display}.`) });
    }
    const emergingSigs = detectedSignals.filter(s => s.type === "emerging").length;
    const anomalySigs = detectedSignals.filter(s => s.type === "anomaly").length;
    const viralSigs = detectedSignals.filter(s => s.type === "viral").length;
    if (emergingSigs > 0) insights.push({ icon: "⚡", text: t(lang, `${emergingSigs} sinais emergentes detectados com crescimento acima de 80%.`, `${emergingSigs} emerging signals detected with growth above 80%.`) });
    if (viralSigs > 0) insights.push({ icon: "🔥", text: t(lang, `${viralSigs} tendências com potencial viral (score ≥65, multi-plataforma).`, `${viralSigs} trends with viral potential (score ≥65, multi-platform).`) });
    if (anomalySigs > 0) insights.push({ icon: "🔍", text: t(lang, `${anomalySigs} anomalias estatísticas identificadas.`, `${anomalySigs} statistical anomalies identified.`) });
    if (narrativeClusters.length > 0) {
      const topCluster = narrativeClusters[0];
      insights.push({ icon: "🧬", text: t(lang, `Cluster narrativo dominante: "${topCluster.label}" (${topCluster.terms.length} termos, ${fmtNum(topCluster.volume)} vol).`, `Dominant narrative cluster: "${topCluster.label}" (${topCluster.terms.length} terms, ${fmtNum(topCluster.volume)} vol).`) });
    }
    if (geoRegions.length > 1) {
      insights.push({ icon: "🌍", text: t(lang, `Sinais em ${geoRegions.length} regiões. Líder: ${geoRegions[0].name} (${fmtNum(geoRegions[0].volume)}).`, `Signals in ${geoRegions.length} regions. Leader: ${geoRegions[0].name} (${fmtNum(geoRegions[0].volume)}).`) });
    }
    // Lifecycle insight
    const accCount = lifecycleCounts.accelerating || 0;
    const declCount = lifecycleCounts.declining || 0;
    if (accCount > 0 || declCount > 0) {
      insights.push({ icon: "📊", text: t(lang, `Ciclo de vida: ${accCount} tendências acelerando, ${declCount} em declínio.`, `Lifecycle: ${accCount} trends accelerating, ${declCount} declining.`) });
    }

    const growthVsPrev = prevWeekVol > 0 ? Math.round(((totalVolume - prevWeekVol) / prevWeekVol) * 100) : 0;
    const catByDay: Record<string, Record<string, number>> = {};
    for (const cat of topCats) {
      catByDay[cat] = {};
      for (const day of orderedDays) catByDay[cat][day] = catDaily[day]?.[cat] || 0;
    }

    return {
      chartData, topCats, wordCloud, catByDay, insights, totalVolume,
      totalSnapshots: weeklyData.length, totalTrends: trends.length,
      momentumResult, dailyVolumes, todayIndex, emergingCount,
      detectedSignals: detectedSignals.sort((a, b) => b.score - a.score).slice(0, 10),
      liveSignals, categoryMomentum, growthVsPrev, platformCounts,
      narrativeClusters: narrativeClusters.slice(0, 8),
      geoRegions, lifecycleCounts, hourlyByCatByDay,
    };
  }, [weeklyData, trends, lang]);

  // If no weekly data and no trends, show empty state
  const hasAnyData = weeklyData.length > 0 || trends.length > 0;

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-[11px]">{t(lang, "Nenhum dado semanal disponível ainda.", "No weekly data available yet.", "No hay datos semanales disponibles aún.")}</p>
      </div>
    );
  }

  const { momentumResult } = analysis;
  const platformCount = Object.keys(analysis.platformCounts).length;
  const refreshAgo = Math.round((Date.now() - lastRefresh.getTime()) / 60000);

  return (
    <div className="p-2.5 space-y-2.5">
      {/* ═══════ HEADER STATUS BAR ═══════ */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[8px] text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t(lang, "Atualização automática a cada 5 min", "Auto-refresh every 5 min", "Actualización automática cada 5 min")}
          {refreshAgo > 0 && <span className="text-muted-foreground/60">· {refreshAgo}m {t(lang, "atrás", "ago", "hace")}</span>}
        </span>
        <button onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-1 text-[8px] text-primary hover:text-primary/80 transition-colors">
          <RefreshCw className="w-2.5 h-2.5" />
          {t(lang, "Atualizar", "Refresh", "Actualizar")}
        </button>
      </div>

      {/* ═══════ KPI ROW ═══════ */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        <KPICard icon={<BarChart3 className="w-3.5 h-3.5" />}
          value={fmtNum(analysis.totalVolume)}
          label={t(lang, "Volume total", "Total Volume", "Volumen total")}
          delta={analysis.growthVsPrev !== 0 ? { value: analysis.growthVsPrev, label: "" } : undefined}
          tooltip={getTooltip("volume", lang) || t(lang, "Volume total de menções na semana", "Total mention volume this week")}
          delay={0} />
        <KPICard icon={<Layers className="w-3.5 h-3.5" />}
          value={analysis.totalTrends} label={t(lang, "Trends ativas", "Active Trends", "Trends activas")}
          tooltip={t(lang, "Tendências detectadas em todas as fontes", "Trends detected across all sources")} delay={0.04} />
        <KPICard icon={<Zap className="w-3.5 h-3.5" />}
          value={analysis.emergingCount} label={t(lang, "Emergentes", "Emerging", "Emergentes")}
          tooltip={getTooltip("emerging", lang)} color="text-emerald-500" delay={0.08} />
        <KPICard icon={<Activity className="w-3.5 h-3.5" />}
          value={momentumResult.display} label="Momentum"
          delta={momentumResult.isReliable && momentumResult.value !== 0 ? { value: momentumResult.value, label: "" } : undefined}
          tooltip={getTooltip("momentum", lang)} color={momentumResult.color} delay={0.12} />
        <KPICard icon={<Globe className="w-3.5 h-3.5" />}
          value={platformCount} label={t(lang, "Plataformas", "Platforms", "Plataformas")}
          tooltip={t(lang, "Plataformas com sinais ativos", "Platforms with active signals")} delay={0.16} />
      </div>

      {/* ═══════ LIFECYCLE BAR ═══════ */}
      <div className="rounded-xl border border-border/50 bg-card p-2.5">
        <LifecycleOverview counts={analysis.lifecycleCounts} lang={lang} />
      </div>

      {/* ═══════ CHART + 24H DRILL-DOWN ═══════ */}
      <AnimatePresence mode="wait">
        {drillDownDay ? (
          <HourlyDrillDown
            key="drilldown"
            dayKey={drillDownDay}
            dayLabel={drillDownDay}
            hourlyData={analysis.hourlyByCatByDay[drillDownDay] || {}}
            topCats={analysis.topCats}
            lang={lang}
            onClose={() => setDrillDownDay(null)}
          />
        ) : (
          <motion.div key="weekly-chart" className="rounded-xl border border-border/50 bg-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {t(lang, "Evolução Semanal", "Weekly Evolution", "Evolución Semanal")}
              </span>
              <span className="text-[7px] text-muted-foreground/60">
                {t(lang, "Clique em um dia para drill-down 24h", "Click a day for 24h drill-down", "Haga clic en un día para drill-down 24h")}
              </span>
            </div>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analysis.chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e?.activeLabel) setDrillDownDay(e.activeLabel);
                  }}>
                  <defs>
                    {analysis.topCats.map(cat => (
                      <linearGradient key={cat} id={`wg-${cat.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={getCatColor(cat)} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={getCatColor(cat)} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                    cursor="pointer" />
                  <YAxis tick={{ fontSize: 7, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : `${v}K`} />
                  <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "9px" }}
                    formatter={(v: any, name: string) => [v !== null ? fmtNum(v * 1000) : t(lang, "Sem dados", "No data"), name]}
                    labelFormatter={(l: string) => `${l} — ${t(lang, "clique para explorar", "click to explore")}`} />
                  {analysis.topCats.map(cat => (
                    <Area key={cat} type="monotone" dataKey={cat} stroke={getCatColor(cat)} strokeWidth={1.5}
                      fill={`url(#wg-${cat.replace(/\s/g, "")})`} dot={{ r: 2, fill: getCatColor(cat), strokeWidth: 0 }}
                      connectNulls={false} animationDuration={700}
                      style={{ cursor: "pointer" }} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {analysis.topCats.map(cat => (
                <span key={cat} className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCatColor(cat) }} />{cat}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ MOMENTUM + LIVE FEED ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <MomentumGauge categories={analysis.categoryMomentum} lang={lang} />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <LiveSignalFeed signals={analysis.liveSignals} lang={lang} />
        </div>
      </div>

      {/* ═══════ SIGNAL DETECTION ═══════ */}
      <div className="rounded-xl border border-border/50 bg-card p-2.5">
        <SignalDetectionPanel signals={analysis.detectedSignals} lang={lang} />
      </div>

      {/* ═══════ NARRATIVE CLUSTERS + GEO ═══════ */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <NarrativeClusters clusters={analysis.narrativeClusters} lang={lang} />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <GeoDistribution regions={analysis.geoRegions} lang={lang} />
        </div>
      </div>

      {/* ═══════ HEATMAP + TERM CLOUD ═══════ */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Target className="w-3 h-3" />Trend Pulse Matrix
          </span>
          <TrendPulseMatrix data={analysis.catByDay} topCats={analysis.topCats} lang={lang} dailyTotals={analysis.dailyVolumes} />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-2.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />
            {t(lang, "Mapa de Termos", "Term Map", "Mapa de Términos")}
          </span>
          <div className="text-[6px] text-muted-foreground/60 mb-0.5">
            {t(lang, "Tamanho = volume · Cor = categoria · ● = emergente · Clique para explorar", "Size = volume · Color = category · ● = emerging · Click to explore")}
          </div>
          <TermCloud words={analysis.wordCloud} lang={lang} />
        </div>
      </div>

      {/* ═══════ AI INTELLIGENCE SUMMARY ═══════ */}
      {analysis.insights.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 px-1">
            <Brain className="w-3 h-3" />
            {t(lang, "Inteligência Semanal Automatizada", "Automated Weekly Intelligence", "Inteligencia Semanal Automatizada")}
          </span>
          {analysis.insights.map((insight, i) => (
            <InsightCard key={i} icon={insight.icon} text={insight.text} delay={i * 0.06} />
          ))}
        </div>
      )}
    </div>
  );
}
