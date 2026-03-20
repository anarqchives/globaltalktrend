import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

/* ─── Source type mapping ─── */
const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bing news": "imprensa", "newsdata": "imprensa", "thenewsapi": "imprensa", "the news api": "imprensa",
  "variety": "imprensa", "bbc": "imprensa", "reuters": "imprensa", "france 24": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "ibge": "dados_oficiais", "imf": "dados_oficiais", "who": "dados_oficiais",
  "pubmed": "cientifico", "openal": "cientifico", "arxiv": "cientifico",
  "crossref": "cientifico", "semantic scholar": "cientifico",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) {
    if (p.includes(key)) return val;
  }
  return "imprensa";
}

const SOURCE_DOT_COLORS: Record<string, string> = {
  imprensa: "#2557D6",
  redes_sociais: "#7C3AED",
  google_trends: "#D97706",
  dados_oficiais: "#059669",
  cientifico: "#0891B2",
};

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
  fr: { now: "maintenant", min: "il y a {n}min", h: "il y a {n}h", d: "il y a {n}j" },
  de: { now: "jetzt", min: "vor {n}min", h: "vor {n}h", d: "vor {n}T" },
};

/* ─── Tag validation ─── */
const SPORTS_TERMS = ["esportes", "sports", "jogo", "copa", "game", "nba", "nfl", "fifa", "gol", "futebol", "football", "soccer"];
const POLITICS_TERMS = ["política", "politics", "eleição", "governo", "election", "trump", "biden", "congress"];

function validateTag(tagLabel: string, title: string): boolean {
  const tL = title.toLowerCase();
  const tagL = tagLabel.toLowerCase();
  if (SPORTS_TERMS.some(t => tagL.includes(t)) && !SPORTS_TERMS.some(t => tL.includes(t))) return false;
  if (POLITICS_TERMS.some(t => tagL.includes(t)) && !POLITICS_TERMS.some(t => tL.includes(t))) return false;
  return true;
}

/* ─── Sparkline ─── */
const SparklineChart = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `sp_${Math.random().toString(36).slice(2, 7)}`, []);
  const { pathD, areaD, lastPt } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "", lastPt: { x: 0, y: 0 } };
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const w = 120, h = 28, pad = 2;
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

  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <span className="text-[9px] text-muted-foreground/40 italic">—</span>
    </div>
  );

  return (
    <svg width={120} height={28} viewBox="0 0 120 28" className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeInOut" }} />
      <circle cx={lastPt.x} cy={lastPt.y} r="2" fill={color}>
        <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});
SparklineChart.displayName = "SparklineChart";

/* ─── Framer variants ─── */
export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] } },
};

/* ─── Props ─── */
export interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onSaveCard?: (card: any) => void;
  staggerIndex?: number;
  compact?: boolean;
  isSelected?: boolean;
  isMultiplatform?: boolean;
}

/* ─── Component ─── */
const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  historicalData, countryCode, sources, sourceUrl, trustBadge, thumbnail,
  publishedAt, description, details, translated, isMultiplatform, sparkData: rawSparkData,
  onClick, onFilterPlatform, onSaveCard,
  staggerIndex = 0, compact = false, isSelected = false,
}: TimelineCardProps) => {
  const { lang } = useLanguage();

  const sourceType = getSourceType(platform);
  const dotColor = SOURCE_DOT_COLORS[sourceType] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);

  /* Time */
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

  /* Tags — only real, validated */
  const tags = useMemo(() => {
    const result: { label: string; color: string; verified?: boolean }[] = [];
    if (trustBadge === "verified" || trustBadge === "press") {
      result.push({ label: "✓ " + (lang === "pt" ? "Imprensa" : "Press"), color: dotColor, verified: true });
    } else if (trustBadge === "scientific") {
      result.push({ label: "🔬 " + (lang === "pt" ? "Científico" : "Scientific"), color: "#0891B2", verified: true });
    }
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", color: "#D97706" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", color: "#2557D6" });
    if (isMultiplatform) result.push({ label: "🌐 Multi", color: "#6B6560" });
    return result.filter(tag => validateTag(tag.label, title));
  }, [trustBadge, change, changePositive, isMultiplatform, title, lang, dotColor]);

  /* Sparkline data */
  const sparkData = useMemo(() => {
    if (historicalData && historicalData.length >= 2) return historicalData.slice(-12).map(d => d.value);
    if (rawSparkData && rawSparkData.length >= 2) return rawSparkData.slice(-12);
    return null;
  }, [historicalData, rawSparkData]);

  /* Volume + Growth */
  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  /* Description snippet */
  const contextSnippet = useMemo(() => {
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw.slice(0, 120) + (raw.length > 120 ? "…" : "");
  }, [description, details, title]);

  /* Sparkline color */
  const sparkColor = useMemo(() => {
    if (changePositive && changeNum > 10) return "#2557D6";
    if (!changePositive && changeNum > 10) return "#E03C31";
    return "#94A3B8";
  }, [changePositive, changeNum]);

  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className={`bg-card rounded-2xl border cursor-pointer mb-2 w-full
        transition-all duration-[180ms] ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${isSelected
          ? "border-l-[3px] border-l-[#2557D6] border-[#2557D6]/20 shadow-[0_6px_24px_rgba(26,24,20,0.10)]"
          : "border-border shadow-[0_2px_12px_rgba(26,24,20,0.06)] hover:shadow-[0_6px_24px_rgba(26,24,20,0.10)] hover:-translate-y-px hover:border-[#2557D6]/20"}
        `}
      style={{ padding: compact ? "10px 14px" : "14px 16px" }}
    >
      {/* ① Source · time · country */}
      <div className="flex items-center gap-1.5 mb-2">
        <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: dotColor }}>
            {platform}
          </span>
        </button>
        <span className="text-[11px] text-muted-foreground/40">·</span>
        <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[11px]">{flag}</span>}
        <div className="flex-1" />
        <button onClick={(e) => {
          e.stopPropagation();
          onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
        }} className="p-1 rounded-md text-muted-foreground/30 hover:text-[#2557D6] transition-colors">
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ② Title */}
      <h3 className={`font-semibold text-foreground leading-snug mb-1 break-words ${compact ? "text-[13px] line-clamp-1" : "text-[15px] line-clamp-2"}`}>
        {decodeEntities(title)}
      </h3>

      {/* ③ Description */}
      {contextSnippet && !compact && (
        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-1 mb-2">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ④ Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ⑤ Sparkline + Metrics */}
      {!compact && (
        <div className="flex items-end gap-3 mt-1">
          <div className="flex-1" style={{ height: 28 }}>
            <SparklineChart data={sparkData || []} color={sparkColor} />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {showChange && (
              <span className={`text-[12px] font-bold ${changePositive ? "text-[#059669]" : "text-[#E03C31]"}`}>
                {changePositive ? "↗" : "↘"} {changePositive ? "+" : ""}{change}
              </span>
            )}
            {showVolume && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/50">Vol</span>
                <span className="text-[12px] font-semibold text-foreground">{volume}</span>
              </div>
            )}
            {sources && sources.length > 1 && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/50">{lang === "pt" ? "Fontes" : "Src"}</span>
                <span className="text-[12px] font-semibold text-foreground">{sources.length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact metrics */}
      {compact && (showVolume || showChange) && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
          {showVolume && <span className="font-medium">{volume}</span>}
          {showChange && (
            <span className={`font-bold ${changePositive ? "text-[#059669]" : "text-[#E03C31]"}`}>{change}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);
