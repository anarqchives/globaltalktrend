import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Globe, TrendingUp, BarChart3, Clock, ExternalLink,
  Share2, Bookmark, MapPin, Layers, ChevronRight
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

const TopicPage = () => {
  const { lang } = useLanguage();
  const [params] = useSearchParams();
  const topicTitle = params.get("title") || "";
  const topicPlatform = params.get("platform") || "";

  const [, setTrendCounts] = useState<Record<string, number>>({});
  const { filteredTrends: rawTrends } = useTrends(defaultFilters, setTrendCounts, lang);
  const { translatedTrends } = useTranslatedTrends(rawTrends, lang);

  // Find the topic trend
  const topic = useMemo(() => {
    return translatedTrends.find(t =>
      t.title.toLowerCase().includes(topicTitle.toLowerCase().slice(0, 30))
    );
  }, [translatedTrends, topicTitle]);

  // Related topics (same category or platform)
  const relatedTopics = useMemo(() => {
    if (!topic) return [];
    const seen = new Set<string>();
    seen.add(topic.title.toLowerCase().slice(0, 30));
    return translatedTrends
      .filter(t => {
        const key = t.title.toLowerCase().slice(0, 30);
        if (seen.has(key)) return false;
        const sameCategory = t.category === topic.category;
        const samePlatform = t.platform === topic.platform;
        const sameCountry = t.countryCode === topic.countryCode;
        return sameCategory || samePlatform || sameCountry;
      })
      .slice(0, 6)
      .map(t => { seen.add(t.title.toLowerCase().slice(0, 30)); return t; });
  }, [translatedTrends, topic]);

  // Geographic distribution
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

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: topicTitle, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: lang === "en" ? "Link copied" : "Link copiado" });
    }
  };

  if (!topicTitle) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">{lang === "en" ? "No topic selected" : "Nenhum tópico selecionado"}</p>
        </div>
      </div>
    );
  }

  const change = topic?.change ? parseFloat(topic.change.replace(/[^0-9.-]/g, "")) : 0;
  const isPositive = topic?.changePositive ?? change > 0;
  const flag = topic?.countryCode ? countryCodeToFlag(topic.countryCode) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-6"
        >
          <Link to="/" className="hover:text-foreground transition-colors">
            {lang === "en" ? "Explore" : "Descobrir"}
          </Link>
          <ChevronRight className="w-3 h-3" />
          {topic?.category && (
            <>
              <span>{topic.category}</span>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground font-medium truncate max-w-[200px]">{topicTitle}</span>
        </motion.nav>

        {/* Header */}
        <motion.header
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {lang === "en" ? "Back to Explore" : "Voltar à Descoberta"}
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  {topic?.platform || topicPlatform}
                </span>
                {topic?.category && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium">
                    {topic.category}
                  </span>
                )}
                {flag && <span className="text-sm">{flag}</span>}
              </div>
              <h1 className="text-[24px] md:text-[32px] lg:text-[38px] font-bold tracking-tight leading-[1.15] text-foreground">
                {topicTitle}
              </h1>
              {topic?.description && (
                <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed max-w-2xl">
                  {topic.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 text-muted-foreground text-[11px] font-medium hover:bg-secondary hover:text-foreground transition-all"
              >
                <Share2 className="w-3 h-3" />
                {lang === "en" ? "Share" : "Compartilhar"}
              </button>
              {topic?.sourceUrl && (
                <a
                  href={topic.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  {lang === "en" ? "Source" : "Fonte"}
                </a>
              )}
            </div>
          </div>
        </motion.header>

        {/* ─── METRICS ROW ─── */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {[
            {
              icon: BarChart3,
              label: lang === "en" ? "Volume" : "Volume",
              value: topic?.volume || "—",
              accent: "primary"
            },
            {
              icon: TrendingUp,
              label: lang === "en" ? "Change" : "Variação",
              value: topic?.change ? `${isPositive ? "+" : ""}${topic.change}` : "—",
              accent: isPositive ? "color-positive" : "color-critical"
            },
            {
              icon: Globe,
              label: lang === "en" ? "Region" : "Região",
              value: topic?.countryCode?.toUpperCase() || (lang === "en" ? "Global" : "Global"),
              accent: "primary"
            },
            {
              icon: Clock,
              label: lang === "en" ? "Detected" : "Detectado",
              value: topic?.time || "—",
              accent: "muted-foreground"
            },
          ].map((metric, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-4 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <metric.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{metric.label}</span>
              </div>
              <p className={cn(
                "text-[18px] md:text-[22px] font-bold leading-none",
                metric.accent === "color-positive" ? "text-[hsl(var(--color-positive))]" :
                metric.accent === "color-critical" ? "text-[hsl(var(--color-critical))]" :
                "text-foreground"
              )}>
                {metric.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ─── EVOLUTION CHART ─── */}
        {topic?.historicalData && topic.historicalData.length > 0 && (
          <motion.section
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-border/60 bg-card p-5 md:p-6 mb-8"
          >
            <h2 className="text-[13px] font-semibold text-foreground mb-4 uppercase tracking-wider">
              {lang === "en" ? "24h Evolution" : "Evolução 24h"}
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
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#topicGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ─── GEOGRAPHIC DISTRIBUTION ─── */}
          <motion.section
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                {lang === "en" ? "Geographic Distribution" : "Distribuição Geográfica"}
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
                        <span className="text-[10px] text-muted-foreground">
                          {geo.count} {lang === "en" ? "signals" : "sinais"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full bg-primary/60 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {lang === "en" ? "No geographic data available" : "Sem dados geográficos disponíveis"}
              </p>
            )}
          </motion.section>

          {/* ─── RELATED TOPICS ─── */}
          <motion.section
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
                {lang === "en" ? "Related Topics" : "Tópicos Relacionados"}
              </h2>
            </div>
            {relatedTopics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedTopics.map((rt, i) => {
                  const rtChange = parseFloat(rt.change?.replace(/[^0-9.-]/g, "") || "0");
                  return (
                    <Link
                      key={i}
                      to={`/topic?title=${encodeURIComponent(rt.title)}&platform=${encodeURIComponent(rt.platform)}`}
                      className="group flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-secondary/30 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {rt.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">{rt.platform}</span>
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
                          <SparklineArea
                            data={rt.sparkData}
                            color={rt.changePositive ? "hsl(var(--color-positive))" : "hsl(var(--color-critical))"}
                            height={24}
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {lang === "en" ? "No related topics found" : "Nenhum tópico relacionado encontrado"}
              </p>
            )}
          </motion.section>
        </div>

        {/* ─── SPARKLINE DETAIL ─── */}
        {topic?.sparkData && topic.sparkData.length > 0 && (
          <motion.section
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-border/60 bg-card p-5 mb-8"
          >
            <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
              {lang === "en" ? "Momentum Indicator" : "Indicador de Momentum"}
            </h2>
            <div className="h-[80px]">
              <SparklineArea
                data={topic.sparkData}
                color={isPositive ? "hsl(var(--color-positive))" : "hsl(var(--color-critical))"}
                height={80}
              />
            </div>
          </motion.section>
        )}

        {/* ─── ANALYTICAL CONTEXT ─── */}
        <motion.section
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-border/60 bg-card p-5 md:p-6 mb-8"
        >
          <h2 className="text-[13px] font-semibold text-foreground mb-3 uppercase tracking-wider">
            {lang === "en" ? "Analytical Context" : "Contexto Analítico"}
          </h2>
          <div className="prose prose-sm max-w-none text-muted-foreground text-[13px] leading-relaxed">
            {topic?.details ? (
              <p>{topic.details}</p>
            ) : (
              <p>
                {lang === "en"
                  ? `This topic is currently trending on ${topic?.platform || topicPlatform}. The signal was detected based on volume and engagement metrics across multiple sources. Further analysis may reveal deeper patterns and cross-platform propagation.`
                  : `Este tópico está em destaque atualmente no ${topic?.platform || topicPlatform}. O sinal foi detectado com base em métricas de volume e engajamento em múltiplas fontes. Uma análise mais profunda pode revelar padrões e propagação entre plataformas.`}
              </p>
            )}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 md:px-8 lg:px-12 py-6 max-w-[1200px] mx-auto w-full">
        <p className="text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Global Talk Trend
        </p>
      </footer>
    </div>
  );
};

export default TopicPage;
