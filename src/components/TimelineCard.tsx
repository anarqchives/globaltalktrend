import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ExternalLink, Share2, ChevronDown, Globe, Eye, ShieldCheck, TrendingUp, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { toast } from "@/hooks/use-toast";
import { PriorityResult, LIFECYCLE_LABELS } from "@/lib/priority-engine";

/* ─── Source classification ─── */
const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bing news": "imprensa", "newsdata": "imprensa", "thenewsapi": "imprensa", "the news api": "imprensa",
  "variety": "imprensa", "bbc": "imprensa", "reuters": "imprensa", "france 24": "imprensa",
  "ap news": "imprensa", "bloomberg": "imprensa", "nyt": "imprensa", "guardian": "imprensa",
  "folha": "imprensa", "estadão": "imprensa", "o globo": "imprensa", "el país": "imprensa",
  "le monde": "imprensa", "der spiegel": "imprensa", "al jazeera": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "ibge": "dados_oficiais", "imf": "dados_oficiais", "who": "dados_oficiais", "noaa": "dados_oficiais",
  "pubmed": "cientifico", "openal": "cientifico", "arxiv": "cientifico",
  "crossref": "cientifico", "semantic scholar": "cientifico",
  "wikipedia": "enciclopedico",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) { if (p.includes(key)) return val; }
  return "imprensa";
}

const SOURCE_HEX: Record<string, string> = {
  imprensa: "#2563EB", redes_sociais: "#F97316", google_trends: "#FACC15",
  dados_oficiais: "#10B981", cientifico: "#8B5CF6", enciclopedico: "#06B6D4",
};

/* ─── 4-dimension badge system ─── */
// Dimension 1: ORIGIN (where it comes from)
const ORIGIN_BADGES: Record<string, { label: Record<string, string>; icon: string; css: string }> = {
  imprensa: { label: { pt: "Imprensa", en: "Press" }, icon: "✓", css: "bg-[hsl(var(--source-press)/0.1)] text-[hsl(var(--source-press))]" },
  dados_oficiais: { label: { pt: "Oficial", en: "Official" }, icon: "◆", css: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]" },
  cientifico: { label: { pt: "Acadêmico", en: "Academic" }, icon: "◈", css: "bg-[hsl(var(--source-academic)/0.1)] text-[hsl(var(--source-academic))]" },
  enciclopedico: { label: { pt: "Enciclopédico", en: "Encyclopedic" }, icon: "◎", css: "bg-[hsl(var(--source-encyclopedic)/0.1)] text-[hsl(var(--source-encyclopedic))]" },
  redes_sociais: { label: { pt: "Social", en: "Social" }, icon: "◉", css: "bg-[hsl(var(--source-social)/0.1)] text-[hsl(var(--source-social))]" },
  google_trends: { label: { pt: "Buscas", en: "Searches" }, icon: "◉", css: "bg-[hsl(var(--source-search)/0.1)] text-[hsl(var(--source-search))]" },
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

/* ─── Smart chart type selection ─── */
type ChartType = "sparkline" | "bars" | "momentum" | "segments";

function pickChartType(sourceType: string, sparkData: number[] | null, changeNum: number): ChartType {
  if (!sparkData || sparkData.length < 2) return "sparkline";
  if (sourceType === "dados_oficiais" || sourceType === "cientifico") return "bars";
  if (changeNum > 100) return "momentum";
  if (sparkData.length >= 6) return "sparkline";
  return "segments";
}

/* ─── Mini Sparkline SVG ─── */
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
  if (!data || data.length < 2) return <span className="text-[8px] text-muted-foreground/30 italic">—</span>;
  return (
    <svg width={100} height={24} viewBox="0 0 100 24" className="w-full h-full" style={{ overflow: "visible" }}>
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

const MiniBars = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[1px] h-[22px] w-full">
      {data.slice(-8).map((v, i) => (
        <motion.div key={i} className="flex-1 rounded-t-[1px] min-w-[3px]"
          style={{ backgroundColor: color, opacity: 0.3 + (v / max) * 0.7 }}
          initial={{ height: 0 }} animate={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
});
MiniBars.displayName = "MiniBars";

const MomentumLine = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `mom_${Math.random().toString(36).slice(2, 7)}`, []);
  const { pathD, areaD } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "" };
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const w = 100, h = 24, pad = 1;
    const pts = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));
    const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    return { pathD: d, areaD: `${d} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z` };
  }, [data]);
  if (!data || data.length < 2) return null;
  return (
    <svg width={100} height={24} viewBox="0 0 100 24" className="w-full h-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
    </svg>
  );
});
MomentumLine.displayName = "MomentumLine";

