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
import { ArrowUpRight, TrendingUp, Globe, BarChart3, Newspaper, FlaskConical, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── CATEGORIES ─── */
const CATEGORIES = [
  { key: "all", labelPt: "Tudo", labelEn: "All", icon: Globe },
  { key: "Política", labelPt: "Política", labelEn: "Politics", icon: Newspaper },
  { key: "Tecnologia", labelPt: "Tecnologia", labelEn: "Technology", icon: BarChart3 },
  { key: "Ciência", labelPt: "Ciência", labelEn: "Science", icon: FlaskConical },
  { key: "Cultura", labelPt: "Cultura", labelEn: "Culture", icon: Globe },
  { key: "Economia", labelPt: "Economia", labelEn: "Economy", icon: TrendingUp },
  { key: "Esportes", labelPt: "Esportes", labelEn: "Sports", icon: TrendingUp },
  { key: "Saúde", labelPt: "Saúde", labelEn: "Health", icon: FlaskConical },
];

/* ─── CARD SIZE PATTERNS (masonry variation) ─── */
type CardSize = "large" | "medium" | "standard" | "wide";

// Cycle through different sizes for visual variety
const getSizePattern = (index: number): CardSize => {
  const pattern: CardSize[] = [
    "large", "standard", "medium", "standard",
    "wide", "standard", "standard", "medium",
    "standard", "large", "standard", "standard",
    "medium", "standard", "wide", "standard",
  ];
  return pattern[index % pattern.length];
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

/* ─── DISCOVERY CARD ─── */
interface DiscoveryCardProps {
  trend: TrendCardProps;
  size: CardSize;
  index: number;
}

const DiscoveryCard = React.memo(({ trend, size, index }: DiscoveryCardProps) => {
  const navigate = useNavigate();
  const accent = getAccentColor(trend.platform);
  const flag = trend.countryCode ? countryCodeToFlag(trend.countryCode) : null;
  const change = parseChange(trend.change);
  const title = decodeEntities(trend.title);
  const description = trend.description || trend.details || "";

  const handleClick = () => {
    if (trend.sourceUrl) {
      window.open(trend.sourceUrl, "_blank", "noopener");
    } else {
      navigate(`/dashboard?highlight=${encodeURIComponent(trend.title)}`);
    }
  };

  // Card height classes based on size
  const sizeClasses: Record<CardSize, string> = {
    large: "col-span-1 row-span-2 min-h-[380px] md:min-h-[440px]",
    medium: "col-span-1 min-h-[260px] md:min-h-[300px]",
    standard: "col-span-1 min-h-[200px] md:min-h-[220px]",
    wide: "col-span-1 md:col-span-2 min-h-[200px] md:min-h-[240px]",
  };

  const isLarge = size === "large";
  const isWide = size === "wide";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.6), ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/50 bg-card overflow-hidden cursor-pointer",
        "hover:border-border hover:shadow-[var(--shadow-md)] transition-all duration-300",
        sizeClasses[size],
      )}
    >
      {/* Accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `hsl(${accent})` }}
      />

      {/* Content */}
      <div className={cn("flex flex-col gap-3 p-5", isLarge && "p-6 gap-4")}>
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: `hsl(${accent} / 0.08)`,
                color: `hsl(${accent})`,
              }}
            >
              {trend.icon} {trend.platform}
            </span>
            {trend.category && trend.category !== "Geral" && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {trend.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {flag && <span className="text-xs">{flag}</span>}
            <span className="text-[10px] text-muted-foreground">{trend.time}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className={cn(
          "font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-3",
          isLarge ? "text-xl md:text-2xl" : isWide ? "text-lg md:text-xl" : "text-[15px] md:text-base"
        )}>
          {title}
        </h3>

        {/* Description — only on large/wide cards */}
        {(isLarge || isWide) && description && (
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3">
            {decodeEntities(description)}
          </p>
        )}

        {/* Sparkline — on large/medium cards */}
        {(isLarge || size === "medium") && trend.sparkData?.length > 2 && (
          <div className="mt-auto pt-2">
            <SparklineArea
              data={trend.sparkData}
              color={`hsl(${accent})`}
              height={isLarge ? 48 : 36}
              width={isLarge ? 180 : 120}
            />
          </div>
        )}
      </div>

      {/* Footer metrics */}
      <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-border/30 mt-auto">
        <div className="flex items-center gap-3">
          {trend.volume && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {trend.volume}
            </span>
          )}
          {change !== 0 && (
            <span className={cn(
              "text-[11px] font-semibold",
              trend.changePositive ? "text-[hsl(var(--color-positive))]" : "text-[hsl(var(--color-critical))]"
            )}>
              {trend.changePositive ? "+" : ""}{trend.change}
            </span>
          )}
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
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

  // First-visit redirect to /welcome
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

  // Filter by category & search
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

    // Deduplicate by normalized title
    const seen = new Set<string>();
    return trends.filter(t => {
      const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [translatedTrends, activeCategory, searchQuery]);

  // Stats
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* ─── HERO SECTION ─── */}
      <section className="px-4 md:px-8 lg:px-12 pt-8 md:pt-12 pb-6 md:pb-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-[28px] md:text-[36px] lg:text-[42px] font-bold tracking-tight leading-[1.1] text-foreground">
              {lang === "en" ? "Discover" : "Descobrir"}
            </h1>
            <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed max-w-xl">
              {lang === "en"
                ? "Explore global trends, signals and emerging conversations across platforms."
                : "Explore tendências globais, sinais e conversas emergentes em múltiplas plataformas."}
            </p>
          </div>

          {/* Live stats */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right">
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none">{stats.totalTrends}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                {lang === "en" ? "Signals" : "Sinais"}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none">{stats.platforms}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                {lang === "en" ? "Sources" : "Fontes"}
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-right">
              <p className="text-[22px] md:text-[26px] font-bold text-foreground leading-none">{stats.countries}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                {lang === "en" ? "Countries" : "Países"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <div className="sticky top-[56px] z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto w-full flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
          {/* Categories */}
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all duration-150 shrink-0",
                  active
                    ? "bg-foreground text-background"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {getCatLabel(cat)}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Search */}
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative shrink-0"
              >
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "en" ? "Search…" : "Buscar…"}
                  className="w-full h-8 pl-3 pr-8 rounded-full bg-secondary/60 border border-border/50 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── EDITORIAL GRID ─── */}
      <main className="flex-1 px-4 md:px-8 lg:px-12 py-6 md:py-8 max-w-[1400px] mx-auto w-full">
        {loading && isFirstLoad ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl bg-secondary/30 animate-pulse",
                  getSizePattern(i) === "large" ? "row-span-2 min-h-[380px]" :
                  getSizePattern(i) === "wide" ? "sm:col-span-2 min-h-[200px]" :
                  getSizePattern(i) === "medium" ? "min-h-[260px]" : "min-h-[200px]"
                )}
              />
            ))}
          </div>
        ) : displayTrends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-medium text-foreground">
              {lang === "en" ? "No signals found" : "Nenhum sinal encontrado"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {lang === "en"
                ? "Try changing the category or search term."
                : "Tente mudar a categoria ou o termo de busca."}
            </p>
            {(activeCategory !== "all" || searchQuery) && (
              <button
                onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                {lang === "en" ? "Clear filters" : "Limpar filtros"}
              </button>
            )}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min"
          >
            <AnimatePresence mode="popLayout">
              {displayTrends.slice(0, 40).map((trend, i) => (
                <DiscoveryCard
                  key={`${trend.platform}-${trend.title.slice(0, 30)}-${i}`}
                  trend={trend}
                  size={getSizePattern(i)}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Load more trigger */}
        {displayTrends.length > 40 && (
          <div className="flex justify-center pt-8">
            <button className="px-6 py-2.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
              {lang === "en" ? "Load more" : "Carregar mais"}
            </button>
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 px-4 md:px-8 lg:px-12 py-6 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Global Talk Trend — {lang === "en" ? "Trend Intelligence Platform" : "Plataforma de Inteligência de Tendências"}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="relative flex items-center justify-center w-1.5 h-1.5">
              <span className="absolute w-full h-full rounded-full bg-[hsl(var(--color-positive))] animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-positive))]" />
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {lang === "en" ? "Live data" : "Dados ao vivo"}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Discover;
