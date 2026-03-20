import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Bookmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import SparklineArea from "./SparklineArea";

const SOURCE_COLORS: Record<string, string> = {
  "The Guardian": "#052962", "arXiv": "#B31B1B", "PubMed": "#007CBB",
  "Google Trends": "#4285F4", "Wikipedia": "#000000", "World Bank": "#009FDA",
  "IBGE": "#003A6C", "Bluesky": "#0085FF", "GitHub": "#24292E",
  "Mastodon": "#6364FF", "YouTube": "#FF0000", "Reddit": "#FF4500",
  "Hacker News": "#FF6600", "X (Twitter)": "#1DA1F2", "NewsAPI": "#2E8B57",
  "GNews": "#3CB371", "Stack Overflow": "#F48024", "Variety": "#B8860B",
  "OpenAlex": "#3366CC", "NPR": "#EC1427", "Bing News": "#008373",
  "NewsData": "#4682B4",
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

const trustBadgeKeys: Record<string, { labelKey: string; cls: string }> = {
  official: { labelKey: "officialSource", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  verified: { labelKey: "verifiedPress", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  scientific: { labelKey: "scientificData", cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
  press: { labelKey: "verifiedPress", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
};

// Tag validation: verify tag matches card content
function validateTag(tagLabel: string, title: string): boolean {
  const titleLower = title.toLowerCase();
  const tagLower = tagLabel.toLowerCase();
  
  // Sports tag on non-sports content
  const sportsTerms = ["esportes", "sports", "🏈", "jogo", "copa", "game", "nba", "nfl", "fifa", "gol", "match"];
  const isSportsTag = sportsTerms.some(t => tagLower.includes(t));
  if (isSportsTag) {
    const hasSportsContent = sportsTerms.some(t => titleLower.includes(t));
    if (!hasSportsContent) return false;
  }

  // Politics tag on non-politics content
  const politicsTerms = ["política", "politics", "🏛️", "eleição", "governo", "election", "trump", "biden", "congress"];
  const isPoliticsTag = politicsTerms.some(t => tagLower.includes(t));
  if (isPoliticsTag) {
    const hasPoliticsContent = politicsTerms.some(t => titleLower.includes(t));
    if (!hasPoliticsContent) return false;
  }

  return true;
}

const relativeTimeFormats: Record<string, { now: string; min: string; h: string; d: string }> = {
  pt: { now: "agora", min: "há {n}min", h: "há {n}h", d: "há {n}d" },
  en: { now: "now", min: "{n}min ago", h: "{n}h ago", d: "{n}d ago" },
  es: { now: "ahora", min: "hace {n}min", h: "hace {n}h", d: "hace {n}d" },
  fr: { now: "maintenant", min: "il y a {n}min", h: "il y a {n}h", d: "il y a {n}j" },
  de: { now: "jetzt", min: "vor {n}min", h: "vor {n}h", d: "vor {n}T" },
};

interface TimelineCardProps extends TrendCardProps {
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
  publishedAt, description, details, translated, isMultiplatform,
  onClick, onFilterPlatform, onSaveCard,
  staggerIndex = 0, compact = false, isSelected = false,
}: TimelineCardProps) => {
  const { t, lang } = useLanguage();

  const brandColor = SOURCE_COLORS[platform] || "#666";
  const flag = countryCodeToFlag(countryCode);

  const formattedTime = useMemo(() => {
    if (!publishedAt) {
      // Localize fallback time
      if (!time) return time;
      const lower = time.toLowerCase().trim();
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (lower === "agora" || lower === "now") return fmt.now;
      const match = lower.match(/(?:há\s*)?(\d+)\s*(min|m|h|d)/i);
      if (!match) return time;
      const val = match[1];
      const unit = match[2].toLowerCase();
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

  // Tags: only from real data, validated against title
  const tags = useMemo(() => {
    const result: { label: string; cls: string }[] = [];

    // Trust badge
    if (trustBadge && trustBadgeKeys[trustBadge]) {
      result.push({ label: `✓ ${t(trustBadgeKeys[trustBadge].labelKey as any)}`, cls: trustBadgeKeys[trustBadge].cls });
    }

    // Growth pill
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" });

    // Multiplatform badge
    if (isMultiplatform) result.push({ label: "🌐 Multi", cls: "bg-secondary text-muted-foreground" });

    // Filter out tags that don't match title content
    return result.filter(tag => validateTag(tag.label, title));
  }, [trustBadge, change, changePositive, isMultiplatform, title, t]);

  const sparkData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;
    return historicalData.slice(-12).map(d => d.value);
  }, [historicalData]);

  // Volume: don't show zero
  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  // Short context: only if description is different from title
  const contextSnippet = useMemo(() => {
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw.slice(0, 120) + (raw.length > 120 ? "…" : "");
  }, [description, details, title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: Math.min(staggerIndex * 0.04, 0.2) }}
      onClick={onClick}
      className={`bg-card rounded-2xl p-4 border cursor-pointer transition-all duration-200 
        ${isSelected ? 'border-l-[3px] border-l-cobalt border-cobalt/30 shadow-[0_8px_40px_rgba(0,0,0,0.08)]' : 'border-border/30 shadow-[0_4px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:scale-[0.985]'}
        active:scale-[0.97]`}
    >
      {/* ① Source · time · flag */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brandColor }} />
          <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: brandColor }}>{platform}</span>
        </button>
        <span className="text-[10px] text-muted-foreground/40">·</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[11px]">{flag}</span>}
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" }); }}
          className="p-1 rounded-md text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ② Title */}
      <h3 className={`font-semibold text-foreground leading-snug mb-1.5 break-words ${compact ? 'text-xs line-clamp-1' : 'text-[15px] line-clamp-2'}`} style={{ overflowWrap: 'anywhere' }}>
        {decodeEntities(title)}
      </h3>

      {/* ③ Tags — only real, validated */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {tags.map((tag, i) => (
            <span key={i} className={`inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-medium ${tag.cls}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ④ Context snippet */}
      {contextSnippet && !compact && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ⑤ Sparkline */}
      {sparkData && !compact && (
        <div className="w-full mb-2" style={{ height: 32 }}>
          <SparklineArea data={sparkData} color="#2557D6" width={300} height={32} className="w-full" />
        </div>
      )}

      {/* ⑥ Metrics: volume + change */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {showVolume && <span className="font-medium">📊 {volume}</span>}
        {showChange && (
          <span className={`font-bold flex items-center gap-0.5 ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            <TrendingUp className="w-2.5 h-2.5" />
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(TimelineCard);
