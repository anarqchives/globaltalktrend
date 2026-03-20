import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, ExternalLink, Share2, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { toast } from "@/hooks/use-toast";

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

/* Vibrant, differentiated colors per source type for charts */
const SOURCE_HEX: Record<string, string> = {
  imprensa: "#2563EB",       // vivid blue
  redes_sociais: "#F97316",  // vibrant orange
  google_trends: "#FACC15",  // bright yellow
  dados_oficiais: "#10B981", // emerald green
  cientifico: "#8B5CF6",     // vivid purple
  enciclopedico: "#06B6D4",  // cyan
};

const SOURCE_BADGES: Record<string, { label: Record<string, string>; icon: string; css: string; explanation: Record<string, string> }> = {
  imprensa: { label: { pt: "Imprensa", en: "Press" }, icon: "✓", css: "bg-[hsl(var(--source-press)/0.1)] text-[hsl(var(--source-press))]", explanation: { pt: "Veículos de imprensa profissional com equipe editorial", en: "Professional press outlets with editorial teams" } },
  dados_oficiais: { label: { pt: "Oficial", en: "Official" }, icon: "◆", css: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]", explanation: { pt: "Instituições governamentais e organismos internacionais", en: "Government institutions and international organizations" } },
  cientifico: { label: { pt: "Acadêmico", en: "Academic" }, icon: "◈", css: "bg-[hsl(var(--source-academic)/0.1)] text-[hsl(var(--source-academic))]", explanation: { pt: "Publicações científicas revisadas por pares", en: "Peer-reviewed scientific publications" } },
  enciclopedico: { label: { pt: "Enciclopédico", en: "Encyclopedic" }, icon: "◎", css: "bg-[hsl(var(--source-encyclopedic)/0.1)] text-[hsl(var(--source-encyclopedic))]", explanation: { pt: "Plataformas de conhecimento colaborativo", en: "Collaborative knowledge platforms" } },
  redes_sociais: { label: { pt: "Social", en: "Social" }, icon: "◉", css: "bg-[hsl(var(--source-social)/0.1)] text-[hsl(var(--source-social))]", explanation: { pt: "Redes sociais e comunidades online", en: "Social networks and online communities" } },
  google_trends: { label: { pt: "Buscas", en: "Searches" }, icon: "◉", css: "bg-[hsl(var(--source-search)/0.1)] text-[hsl(var(--source-search))]", explanation: { pt: "Dados de volume de buscas em mecanismos de pesquisa", en: "Search engine volume data" } },
};

/* ─── Term explanations ─── */
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

/* ─── Mini Bar Chart ─── */
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

/* ─── Momentum sparkline (thicker, with area fill) ─── */
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

/* ─── Segmented mini bars (composition/comparison) ─── */
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

export interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onSaveCard?: (card: any) => void;
  staggerIndex?: number;
  compact?: boolean;
  isSelected?: boolean;
  isMultiplatform?: boolean;
}

const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  historicalData, countryCode, sources, sourceUrl, trustBadge, thumbnail,
  publishedAt, description, details, translated, isMultiplatform, sparkData: rawSparkData,
  onClick, onFilterPlatform, onSaveCard,
  staggerIndex = 0, compact = false, isSelected = false,
}: TimelineCardProps) => {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const sourceType = getSourceType(platform);
  const sparkHex = SOURCE_HEX[sourceType] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);
  const badge = SOURCE_BADGES[sourceType];

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

  const tags = useMemo(() => {
    const result: { label: string; css: string }[] = [];
    if (trustBadge === "verified" || trustBadge === "press") {
      result.push({ label: "✓ " + (lang === "pt" ? "Verificado" : "Verified"), css: "bg-[hsl(var(--source-press)/0.1)] text-[hsl(var(--source-press))]" });
    } else if (trustBadge === "scientific") {
      result.push({ label: "🔬 " + (lang === "pt" ? "Científico" : "Scientific"), css: "bg-[hsl(var(--source-academic)/0.1)] text-[hsl(var(--source-academic))]" });
    } else if (trustBadge === "official") {
      result.push({ label: "◆ " + (lang === "pt" ? "Oficial" : "Official"), css: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]" });
    }
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", css: "bg-[hsl(var(--accent-coral)/0.1)] text-[hsl(var(--accent-coral))]" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", css: "bg-[hsl(var(--source-search)/0.1)] text-[hsl(var(--source-search))]" });
    if (isMultiplatform) result.push({ label: "🌐 Multi", css: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]" });
    return result;
  }, [trustBadge, change, changePositive, isMultiplatform, lang]);

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
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw.slice(0, 160) + (raw.length > 160 ? "…" : "");
  }, [description, details, title]);

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

  const handleCardClick = (e: React.MouseEvent) => {
    // If compact mode, use the parent onClick. Otherwise toggle inline expansion.
    if (compact) {
      onClick?.();
    } else {
      setExpanded(prev => !prev);
    }
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

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -3, scale: 1.008, transition: { duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] } }}
      whileTap={{ scale: 0.97 }}
      className={`bg-card rounded-lg border cursor-pointer w-full relative overflow-hidden
        transition-shadow duration-200 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${isSelected
          ? "border-l-[3px] shadow-[var(--shadow-md)]" : "border-border/25 shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)]"}`}
      style={{ padding: compact ? "8px 10px" : "10px 12px" }}
      onClick={handleCardClick}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: sparkHex }} />

      {/* ① Source · time · country · badge */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
        {badge && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ml-auto cursor-help ${badge.css}`}>
                {badge.icon} {badge.label[lang] || badge.label.en}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-[10px]">
              {badge.explanation[lang] || badge.explanation.en}
            </TooltipContent>
          </Tooltip>
        )}
        {!badge && <div className="flex-1" />}
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
        </div>
      </div>

      {/* ② Title + thumbnail */}
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

      {/* ③ Context snippet — always show below title */}
      {contextSnippet && !compact && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ④ Term explanation */}
      {termExplanation && !compact && (
        <div className="flex items-start gap-1.5 mb-1.5 px-2 py-1.5 rounded-md text-[9px] leading-relaxed bg-[hsl(var(--info-bg))] border-l-2 border-[hsl(var(--info-fg))] text-[hsl(var(--info-fg))]">
          <span className="flex-shrink-0">💡</span>
          <span className="line-clamp-2">{termExplanation}</span>
        </div>
      )}

      {/* ⑤ Tags */}
      {tags.length > 0 && !compact && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {tags.map((tag, i) => (
            <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-[0.04em] ${tag.css}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ⑥ Smart chart + Metrics */}
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
                {lang === "pt" ? "Volume total de menções ou buscas" : "Total mentions or search volume"}
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

      {/* ⑦ Propagation */}
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

      {/* ⑧ INLINE EXPANSION — editorial accordion */}
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
              {/* Full description */}
              {(description || details) && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {decodeEntities((description || details || "").slice(0, 400))}
                </p>
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

              {/* Propagation in expanded view */}
              {propagationSources && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">{lang === "pt" ? "Propagação" : "Propagation"}</span>
                  {propagationSources.map((s, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-[9px] text-muted-foreground/30">→</span>}
                      <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-md bg-secondary">{s}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Source link */}
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[hsl(var(--source-press))] hover:underline group">
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  {lang === "pt" ? "Abrir fonte original" : "Open original source"}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact metrics */}
      {compact && (showVolume || showChange) && (
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          {showVolume && <span className="font-medium tabular-nums">{volume}</span>}
          {showChange && <span className={`font-bold ${changePositive ? "text-[hsl(var(--success-fg))]" : "text-destructive"}`}>{change}</span>}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);
