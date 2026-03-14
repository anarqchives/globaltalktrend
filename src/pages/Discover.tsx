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
import { ArrowUpRight, TrendingUp, Globe, BarChart3, Newspaper, FlaskConical, Search, X, Zap, Activity, Clock, ArrowRight, Layers, ChevronRight } from "lucide-react";
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

/* ─── EDITORIAL GRID — asymmetric rhythm ─── */
type CardVariant = "hero" | "featured" | "standard" | "wide" | "compact";

const getCardVariant = (index: number): CardVariant => {
  const pattern: CardVariant[] = [
    "hero", "featured", "standard",
    "standard", "wide", "compact", "compact",
    "featured", "standard", "standard",
    "wide", "compact", "standard", "featured",
    "standard", "compact", "standard", "standard",
    "hero", "standard",
  ];
  return pattern[index % pattern.length];
};

const gridSpans: Record<CardVariant, string> = {
  hero: "col-span-4 sm:col-span-6 lg:col-span-8 row-span-2",
  featured: "col-span-4 sm:col-span-3 lg:col-span-4 row-span-2",
  wide: "col-span-4 sm:col-span-6 lg:col-span-8",
  standard: "col-span-4 sm:col-span-3 lg:col-span-4",
  compact: "col-span-2 sm:col-span-3 lg:col-span-4",
};

/* ─── PLATFORM COLOR MAP ─── */
const platformAccent: Record<string, string> = {
  "The Guardian": "var(--accent-blue)",
  "Reddit": "var(--accent-coral)",
  "Google Trends": "var(--accent-blue)",
  "YouTube": "var(--accent-coral)",
  "Bluesky": "var(--accent-cyan)",
  "Mastodon": "var(--accent-purple)",
  "NewsAPI": "var(--accent-lime)",
  "GNews": "var(--accent-lime)",
  "Wikipedia": "var(--accent-neutral)",
  "OpenAlex": "var(--accent-purple)",
  "World Bank": "var(--accent-cyan)",
  "Hacker News": "var(--accent-amber)",
  "FRED": "var(--accent-blue)",
};

const getAccentColor = (platform: string) => platformAccent[platform] || "var(--accent-neutral)";

/* ─── SIGNAL INTELLIGENCE HELPERS ─── */
function computeTVI(trend: TrendCardProps): number {
  const vol = parseVolume(trend.volume);
  const change = Math.abs(parseChange(trend.change));
  const sourceBonus = (trend.sources?.length || 1) * 5;
  const raw = Math.min(100, Math.round(vol / 500 + change * 1.2 + sourceBonus));
  return Math.max(0, Math.min(100, raw));
}

function getLifecycleStage(trend: TrendCardProps): { label: string; labelEn: string; color: string; icon: string } {
  const change = parseChange(trend.change);
  const spark = trend.sparkData || [];
  if (spark.length >= 4) {
    const last = spark[spark.length - 1];
    const mid = spark[Math.floor(spark.length / 2)];
    const first = spark[0];
    if (last > mid && mid > first && change > 20) return { label: "Acelerando", labelEn: "Accelerating", color: "var(--accent-amber)", icon: "🚀" };
    if (last >= mid * 0.95 && change > 5) return { label: "Pico", labelEn: "Peaking", color: "var(--accent-coral)", icon: "🔥" };
    if (last < mid && last < first * 0.8) return { label: "Declínio", labelEn: "Declining", color: "var(--accent-neutral)", icon: "📉" };
  }
  if (change > 40) return { label: "Acelerando", labelEn: "Accelerating", color: "var(--accent-amber)", icon: "🚀" };
  if (change > 10) return { label: "Emergente", labelEn: "Emerging", color: "var(--accent-lime)", icon: "🌱" };
  if (change > 0) return { label: "Estável", labelEn: "Stable", color: "var(--accent-neutral)", icon: "➡️" };
  return { label: "Declínio", labelEn: "Declining", color: "var(--accent-neutral)", icon: "📉" };
}

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