const SegmentBars = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex items-center gap-[1px] h-[6px] w-full rounded-full overflow-hidden bg-muted/30">
      {data.slice(-6).map((v, i) => (
        <motion.div key={i} style={{ width: `${(v / total) * 100}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }}
          className="h-full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3, delay: i * 0.05 }}
        />
      ))}
    </div>
  );
});
SegmentBars.displayName = "SegmentBars";

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] } },
};

/* ─── Priority Score Bar ─── */
const TIER_COLORS: Record<string, string> = {
  critical: "hsl(var(--priority-critical))",
  high: "hsl(var(--priority-high))",
  medium: "hsl(var(--priority-medium))",
  low: "hsl(var(--priority-low))",
};

const PriorityBar = React.memo(({ priority, lang }: { priority: PriorityResult; lang: string }) => {
  const color = TIER_COLORS[priority.tier] || TIER_COLORS.low;
  const lc = LIFECYCLE_LABELS[priority.lifecycle];
  const lifecycleLabel = lc[lang as "pt" | "en"] || lc.en;
  
  return (
    <div className="flex items-center gap-2 mb-1.5">
      {/* Score number */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help flex-shrink-0">
            <span className="text-[11px] font-black tabular-nums" style={{ color }}>{priority.score}</span>
            <div className="w-[32px] h-[3px] rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${priority.score}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-[10px]">
          {lang === "pt" ? "Score de prioridade: volume + crescimento + confiança + frescor" : "Priority score: volume + growth + confidence + freshness"}
        </TooltipContent>
      </Tooltip>

      {/* Lifecycle badge */}
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md"
        style={{ 
          backgroundColor: `hsl(var(--lifecycle-${priority.lifecycle}) / 0.1)`,
          color: `hsl(var(--lifecycle-${priority.lifecycle}))`,
        }}>
        {lc.icon} {lifecycleLabel}
      </span>

      {/* Confidence dot */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5 cursor-help">
            <ShieldCheck className="w-2.5 h-2.5" style={{ color: priority.confidence > 0.7 ? "hsl(var(--success-fg))" : priority.confidence > 0.4 ? "hsl(var(--warning-fg))" : "hsl(var(--destructive))" }} />
            <span className="text-[8px] tabular-nums text-muted-foreground">{Math.round(priority.confidence * 100)}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          {lang === "pt" ? "Nível de confiança baseado na qualidade e quantidade de fontes" : "Confidence level based on source quality and quantity"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
});
PriorityBar.displayName = "PriorityBar";

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
  mapSelected?: boolean; // true when this card matches a map selection
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
  const originBadge = ORIGIN_BADGES[sourceType];

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
  const chartType = useMemo(() => pickChartType(sourceType, sparkData, changeNum), [sourceType, sparkData, changeNum]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = sourceUrl || window.location.href;
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})\n${shareUrl}`);
    toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!", description: title.slice(0, 60) });
  };

  const handleCardClick = () => {
    if (compact) { onClick?.(); } else { setExpanded(prev => !prev); }
  };

  const renderSmartChart = () => {
    if (!sparkData || sparkData.length < 2) return <span className="text-[8px] text-muted-foreground/30 italic">—</span>;
    switch (chartType) {
      case "bars": return <MiniBars data={sparkData} color={sparkHex} />;
      case "momentum": return <MomentumLine data={sparkData} color={sparkHex} />;
      case "segments": return <SegmentBars data={sparkData} color={sparkHex} />;
      default: return <SparklineSVG data={sparkData} color={sparkHex} />;
    }
  };

  const tierBorderColor = priority ? TIER_COLORS[priority.tier] : undefined;

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] } }}
      whileTap={{ scale: 0.98 }}
      className={`bg-card rounded-lg border cursor-pointer w-full relative overflow-hidden
        shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06),0_2px_8px_-2px_hsl(var(--foreground)/0.08)]
        hover:shadow-[0_3px_12px_0_hsl(var(--foreground)/0.09),0_2px_6px_-2px_hsl(var(--foreground)/0.1)]
        transition-shadow duration-200 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${mapSelected ? "ring-2 ring-[hsl(var(--map-selection-border))] bg-[hsl(var(--map-selection-bg))]" : ""}
        ${isSelected
          ? "border-l-[3px] shadow-[var(--shadow-md)]" : "border-border/25 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)]"}`}
      style={{ 
        padding: compact ? "8px 10px" : "10px 12px",
        borderLeftColor: !isSelected && tierBorderColor ? tierBorderColor : undefined,
        borderLeftWidth: !isSelected && tierBorderColor ? "3px" : undefined,
      }}
      onClick={handleCardClick}
    >
      {/* Accent line — colored by priority tier */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: tierBorderColor || sparkHex }} />

      {/* ① PRIORITY BAR — first level of reading */}
      {priority && !compact && <PriorityBar priority={priority} lang={lang} />}

      {/* ② PRIORITY REASON — why this matters */}
      {priority && !compact && priority.reason && (
        <p className="text-[9px] font-medium leading-snug mb-1.5 px-1.5 py-1 rounded-md"
          style={{ 
            backgroundColor: `hsl(var(--priority-${priority.tier === "critical" ? "critical" : priority.tier === "high" ? "high" : priority.tier === "medium" ? "medium" : "low"}) / 0.06)`,
            color: `hsl(var(--priority-${priority.tier === "critical" ? "critical" : priority.tier === "high" ? "high" : priority.tier === "medium" ? "medium" : "low"}))`,
          }}>
          {priority.reason}
        </p>
      )}

      {/* ③ Source · time · country · origin badge */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: sparkHex }} />
          <span className="text-[10px] uppercase tracking-[0.06em] font-bold" style={{ color: sparkHex }}>
            {platform}
          </span>
        </button>
        <span className="text-[9px] text-muted-foreground/25">·</span>
        <span className="text-[9px] text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[11px]" title={countryCode}>{flag}</span>}
        <span className="text-[8px] text-muted-foreground/40 uppercase">{category}</span>
        
        {/* Origin badge (Dimension 1) */}
        {originBadge && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ml-auto cursor-help ${originBadge.css}`}>
                {originBadge.icon} {originBadge.label[lang] || originBadge.label.en}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-[10px]">
              {lang === "pt" ? "Tipo de fonte de dados" : "Data source type"}
            </TooltipContent>
          </Tooltip>
        )}
        {!originBadge && <div className="flex-1" />}

        {/* Coverage badge (Dimension 3) */}
        {isMultiplatform && (
          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-md bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]">
            🌐 Multi
          </span>
        )}

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={handleShare} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors">
            <Share2 className="w-3 h-3" />
          </button>
          <button onClick={(e) => {
            e.stopPropagation();
            onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
          }} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors">
            <Bookmark className="w-3 h-3" />
          </button>
          {onAddToWatchlist && (
            <button onClick={(e) => {
              e.stopPropagation();
              onAddToWatchlist({ title, platform, category, countryCode, volume, change, changePositive, sources });
            }} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-foreground/50 transition-colors" title={lang === "pt" ? "Adicionar ao watchlist" : "Add to watchlist"}>
              <Eye className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ④ Title + thumbnail */}
      <div className="flex gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-foreground leading-snug ${compact ? "text-[11px] line-clamp-1" : "text-[12.5px] line-clamp-2"}`}
            style={{ wordBreak: "break-word" }}>
            {decodeEntities(title)}
          </h3>
        </div>
        {hasThumbnail && !compact && (
          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
            <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>

      {/* ⑤ Context snippet */}
      {contextSnippet && !compact && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ⑥ Term explanation */}
      {termExplanation && !compact && (
        <div className="flex items-start gap-1.5 mb-1.5 px-2 py-1.5 rounded-md text-[9px] leading-relaxed bg-[hsl(var(--info-bg))] border-l-2 border-[hsl(var(--info-fg))] text-[hsl(var(--info-fg))]">
          <span className="flex-shrink-0">💡</span>
          <span className="line-clamp-2">{termExplanation}</span>
        </div>
      )}

      {/* ⑦ Smart chart + Metrics */}
      <div className="flex items-end gap-2 mt-1">
        <div className="flex-1 min-w-0" style={{ height: 22 }}>
          {renderSmartChart()}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showChange && (
            <span className={`text-[10px] font-bold ${changePositive ? "text-[hsl(var(--success-fg))]" : "text-destructive"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
          {showVolume && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-semibold text-foreground tabular-nums cursor-help">{volume}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {lang === "pt" ? "Métrica bruta da fonte original" : "Raw metric from original source"}
              </TooltipContent>
            </Tooltip>
          )}
          {sources && sources.length > 1 && (
            <span className="text-[8px] text-muted-foreground tabular-nums">{sources.length}src</span>
          )}
          {!compact && (
            <ChevronDown className={`w-3 h-3 text-muted-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`} />
          )}
        </div>
      </div>

      {/* ⑧ Propagation */}
      {propagationSources && !compact && !expanded && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/15 overflow-hidden">
          <span className="text-[7px] text-muted-foreground/40 uppercase tracking-wider flex-shrink-0">PROP</span>
          {propagationSources.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[8px] text-muted-foreground/25">→</span>}
              <span className="text-[8px] font-medium text-muted-foreground px-1 py-0.5 rounded bg-muted/40 truncate max-w-[60px]">{s}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ⑨ UNIFIED INLINE DETAIL — enriched accordion */}
      <AnimatePresence>
        {expanded && !compact && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/20 space-y-3">
              
              {/* Signal summary block */}
              <div className="grid grid-cols-2 gap-2">
                {/* Status */}
                {priority && (
                  <div className="px-2 py-1.5 rounded-md bg-muted/30">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-0.5">
                      {lang === "pt" ? "Status" : "Status"}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: `hsl(var(--lifecycle-${priority.lifecycle}))` }}>
                      {LIFECYCLE_LABELS[priority.lifecycle].icon} {LIFECYCLE_LABELS[priority.lifecycle][lang as "pt" | "en"] || LIFECYCLE_LABELS[priority.lifecycle].en}
                    </span>
                  </div>
                )}
                {/* Confidence */}
                {priority && (
                  <div className="px-2 py-1.5 rounded-md bg-muted/30">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-0.5">
                      {lang === "pt" ? "Confiança" : "Confidence"}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-full h-[4px] rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all" 
                          style={{ 
                            width: `${priority.confidence * 100}%`,
                            backgroundColor: priority.confidence > 0.7 ? "hsl(var(--success-fg))" : priority.confidence > 0.4 ? "hsl(var(--warning-fg))" : "hsl(var(--destructive))",
                          }} />
                      </div>
                      <span className="text-[9px] font-bold tabular-nums">{Math.round(priority.confidence * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Full description */}
              {(description || details) && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {decodeEntities((description || details || "").slice(0, 400))}
                </p>
              )}

              {/* Countries affected */}
              {countryCode && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-[9px] text-muted-foreground">
                    {flag} {countryCode?.toUpperCase()}
                    {isMultiplatform && (
                      <span className="ml-1 text-[8px] text-[hsl(var(--source-official))]">
                        + {lang === "pt" ? "múltiplas regiões" : "multiple regions"}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Historical chart — larger when expanded */}
              {historicalData && historicalData.length > 2 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {lang === "pt" ? "Evolução 24h" : "24h Evolution"}
                    </span>
                  </div>
                  <div className="h-28 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      {changeNum > 80 ? (
                        <BarChart data={historicalData.slice(-12)}>
                          <XAxis dataKey="hour" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={2} />
                          <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                          <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }} />
                          <Bar dataKey="value" fill={sparkHex} opacity={0.7} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      ) : (
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
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Related sources */}
              {propagationSources && (
                <div>
                  <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider block mb-1">
                    {lang === "pt" ? "Fontes relacionadas" : "Related sources"}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {propagationSources.map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[9px] text-muted-foreground/30">→</span>}
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
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[hsl(var(--source-press))] hover:underline group">
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

      {/* Compact metrics */}
      {compact && (
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          {priority && <span className="font-black tabular-nums" style={{ color: TIER_COLORS[priority.tier] }}>{priority.score}</span>}
          {showVolume && <span className="font-medium tabular-nums">{volume}</span>}
          {showChange && <span className={`font-bold ${changePositive ? "text-[hsl(var(--success-fg))]" : "text-destructive"}`}>{change}</span>}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);
