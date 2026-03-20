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
  "ap news": "imprensa", "bloomberg": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "ibge": "dados_oficiais", "imf": "dados_oficiais", "who": "dados_oficiais",
  "pubmed": "cientifico", "openal": "cientifico", "arxiv": "cientifico",
  "crossref": "cientifico", "semantic scholar": "cientifico",
  "wikipedia": "enciclopedico",
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
  enciclopedico: "#06b6d4",
};

const SOURCE_BADGES: Record<string, { label: Record<string, string>; icon: string; color: string }> = {
  imprensa: { label: { pt: "Imprensa Verificada", en: "Verified Press" }, icon: "✓", color: "#059669" },
  dados_oficiais: { label: { pt: "Dados Oficiais", en: "Official Data" }, icon: "◆", color: "#2557D6" },
  cientifico: { label: { pt: "Acadêmico", en: "Academic" }, icon: "◈", color: "#7C3AED" },
  enciclopedico: { label: { pt: "Enciclopédico", en: "Encyclopedic" }, icon: "◎", color: "#06b6d4" },
  redes_sociais: { label: { pt: "Social/Trending", en: "Social/Trending" }, icon: "◉", color: "#D97706" },
  google_trends: { label: { pt: "Social/Trending", en: "Social/Trending" }, icon: "◉", color: "#D97706" },
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

  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <span className="text-[7px] text-muted-foreground/40 italic">—</span>
    </div>
  );

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
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }} />
      <circle cx={lastPt.x} cy={lastPt.y} r="1.5" fill={color}>
        <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
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
  const badge = SOURCE_BADGES[sourceType];

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
      result.push({ label: "✓ " + (lang === "pt" ? "Imprensa" : "Press"), color: "#059669", verified: true });
    } else if (trustBadge === "scientific") {
      result.push({ label: "🔬 " + (lang === "pt" ? "Científico" : "Scientific"), color: "#0891B2", verified: true });
    }
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", color: "#D97706" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", color: "#2557D6" });
    if (isMultiplatform) result.push({ label: "🌐 Multi", color: "#6B6560" });
    return result.filter(tag => validateTag(tag.label, title));
  }, [trustBadge, change, changePositive, isMultiplatform, title, lang]);

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
    return raw.slice(0, 90) + (raw.length > 90 ? "…" : "");
  }, [description, details, title]);

  /* Sparkline color */
  const sparkColor = useMemo(() => dotColor, [dotColor]);

  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className={`bg-card rounded-2xl border cursor-pointer w-full relative overflow-hidden
        transition-all duration-200 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${isSelected
          ? "border-l-[3px] border-l-[#2557D6] border-[#2557D6]/20 shadow-[0_6px_24px_rgba(26,24,20,0.10)]"
          : "border-border shadow-[0_2px_8px_rgba(26,24,20,0.04)] hover:shadow-[0_4px_16px_rgba(26,24,20,0.08)] hover:-translate-y-[1px] hover:border-[#2557D6]/15"}
        `}
      style={{ padding: compact ? "8px 10px" : "10px 12px" }}
    >
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: dotColor }} />

      {/* ① Source · time · country · badge */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[8px] uppercase tracking-[0.08em] font-bold" style={{ color: dotColor }}>
            {platform}
          </span>
        </button>
        <span className="text-[8px] text-muted-foreground/30">·</span>
        <span className="text-[8px] uppercase tracking-[0.06em] text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[9px]">{flag}</span>}
        {badge && (
          <span className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full ml-auto"
            style={{ backgroundColor: `${badge.color}12`, color: badge.color, border: `1px solid ${badge.color}20` }}>
            {badge.icon} {badge.label[lang] || badge.label.en}
          </span>
        )}
        {!badge && (
          <div className="flex-1" />
        )}
        <button onClick={(e) => {
          e.stopPropagation();
          onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
        }} className="p-0.5 rounded-md text-muted-foreground/20 hover:text-[#2557D6] transition-colors flex-shrink-0">
          <Bookmark className="w-3 h-3" />
        </button>
      </div>

      {/* ② Title */}
      <h3 className={`font-semibold text-foreground leading-snug mb-1 ${compact ? "text-[10px] line-clamp-1" : "text-[11px] line-clamp-2"}`}
        style={{ wordBreak: "break-word", overflow: "hidden", textOverflow: "ellipsis" }}>
        {decodeEntities(title)}
      </h3>

      {/* ③ Description */}
      {contextSnippet && !compact && (
        <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ④ Tags */}
      {tags.length > 0 && !compact && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-semibold uppercase tracking-[0.06em]"
              style={{ backgroundColor: `${tag.color}12`, color: tag.color, border: `1px solid ${tag.color}18` }}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ⑤ Sparkline + Metrics */}
      <div className="flex items-end gap-2 mt-1">
        <div className="flex-1 min-w-0" style={{ height: 22 }}>
          <SparklineChart data={sparkData || []} color={sparkColor} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showChange && (
            <span className={`text-[9px] font-bold ${changePositive ? "text-[#059669]" : "text-[#E03C31]"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
          {showVolume && (
            <span className="text-[9px] font-semibold text-foreground tabular-nums">{volume}</span>
          )}
          {sources && sources.length > 1 && (
            <span className="text-[8px] text-muted-foreground tabular-nums">{sources.length}src</span>
          )}
        </div>
      </div>

      {/* Compact metrics */}
      {compact && (showVolume || showChange) && (
        <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground mt-0.5">
          {showVolume && <span className="font-medium tabular-nums">{volume}</span>}
          {showChange && (
            <span className={`font-bold ${changePositive ? "text-[#059669]" : "text-[#E03C31]"}`}>{change}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);
