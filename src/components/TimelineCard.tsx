import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

/* ─── Source brand colors ─── */
const SOURCE_COLORS: Record<string, string> = {
  "The Guardian": "#052962", "arXiv": "#B31B1B", "PubMed": "#007CBB",
  "Google Trends": "#4285F4", "Wikipedia": "#000000", "World Bank": "#009FDA",
  "IBGE": "#003A6C", "Bluesky": "#0085FF", "GitHub": "#24292E",
  "Mastodon": "#6364FF", "YouTube": "#FF0000", "Reddit": "#FF4500",
  "Hacker News": "#FF6600", "X (Twitter)": "#1DA1F2", "NewsAPI": "#2E8B57",
  "GNews": "#3CB371", "Stack Overflow": "#F48024", "Variety": "#B8860B",
  "OpenAlex": "#3366CC", "NPR": "#EC1427", "Bing News": "#008373",
  "NewsData": "#4682B4", "FRED": "#003366", "TheNewsAPI": "#2E8B57",
};

/* ─── Source type → dot color ─── */
const SOURCE_TYPE_COLOR: Record<string, string> = {
  imprensa: "bg-[hsl(var(--cobalt))]",
  redes_sociais: "bg-violet-500",
  google_trends: "bg-amber-400",
  dados_oficiais: "bg-emerald-500",
  cientifico: "bg-teal-500",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  if (["the guardian", "npr", "newsapi", "gnews", "bing news", "newsdata", "thenewsapi", "variety"].some(s => p.includes(s))) return "imprensa";
  if (["reddit", "bluesky", "mastodon", "x (twitter)", "youtube"].some(s => p.includes(s))) return "redes_sociais";
  if (p.includes("google trends")) return "google_trends";
  if (["world bank", "ibge", "fred", "imf", "who"].some(s => p.includes(s))) return "dados_oficiais";
  if (["arxiv", "pubmed", "openal", "crossref", "semantic"].some(s => p.includes(s))) return "cientifico";
  return "imprensa";
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
  fr: { now: "maintenant", min: "il y a {n}min", h: "il y a {n}h", d: "il y a {n}j" },
  de: { now: "jetzt", min: "vor {n}min", h: "vor {n}h", d: "vor {n}T" },
};

/* ─── Tag validation ─── */
const SPORTS_TERMS = ["esportes", "sports", "jogo", "copa", "game", "nba", "nfl", "fifa", "gol", "match", "futebol", "football", "soccer"];
const POLITICS_TERMS = ["política", "politics", "eleição", "governo", "election", "trump", "biden", "congress", "senate", "parliament"];

function validateTag(tagLabel: string, title: string): boolean {
  const titleLower = title.toLowerCase();
  const tagLower = tagLabel.toLowerCase();
  if (SPORTS_TERMS.some(t => tagLower.includes(t)) && !SPORTS_TERMS.some(t => titleLower.includes(t))) return false;
  if (POLITICS_TERMS.some(t => tagLower.includes(t)) && !POLITICS_TERMS.some(t => titleLower.includes(t))) return false;
  return true;
}

/* ─── Sparkline with gradient fill ─── */
const SparklineChart = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `sp_${Math.random().toString(36).slice(2, 7)}`, []);
  const { pathD, areaD, lastPt } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "", lastPt: { x: 0, y: 0 } };
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const w = 120, h = 40, pad = 2;
    const pts = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));
    const pathD = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
    }, "");
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
    return { pathD, areaD, lastPt: pts[pts.length - 1] };
  }, [data]);

  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <span className="text-[9px] text-muted-foreground/40 italic">sem dados</span>
    </div>
  );

  return (
    <svg width={120} height={40} viewBox="0 0 120 40" className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={color}>
        <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});
SparklineChart.displayName = "SparklineChart";

/* ─── Framer variants ─── */
export const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] },
  },
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
  const { t, lang } = useLanguage();

  const brandColor = SOURCE_COLORS[platform] || "#666";
  const flag = countryCodeToFlag(countryCode);
  const sourceType = getSourceType(platform);
  const dotCls = SOURCE_TYPE_COLOR[sourceType] || "bg-muted-foreground/40";

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
  const trustBadgeKeys: Record<string, { label: string; cls: string }> = {
    official: { label: lang === "pt" ? "Fonte Oficial" : "Official", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    verified: { label: lang === "pt" ? "Verificada" : "Verified", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    scientific: { label: lang === "pt" ? "Científico" : "Scientific", cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
    press: { label: lang === "pt" ? "Imprensa" : "Press", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  };

  const tags = useMemo(() => {
    const result: { label: string; cls: string; verified?: boolean }[] = [];
    if (trustBadge && trustBadgeKeys[trustBadge]) {
      result.push({ label: trustBadgeKeys[trustBadge].label, cls: trustBadgeKeys[trustBadge].cls, verified: true });
    }
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" });
    if (isMultiplatform) result.push({ label: "🌐 Multi", cls: "bg-secondary text-muted-foreground" });
    return result.filter(tag => validateTag(tag.label, title));
  }, [trustBadge, change, changePositive, isMultiplatform, title, lang]);

  /* Sparkline data */
  const sparkData = useMemo(() => {
    if (historicalData && historicalData.length >= 2) return historicalData.slice(-12).map(d => d.value);
    if (rawSparkData && rawSparkData.length >= 2) return rawSparkData.slice(-12);
    return null;
  }, [historicalData, rawSparkData]);

  /* Volume + Growth parsing */
  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  /* Context snippet */
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
      className={`bg-card rounded-2xl p-4 border cursor-pointer transition-all duration-200
        ${isSelected
          ? "border-l-[3px] border-l-[hsl(var(--cobalt))] border-[hsl(var(--cobalt))]/30 shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
          : "border-border/30 shadow-[0_4px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:scale-[0.985]"}
        active:scale-[0.97]`}
    >
      {/* ① Source · time · country */}
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
          <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: brandColor }}>
            {platform}
          </span>
        </button>
        <span className="text-[10px] text-muted-foreground/40">·</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[11px]">{flag}</span>}
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
          }}
          className="p-1 rounded-md text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ② Title */}
      <h3 className={`font-semibold text-foreground leading-snug mb-1.5 break-words ${compact ? "text-xs line-clamp-1" : "text-base line-clamp-2"}`}>
        {decodeEntities(title)}
      </h3>

      {/* ③ Context snippet */}
      {contextSnippet && !compact && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ④ Tags — only real, validated */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {tags.map((tag, i) => (
            <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[10px] font-medium ${tag.cls}`}>
              {tag.verified && <span>✓</span>}
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ⑤ Sparkline + Metrics row */}
      {!compact && (
        <div className="flex items-end gap-3 mt-1">
          <div className="flex-1" style={{ height: 40 }}>
            <SparklineChart data={sparkData || []} color={sparkColor} />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {showVolume && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">Vol</span>
                <span className="text-xs font-semibold text-foreground">{volume}</span>
              </div>
            )}
            {showChange && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50">Cresc.</span>
                <span className={`text-xs font-bold ${changePositive ? "text-emerald-500" : "text-[hsl(var(--coral))]"}`}>
                  {changePositive ? "+" : ""}{change}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact: minimal metrics */}
      {compact && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
          {showVolume && <span className="font-medium">{volume}</span>}
          {showChange && (
            <span className={`font-bold ${changePositive ? "text-emerald-500" : "text-[hsl(var(--coral))]"}`}>
              {change}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);
