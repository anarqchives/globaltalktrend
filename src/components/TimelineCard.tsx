import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ExternalLink, Share2, ChevronDown, Globe, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { toast } from "@/hooks/use-toast";
import {
  PriorityResult, LIFECYCLE_LABELS, TIER_CONFIG, CONFIDENCE_CONFIG,
  getSourceType, SOURCE_NATURE_LABEL_MAP, SOURCE_NATURE_COLOR_MAP,
} from "@/lib/priority-engine";

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

/* ─── Mini Sparkline ─── */
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

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] } },
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

  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  const contextSnippet = useMemo(() => {
    if (aiContext) return aiContext.slice(0, 200);
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw.slice(0, 160) + (raw.length > 160 ? "…" : "");
  }, [aiContext, description, details, title]);

  const termExplanation = useMemo(() => findTermExplanation(title, lang), [title, lang]);

  const propagationSources = useMemo(() => {
    if (!sources || sources.length <= 1) return null;
    return sources.slice(0, 4).map(s => typeof s === "string" ? s : (s as any).name || (s as any).platform || "");
  }, [sources]);

  const hasThumbnail = thumbnail && thumbnail.startsWith("http");

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = sourceUrl || window.location.href;
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})\n${shareUrl}`);
    toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!", description: title.slice(0, 60) });
  };

  const handleCardClick = () => {
    if (compact) { onClick?.(); } else { setExpanded(prev => !prev); }
  };

  // v2.0 visual config
  const tierBorder = priority ? TIER_CONFIG[priority.tier].borderColor : sparkHex;
  const confConfig = priority ? CONFIDENCE_CONFIG[priority.confidence] : null;
  const lcConfig = priority ? LIFECYCLE_LABELS[priority.lifecycle] : null;
  const sourceNatureLabel = priority?.sourceNature || (SOURCE_NATURE_LABEL_MAP[sourceType]?.[lang] || "");
  const sourceNatureColor = SOURCE_NATURE_COLOR_MAP[sourceType] || sparkHex;

  /* ═══════════════════════════════════════════════════════════
   *  COMPACT MODE — border + reason + title + confidence + stage
   * ═══════════════════════════════════════════════════════════ */
  if (compact) {
    return (
      <motion.div
        variants={cardVariants}
        layout
        whileTap={{ scale: 0.98 }}
        className="bg-card rounded-md border border-border/15 cursor-pointer w-full relative overflow-hidden
          shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]
          hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.08)]
          transition-shadow duration-200"
        style={{ borderLeftWidth: 4, borderLeftColor: tierBorder, padding: "6px 10px" }}
        onClick={() => onClick?.()}
      >
        {/* Line 1: Reason */}
        {priority && (
          <p className="text-[9px] font-semibold truncate mb-0.5" style={{ color: tierBorder }}>
            {priority.reason}
          </p>
        )}

        {/* Line 2: Title */}
        <h3 className="text-[11px] font-semibold text-foreground leading-snug line-clamp-1 mb-0.5"
          style={{ wordBreak: "break-word" }}>
          {decodeEntities(title)}
        </h3>

        {/* Line 3: Confidence + Stage + Time + Sparkline */}
        <div className="flex items-center gap-1.5">
          {confConfig && (
            <span className={`text-[7px] font-bold px-1 py-0.5 rounded border ${confConfig.className}`}>
              {confConfig.icon}
            </span>
          )}
          {lcConfig && (
            <span className="text-[8px]" style={{ color: lcConfig.color }}>
              {lcConfig.icon}
            </span>
          )}
          {flag && <span className="text-[9px]">{flag}</span>}
          <span className="text-[8px] text-muted-foreground">{formattedTime}</span>
          <div className="flex-1" />
          {sparkData && sparkData.length >= 2 && (
            <div className="w-12 h-4 flex-shrink-0">
              <SparklineSVG data={sparkData} color={sparkHex} />
            </div>
          )}
          {showChange && (
            <span className={`text-[9px] font-bold tabular-nums ${changePositive ? "text-emerald-600" : "text-red-500"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
   *  EXPANDED MODE — full v2.0 card
   * ═══════════════════════════════════════════════════════════ */
  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -1, transition: { duration: 0.15, ease: [0.21, 0.47, 0.32, 0.98] } }}
      whileTap={{ scale: 0.98 }}
      className={`bg-card rounded-lg border cursor-pointer w-full relative overflow-hidden
        shadow-[0_1px_4px_0_hsl(var(--foreground)/0.05),0_2px_8px_-2px_hsl(var(--foreground)/0.06)]
        hover:shadow-[0_3px_12px_0_hsl(var(--foreground)/0.08),0_2px_6px_-2px_hsl(var(--foreground)/0.09)]
        transition-shadow duration-200 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${mapSelected ? "ring-2 ring-primary/20" : ""}
        ${isSelected ? "shadow-[var(--shadow-md)]" : ""}`}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: tierBorder,
        borderTopColor: "hsl(var(--border) / 0.15)",
        borderRightColor: "hsl(var(--border) / 0.15)",
        borderBottomColor: "hsl(var(--border) / 0.15)",
        padding: "10px 12px",
      }}
      onClick={handleCardClick}
    >
      {/* ① REASON — dominant first-read element */}
      {priority && (
        <p className="text-[10px] font-bold leading-tight truncate mb-1" style={{ color: tierBorder }}>
          {priority.reason}
        </p>
      )}

      {/* ② TITLE + thumbnail */}
      <div className="flex gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2"
            style={{ wordBreak: "break-word" }}>
            {decodeEntities(title)}
          </h3>
        </div>
        {hasThumbnail && (
          <div className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-muted">
            <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>

      {/* ③ CONFIDENCE + SOURCE TYPE + TIME + STAGE — single metadata line */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {/* Confidence badge (independent) */}
        {confConfig && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border cursor-help ${confConfig.className}`}>
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

        {/* Source nature badge (color = origin type, NOT reliability) */}
        <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity">
          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `color-mix(in srgb, ${sourceNatureColor} 12%, transparent)`, color: sourceNatureColor }}>
            {sourceNatureLabel}
          </span>
        </button>

        {/* Platform name */}
        <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-wider">{platform}</span>

        <span className="text-[8px] text-muted-foreground/20">·</span>

        {/* Flag */}
        {flag && <span className="text-[10px]" title={countryCode}>{flag}</span>}

        {/* Time */}
        <span className="text-[9px] text-muted-foreground">{formattedTime}</span>

        {/* Multi-platform */}
        {isMultiplatform && (
          <span className="text-[7px] font-semibold px-1 py-0.5 rounded bg-primary/8 text-primary">
            🌐 Multi
          </span>
        )}

        <div className="flex-1" />

        {/* Stage — always visible */}
        {lcConfig && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[8px] font-semibold cursor-help" style={{ color: lcConfig.color }}>
                {lcConfig.icon} {lcConfig[lang as "pt" | "en"] || lcConfig.en}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] max-w-[200px]">
              {lcConfig.desc[lang as "pt" | "en"] || lcConfig.desc.en}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ④ CONTEXT (1-line default, 2 expanded) — only when title isn't enough */}
      {contextSnippet && (
        <p className={`text-[10px] text-muted-foreground leading-relaxed mb-1.5 ${expanded ? "line-clamp-3" : "line-clamp-1"}`}>
          {decodeEntities(contextSnippet)}
        </p>
      )}

      {/* ⑤ SPARKLINE + DELTA + VOLUME — bottom row */}
      <div className="flex items-end gap-2 mt-0.5">
        {sparkData && sparkData.length >= 2 && (
          <div className="flex-1 min-w-0" style={{ height: 22 }}>
            <SparklineSVG data={sparkData} color={sparkHex} />
          </div>
        )}
        {!sparkData && <div className="flex-1" />}

        <div className="flex items-center gap-2 flex-shrink-0">
          {showChange && (
            <span className={`text-[10px] font-bold tabular-nums ${changePositive ? "text-emerald-600" : "text-red-500"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
          {showVolume && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums cursor-help">{volume}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {lang === "pt" ? "Métrica bruta da fonte original" : "Raw metric from original source"}
              </TooltipContent>
            </Tooltip>
          )}
          {sources && sources.length > 1 && (
            <span className="text-[8px] text-muted-foreground/40 tabular-nums">{sources.length}src</span>
          )}

          {/* Minimal actions */}
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={handleShare} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors"
              aria-label={lang === "pt" ? "Compartilhar" : "Share"}>
              <Share2 className="w-3 h-3" aria-hidden="true" />
            </button>
            <button onClick={(e) => {
              e.stopPropagation();
              onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
            }} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors"
              aria-label={lang === "pt" ? "Salvar" : "Save"}>
              <Bookmark className="w-3 h-3" aria-hidden="true" />
            </button>
            {onAddToWatchlist && (
              <button onClick={(e) => {
                e.stopPropagation();
                onAddToWatchlist({ title, platform, category, countryCode, volume, change, changePositive, sources });
              }} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors"
                aria-label={lang === "pt" ? "Monitorar tendência" : "Watch trend"}>
                <Eye className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <ChevronDown className={`w-3 h-3 text-muted-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* ⑥ PROPAGATION (collapsed only) */}
      {propagationSources && !expanded && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/10 overflow-hidden">
          <span className="text-[7px] text-muted-foreground/30 uppercase tracking-wider flex-shrink-0">
            {lang === "pt" ? "PROP" : "PROP"}
          </span>
          {propagationSources.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[8px] text-muted-foreground/20">→</span>}
              <span className="text-[8px] font-medium text-muted-foreground px-1 py-0.5 rounded bg-muted/30 truncate max-w-[60px]">{s}</span>
            </React.Fragment>
          ))}
        </div>
      )}

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
            <div className="mt-3 pt-3 border-t border-border/15 space-y-3">
              {/* Term explanation */}
              {termExplanation && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md text-[9px] leading-relaxed bg-muted/30 border-l-2 border-primary/30 text-muted-foreground">
                  <span className="flex-shrink-0">💡</span>
                  <span>{termExplanation}</span>
                </div>
              )}

              {/* Full description */}
              {(description || details) && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {decodeEntities((description || details || "").slice(0, 400))}
                </p>
              )}

              {/* Metric + normalized relevance */}
              {priority && (
                <div className="flex items-center gap-3 px-2 py-1.5 rounded-md bg-muted/20">
                  <div className="flex-1">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block">
                      {lang === "pt" ? "Relevância" : "Relevance"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-full h-[3px] rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${priority.normalizedVolume * 100}%`, backgroundColor: sparkHex }} />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{Math.round(priority.normalizedVolume * 100)}%</span>
                    </div>
                  </div>
                  {showVolume && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block">
                        {lang === "pt" ? "Métrica" : "Metric"}
                      </span>
                      <span className="text-[10px] font-semibold text-foreground tabular-nums">{volume}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Country */}
              {countryCode && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-[9px] text-muted-foreground">
                    {flag} {countryCode?.toUpperCase()}
                    {isMultiplatform && (
                      <span className="ml-1 text-[8px] text-primary">
                        + {lang === "pt" ? "múltiplas regiões" : "multiple regions"}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Historical chart */}
              {historicalData && historicalData.length > 2 && (
                <div>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {lang === "pt" ? "Evolução 24h" : "24h Evolution"}
                  </span>
                  <div className="h-28 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData.slice(-12)}>
                        <defs>
                          <linearGradient id={`exp_${title.slice(0, 5)}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sparkHex} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={sparkHex} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28}
                          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                        <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }} />
                        <Area type="monotone" dataKey="value" stroke={sparkHex} strokeWidth={1.5} fill={`url(#exp_${title.slice(0, 5)})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Propagation */}
              {propagationSources && (
                <div>
                  <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider block mb-1">
                    {lang === "pt" ? "Propagação" : "Propagation"}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {propagationSources.map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[9px] text-muted-foreground/25">→</span>}
                        <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary">{s}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-1">
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline group">
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    {lang === "pt" ? "Fonte original" : "Original source"}
                  </a>
                )}
                {onAddToWatchlist && (
                  <button onClick={(e) => {
                    e.stopPropagation();
                    onAddToWatchlist({ title, platform, category, countryCode, volume, change, changePositive, sources });
                  }} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <Eye className="w-3 h-3" />
                    {lang === "pt" ? "Monitorar" : "Watch"}
                  </button>
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
