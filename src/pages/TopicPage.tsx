import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, TrendingUp, BarChart3, Clock, ExternalLink,
  Share2, Bookmark, MapPin, Layers, ChevronRight, Zap, Activity, AlertTriangle
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
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
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

  // Cross-platform signals for this topic
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

      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb */}
        <motion.nav initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">{en ? "Explore" : "Descobrir"}</Link>
          <ChevronRight className="w-3 h-3" />
          {topic?.category && (
            <>
              <span>{topic.category}</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground font-medium truncate max-w-[200px]">{topicTitle}</span>
        </motion.nav>

        {/* ─── HEADER ─── */}
        <motion.header custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            {en ? "Back to Explore" : "Voltar à Descoberta"}
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {topic?.platform || topicPlatform}
                </span>
                {topic?.category && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium">{topic.category}</span>
                )}
                {flag && <span className="text-sm">{flag}</span>}
                {/* Lifecycle badge */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: `hsl(${lifecycle.color} / 0.1)`, color: `hsl(${lifecycle.color})` }}
                >
                  {lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}
                </span>
              </div>
              <h1 className="text-[24px] md:text-[32px] lg:text-[38px] font-bold tracking-tight leading-[1.15] text-foreground">
                {topicTitle}
              </h1>
              {topic?.description && (
                <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed max-w-2xl">{topic.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-secondary/60 text-muted-foreground text-[11px] font-medium hover:bg-secondary hover:text-foreground transition-all">
                <Share2 className="w-3 h-3" />
                {en ? "Share" : "Compartilhar"}
              </button>
              {topic?.sourceUrl && (
                <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground text-background text-[11px] font-semibold hover:opacity-90 transition-all">
                  <ExternalLink className="w-3 h-3" />
                  {en ? "Source" : "Fonte"}
                </a>
              )}
            </div>
          </div>
        </motion.header>

        {/* ─── SIGNAL INTELLIGENCE PANEL ─── */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          {/* TVI Score */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">TVI Score</span>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-[28px] font-bold leading-none" style={{ color: `hsl(${tviTier.color})` }}>{tvi}</p>
              <span className="text-[10px] font-semibold uppercase mb-1" style={{ color: `hsl(${tviTier.color})` }}>{tviTier.label}</span>
            </div>
            <div className="w-full h-[3px] rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${tvi}%`, background: `hsl(${tviTier.color})` }} />
            </div>
          </div>

          {/* Volume */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{en ? "Volume" : "Volume"}</span>
            </div>
            <p className="text-[22px] font-bold leading-none text-foreground">{topic?.volume || "—"}</p>
          </div>

          {/* Change */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{en ? "Change" : "Variação"}</span>
            </div>
            <p className={cn("text-[22px] font-bold leading-none", isPositive ? "text-[hsl(var(--color-positive))]" : "text-[hsl(var(--color-critical))]")}>
              {topic?.change ? `${isPositive ? "+" : ""}${topic.change}` : "—"}
            </p>
          </div>

          {/* Region */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{en ? "Region" : "Região"}</span>
            </div>
            <p className="text-[22px] font-bold leading-none text-foreground">{topic?.countryCode?.toUpperCase() || "Global"}</p>
          </div>

          {/* Lifecycle */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl border border-border/60 bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{en ? "Stage" : "Fase"}</span>
            </div>
            <p className="text-[15px] font-bold leading-snug" style={{ color: `hsl(${lifecycle.color})` }}>
              {lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{en ? lifecycle.descEn : lifecycle.desc}</p>
          </div>
        </motion.div>

        {/* ─── EVOLUTION CHART ─── */}
        {topic?.historicalData && topic.historicalData.length > 0 && (
          <motion.section custom={2} variants={fadeUp} initial="hidden" animate="visible" className="rounded-xl border border-border/60 bg-card p-5 md:p-6 mb-8">
            <h2 className="text-[13px] font-semibold text-foreground mb-4 uppercase tracking-wider">
              {en ? "24h Signal Evolution" : "Evolução do Sinal 24h"}
            </h2>
            <div className="h-[220px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={topic.historicalData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="topicGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#topicGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        {/* ─── MOMENTUM + CROSS-PLATFORM ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Momentum Sparkline */}
          {topic?.sparkData && topic.sparkData.length > 0 && (
            <motion.section custom={3} variants={fadeUp} initial="hidden" animate="visible" className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
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
            </motion.section>
          )}

          {/* Cross-platform signals */}
          {crossPlatformSignals.length > 0 && (
            <motion.section custom={4} variants={fadeUp} initial="hidden" animate="visible" className="rounded-xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                  {en ? "Cross-Platform Signals" : "Sinais Cross-Platform"}
                </h2>
              </div>
              <div className="space-y-2">
                {crossPlatformSignals.map((sig, i) => (
                  <Link
                    key={i}
                    to={`/topic?title=${encodeURIComponent(sig.title)}&platform=${encodeURIComponent(sig.platform)}`}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:bg-secondary/20 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-primary shrink-0">{sig.platform}</span>
                      <span className="text-[11px] text-foreground truncate">{sig.title}</span>
                    </div>
                    {sig.change && (
                      <span className={cn("text-[10px] font-semibold shrink-0 ml-2", sig.changePositive ? "text-[hsl(var(--color-positive))]" : "text-[hsl(var(--color-critical))]")}>
                        {sig.changePositive ? "+" : ""}{sig.change}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ─── GEOGRAPHIC DISTRIBUTION ─── */}
          <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                {en ? "Geographic Distribution" : "Distribuição Geográfica"}
              </h2>
            </div>
            {geoDistribution.length > 0 ? (
              <div className="space-y-2.5">
                {geoDistribution.map((geo) => {
                  const maxCount = geoDistribution[0]?.count || 1;
                  const pct = Math.round((geo.count / maxCount) * 100);
                  return (
                    <div key={geo.code} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                          <span>{countryCodeToFlag(geo.code)}</span>
                          {geo.code.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{geo.count} {en ? "signals" : "sinais"}</span>
                      </div>
                      <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.2 }} className="h-full bg-primary/60 rounded-full" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">{en ? "No geographic data available" : "Sem dados geográficos disponíveis"}</p>
            )}
          </motion.section>

          {/* ─── RELATED TOPICS ─── */}
          <motion.section custom={6} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
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
                    className="group flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-secondary/20 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{rt.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-primary font-medium">{rt.platform}</span>
                        {rt.volume && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-border" />
                            <span className="text-[10px] text-muted-foreground">{rt.volume}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {rt.sparkData && rt.sparkData.length > 0 && (
                      <div className="w-[48px] h-[24px] shrink-0 opacity-50">
                        <SparklineArea data={rt.sparkData} color={rt.changePositive ? "hsl(var(--color-positive))" : "hsl(var(--color-critical))"} height={24} width={48} />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">{en ? "No related topics found" : "Nenhum tópico relacionado encontrado"}</p>
            )}
          </motion.section>
        </div>

        {/* ─── ANALYTICAL CONTEXT ─── */}
        <motion.section custom={7} variants={fadeUp} initial="hidden" animate="visible" className="rounded-xl border border-border/60 bg-card p-5 md:p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
              {en ? "Analytical Context" : "Contexto Analítico"}
            </h2>
          </div>
          <div className="prose prose-sm max-w-none text-muted-foreground text-[13px] leading-relaxed space-y-3">
            {topic?.details ? (
              <p>{topic.details}</p>
            ) : (
              <p>
                {en
                  ? `This topic is currently trending on ${topic?.platform || topicPlatform} with a TVI score of ${tvi}/100 (${tviTier.label}). The signal is in the "${lifecycle.labelEn}" stage of its lifecycle. ${lifecycle.descEn} Cross-referencing ${crossPlatformSignals.length} additional signals from other platforms and ${geoDistribution.length} geographic regions.`
                  : `Este tópico está em destaque no ${topic?.platform || topicPlatform} com um score TVI de ${tvi}/100 (${tviTier.label}). O sinal está na fase "${lifecycle.label}" do seu ciclo de vida. ${lifecycle.desc} Cruzando ${crossPlatformSignals.length} sinais adicionais de outras plataformas e ${geoDistribution.length} regiões geográficas.`}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              {en
                ? "⚠️ This analysis is generated from public data signals and does not constitute a recommendation. Always verify with primary sources."
                : "⚠️ Esta análise é gerada a partir de sinais de dados públicos e não constitui uma recomendação. Sempre verifique com fontes primárias."}
            </p>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-border/40 px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[1200px] mx-auto w-full">
        <p className="text-[11px] text-muted-foreground/60 text-center">
          © {new Date().getFullYear()} Global Talk Trend
        </p>
      </footer>
    </div>
  );
};

export default TopicPage;
