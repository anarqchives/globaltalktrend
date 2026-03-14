import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { useTrends } from "@/hooks/use-trends";
import { useTranslatedTrends } from "@/hooks/use-translated-trends";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "@/components/TrendCard";
import SparklineArea from "@/components/SparklineArea";
import { countryCodeToFlag } from "@/lib/shared-utils";
import { FilterState } from "@/components/FilterBar";
import { ArrowUpRight, TrendingUp, Globe, BarChart3, Newspaper, FlaskConical, Search, X, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── CATEGORIES ─── */
const CATEGORIES = [
  { key: "all", labelPt: "Tudo", labelEn: "All", icon: Globe },
  { key: "Política", labelPt: "Política", labelEn: "Politics", icon: Newspaper },
  { key: "Tecnologia", labelPt: "Tecnologia", labelEn: "Technology", icon: BarChart3 },
  { key: "Ciência", labelPt: "Ciência", labelEn: "Science", icon: FlaskConical },
  { key: "Cultura", labelPt: "Cultura", labelEn: "Culture", icon: Globe },
  { key: "Economia", labelPt: "Economia", labelEn: "Economy", icon: TrendingUp },
  { key: "Esportes", labelPt: "Esportes", labelEn: "Sports", icon: Activity },
  { key: "Saúde", labelPt: "Saúde", labelEn: "Health", icon: Zap },
];

/* ─── EDITORIAL GRID LAYOUT ─── */
type CardVariant = "hero" | "featured" | "standard" | "wide" | "compact";

const getCardVariant = (index: number): CardVariant => {
  const pattern: CardVariant[] = [
    "hero", "standard", "standard", "featured",
    "wide", "standard", "compact", "compact",
    "featured", "standard", "standard", "hero",
    "standard", "wide", "compact", "standard",
    "compact", "featured", "standard", "standard",
  ];
  return pattern[index % pattern.length];
};

const gridSpans: Record<CardVariant, string> = {
  hero: "col-span-4 sm:col-span-6 lg:col-span-8 row-span-2",
  featured: "col-span-4 sm:col-span-6 lg:col-span-4 row-span-2",
  wide: "col-span-4 sm:col-span-6 lg:col-span-8",
  standard: "col-span-4 sm:col-span-3 lg:col-span-4",
  compact: "col-span-2 sm:col-span-3 lg:col-span-4",
};

/* ─── PLATFORM COLOR MAP ─── */
const platformAccent: Record<string, string> = {
  "The Guardian": "210 70% 35%",
  "Reddit": "16 100% 50%",
  "Google Trends": "217 91% 60%",
  "YouTube": "0 72% 51%",
  "Bluesky": "210 100% 56%",
  "Mastodon": "270 60% 50%",
  "NewsAPI": "152 69% 31%",
  "GNews": "152 69% 31%",
  "Wikipedia": "0 0% 30%",
  "OpenAlex": "270 60% 50%",
  "World Bank": "200 80% 45%",
  "Hacker News": "25 95% 53%",
  "FRED": "210 60% 40%",
};

const getAccentColor = (platform: string) => platformAccent[platform] || "220 15% 40%";

/* ─── SIGNAL INTELLIGENCE HELPERS ─── */

/** Compute a simple TVI (Trend Velocity Index) 0-100 from available data */
function computeTVI(trend: TrendCardProps): number {
  const vol = parseVolume(trend.volume);
  const change = Math.abs(parseChange(trend.change));
  const sourceBonus = (trend.sources?.length || 1) * 5;
  const raw = Math.min(100, Math.round(vol / 500 + change * 1.2 + sourceBonus));
  return Math.max(0, Math.min(100, raw));
}

/** Determine lifecycle stage from change rate and sparkData trajectory */
function getLifecycleStage(trend: TrendCardProps): { label: string; labelEn: string; color: string; icon: string } {
  const change = parseChange(trend.change);
  const spark = trend.sparkData || [];
  
  if (spark.length >= 4) {
    const last = spark[spark.length - 1];
    const mid = spark[Math.floor(spark.length / 2)];
    const first = spark[0];
    
    if (last > mid && mid > first && change > 20) {
      return { label: "Acelerando", labelEn: "Accelerating", color: "var(--color-high)", icon: "🚀" };
    }
    if (last >= mid * 0.95 && change > 5) {
      return { label: "Pico", labelEn: "Peaking", color: "var(--color-critical)", icon: "🔥" };
    }
    if (last < mid && last < first * 0.8) {
      return { label: "Declínio", labelEn: "Declining", color: "var(--color-neutral)", icon: "📉" };
    }
  }
  
  if (change > 40) return { label: "Acelerando", labelEn: "Accelerating", color: "var(--color-high)", icon: "🚀" };
  if (change > 10) return { label: "Emergente", labelEn: "Emerging", color: "var(--color-positive)", icon: "🌱" };
  if (change > 0) return { label: "Estável", labelEn: "Stable", color: "var(--color-neutral)", icon: "➡️" };
  return { label: "Declínio", labelEn: "Declining", color: "var(--color-neutral)", icon: "📉" };
}

/* ─── CATEGORY VISUALS ─── */
const categoryVisual: Record<string, { gradient: string; emoji: string }> = {
  "Política": { gradient: "from-blue-500/5 to-transparent", emoji: "🏛" },
  "Tecnologia": { gradient: "from-violet-500/5 to-transparent", emoji: "⚡" },
  "Ciência": { gradient: "from-emerald-500/5 to-transparent", emoji: "🔬" },
  "Cultura": { gradient: "from-amber-500/5 to-transparent", emoji: "🎭" },
  "Economia": { gradient: "from-sky-500/5 to-transparent", emoji: "📈" },
  "Esportes": { gradient: "from-orange-500/5 to-transparent", emoji: "⚽" },
  "Saúde": { gradient: "from-rose-500/5 to-transparent", emoji: "💊" },
};

/* ─── HELPERS ─── */
const parseVolume = (v?: string): number => {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  if (v.toLowerCase().includes("m")) return n * 1_000_000;
  if (v.toLowerCase().includes("k")) return n * 1_000;
  return n || 0;
};

const parseChange = (c?: string): number => {
  if (!c) return 0;
  return parseFloat(c.replace(/[^0-9.-]/g, "")) || 0;
};

const decodeEntities = (text: string): string => {
  try {
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  } catch { return text; }
};

/* ─── TVI MINI BAR ─── */
const TVIMiniBar = ({ score }: { score: number }) => {
  const color = score >= 80 ? "var(--color-critical)" : score >= 50 ? "var(--color-high)" : score >= 25 ? "var(--color-moderate)" : "var(--color-neutral)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-[32px] h-[3px] rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: `hsl(${color})` }}
        />
      </div>
      <span className="text-[9px] font-semibold tabular-nums" style={{ color: `hsl(${color})` }}>
        {score}
      </span>
    </div>
  );
};

