import React, { useMemo, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ExternalLink, Share2, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  PriorityResult, LIFECYCLE_LABELS, CONFIDENCE_CONFIG,
  getSourceType, SOURCE_NATURE_LABEL_MAP, SOURCE_NATURE_COLOR_MAP,
} from "@/lib/priority-engine";

// Lazy-load recharts — only when card is expanded
const LazyExpandedChart = lazy(() =>
  import("recharts").then(mod => ({
    default: ({ data, color, gradId }: { data: any[]; color: string; gradId: string }) => (
      <mod.ResponsiveContainer width="100%" height="100%">
        <mod.AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <mod.XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={2} />
          <mod.YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <mod.Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }} />
          <mod.Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} />
        </mod.AreaChart>
      </mod.ResponsiveContainer>
    ),
  }))
);

/* ─── Category color map ─── */
const CATEGORY_COLORS: Record<string, string> = {
  "entretenimento": "var(--cat-entretenimento)", "entertainment": "var(--cat-entretenimento)",
  "tecnologia": "var(--cat-tecnologia)", "technology": "var(--cat-tecnologia)",
  "geopolítica": "var(--cat-geopolitica)", "geopolitics": "var(--cat-geopolitica)",
  "política": "var(--cat-geopolitica)", "politics": "var(--cat-geopolitica)",
  "esportes": "var(--cat-esportes)", "sports": "var(--cat-esportes)",
  "ciências": "var(--cat-ciencias)", "science": "var(--cat-ciencias)", "ciência": "var(--cat-ciencias)",
  "cultura": "var(--cat-cultura)", "culture": "var(--cat-cultura)",
  "economia": "var(--cat-economia)", "economy": "var(--cat-economia)", "business": "var(--cat-economia)",
};
function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toLowerCase().trim() || ""] || "var(--muted-foreground)";
}

/* ─── Helpers ─── */
const SOURCE_HEX: Record<string, string> = {
  imprensa: "#2563EB", redes_sociais: "#F97316", google_trends: "#FACC15",
  dados_oficiais: "#10B981", cientifico: "#8B5CF6", enciclopedico: "#06B6D4",
};

const TERM_EXPLANATIONS: Record<string, Record<string, string>> = {
  pt: {
    "CPIAUCSL": "CPI = Índice de Preços ao Consumidor dos EUA", "PMID": "PMID = identificador de artigo no PubMed",
    "FRED": "FRED = base de dados econômicos do Fed de St. Louis", "DOI": "DOI = identificador digital de publicação acadêmica",
    "GDP": "GDP = Produto Interno Bruto", "CPI": "CPI = Índice de Preços ao Consumidor",
    "WHO": "WHO = Organização Mundial da Saúde", "IMF": "IMF = Fundo Monetário Internacional",
    "IBGE": "IBGE = Instituto Brasileiro de Geografia e Estatística", "PMI": "PMI = Índice de Gerentes de Compras",
    "ARXIV": "arXiv = repositório de preprints científicos",
  },
  en: {
    "CPIAUCSL": "CPI = US Consumer Price Index", "PMID": "PMID = PubMed article identifier",
    "FRED": "FRED = Federal Reserve Economic Data", "DOI": "DOI = Digital Object Identifier",
    "GDP": "GDP = Gross Domestic Product", "CPI": "CPI = Consumer Price Index",
    "WHO": "WHO = World Health Organization", "IMF": "IMF = International Monetary Fund",
    "IBGE": "IBGE = Brazilian Institute of Geography and Statistics", "PMI": "PMI = Purchasing Managers' Index",
    "ARXIV": "arXiv = scientific preprint repository",
  },
};

function findTermExplanation(title: string, lang: string): string | null {
  const terms = TERM_EXPLANATIONS[lang] || TERM_EXPLANATIONS.pt;
  const upper = title.toUpperCase();
  for (const [term, explanation] of Object.entries(terms)) {
    if (upper.includes(term)) return explanation;
  }
  return null;
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el) return text;
  el.innerHTML = text;
  return el.value;
};

const relativeTimeFormats: Record<string, { now: string; min: string; h: string; d: string }> = {
  pt: { now: "agora", min: "há {n}min", h: "há {n}h", d: "há {n}d" },
  en: { now: "now", min: "{n}min ago", h: "{n}h ago", d: "{n}d ago" },
  es: { now: "ahora", min: "hace {n}min", h: "hace {n}h", d: "hace {n}d" },
};