/* ─── TVI GAUGE (RADIAL) ─── */
const TVIGauge = ({ score, size = 40 }: { score: number; size?: number }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "var(--accent-coral)" : score >= 50 ? "var(--accent-amber)" : score >= 25 ? "var(--accent-lime)" : "var(--accent-neutral)";
  return (
    <div className="tvi-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={3} opacity={0.2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
        />
      </svg>
      <span className="absolute text-[9px] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
};

/* ─── TVI MINI BAR ─── */
const TVIMiniBar = ({ score }: { score: number }) => {
  const color = score >= 80 ? "var(--accent-coral)" : score >= 50 ? "var(--accent-amber)" : score >= 25 ? "var(--accent-lime)" : "var(--accent-neutral)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-[32px] h-[3px] rounded-full bg-secondary/60 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[9px] font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
};

/* ─── INSIGHT ROW ─── */
const InsightRow = React.memo(({ trends, lang }: { trends: TrendCardProps[]; lang: string }) => {
  const en = lang === "en";
  const topTrend = trends[0];
  const accelerating = trends.filter(t => parseChange(t.change) > 30).length;
  const platforms = new Set(trends.map(t => t.platform)).size;

  if (!topTrend) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="insight-row flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8"
    >
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--accent-lime) 12%, transparent)' }}>
          <Zap className="w-5 h-5" style={{ color: 'var(--accent-lime)' }} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-semibold">
            {en ? "Signal Briefing" : "Briefing de Sinais"}
          </p>
          <p className="text-[15px] font-bold text-foreground leading-tight">
            {accelerating} {en ? "accelerating signals" : "sinais acelerando"}
          </p>
        </div>
      </div>
      <div className="hidden sm:block w-px h-8 bg-border/20" />
      <p className="text-[13px] text-muted-foreground/50 leading-relaxed flex-1">
        {en
          ? `Monitoring ${trends.length} active signals across ${platforms} platforms. Top signal: "${decodeEntities(topTrend.title).slice(0, 60)}…"`
          : `Monitorando ${trends.length} sinais ativos em ${platforms} plataformas. Sinal principal: "${decodeEntities(topTrend.title).slice(0, 60)}…"`
        }
      </p>
      <Link
        to="/dashboard"
        className="compact-link inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-foreground transition-colors shrink-0"
      >
        {en ? "View Observatory" : "Ver Observatório"}
        <ChevronRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
});
InsightRow.displayName = "InsightRow";

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

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.4), ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={handleClick}
      className={cn(
        "signal-card group relative flex flex-col cursor-pointer",
        gridSpans[variant],
        isHero && "signal-card-hero",
        isFeatured && "signal-card-featured",
        isWide && "min-h-[160px] sm:min-h-[180px]",
        variant === "standard" && "min-h-[200px] sm:min-h-[260px]",
        isCompact && "min-h-[160px] sm:min-h-[220px]",
      )}
    >
      {/* Accent indicator */}
      {isHero ? (
        <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-2xl" style={{ background: accent }} />
      ) : (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-80 transition-opacity duration-300"
          style={{ background: accent }}
        />
      )}

      {/* Content */}
      <div className={cn(
        "relative flex flex-col flex-1",
        isHero ? "p-6 sm:p-8 gap-3.5" : isFeatured ? "p-5 sm:p-6 gap-3" : isWide ? "p-4 sm:p-5 gap-2.5" : "p-4 gap-2"
      )}>
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="signal-platform-badge" style={{ '--accent': accent } as React.CSSProperties}>
              {trend.icon} {trend.platform}
            </span>
            {trend.category && trend.category !== "Geral" && (
              <span className="text-[10px] text-muted-foreground/40 font-medium truncate">{trend.category}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {flag && <span className="text-xs">{flag}</span>}
            <span className="text-[10px] text-muted-foreground/30 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {trend.time}
            </span>
          </div>
        </div>

        {/* Lifecycle badge + TVI */}
        {showLifecycle && (
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
              style={{ background: `color-mix(in srgb, ${lifecycle.color} 10%, transparent)`, color: lifecycle.color }}
            >
              {lifecycle.icon} {en ? lifecycle.labelEn : lifecycle.label}
            </span>
            {isHero ? <TVIGauge score={tvi} size={36} /> : <TVIMiniBar score={tvi} />}
          </div>
        )}

        {/* Title */}
        <h3 className={cn(
          "font-bold leading-[1.1] tracking-[-0.02em] text-foreground group-hover:text-primary transition-colors duration-200",
          isHero ? "text-xl sm:text-2xl md:text-[28px] lg:text-[32px] line-clamp-3" :
          isFeatured ? "text-base sm:text-lg line-clamp-3" :
          isWide ? "text-sm sm:text-base line-clamp-2" :
          isCompact ? "text-[13px] sm:text-sm line-clamp-3" :
          "text-sm line-clamp-3"
        )}>
          {title}
        </h3>

        {/* Description */}
        {showDescription && description && (
          <p className={cn(
            "text-muted-foreground/50 leading-relaxed",
            isHero ? "text-[13px] sm:text-[14px] line-clamp-3 max-w-2xl" : "text-[12px] line-clamp-2"
          )}>
            {decodeEntities(description)}
          </p>
        )}

        {/* Sparkline */}
        <div className="mt-auto" />
        {showSparkline && trend.sparkData?.length > 2 && (
          <div className="pt-2">
            <SparklineArea
              data={trend.sparkData}
              color={accent}
              height={isHero ? 52 : isFeatured ? 44 : 32}
              width={isHero ? 240 : isFeatured ? 180 : 120}
            />
          </div>
        )}
      </div>

      {/* Footer metrics */}
      <div className={cn(
        "flex items-center justify-between border-t border-border/10 mt-auto",
        isHero ? "px-6 sm:px-8 pb-4 pt-3" : "px-4 pb-3 pt-2"
      )}>
        <div className="flex items-center gap-3">
          {trend.volume && (
            <span className={cn("font-medium text-muted-foreground/50 tabular-nums", isCompact ? "text-[10px]" : "text-[11px]")}>
              {trend.volume}
            </span>
          )}
          {change !== 0 && (
            <span className={cn(
              "font-semibold tabular-nums",
              isCompact ? "text-[10px]" : "text-[11px]",
              trend.changePositive ? "text-[var(--accent-lime)]" : "text-[var(--accent-coral)]"
            )}>
              {trend.changePositive ? "+" : ""}{trend.change}
            </span>
          )}
          {!showLifecycle && <TVIMiniBar score={tvi} />}
        </div>
        <ArrowUpRight className={cn(
          "text-muted-foreground/10 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200",
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

  const now = new Date();
  const timeStr = now.toLocaleTimeString(en ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(en ? "en-US" : "pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const firstHalf = displayTrends.slice(0, 7);
  const secondHalf = displayTrends.slice(7, 40);

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <AppHeader />

      {/* ═══════════════════ INTELLIGENCE HEADER ═══════════════════ */}
      <section className="briefing-header px-4 sm:px-6 md:px-8 lg:px-12 pt-5 sm:pt-7 pb-0 max-w-[var(--editorial-max-width)] mx-auto w-full">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground/35 uppercase tracking-wider font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex items-center justify-center w-1.5 h-1.5">
                    <span className="absolute w-full h-full rounded-full bg-[var(--accent-lime)] animate-ping opacity-60" />
                    <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
                  </span>
                  {en ? "Live" : "Ao vivo"}
                </span>
                <span className="w-px h-2.5 bg-border/20" />
                <span className="capitalize">{dateStr}</span>
                <span className="w-px h-2.5 bg-border/20" />
                <span className="tabular-nums">{timeStr}</span>
              </div>
              <h1 className="text-foreground font-bold tracking-[-0.03em] leading-none" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
                {en ? "Signal Explorer" : "Explorador de Sinais"}
              </h1>
            </div>
          </div>

          {/* Signal stats */}
          <div className="hidden sm:flex items-center gap-6 shrink-0">
            {[
              { value: stats.totalTrends, labelEn: "Signals", labelPt: "Sinais", icon: Activity },
              { value: stats.platforms, labelEn: "Sources", labelPt: "Fontes", icon: Layers },
              { value: stats.countries, labelEn: "Countries", labelPt: "Países", icon: Globe },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.labelEn} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-muted-foreground/20" />
                  <div>
                    <p className="text-[18px] md:text-[22px] font-bold text-foreground leading-none tabular-nums">{stat.value}</p>
                    <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">
                      {en ? stat.labelEn : stat.labelPt}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FILTER BAR ═══════════════════ */}
      <div className="sticky top-[52px] sm:top-[56px] z-30 bg-background/90 backdrop-blur-xl border-b border-border/15">
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 max-w-[var(--editorial-max-width)] mx-auto w-full flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none" role="tablist">
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
                  "compact-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150 shrink-0",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-secondary/30 text-muted-foreground/60 hover:bg-secondary/60 hover:text-foreground"
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
                  placeholder={en ? "Search signals…" : "Buscar sinais…"}
                  className="w-full h-9 pl-3.5 pr-8 rounded-full bg-secondary/30 border border-border/20 text-[12px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="compact-btn absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="compact-btn flex items-center justify-center w-9 h-9 rounded-full bg-secondary/30 text-muted-foreground/50 hover:bg-secondary/60 hover:text-foreground transition-all shrink-0"
                aria-label={en ? "Search" : "Buscar"}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════════════ EDITORIAL GRID ═══════════════════ */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10 max-w-[var(--editorial-max-width)] mx-auto w-full">
        {loading && isFirstLoad ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 auto-rows-[minmax(100px,auto)]">
            {Array.from({ length: 12 }).map((_, i) => {
              const v = getCardVariant(i);
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl bg-secondary/10 animate-pulse",
                    gridSpans[v],
                    v === "hero" ? "min-h-[320px]" :
                    v === "featured" ? "min-h-[280px]" :
                    v === "wide" ? "min-h-[160px]" :
                    v === "compact" ? "min-h-[160px]" : "min-h-[200px]"
                  )}
                />
              );
            })}
          </div>
        ) : displayTrends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Search className="w-7 h-7 text-muted-foreground/20" />
            </div>
            <p className="text-base font-semibold text-foreground">
              {en ? "No signals found" : "Nenhum sinal encontrado"}
            </p>
            <p className="text-sm text-muted-foreground/40 max-w-xs">
              {en ? "Try changing the category or search term." : "Tente mudar a categoria ou o termo de busca."}
            </p>
            {(activeCategory !== "all" || searchQuery) && (
              <button
                onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                className="mt-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                {en ? "Clear filters" : "Limpar filtros"}
              </button>
            )}
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 auto-rows-[minmax(100px,auto)]">
              <AnimatePresence mode="popLayout">
                {firstHalf.map((trend, i) => (
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

            {displayTrends.length > 7 && (
              <div className="my-5 md:my-7">
                <InsightRow trends={displayTrends} lang={lang} />
              </div>
            )}

            {secondHalf.length > 0 && (
              <motion.div layout className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 auto-rows-[minmax(100px,auto)]">
                <AnimatePresence mode="popLayout">
                  {secondHalf.map((trend, i) => (
                    <DiscoveryCard
                      key={`${trend.platform}-${trend.title.slice(0, 30)}-s-${i}`}
                      trend={trend}
                      variant={getCardVariant(i + 7)}
                      index={i + 8}
                      lang={lang}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {displayTrends.length > 40 && (
          <div className="flex justify-center pt-14">
            <button className="px-8 py-3 rounded-full border border-border/30 text-sm font-medium text-muted-foreground/60 hover:text-foreground hover:border-foreground/30 transition-all">
              {en ? "Load more signals" : "Carregar mais sinais"}
            </button>
          </div>
        )}
      </main>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-border/10 px-4 sm:px-6 md:px-8 lg:px-12 py-6 max-w-[var(--editorial-max-width)] mx-auto w-full">
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground/30 leading-relaxed max-w-2xl mx-auto text-center">
            {en
              ? "⚠️ Insights represent analytical signals derived from public data sources. They do not constitute recommendations or predictions. Always verify with primary sources."
              : "⚠️ Os insights representam sinais analíticos derivados de fontes públicas. Não constituem recomendações ou previsões. Sempre verifique com fontes primárias."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/30">
            © {new Date().getFullYear()} Global Talk Trend
          </p>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/25">
            <Link to="/metodologia" className="hover:text-foreground transition-colors">
              {en ? "Methodology" : "Metodologia"}
            </Link>
            <span className="w-px h-3 bg-border/15" />
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              {en ? "Privacy" : "Privacidade"}
            </Link>
            <span className="w-px h-3 bg-border/15" />
            <div className="flex items-center gap-1.5">
              <span className="relative flex items-center justify-center w-1.5 h-1.5">
                <span className="absolute w-full h-full rounded-full bg-[var(--accent-lime)] animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
              </span>
              <span className="font-medium uppercase tracking-wider">{en ? "Live data" : "Dados ao vivo"}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Discover;