/* ─── DISCOVERY CARD ─── */
interface DiscoveryCardProps {
  trend: TrendCardProps;
  variant: CardVariant;
  index: number;
  lang: string;
}

const DiscoveryCard = React.memo(({ trend, variant, index, lang }: DiscoveryCardProps) => {
  const navigate = useNavigate();
  const accent = getAccentColor(trend.platform);
  const flag = trend.countryCode ? countryCodeToFlag(trend.countryCode) : null;
  const change = parseChange(trend.change);
  const title = decodeEntities(trend.title);
  const description = trend.description || trend.details || "";
  const catVisual = categoryVisual[trend.category || ""] || null;
  const tvi = computeTVI(trend);
  const lifecycle = getLifecycleStage(trend);
  const en = lang === "en";

  const handleClick = () => {
    navigate(`/topic?title=${encodeURIComponent(trend.title)}&platform=${encodeURIComponent(trend.platform)}`);
  };

  const isHero = variant === "hero";
  const isFeatured = variant === "featured";
  const isWide = variant === "wide";
  const isCompact = variant === "compact";
  const showDescription = isHero || isFeatured || isWide;
  const showSparkline = isHero || isFeatured || variant === "standard";
  const showLifecycle = isHero || isFeatured || isWide;
  const showTVI = !isCompact;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.5), ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card overflow-hidden cursor-pointer",
        "hover:border-border/70 hover:shadow-[var(--shadow-md)] transition-all duration-300",
        gridSpans[variant],
        isHero && "min-h-[320px] sm:min-h-[400px]",
        isFeatured && "min-h-[280px] sm:min-h-[360px]",
        isWide && "min-h-[180px] sm:min-h-[200px]",
        variant === "standard" && "min-h-[200px] sm:min-h-[240px]",
        isCompact && "min-h-[160px] sm:min-h-[200px]",
      )}
    >
      {/* Category gradient background */}
      {(isHero || isFeatured) && catVisual && (
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", catVisual.gradient)} />
      )}

      {/* Accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `hsl(${accent})` }}
      />

      {/* Content */}
      <div className={cn(
        "relative flex flex-col gap-2.5 flex-1",
        isHero ? "p-6 sm:p-8 gap-3.5" : isFeatured ? "p-5 sm:p-6 gap-3" : "p-4 sm:p-5 gap-2"
      )}>
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0"
              style={{ background: `hsl(${accent} / 0.08)`, color: `hsl(${accent})` }}
            >
              {trend.icon} {trend.platform}
            </span>
            {trend.category && trend.category !== "Geral" && (
              <span className="text-[10px] text-muted-foreground font-medium truncate">{trend.category}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {flag && <span className="text-xs">{flag}</span>}
            <span className="text-[10px] text-muted-foreground">{trend.time}</span>
          </div>
        </div>

        {/* Lifecycle badge — hero/featured/wide */}
        {showLifecycle && (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
              style={{ background: `hsl(${lifecycle.color} / 0.08)`, color: `hsl(${lifecycle.color})` }}
            >
              {lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}
            </span>
            {showTVI && <TVIMiniBar score={tvi} />}
          </div>
        )}

        {/* Title */}
        <h3 className={cn(
          "font-bold leading-[1.2] tracking-tight text-foreground group-hover:text-primary transition-colors duration-200",
          isHero ? "text-xl sm:text-2xl md:text-[28px] line-clamp-3" :
          isFeatured ? "text-lg sm:text-xl line-clamp-3" :
          isWide ? "text-base sm:text-lg line-clamp-2" :
          isCompact ? "text-[13px] sm:text-sm line-clamp-2" :
          "text-[14px] sm:text-[15px] line-clamp-3"
        )}>
          {title}
        </h3>

        {/* Description */}
        {showDescription && description && (
          <p className={cn(
            "text-muted-foreground leading-relaxed",
            isHero ? "text-[14px] sm:text-[15px] line-clamp-3 max-w-2xl" : "text-[12px] sm:text-[13px] line-clamp-2"
          )}>
            {decodeEntities(description)}
          </p>
        )}

        {/* Category emoji watermark for hero */}
        {isHero && catVisual && (
          <span className="text-[48px] sm:text-[64px] absolute bottom-6 right-6 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none select-none">
            {catVisual.emoji}
          </span>
        )}

        {/* Sparkline */}
        {showSparkline && trend.sparkData?.length > 2 && (
          <div className="mt-auto pt-2">
            <SparklineArea
              data={trend.sparkData}
              color={`hsl(${accent})`}
              height={isHero ? 52 : isFeatured ? 44 : 36}
              width={isHero ? 220 : isFeatured ? 160 : 120}
            />
          </div>
        )}
      </div>

      {/* Footer metrics */}
      <div className={cn(
        "flex items-center justify-between border-t border-border/30 mt-auto",
        isHero ? "px-6 sm:px-8 pb-5 pt-3" : "px-4 sm:px-5 pb-3 pt-2"
      )}>
        <div className="flex items-center gap-3">
          {trend.volume && (
            <span className={cn("font-medium text-muted-foreground", isCompact ? "text-[10px]" : "text-[11px]")}>
              {trend.volume}
            </span>
          )}
          {change !== 0 && (
            <span className={cn(
              "font-semibold",
              isCompact ? "text-[10px]" : "text-[11px]",
              trend.changePositive ? "text-[hsl(var(--color-positive))]" : "text-[hsl(var(--color-critical))]"
            )}>
              {trend.changePositive ? "+" : ""}{trend.change}
            </span>
          )}
          {/* TVI on standard cards (not shown in lifecycle row) */}
          {!showLifecycle && showTVI && <TVIMiniBar score={tvi} />}
        </div>
        <ArrowUpRight className={cn(
          "text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200",
          isCompact ? "w-3 h-3" : "w-3.5 h-3.5"
        )} />
      </div>
    </motion.article>
  );
});
DiscoveryCard.displayName = "DiscoveryCard";

