import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, TrendingUp, BarChart3, Clock, ExternalLink,
  Share2, MapPin, Layers, ChevronRight, Zap, Activity, AlertTriangle, ArrowUpRight
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { useTrends } from "@/hooks/use-trends";
import { useTranslatedTrends } from "@/hooks/use-translated-trends";
import { FilterState } from "@/components/FilterBar";
import SparklineArea from "@/components/SparklineArea";
import { countryCodeToFlag } from "@/lib/shared-utils";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { toast } from "@/hooks/use-toast";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

/* ─── SIGNAL INTELLIGENCE ─── */
function computeTVI(vol: string | undefined, change: string | undefined, sources?: string[]): number {
  const v = parseFloat((vol || "0").replace(/[^0-9.]/g, ""));
  const c = Math.abs(parseFloat((change || "0").replace(/[^0-9.-]/g, "")));
  const s = (sources?.length || 1) * 5;
  return Math.max(0, Math.min(100, Math.round(v / 500 + c * 1.2 + s)));
}

function getLifecycle(change: string | undefined, sparkData?: number[]): { label: string; labelEn: string; color: string; icon: string; desc: string; descEn: string } {
  const c = parseFloat((change || "0").replace(/[^0-9.-]/g, ""));
  const spark = sparkData || [];
  if (spark.length >= 4) {
    const last = spark[spark.length - 1];
    const mid = spark[Math.floor(spark.length / 2)];
    const first = spark[0];
    if (last > mid && mid > first && c > 20)
      return { label: "Acelerando", labelEn: "Accelerating", color: "var(--color-high)", icon: "🚀", desc: "Sinal ganhando velocidade rapidamente em múltiplas fontes.", descEn: "Signal gaining speed rapidly across multiple sources." };
    if (last >= mid * 0.95 && c > 5)
      return { label: "Pico", labelEn: "Peaking", color: "var(--color-critical)", icon: "🔥", desc: "Sinal no ponto máximo de intensidade. Monitorar evolução.", descEn: "Signal at peak intensity. Monitor evolution." };
    if (last < mid && last < first * 0.8)
      return { label: "Declínio", labelEn: "Declining", color: "var(--color-neutral)", icon: "📉", desc: "Sinal perdendo intensidade. Pode estar se estabilizando.", descEn: "Signal losing intensity. May be stabilizing." };
  }
  if (c > 40) return { label: "Acelerando", labelEn: "Accelerating", color: "var(--color-high)", icon: "🚀", desc: "Crescimento acelerado detectado.", descEn: "Accelerated growth detected." };
  if (c > 10) return { label: "Emergente", labelEn: "Emerging", color: "var(--color-positive)", icon: "🌱", desc: "Sinal em fase inicial de crescimento.", descEn: "Signal in early growth phase." };
  if (c > 0) return { label: "Estável", labelEn: "Stable", color: "var(--color-neutral)", icon: "➡️", desc: "Sinal estável sem variação significativa.", descEn: "Stable signal without significant change." };
  return { label: "Declínio", labelEn: "Declining", color: "var(--color-neutral)", icon: "📉", desc: "Sinal em redução de intensidade.", descEn: "Signal decreasing in intensity." };
}

function getTVITier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Viral", color: "var(--color-critical)" };
  if (score >= 50) return { label: "High", color: "var(--color-high)" };
  if (score >= 25) return { label: "Moderate", color: "var(--color-moderate)" };
  return { label: "Low", color: "var(--color-neutral)" };
}