/* ─── Mini Sparkline (used only in expanded view now) ─── */
const SparklineSVG = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `sp_${Math.random().toString(36).slice(2, 7)}`, []);
  const { pathD, areaD, lastPt } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "", lastPt: { x: 0, y: 0 } };
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const w = 100, h = 24, pad = 2;
    const pts = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));
    const d = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
    }, "");
    return { pathD: d, areaD: `${d} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`, lastPt: pts[pts.length - 1] };
  }, [data]);
  if (!data || data.length < 2) return null;
  return (
    <svg width={100} height={24} viewBox="0 0 100 24" className="w-full h-full" style={{ overflow: "visible" }} role="img" aria-label="Trend sparkline chart">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeInOut" }} />
      <circle cx={lastPt.x} cy={lastPt.y} r="1.5" fill={color}>
        <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});
SparklineSVG.displayName = "SparklineSVG";

/* ─── Check if chart data is meaningful ─── */
function isChartMeaningful(data: number[] | null): boolean {
  if (!data || data.length < 3) return false;
  const max = Math.max(...data), min = Math.min(...data);
  // If variance is < 5% of max, chart is flat/inexpressive
  if (max === 0) return false;
  return (max - min) / max > 0.05;
}

/* ─── Scroll entry animation ─── */
export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] } },
};

/* ─── Main component ─── */
export interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onSaveCard?: (card: any) => void;
  onAddToWatchlist?: (card: any) => void;
  staggerIndex?: number;
  compact?: boolean;
  isSelected?: boolean;
  isMultiplatform?: boolean;
  aiContext?: string;
  priority?: PriorityResult;
  mapSelected?: boolean;
}