/* ─── MAIN PAGE ─── */
const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

const Discover = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem("gtt-has-visited");
    if (!hasVisited) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          localStorage.setItem("gtt-has-visited", "true");
          navigate("/welcome", { replace: true });
        } else {
          localStorage.setItem("gtt-has-visited", "true");
        }
      });
    }
  }, [navigate]);

  const [, setTrendCounts] = useState<Record<string, number>>({});
  const { filteredTrends: rawTrends, loading, isFirstLoad } = useTrends(defaultFilters, setTrendCounts, lang);
  const { translatedTrends } = useTranslatedTrends(rawTrends, lang);

  const displayTrends = useMemo(() => {
    let trends = translatedTrends;

    if (activeCategory !== "all") {
      const filtered = trends.filter(t =>
        t.category?.toLowerCase().includes(activeCategory.toLowerCase())
      );
      if (filtered.length > 0) trends = filtered;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      trends = trends.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.platform.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }

    const seen = new Set<string>();
    return trends.filter(t => {
      const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [translatedTrends, activeCategory, searchQuery]);

  const stats = useMemo(() => {
    const platforms = new Set(translatedTrends.map(t => t.platform));
    const countries = new Set(translatedTrends.map(t => t.countryCode).filter(Boolean));
    return {
      totalTrends: translatedTrends.length,
      platforms: platforms.size,
      countries: countries.size,
    };
  }, [translatedTrends]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const getCatLabel = (cat: typeof CATEGORIES[0]) => lang === "en" ? cat.labelEn : cat.labelPt;
  const en = lang === "en";

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <AppHeader />

      {/* ─── HERO ─── */}
      <section className="px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-12 md:pt-14 pb-6 md:pb-8 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-foreground font-bold tracking-[-0.02em] leading-[1.08]" style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3rem)' }}>
              {en ? "Discover" : "Descobrir"}
            </h1>
            <p className="text-muted-foreground leading-relaxed" style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.9375rem)' }}>
              {en
                ? "Explore global trends, emerging signals and cross-platform conversations in real time."
                : "Explore tendências globais, sinais emergentes e conversas cross-platform em tempo real."}
            </p>
          </div>

          <div className="flex items-center gap-5 md:gap-6">
            {[
              { value: stats.totalTrends, labelEn: "Signals", labelPt: "Sinais" },
              { value: stats.platforms, labelEn: "Sources", labelPt: "Fontes" },
              { value: stats.countries, labelEn: "Countries", labelPt: "Países" },
            ].map((stat, i) => (
              <React.Fragment key={stat.labelEn}>
                {i > 0 && <div className="w-px h-8 bg-border/60" />}
                <div className="text-right">
                  <p className="text-[24px] md:text-[28px] font-bold text-foreground leading-none tracking-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                    {en ? stat.labelEn : stat.labelPt}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <div className="sticky top-[52px] sm:top-[56px] z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1440px] mx-auto w-full flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Category filters">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                role="tab"
                aria-selected={active}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150 shrink-0",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {getCatLabel(cat)}
              </button>
            );
          })}

          <div className="flex-1" />

          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: isMobile ? 160 : 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative shrink-0"
              >
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={en ? "Search…" : "Buscar…"}
                  className="w-full h-9 pl-3.5 pr-8 rounded-full bg-secondary/60 border border-border/50 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shrink-0"
                aria-label={en ? "Search" : "Buscar"}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── EDITORIAL GRID ─── */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10 max-w-[1440px] mx-auto w-full">
        {loading && isFirstLoad ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 auto-rows-[minmax(100px,auto)]">
            {Array.from({ length: 12 }).map((_, i) => {
              const v = getCardVariant(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl bg-secondary/30 animate-pulse",
                    gridSpans[v],
                    v === "hero" ? "min-h-[320px]" :
                    v === "featured" ? "min-h-[280px]" :
                    v === "wide" ? "min-h-[180px]" :
                    v === "compact" ? "min-h-[160px]" : "min-h-[200px]"
                  )}
                />
              );
            })}
          </div>
        ) : displayTrends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-base font-semibold text-foreground">
              {en ? "No signals found" : "Nenhum sinal encontrado"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {en ? "Try changing the category or search term." : "Tente mudar a categoria ou o termo de busca."}
            </p>
            {(activeCategory !== "all" || searchQuery) && (
              <button
                onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                className="mt-2 px-5 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                {en ? "Clear filters" : "Limpar filtros"}
              </button>
            )}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 auto-rows-[minmax(100px,auto)]"
          >
            <AnimatePresence mode="popLayout">
              {displayTrends.slice(0, 40).map((trend, i) => (
                <DiscoveryCard
                  key={`${trend.platform}-${trend.title.slice(0, 30)}-${i}`}
                  trend={trend}
                  variant={getCardVariant(i)}
                  index={i}
                  lang={lang}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {displayTrends.length > 40 && (
          <div className="flex justify-center pt-10">
            <button className="px-8 py-3 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
              {en ? "Load more" : "Carregar mais"}
            </button>
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[1440px] mx-auto w-full">
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-2xl mx-auto text-center">
            {en
              ? "⚠️ Insights represent analytical signals derived from public data sources. They do not constitute recommendations or predictions. Always verify with primary sources."
              : "⚠️ Os insights representam sinais analíticos derivados de fontes públicas. Não constituem recomendações ou previsões. Sempre verifique com fontes primárias."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} Global Talk Trend
          </p>
          <div className="flex items-center gap-1.5">
            <span className="relative flex items-center justify-center w-1.5 h-1.5">
              <span className="absolute w-full h-full rounded-full bg-[hsl(var(--color-positive))] animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-positive))]" />
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
              {en ? "Live data" : "Dados ao vivo"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Discover;