/* ─── TVI RADIAL GAUGE ─── */
const TVIRadialGauge = ({ score, size = 96 }: { score: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tier = getTVITier(score);
  return (
    <div className="tvi-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={4} opacity={0.25} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`hsl(${tier.color})`} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color: `hsl(${tier.color})` }}>{score}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: `hsl(${tier.color})` }}>{tier.label}</span>
      </div>
    </div>
  );
};

const TopicPage = () => {
  const { lang } = useLanguage();
  const en = lang === "en";
  const [params] = useSearchParams();
  const topicTitle = params.get("title") || "";
  const topicPlatform = params.get("platform") || "";

  const [, setTrendCounts] = useState<Record<string, number>>({});
  const { filteredTrends: rawTrends } = useTrends(defaultFilters, setTrendCounts, lang);
  const { translatedTrends } = useTranslatedTrends(rawTrends, lang);

  const topic = useMemo(() => {
    return translatedTrends.find(t =>
      t.title.toLowerCase().includes(topicTitle.toLowerCase().slice(0, 30))
    );
  }, [translatedTrends, topicTitle]);

  const relatedTopics = useMemo(() => {
    if (!topic) return [];
    const seen = new Set<string>();
    seen.add(topic.title.toLowerCase().slice(0, 30));
    return translatedTrends
      .filter(t => {
        const key = t.title.toLowerCase().slice(0, 30);
        if (seen.has(key)) return false;
        return t.category === topic.category || t.platform === topic.platform || t.countryCode === topic.countryCode;
      })
      .slice(0, 8)
      .map(t => { seen.add(t.title.toLowerCase().slice(0, 30)); return t; });
  }, [translatedTrends, topic]);

  const geoDistribution = useMemo(() => {
    if (!topic) return [];
    const titleWords = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const countryMap = new Map<string, { code: string; count: number; volume: number }>();
    translatedTrends.forEach(t => {
      if (!t.countryCode) return;
      const matches = titleWords.some(w => t.title.toLowerCase().includes(w));
      if (matches || t.category === topic.category) {
        const existing = countryMap.get(t.countryCode) || { code: t.countryCode, count: 0, volume: 0 };
        existing.count++;
        existing.volume += parseFloat(t.volume?.replace(/[^0-9.]/g, "") || "0");
        countryMap.set(t.countryCode, existing);
      }
    });
    return Array.from(countryMap.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [translatedTrends, topic]);

  const crossPlatformSignals = useMemo(() => {
    if (!topic) return [];
    const titleWords = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return translatedTrends
      .filter(t => {
        if (t.title === topic.title && t.platform === topic.platform) return false;
        return titleWords.some(w => t.title.toLowerCase().includes(w));
      })
      .slice(0, 6);
  }, [translatedTrends, topic]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: topicTitle, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: en ? "Link copied" : "Link copiado" });
    }
  };

  if (!topicTitle) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">{en ? "No topic selected" : "Nenhum tópico selecionado"}</p>
        </div>
      </div>
    );
  }

  const change = topic?.change ? parseFloat(topic.change.replace(/[^0-9.-]/g, "")) : 0;
  const isPositive = topic?.changePositive ?? change > 0;
  const flag = topic?.countryCode ? countryCodeToFlag(topic.countryCode) : null;
  const tvi = computeTVI(topic?.volume, topic?.change, topic?.sources);
  const tviTier = getTVITier(tvi);
  const lifecycle = getLifecycle(topic?.change, topic?.sparkData);

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <AppHeader />

      {/* ═══════════════════ INTELLIGENCE BRIEFING HERO ═══════════════════ */}
      <section className="briefing-header relative px-4 sm:px-6 md:px-8 lg:px-12 pt-6 md:pt-8 pb-8 md:pb-10 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mb-6">
          <Link to="/" className="hover:text-foreground transition-colors compact-link">{en ? "Explore" : "Descobrir"}</Link>
          <ChevronRight className="w-3 h-3" />
          {topic?.category && (
            <>
              <span>{topic.category}</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground/80 font-medium truncate max-w-[200px]">{topicTitle}</span>
        </motion.nav>

        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
          <Link to="/" className="compact-link inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/60 hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            {en ? "Back to Explore" : "Voltar à Descoberta"}
          </Link>

          <div className="flex flex-col md:flex-row md:items-start gap-8 md:gap-10">
            {/* TVI Gauge — dominant visual */}
            <div className="shrink-0 flex flex-col items-center gap-2.5">
              <TVIRadialGauge score={tvi} size={108} />
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold">Trend Velocity Index</span>
            </div>

            {/* Title + meta */}
            <div className="space-y-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/8 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {topic?.platform || topicPlatform}
                </span>
                {topic?.category && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground/70 text-[10px] font-medium">{topic.category}</span>
                )}
                {flag && <span className="text-sm">{flag}</span>}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: `hsl(${lifecycle.color} / 0.08)`, color: `hsl(${lifecycle.color})` }}
                >
                  {lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}
                </span>
              </div>
              <h1 className="font-bold tracking-[-0.025em] leading-[1.08] text-foreground" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.75rem)' }}>
                {topicTitle}
              </h1>
              {topic?.description && (
                <p className="text-muted-foreground/70 text-[14px] md:text-[15px] leading-relaxed max-w-2xl">{topic.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleShare} className="compact-btn flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary/50 text-muted-foreground text-[11px] font-medium hover:bg-secondary hover:text-foreground transition-all">
                  <Share2 className="w-3 h-3" />
                  {en ? "Share" : "Compartilhar"}
                </button>
                {topic?.sourceUrl && (
                  <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="compact-btn flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground text-background text-[11px] font-semibold hover:opacity-90 transition-all">
                    <ExternalLink className="w-3 h-3" />
                    {en ? "Source" : "Fonte"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 pb-10 max-w-[1200px] mx-auto w-full space-y-6 md:space-y-8">
        {/* ═══════════════════ SIGNAL METRICS STRIP ═══════════════════ */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BarChart3, label: en ? "Volume" : "Volume", value: topic?.volume || "—", color: null },
            { icon: TrendingUp, label: en ? "Change" : "Variação", value: topic?.change ? `${isPositive ? "+" : ""}${topic.change}` : "—", color: isPositive ? "var(--color-positive)" : "var(--color-critical)" },
            { icon: Globe, label: en ? "Region" : "Região", value: topic?.countryCode?.toUpperCase() || "Global", color: null },
            { icon: Activity, label: en ? "Stage" : "Fase", value: `${lifecycle.icon} ${en ? lifecycle.labelEn : lifecycle.label}`, color: lifecycle.color },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="intelligence-module p-4 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">{metric.label}</span>
                </div>
                <p className={cn("text-[20px] sm:text-[24px] font-bold leading-none tabular-nums", !metric.color && "text-foreground")}
                  style={metric.color ? { color: `hsl(${metric.color})` } : undefined}
                >
                  {metric.value}
                </p>
              </div>
            );
          })}
        </motion.div>

        {/* ═══════════════════ EVOLUTION CHART ═══════════════════ */}
        {topic?.historicalData && topic.historicalData.length > 0 && (
          <motion.section custom={2} variants={fadeUp} initial="hidden" animate="visible" className="intelligence-module p-5 md:p-6">
            <h2 className="text-[13px] font-semibold text-foreground mb-5 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
              {en ? "24h Signal Evolution" : "Evolução do Sinal 24h"}
            </h2>
            <div className="h-[200px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={topic.historicalData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="topicGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11, boxShadow: "var(--shadow-md)" }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#topicGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        {/* ═══════════════════ MOMENTUM + CROSS-PLATFORM ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topic?.sparkData && topic.sparkData.length > 0 && (
            <motion.section custom={3} variants={fadeUp} initial="hidden" animate="visible" className="intelligence-module p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/50" />
                {en ? "Momentum Indicator" : "Indicador de Momentum"}
              </h2>
              <div className="h-[80px]">
                <SparklineArea
                  data={topic.sparkData}
                  color={isPositive ? "hsl(var(--color-positive))" : "hsl(var(--color-critical))"}
                  height={80}
                  width={500}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/50 mt-3 leading-relaxed">
                {en ? lifecycle.descEn : lifecycle.desc}
              </p>
            </motion.section>
          )}

          {crossPlatformSignals.length > 0 && (
            <motion.section custom={4} variants={fadeUp} initial="hidden" animate="visible" className="intelligence-module p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-3.5 h-3.5 text-muted-foreground/50" />
                <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                  {en ? "Cross-Platform Signals" : "Sinais Cross-Platform"}
                </h2>
              </div>
              <div className="space-y-0.5">
                {crossPlatformSignals.map((sig, i) => (
                  <Link
                    key={i}
                    to={`/topic?title=${encodeURIComponent(sig.title)}&platform=${encodeURIComponent(sig.platform)}`}
                    className="compact-link flex items-center justify-between py-2.5 border-b border-border/15 last:border-0 hover:bg-secondary/20 -mx-2 px-2 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-primary/80 shrink-0">{sig.platform}</span>
                      <span className="text-[11px] text-foreground/80 truncate">{sig.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {sig.change && (
                        <span className={cn("text-[10px] font-semibold tabular-nums", sig.changePositive ? "text-[hsl(var(--color-positive))]" : "text-[hsl(var(--color-critical))]")}>
                          {sig.changePositive ? "+" : ""}{sig.change}
                        </span>
                      )}
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* ═══════════════════ GEO + RELATED ═══════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 intelligence-module p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/50" />
              <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                {en ? "Geographic Distribution" : "Distribuição Geográfica"}
              </h2>
            </div>
            {geoDistribution.length > 0 ? (
              <div className="space-y-3">
                {geoDistribution.map((geo) => {
                  const maxCount = geoDistribution[0]?.count || 1;
                  const pct = Math.round((geo.count / maxCount) * 100);
                  return (
                    <div key={geo.code} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground/80 flex items-center gap-1.5">
                          <span>{countryCodeToFlag(geo.code)}</span>
                          {geo.code.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums">{geo.count} {en ? "signals" : "sinais"}</span>
                      </div>
                      <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.2 }} className="h-full bg-primary/40 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground/50">{en ? "No geographic data available" : "Sem dados geográficos disponíveis"}</p>
            )}
          </motion.section>

          <motion.section custom={6} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 intelligence-module p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-3.5 h-3.5 text-muted-foreground/50" />
              <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                {en ? "Related Topic Clusters" : "Clusters de Tópicos Relacionados"}
              </h2>
            </div>
            {relatedTopics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedTopics.map((rt, i) => (
                  <Link
                    key={i}
                    to={`/topic?title=${encodeURIComponent(rt.title)}&platform=${encodeURIComponent(rt.platform)}`}
                    className="compact-link group flex items-start gap-3 p-3 rounded-lg border border-border/20 hover:border-border/50 hover:bg-secondary/15 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground/80 leading-snug line-clamp-2 group-hover:text-primary transition-colors">{rt.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-primary/70 font-medium">{rt.platform}</span>
                        {rt.volume && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-border/50" />
                            <span className="text-[10px] text-muted-foreground/50 tabular-nums">{rt.volume}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {rt.sparkData && rt.sparkData.length > 0 && (
                      <div className="w-[48px] h-[24px] shrink-0 opacity-30 group-hover:opacity-60 transition-opacity">
                        <SparklineArea data={rt.sparkData} color={rt.changePositive ? "hsl(var(--color-positive))" : "hsl(var(--color-critical))"} height={24} width={48} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground/50">{en ? "No related topics found" : "Nenhum tópico relacionado encontrado"}</p>
            )}
          </motion.section>
        </div>

        {/* ═══════════════════ ANALYTICAL CONTEXT ═══════════════════ */}
        <motion.section custom={7} variants={fadeUp} initial="hidden" animate="visible" className="intelligence-module p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-3.5 h-3.5 text-primary/60" />
            <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
              {en ? "Intelligence Summary" : "Resumo de Inteligência"}
            </h2>
          </div>
          <div className="text-foreground/80 text-[14px] leading-[1.7] space-y-4 max-w-3xl">
            {topic?.details ? (
              <p>{topic.details}</p>
            ) : (
              <>
                <p className="text-[15px] font-medium leading-[1.6]">
                  {en
                    ? `This signal registers a TVI score of ${tvi}/100 (${tviTier.label}), indicating ${tvi >= 50 ? 'significant cross-platform resonance' : 'moderate attention'} across the information ecosystem.`
                    : `Este sinal registra um score TVI de ${tvi}/100 (${tviTier.label}), indicando ${tvi >= 50 ? 'ressonância significativa cross-platform' : 'atenção moderada'} no ecossistema de informação.`}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-1">{en ? "Lifecycle" : "Ciclo de vida"}</p>
                    <p className="text-[13px] font-semibold" style={{ color: `hsl(${lifecycle.color})` }}>{lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{en ? lifecycle.descEn : lifecycle.desc}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-1">{en ? "Cross-platform" : "Cross-platform"}</p>
                    <p className="text-[13px] font-semibold text-foreground">{crossPlatformSignals.length} {en ? "related signals" : "sinais relacionados"}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{en ? "From other sources" : "De outras fontes"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-1">{en ? "Geography" : "Geografia"}</p>
                    <p className="text-[13px] font-semibold text-foreground">{geoDistribution.length} {en ? "regions" : "regiões"}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{en ? "Signal diffusion" : "Difusão do sinal"}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-5 pt-3 border-t border-border/15">
            <p className="text-[10px] text-muted-foreground/30 leading-relaxed flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {en
                ? "This analysis is generated from public data signals and does not constitute a recommendation. Always verify with primary sources."
                : "Esta análise é gerada a partir de sinais de dados públicos e não constitui uma recomendação. Sempre verifique com fontes primárias."}
            </p>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-border/20 px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/30">© {new Date().getFullYear()} Global Talk Trend</p>
          <Link to="/metodologia" className="compact-link text-[10px] text-muted-foreground/30 hover:text-foreground transition-colors">{en ? "Methodology" : "Metodologia"}</Link>
        </div>
      </footer>
    </div>
  );
};

export default TopicPage;