const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  historicalData, countryCode, sources, sourceUrl, trustBadge, thumbnail,
  publishedAt, description, details, translated, isMultiplatform, sparkData: rawSparkData,
  aiContext, priority, mapSelected,
  onClick, onFilterPlatform, onSaveCard, onAddToWatchlist,
  staggerIndex = 0, compact = false, isSelected = false,
}: TimelineCardProps) => {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const sourceType = getSourceType(platform);
  const sparkHex = SOURCE_HEX[sourceType] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);
  const catColor = getCatColor(category);

  const formattedTime = useMemo(() => {
    if (!publishedAt) {
      if (!time) return time;
      const lower = time.toLowerCase().trim();
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (lower === "agora" || lower === "now") return fmt.now;
      const match = lower.match(/(?:há\s*)?(\d+)\s*(min|m|h|d)/i);
      if (!match) return time;
      const val = match[1], unit = match[2].toLowerCase();
      if (unit === "min" || unit === "m") return fmt.min.replace("{n}", val);
      if (unit === "h") return fmt.h.replace("{n}", val);
      if (unit === "d") return fmt.d.replace("{n}", val);
      return time;
    }
    try {
      const date = new Date(publishedAt);
      if (isNaN(date.getTime())) return time;
      const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (diffMin < 1) return fmt.now;
      if (diffMin < 60) return fmt.min.replace("{n}", String(diffMin));
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return fmt.h.replace("{n}", String(diffH));
      return date.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short" });
    } catch { return time; }
  }, [publishedAt, time, lang]);

  const sparkData = useMemo(() => {
    if (historicalData && historicalData.length >= 2) return historicalData.slice(-12).map(d => d.value);
    if (rawSparkData && rawSparkData.length >= 2) return rawSparkData.slice(-12);
    return null;
  }, [historicalData, rawSparkData]);

  const chartIsMeaningful = useMemo(() => isChartMeaningful(sparkData), [sparkData]);

  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  // Deduplicate context: don't repeat title content
  const contextSnippet = useMemo(() => {
    const raw = aiContext || description || details || "";
    if (!raw) return null;
    const normTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const normDesc = raw.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (!normDesc || normDesc === normTitle) return null;
    const titleWords = normTitle.split(/\s+/).slice(0, 5).join(" ");
    if (titleWords.length > 10 && normDesc.startsWith(titleWords)) return null;
    const snippet = raw.slice(0, 180) + (raw.length > 180 ? "…" : "");
    return snippet;
  }, [aiContext, description, details, title]);

  const termExplanation = useMemo(() => findTermExplanation(title, lang), [title, lang]);

  const propagationSources = useMemo(() => {
    if (!sources || sources.length <= 1) return null;
    return sources.slice(0, 4).map(s => typeof s === "string" ? s : (s as any).name || (s as any).platform || "");
  }, [sources]);

  const hasThumbnail = thumbnail && thumbnail.startsWith("http");

  // Is this a press/news source that should show editorial thumbnail?
  const isPress = sourceType === "imprensa";

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = sourceUrl || window.location.href;
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})\n${shareUrl}`);
    toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!", description: title.slice(0, 60) });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Unified save: saves to collection AND adds to watchlist
    onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
    onAddToWatchlist?.({ title, platform, category, countryCode, volume, change, changePositive, sources });
    toast({
      title: lang === "pt" ? "Salvo na coleção" : "Saved to collection",
      description: lang === "pt" ? "Você pode acompanhar em 'Coleções'" : "Track it in 'Collections'",
    });
  };

  const handleCardClick = () => {
    if (compact) { onClick?.(); } else { setExpanded(prev => !prev); }
  };

  // v2.0 visual config
  const confConfig = priority ? CONFIDENCE_CONFIG[priority.confidence] : null;
  const lcConfig = priority ? LIFECYCLE_LABELS[priority.lifecycle] : null;
  const sourceNatureLabel = priority?.sourceNature || (SOURCE_NATURE_LABEL_MAP[sourceType]?.[lang] || "");
  const sourceNatureColor = SOURCE_NATURE_COLOR_MAP[sourceType] || sparkHex;

  /* ═══ COMPACT MODE ═══ */
  if (compact) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-30px" }}
        layout
        whileTap={{ scale: 0.98 }}
        className="bg-card rounded-md border border-border/20 cursor-pointer w-full relative overflow-hidden
          shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]
          hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.08)]
          transition-shadow duration-200"
        style={{ padding: "6px 10px" }}
        onClick={() => onClick?.()}
      >
        {/* Category tag + Title in one line */}
        <div className="flex items-start gap-1.5">
          <span className="text-[7px] font-bold px-1 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `hsl(${catColor} / 0.12)`, color: `hsl(${catColor})` }}>
            {category}
          </span>
          <h3 className="text-[11px] font-semibold text-foreground leading-snug line-clamp-1 flex-1 min-w-0"
            style={{ wordBreak: "break-word" }}>
            {decodeEntities(title)}
          </h3>
          {flag && <span className="text-[10px] flex-shrink-0">{flag}</span>}
          {showChange && (
            <span className={`text-[9px] font-bold tabular-nums flex-shrink-0 ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  /* ═══ FULL CARD — Kanban editorial style ═══ */
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-30px" }}
      layout
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.99 }}
      className={`bg-card rounded-lg border border-border/20 cursor-pointer w-full relative overflow-hidden
        shadow-[0_1px_4px_0_hsl(var(--foreground)/0.05),0_2px_8px_-2px_hsl(var(--foreground)/0.06)]
        hover:shadow-[0_3px_12px_0_hsl(var(--foreground)/0.08),0_2px_6px_-2px_hsl(var(--foreground)/0.09)]
        transition-shadow duration-200
        ${mapSelected ? "ring-2 ring-primary/20" : ""}
        ${isSelected ? "shadow-[var(--shadow-md)]" : ""}`}
      onClick={handleCardClick}
    >
      {/* ─── Category accent bar (top edge) ─── */}
      <div className="h-[2px] w-full" style={{ backgroundColor: `hsl(${catColor} / 0.5)` }} />

      <div className="px-3 pt-2.5 pb-2">
        {/* ① META LINE: category tag + source + time + stage */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[8px] font-bold px-1.5 py-[1px] rounded-full uppercase tracking-wider"
            style={{ backgroundColor: `hsl(${catColor} / 0.1)`, color: `hsl(${catColor})` }}>
            {category}
          </span>

          <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
            className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <span className="text-[7px] font-semibold px-1.5 py-[1px] rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${sourceNatureColor} 10%, transparent)`, color: sourceNatureColor }}>
              {sourceNatureLabel}
            </span>
          </button>

          {flag && <span className="text-[10px]" title={countryCode}>{flag}</span>}
          <span className="text-[8px] text-muted-foreground/60">{formattedTime}</span>

          <div className="flex-1" />

          {lcConfig && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[8px] font-medium cursor-help" style={{ color: lcConfig.color }}>
                  {lcConfig.icon} {lcConfig[lang as "pt" | "en"] || lcConfig.en}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                {lcConfig.desc[lang as "pt" | "en"] || lcConfig.desc.en}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ② TITLE — primary visual element */}
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-[1.3] line-clamp-2 mb-1"
          style={{ wordBreak: "break-word", letterSpacing: "-0.01em" }}>
          {decodeEntities(title)}
        </h3>

        {/* ③ CONTEXT — real editorial snippet */}
        {contextSnippet && (
          <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">
            {decodeEntities(contextSnippet)}
          </p>
        )}

        {/* ④ EDITORIAL THUMBNAIL — for press/news cards with images */}
        {hasThumbnail && isPress && (
          <div className="rounded-md overflow-hidden mb-2 bg-muted aspect-[16/9] max-h-[160px]">
            <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
          </div>
        )}

        {/* ⑤ FOOTER: metrics + actions */}
        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          {confConfig && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-[7px] font-bold px-1.5 py-[2px] rounded-full border cursor-help ${confConfig.className}`}>
                  {confConfig.icon} {confConfig.label[lang as "pt" | "en"] || confConfig.label.en}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] max-w-[220px]">
                {lang === "pt"
                  ? `Confiança baseada em ${priority?.sourceCount || 1} fonte(s) independente(s)`
                  : `Confidence based on ${priority?.sourceCount || 1} independent source(s)`}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Volume + Change — small, secondary */}
          {showChange && (
            <span className={`text-[10px] font-bold tabular-nums ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
          {showVolume && (
            <span className="text-[9px] text-muted-foreground/40 tabular-nums">{volume}</span>
          )}
          {sources && sources.length > 1 && (
            <span className="text-[8px] text-muted-foreground/30 tabular-nums">{sources.length} src</span>
          )}

          <div className="flex-1" />

          {/* Action buttons — unified style */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleShare}
                  className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground/70 hover:bg-accent/50 transition-colors"
                  aria-label={lang === "pt" ? "Compartilhar" : "Share"}>
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {lang === "pt" ? "Compartilhar" : "Share"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleSave}
                  className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground/70 hover:bg-accent/50 transition-colors"
                  aria-label={lang === "pt" ? "Salvar" : "Save"}>
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {lang === "pt" ? "Salvar na coleção" : "Save to collection"}
              </TooltipContent>
            </Tooltip>

            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      {/* ═══ EXPANDED ACCORDION ═══ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 border-t border-border/10 space-y-2.5">
              {termExplanation && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md text-[10px] leading-relaxed bg-muted/30 border-l-2 border-primary/30 text-muted-foreground">
                  <span className="flex-shrink-0">💡</span>
                  <span>{termExplanation}</span>
                </div>
              )}

              {/* Full description — only if different from context snippet */}
              {(description || details) && (() => {
                const fullText = (description || details || "").slice(0, 400);
                if (contextSnippet && fullText.startsWith(contextSnippet.replace("…", ""))) return null;
                return <p className="text-[11px] text-muted-foreground leading-relaxed">{decodeEntities(fullText)}</p>;
              })()}

              {/* Non-press thumbnail (shown only in expanded for social/data sources) */}
              {hasThumbnail && !isPress && (
                <div className="rounded-md overflow-hidden bg-muted aspect-video max-h-[140px]">
                  <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                </div>
              )}

              {/* Relevance bar */}
              {priority && (
                <div className="flex items-center gap-3 px-2 py-1.5 rounded-md bg-muted/20">
                  <div className="flex-1">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-0.5">
                      {lang === "pt" ? "Relevância" : "Relevance"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-full h-[3px] rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${priority.normalizedVolume * 100}%`, backgroundColor: sparkHex }} />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{Math.round(priority.normalizedVolume * 100)}%</span>
                    </div>
                  </div>
                  {showVolume && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block">{lang === "pt" ? "Métrica" : "Metric"}</span>
                      <span className="text-[11px] font-semibold text-foreground tabular-nums">{volume}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Sparkline — only shown expanded, only if meaningful */}
              {chartIsMeaningful && sparkData && (
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                    {lang === "pt" ? "Tendência" : "Trend"}
                  </span>
                  <div className="h-6">
                    <SparklineSVG data={sparkData} color={sparkHex} />
                  </div>
                </div>
              )}

              {/* Historical chart — LAZY LOADED, only if meaningful */}
              {historicalData && historicalData.length > 2 && isChartMeaningful(historicalData.map(d => d.value)) && (
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                    {lang === "pt" ? "Evolução 24h" : "24h Evolution"}
                  </span>
                  <div className="h-28 -mx-1">
                    <Suspense fallback={<div className="h-full bg-muted/20 rounded animate-pulse" />}>
                      <LazyExpandedChart
                        data={historicalData.slice(-12)}
                        color={sparkHex}
                        gradId={`exp_${title.slice(0, 5)}_${staggerIndex}`}
                      />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* Propagation */}
              {propagationSources && (
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                    {lang === "pt" ? "Propagação" : "Propagation"}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {propagationSources.map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[8px] text-muted-foreground/20">→</span>}
                        <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary">{s}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Country */}
              {countryCode && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground/30" />
                  <span className="text-[9px] text-muted-foreground">
                    {flag} {countryCode?.toUpperCase()}
                    {isMultiplatform && <span className="ml-1 text-[8px] text-primary">+ {lang === "pt" ? "múltiplas regiões" : "multiple regions"}</span>}
                  </span>
                </div>
              )}

              {/* Source link */}
              <div className="flex items-center gap-3 pt-1 border-t border-border/10">
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    {lang === "pt" ? "Fonte original" : "Original source"}
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default React.memo(TimelineCard);
