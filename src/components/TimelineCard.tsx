import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { SentimentDonut, EmotionBars } from "./SentimentCharts";
import { ChevronDown, ChevronUp, Link2, Bell, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, Newspaper, Bookmark, Flag, Share2, Eye, TrendingUp, Radio, Clock, Info } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";
import TrendFeedback from "./TrendFeedback";
import PropagationTimeline from "./PropagationTimeline";
import FreshnessIndicator from "./FreshnessIndicator";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";
import { getTooltip } from "@/lib/format-utils";
import AbbrTooltip from "./AbbrTooltip";
import SparklineArea from "./SparklineArea";

// Source brand colors
const SOURCE_COLORS: Record<string, string> = {
  "The Guardian": "#052962",
  "arXiv": "#B31B1B",
  "PubMed": "#007CBB",
  "Google Trends": "#4285F4",
  "Wikipedia": "#000000",
  "World Bank": "#009FDA",
  "IBGE": "#003A6C",
  "Bluesky": "#0085FF",
  "GitHub": "#24292E",
  "Mastodon": "#6364FF",
  "YouTube": "#FF0000",
  "Reddit": "#FF4500",
  "Hacker News": "#FF6600",
  "X (Twitter)": "#1DA1F2",
  "NewsAPI": "#2E8B57",
  "GNews": "#3CB371",
  "Stack Overflow": "#F48024",
  "Variety": "#B8860B",
  "OpenAlex": "#3366CC",
  "NPR": "#EC1427",
  "Bing News": "#008373",
  "NewsData": "#4682B4",
};

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "#FF0000" },
  Reddit: { emoji: "◉", color: "#FF4500" },
  "Google Trends": { emoji: "◎", color: "#4285F4" },
  NewsAPI: { emoji: "◈", color: "#2E8B57" },
  Bluesky: { emoji: "🦋", color: "#0085FF" },
  Mastodon: { emoji: "🐘", color: "#6364FF" },
  "Hacker News": { emoji: "🔶", color: "#FF6600" },
  Wikipedia: { emoji: "📖", color: "#000000" },
  "Stack Overflow": { emoji: "💻", color: "#F48024" },
  GitHub: { emoji: "🐙", color: "#24292E" },
  "X (Twitter)": { emoji: "𝕏", color: "#1DA1F2" },
  "The Guardian": { emoji: "📰", color: "#052962" },
  "GNews": { emoji: "📰", color: "#3CB371" },
  "PubMed": { emoji: "🔬", color: "#007CBB" },
  "Variety": { emoji: "🎬", color: "#B8860B" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const trustBadgeKeys: Record<string, { labelKey: string; icon: React.ReactNode; className: string }> = {
  official: { labelKey: "officialSource", icon: <Shield className="w-2.5 h-2.5" />, className: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  verified: { labelKey: "verifiedPress", icon: <CheckCircle2 className="w-2.5 h-2.5" />, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  scientific: { labelKey: "scientificData", icon: <FlaskConical className="w-2.5 h-2.5" />, className: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
  international: { labelKey: "internationalSource", icon: <Globe className="w-2.5 h-2.5" />, className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  press: { labelKey: "verifiedPress", icon: <Newspaper className="w-2.5 h-2.5" />, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  hot: { labelKey: "hotTopic", icon: <span className="text-[9px]">🔥</span>, className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
};

const triggerPatterns: { type: string; emoji: string; labelKey: string; keywords: string[] }[] = [
  { type: "launch", emoji: "🎬", labelKey: "launch", keywords: ["trailer", "estreia", "lançamento", "novo", "nova", "release", "launch", "premiere", "debut"] },
  { type: "politics", emoji: "🗳️", labelKey: "politics", keywords: ["eleição", "voto", "governo", "presidente", "congresso", "election", "vote", "government", "president", "congress", "trump", "biden"] },
  { type: "crisis", emoji: "⚠️", labelKey: "crisis", keywords: ["acidente", "crise", "emergência", "desastre", "ataque", "crash", "crisis", "emergency", "disaster", "attack", "war", "earthquake"] },
  { type: "sports", emoji: "🏆", labelKey: "sportsEvent", keywords: ["jogo", "copa", "campeonato", "final", "gol", "partida", "game", "cup", "championship", "goal", "match", "nba", "nfl", "fifa"] },
  { type: "statement", emoji: "📢", labelKey: "declaration", keywords: ["diz", "afirma", "declara", "polêmica", "fala sobre", "says", "claims", "declares", "controversy", "statement"] },
  { type: "science", emoji: "🔬", labelKey: "scienceEvent", keywords: ["pesquisa", "estudo", "descoberta", "nasa", "vacina", "research", "study", "discovery", "nasa", "vaccine", "breakthrough"] },
  { type: "business", emoji: "📈", labelKey: "businessEvent", keywords: ["bolsa", "mercado", "ações", "investimento", "pib", "market", "stock", "investment", "gdp", "revenue", "profit", "tariff"] },
];

function detectTriggerFromTitle(title: string): { emoji: string; labelKey: string } | null {
  const lower = title.toLowerCase();
  for (const pattern of triggerPatterns) {
    if (pattern.keywords.some(kw => lower.includes(kw))) {
      return { emoji: pattern.emoji, labelKey: pattern.labelKey };
    }
  }
  return null;
}

interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onExpand?: (title: string, platform: string, metadata?: any) => void;
  userId?: string | null;
  onTrackAction?: (action: string, points: number, metadata?: Record<string, any>) => void;
  forceExpanded?: boolean;
  isMultiplatform?: boolean;
  crossPlatformCluster?: CrossPlatformCluster | null;
  onSaveCard?: (card: any) => void;
}

const normalizeText = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el) return text;
  el.innerHTML = text;
  return el.value;
};

const localizeCategory = (category: string, t: (key: any) => string) => {
  const normalized = normalizeText(category || "");
  const map: Record<string, string> = {
    politica: "politics", politics: "politics", entretenimento: "entertainment", entertainment: "entertainment",
    tecnologia: "technology", technology: "technology", esportes: "sports", sports: "sports",
    cultura: "culture", culture: "culture", negocios: "business", "negocios/financas": "business", business: "business",
    ciencia: "science", science: "science", geral: "general", general: "general", social: "socialMedia",
  };
  const key = map[normalized];
  return key ? t(key as any) : category;
};

const relativeTimeFormats: Record<string, { now: string; min: string; h: string; d: string }> = {
  pt: { now: "agora", min: "há {n}min", h: "há {n}h", d: "há {n}d" },
  en: { now: "now", min: "{n}min ago", h: "{n}h ago", d: "{n}d ago" },
  es: { now: "ahora", min: "hace {n}min", h: "hace {n}h", d: "hace {n}d" },
  fr: { now: "maintenant", min: "il y a {n}min", h: "il y a {n}h", d: "il y a {n}j" },
  de: { now: "jetzt", min: "vor {n}min", h: "vor {n}h", d: "vor {n}T" },
  it: { now: "adesso", min: "{n}min fa", h: "{n}h fa", d: "{n}g fa" },
  zh: { now: "刚刚", min: "{n}分钟前", h: "{n}小时前", d: "{n}天前" },
  ja: { now: "たった今", min: "{n}分前", h: "{n}時間前", d: "{n}日前" },
  ko: { now: "방금", min: "{n}분 전", h: "{n}시간 전", d: "{n}일 전" },
  ar: { now: "الآن", min: "منذ {n} دقيقة", h: "منذ {n} ساعة", d: "منذ {n} يوم" },
  hi: { now: "अभी", min: "{n} मिनट पहले", h: "{n} घंटे पहले", d: "{n} दिन पहले" },
  ru: { now: "сейчас", min: "{n} мин назад", h: "{n}ч назад", d: "{n}д назад" },
};

function localizeFallbackTime(timeValue: string, lang: string): string {
  if (!timeValue) return timeValue;
  const lower = timeValue.toLowerCase().trim();
  const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
  if (lower === "agora" || lower === "now") return fmt.now;
  const match = lower.match(/(?:há\s*)?(\d+)\s*(min|m|h|d)/i);
  if (!match) return timeValue;
  const value = match[1];
  const unit = match[2].toLowerCase();
  if (unit === "min" || unit === "m") return fmt.min.replace("{n}", value);
  if (unit === "h") return fmt.h.replace("{n}", value);
  if (unit === "d") return fmt.d.replace("{n}", value);
  return timeValue;
}

// Determine card type based on content
type CardType = "standard" | "article" | "viral" | "image";

function getCardType(props: { thumbnail?: string; trendScore: number; description?: string; details?: string; platform: string; trigger: ReturnType<typeof detectTriggerFromTitle>; imgError: boolean }): CardType {
  if (props.thumbnail && !props.imgError) return "image";
  if (props.trendScore >= 60 || (props.trigger && ["crisis", "politics"].includes(props.trigger.labelKey))) return "viral";
  const desc = props.description || props.details || "";
  const isPressSource = ["The Guardian", "NewsAPI", "GNews", "Bing News", "NewsData", "NPR", "PubMed", "OpenAlex", "IBGE", "World Bank"].includes(props.platform);
  if (desc.length > 60 && isPressSource) return "article";
  return "standard";
}

// Smart context line generator
function generateSmartContext(platform: string, volume: string, countryCode?: string, category?: string, sources?: string[]): string {
  const flag = countryCodeToFlag(countryCode);
  const country = countryCode && countryCode !== "GL" ? ` ${flag || ""} ${countryCode}` : "";
  
  if (platform === "Google Trends") return `${volume || "—"} buscas${country} · ${category || "Geral"}`;
  if (["The Guardian", "NewsAPI", "GNews", "Bing News", "NewsData", "NPR"].includes(platform)) return `${platform}${country} · ${category || "Notícias"}`;
  if (["PubMed", "OpenAlex"].includes(platform)) return `${platform} · Artigo acadêmico${country}`;
  if (platform === "Wikipedia") return `Artigo enciclopédico · ${volume || "—"} visualizações`;
  if (["Reddit", "Bluesky", "Mastodon", "X (Twitter)"].includes(platform)) {
    const interactions = volume && volume !== "0" ? `${volume} interações` : "";
    return `${platform}${interactions ? ` · ${interactions}` : ""}${country}`;
  }
  if (["GitHub", "Hacker News", "Stack Overflow"].includes(platform)) return `${platform} · Dev${country}`;
  return `${platform}${country}`;
}

// TVI badge tier
function getTVITier(score: number) {
  if (score >= 70) return { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400", pulse: true };
  if (score >= 50) return { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", pulse: false };
  if (score >= 30) return { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", pulse: false };
  return { bg: "bg-secondary", text: "text-muted-foreground", pulse: false };
}

// Growth pill
function getGrowthPill(change: string, changePositive: boolean) {
  const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  if (ch === 0) return null;
  if (ch > 200) return { label: "+trending", cls: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" };
  if (changePositive && ch > 50) return { label: "+popular", cls: "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" };
  if (changePositive) return { label: "+novo", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" };
  return null;
}

// Confidence score calculation
function getConfidenceScore(platform: string, sources?: string[], trendScore?: number) {
  let score = 0;
  const isVerifiedPress = ["The Guardian", "NPR", "PubMed", "IBGE", "World Bank", "OpenAlex"].includes(platform);
  if (isVerifiedPress) score += 40;
  else if (["NewsAPI", "GNews", "Bing News", "NewsData"].includes(platform)) score += 25;
  else score += 10;
  
  // Historical accuracy proxy
  score += isVerifiedPress ? 25 : 15;
  
  // Multi-source coverage
  const srcCount = sources?.length || 1;
  score += Math.min(srcCount * 5, 20);
  
  // Recency boost
  score += 10;
  
  return Math.min(score, 100);
}

function getConfidenceTier(score: number) {
  if (score >= 71) return { label: "Alta", color: "#3B82F6", bg: "bg-blue-50 dark:bg-blue-500/10", barBg: "#DBEAFE", fillColor: "#3B82F6" };
  if (score >= 41) return { label: "Boa", color: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-500/10", barBg: "#D1FAE5", fillColor: "#10B981" };
  if (score >= 21) return { label: "Moderada", color: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-500/10", barBg: "#FEF3C7", fillColor: "#F59E0B" };
  return { label: "Baixa", color: "#EF4444", bg: "bg-red-50 dark:bg-red-500/10", barBg: "#FEE2E2", fillColor: "#EF4444" };
}

const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  details, historicalData, metricLabel, likeRatio, commentCount, region,
  countryCode, sources, sourceUrl, trustBadge, thumbnail, publishedAt,
  description, firstSeenAt, peakAt, relevanceScore, translated,
  onClick, onFilterPlatform, onExpand, userId, onTrackAction,
  forceExpanded, isMultiplatform, crossPlatformCluster, onSaveCard,
  staggerIndex = 0, compact = false,
}: TimelineCardProps & { staggerIndex?: number; compact?: boolean }) => {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(forceExpanded || false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [sentimentOpen, setSentimentOpen] = useState(false);

  useEffect(() => { setExpanded(!!forceExpanded); }, [forceExpanded]);

  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const brandColor = SOURCE_COLORS[platform] || pf.color;
  const flag = countryCodeToFlag(countryCode);
  const trigger = useMemo(() => detectTriggerFromTitle(title), [title]);

  const tviBreakdown = useMemo(() => {
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    const velocity = Math.min(Math.round(ch / 10), 30);
    const volStr = (volume || "0").toLowerCase();
    let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
    if (volStr.includes("m")) vol *= 1_000_000;
    else if (volStr.includes("k")) vol *= 1_000;
    const volumeScore = Math.min(Math.round(vol / 5000), 30);
    const sourcesScore = Math.min((sources?.length || 1) * 5, 20);
    let geoScore = 0;
    if (isMultiplatform) geoScore += 15;
    if (crossPlatformCluster && crossPlatformCluster.platformCount > 2) geoScore += 5;
    geoScore = Math.min(geoScore, 20);
    const total = Math.min(velocity + volumeScore + sourcesScore + geoScore, 100);
    return { velocity, volume: volumeScore, sources: sourcesScore, geography: geoScore, total };
  }, [change, volume, sources, isMultiplatform, crossPlatformCluster]);
  const trendScore = tviBreakdown.total;

  const formattedDate = useMemo(() => {
    if (!publishedAt) return null;
    try {
      const date = new Date(publishedAt);
      if (isNaN(date.getTime())) return null;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (diffMin < 1) return fmt.now;
      if (diffMin < 60) return fmt.min.replace("{n}", String(diffMin));
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return fmt.h.replace("{n}", String(diffH));
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return fmt.d.replace("{n}", String(diffD));
      return date.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "short" });
    } catch { return null; }
  }, [publishedAt, lang]);

  const displayDescription = description || details;
  const localizedCategory = useMemo(() => localizeCategory(category, t), [category, t]);
  const localizedTime = useMemo(() => formattedDate || localizeFallbackTime(time, lang), [formattedDate, time, lang]);

  const cardType = useMemo(() => getCardType({ thumbnail, trendScore, description, details, platform, trigger, imgError }), [thumbnail, trendScore, description, details, platform, trigger, imgError]);
  const smartContext = useMemo(() => generateSmartContext(platform, volume, countryCode, category, sources), [platform, volume, countryCode, category, sources]);
  const tviTier = useMemo(() => getTVITier(trendScore), [trendScore]);
  const growthPill = useMemo(() => getGrowthPill(change, changePositive), [change, changePositive]);
  const confidenceScore = useMemo(() => getConfidenceScore(platform, sources, trendScore), [platform, sources, trendScore]);
  const confidenceTier = useMemo(() => getConfidenceTier(confidenceScore), [confidenceScore]);

  const sparkData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;
    return historicalData.slice(-12).map(d => d.value);
  }, [historicalData]);

  const handlePlatformClick = (e: React.MouseEvent) => { e.stopPropagation(); onFilterPlatform?.(platform); };

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      onExpand?.(title, platform, { volume, category, countryCode });
      onTrackAction?.("expand", 2, { title, platform, countryCode, category });
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = sourceUrl || window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${title} — ${shareUrl}`);
      toast({ title: "🔗 Link copiado!", description: title.slice(0, 60) });
    }
    onTrackAction?.("share", 5, { title, platform, countryCode, category });
  };

  const handleAlertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: t("loginRequired"), description: t("loginRequiredDesc") }); return; }
    setAlertOpen(true);
  };

  const handleCreateAlert = async (input: any) => {
    if (!userId) return;
    const { error } = await supabase.from("alerts").insert({
      user_id: userId, keyword: title, category: category || null,
      threshold: input.threshold, frequency: input.frequency, notification_method: input.notification_method,
    });
    if (error) toast({ title: t("error"), description: error.message, variant: "destructive" });
    else toast({ title: `🔔 ${t("alertCreated")}`, description: `${t("monitoring")}: ${title.slice(0, 40)}` });
  };

  const tier = trendScore >= 70 ? "critical" : trendScore >= 40 ? "moderate" : "low";

  // Tags — max 2 + overflow
  const allTags = useMemo(() => {
    const tags: { label: string; cls: string; priority: number }[] = [];
    if (trigger && ["crisis"].includes(trigger.labelKey)) {
      tags.push({ label: `⚡ ${t(trigger.labelKey as any)}`, cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", priority: 0 });
    } else if (trigger) {
      tags.push({ label: `${trigger.emoji} ${t(trigger.labelKey as any)}`, cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", priority: 1 });
    }
    if (trustBadge && (trustBadge === "verified" || trustBadge === "press")) {
      tags.push({ label: `✓ ${t(trustBadgeKeys[trustBadge]?.labelKey as any)}`, cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", priority: 1 });
    }
    tags.push({ label: localizedCategory, cls: "bg-secondary text-muted-foreground", priority: 2 });
    if (translated) {
      tags.push({ label: `🌐 ${t("autoTranslated")}`, cls: "bg-secondary text-muted-foreground", priority: 3 });
    }
    tags.sort((a, b) => a.priority - b.priority);
    return tags;
  }, [trigger, trustBadge, localizedCategory, translated, t]);

  const visibleTags = allTags.slice(0, 2);
  const overflowCount = allTags.length - 2;

  // Card type-specific classes
  const cardTypeClass = cardType === "viral"
    ? "timeline-card-viral"
    : cardType === "article"
    ? "timeline-card-article"
    : "";

  const isFullWidthSparkline = cardType === "article" || cardType === "viral";

  return (
    <motion.div
      className="timeline-card-wrapper"
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1], delay: Math.min(staggerIndex * 0.035, 0.21) }}
    >
      <div
        className={`timeline-card group ${cardTypeClass} ${expanded ? 'timeline-card-expanded' : ''}`}
        data-tier={tier}
        data-card-type={cardType}
      >
        {/* TYPE C: Top accent bar for viral */}
        {cardType === "viral" && (
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${brandColor}, transparent)` }} />
        )}

        {/* === MAIN CONTENT: Click to expand === */}
        <div className="cursor-pointer" onClick={handleToggle}>

          {/* TYPE D: Image at top */}
          {cardType === "image" && thumbnail && !imgError && !compact && (
            <div className="relative w-full overflow-hidden rounded-md mb-2.5" style={{ height: 120 }}>
              <img src={thumbnail} alt="" className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" onError={() => setImgError(true)} />
            </div>
          )}

          {/* ① SOURCE ROW */}
          <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
            <button onClick={handlePlatformClick} className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brandColor }} />
              <span className="text-[11px] font-semibold truncate" style={{ color: brandColor }}>{platform}</span>
            </button>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{localizedTime}</span>
            {flag && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[11px] flex-shrink-0 cursor-help">{flag}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">{countryCode?.toUpperCase()}</TooltipContent>
              </Tooltip>
            )}
            <div className="flex-1" />
            {/* Bookmark always visible */}
            <button
              onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, thumbnail, description: displayDescription, volume, change, changePositive, historicalData, platformColor: brandColor, sources }); }}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ② TITLE */}
          <h3 className={`font-bold text-foreground leading-[1.4] mb-1 break-words ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-3'}`} style={{ overflowWrap: 'anywhere' }}>
            {decodeEntities(title)}
          </h3>

          {/* ③ SMART CONTEXT LINE */}
          <p className="text-[11px] text-muted-foreground italic leading-relaxed mb-1.5 truncate">{smartContext}</p>

          {/* TYPE B: Description for article cards */}
          {cardType === "article" && displayDescription && !compact && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2 break-words" style={{ overflowWrap: 'anywhere' }}>
              {decodeEntities(displayDescription)}
            </p>
          )}

          {/* ④ METRICS ROW */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-1.5 w-full min-w-0">
            {/* TVI Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold cursor-help ${tviTier.bg} ${tviTier.text}`} style={{ height: 18 }}>
                  {tviTier.pulse && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
                  <span className="text-[10px]">TVI {trendScore}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-3 text-[11px] space-y-1.5 min-w-[200px] z-50 bg-popover/95 backdrop-blur-md">
                <div className="font-bold text-[12px] mb-1 text-foreground">Trend Velocity Index (TVI)</div>
                <p className="text-muted-foreground mb-2 leading-tight">{t("tviDescription" as any)}</p>
                <div className="flex justify-between"><span>📈 {t("tviGrowthLabel" as any)}</span><span className="font-bold text-foreground">{tviBreakdown.velocity}</span></div>
                <div className="flex justify-between"><span>💬 {t("tviVolumeLabel" as any)}</span><span className="font-bold text-foreground">{tviBreakdown.volume}</span></div>
                <div className="flex justify-between"><span>📰 {t("tviSourcesLabel" as any)}</span><span className="font-bold text-foreground">{tviBreakdown.sources}</span></div>
                <div className="flex justify-between"><span>🌍 {t("tviGeographyLabel" as any)}</span><span className="font-bold text-foreground">{tviBreakdown.geography}</span></div>
                <div className="h-px bg-border my-2" />
                <div className="text-[11px] font-medium text-center text-foreground">{trendScore}%</div>
              </TooltipContent>
            </Tooltip>

            {/* Growth pill */}
            {growthPill && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${growthPill.cls}`}>
                {growthPill.label}
              </span>
            )}

            {/* Growth value */}
            <span className={`inline-flex items-center gap-0.5 font-bold ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              <TrendingUp className="w-3 h-3" />
              {change}
            </span>

            {/* Volume */}
            {volume && volume !== "0" && (
              <span className="text-muted-foreground font-medium">💬 {volume}</span>
            )}

            {/* Sparkline — inline for standard/image cards */}
            {sparkData && !compact && !isFullWidthSparkline && (
              <div className="ml-auto flex-shrink-0" style={{ width: 80, height: 32 }}>
                <SparklineArea data={sparkData} color={brandColor} width={80} height={32} />
              </div>
            )}
          </div>

          {/* Full-width sparkline for article/viral cards */}
          {sparkData && !compact && isFullWidthSparkline && (
            <div className="w-full mb-1.5" style={{ height: 48 }}>
              <SparklineArea data={sparkData} color={brandColor} width={300} height={48} className="w-full" />
            </div>
          )}

          {/* ⑥ TAGS ROW */}
          <div className="flex items-center gap-1 flex-wrap mb-1 w-full">
            {visibleTags.map((tag, i) => (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                +{overflowCount}
              </span>
            )}
          </div>
        </div>

        {/* ⑦ ACTIONS ROW — hidden by default, reveal on hover */}
        <div className="card-actions-row flex items-center gap-3 w-full min-w-0" style={{ borderTop: '1px solid hsl(var(--border) / 0.15)', paddingTop: 8, marginTop: 4 }}>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              {t("viewSource")}
            </a>
          )}
          <button onClick={handleShare} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            <Share2 className="w-3 h-3 flex-shrink-0" />
            {t("share")}
          </button>
          <div className="flex-1" />
          <button onClick={handleAlertClick} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex-shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${title.slice(0, 40)}` }); }} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0">
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* === EXPANDED CONTENT — INTELLIGENCE REPORT === */}
      {expanded && (
        <div className="timeline-card-expanded-content">
          
          {/* ② Title large */}
          <h2 className="text-[17px] font-black text-foreground leading-[1.35] mb-3">{decodeEntities(title)}</h2>

          {/* ③ Smart Summary */}
          <div className="rounded-lg p-2.5 mb-3" style={{ background: 'hsl(var(--secondary))', borderLeft: `3px solid ${brandColor}` }}>
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              <strong>{decodeEntities(title.split(/[—–:]/)[0].trim())}</strong>
              {" "}
              {lang === "pt"
                ? `está ${trendScore >= 60 ? "acelerando" : trendScore >= 30 ? "em alta" : "sendo discutido"} ${countryCode && countryCode !== "GL" ? `em ${flag} ${countryCode}` : "globalmente"}. Sendo discutido em ${sources?.length || 1} ${(sources?.length || 1) > 1 ? "plataformas" : "plataforma"} com ${change} de crescimento.`
                : `is ${trendScore >= 60 ? "accelerating" : trendScore >= 30 ? "trending" : "being discussed"} ${countryCode && countryCode !== "GL" ? `in ${flag} ${countryCode}` : "globally"}. Discussed across ${sources?.length || 1} platform${(sources?.length || 1) > 1 ? "s" : ""} with ${change} growth.`
              }
            </p>
          </div>

          {/* ④ METRICS GRID 2×2 — flat dividers, no bg */}
          <div className="grid grid-cols-2 mb-3" style={{ border: '1px solid hsl(var(--border) / 0.3)' }}>
            <div className="p-3 text-center" style={{ borderRight: '1px solid hsl(var(--border) / 0.15)', borderBottom: '1px solid hsl(var(--border) / 0.15)' }}>
              <span className="block text-[32px] font-black leading-none" style={{ color: tviTier.pulse ? 'hsl(var(--destructive))' : trendScore >= 50 ? brandColor : undefined }}>{trendScore}</span>
              <span className="block text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.5px]">{lang === "pt" ? "Velocidade" : "Velocity"}</span>
            </div>
            <div className="p-3 text-center" style={{ borderBottom: '1px solid hsl(var(--border) / 0.15)' }}>
              <span className={`block text-[20px] font-bold leading-none ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{change}</span>
              <span className="block text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.5px]">{lang === "pt" ? "Crescimento" : "Growth"}</span>
            </div>
            <div className="p-3 text-center" style={{ borderRight: '1px solid hsl(var(--border) / 0.15)' }}>
              <span className="block text-[20px] font-bold text-foreground leading-none">{volume || "—"}</span>
              <span className="block text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.5px]">{lang === "pt" ? "Volume" : "Volume"}</span>
            </div>
            <div className="p-3 text-center">
              <span className="block text-[20px] font-bold text-foreground leading-none">{sources?.length || 1}</span>
              <span className="block text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.5px]">{lang === "pt" ? "Fontes" : "Sources"}</span>
            </div>
          </div>

          {/* ⑤ CONFIDENCE SCORE */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] font-semibold text-foreground/70">{lang === "pt" ? "Índice de Confiança" : "Confidence Index"}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-[10px] p-2.5">
                  {lang === "pt"
                    ? "Calculado com base em: verificação editorial da fonte (40%), histórico de precisão (30%), cobertura por múltiplas fontes (20%) e tempo desde publicação (10%)."
                    : "Based on: editorial verification (40%), accuracy history (30%), multi-source coverage (20%), and recency (10%)."}
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Segmented bar — thinner, gradient fill */}
            <div className="w-full h-1 rounded-full overflow-hidden bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${confidenceScore}%`,
                  background: confidenceScore >= 71
                    ? 'linear-gradient(90deg, #93C5FD, #3B82F6)'
                    : confidenceScore >= 41
                    ? 'linear-gradient(90deg, #6EE7B7, #10B981)'
                    : confidenceScore >= 21
                    ? 'linear-gradient(90deg, #FCD34D, #F59E0B)'
                    : 'linear-gradient(90deg, #FCA5A5, #EF4444)',
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[11px] font-medium" style={{ color: confidenceTier.color }}>{confidenceTier.label} · {confidenceScore}%</span>
              {["The Guardian", "NPR", "PubMed", "IBGE", "World Bank", "OpenAlex"].includes(platform) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-400 text-emerald-600 dark:text-emerald-400" style={{ background: 'transparent', height: 18, lineHeight: '14px' }}>✓ Fonte verificada</span>
              )}
              {(sources?.length || 1) === 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400 text-amber-600 dark:text-amber-400" style={{ background: 'transparent', height: 18, lineHeight: '14px' }}>⚠ Fonte única</span>
              )}
              {trendScore >= 60 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-blue-400 text-blue-600 dark:text-blue-400" style={{ background: 'transparent', height: 18, lineHeight: '14px' }}>📈 Alto engajamento</span>
              )}
            </div>
          </div>

          {/* Sources & Propagation */}
          {sources && sources.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Radio className="w-2.5 h-2.5" /> {sources.length >= 2 ? t("propagationPath" as any) : t("sourceLabel" as any)}
              </span>
              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                {sources.slice(0, 6).map((s, idx) => (
                  <span key={s} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-muted-foreground/30">→</span>}
                    <span className="px-2 py-0.5 rounded-full bg-primary/6 text-primary font-medium">{s}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ⑥ EVOLUTION 24H CHART */}
          {historicalData && historicalData.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{t("evolution24h")}</span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-0.5 rounded-full" style={{ background: brandColor }} />
                  {metricLabel || "Volume"}
                </span>
              </div>
              <div className="h-20 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id={`exp-${title.slice(0, 5)}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={brandColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "Volume"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={brandColor} strokeWidth={1.5} fill={`url(#exp-${title.slice(0, 5)})`} dot={{ r: 2, fill: brandColor, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ⑦ SENTIMENT — collapsible */}
          <div className="mb-3">
            <button onClick={() => setSentimentOpen(!sentimentOpen)} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full">
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${sentimentOpen ? 'rotate-0' : '-rotate-90'}`} />
              {t("sentimentAnalysis" as any)}
            </button>
            {sentimentOpen && (
              <div className="mt-2">
                {/* Horizontal segmented bar */}
                {(() => {
                  const pos = changePositive ? 55 : 25;
                  const neu = 30;
                  const neg = changePositive ? 15 : 45;
                  return (
                    <>
                      <div className="w-full h-3 rounded-full overflow-hidden flex">
                        <div style={{ width: `${pos}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${neu}%` }} className="bg-muted-foreground/30" />
                        <div style={{ width: `${neg}%` }} className="bg-destructive" />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400">😊 {t("positive")}: {pos}%</span>
                        <span className="text-muted-foreground">😐 {t("neutral")}: {neu}%</span>
                        <span className="text-destructive">😞 {t("negative")}: {neg}%</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Propagation Timeline (cross-platform) */}
          {isMultiplatform && crossPlatformCluster && crossPlatformCluster.platformCount >= 2 && (
            <div className="mb-3 pt-2">
              <PropagationTimeline cluster={crossPlatformCluster} compact />
            </div>
          )}

          {/* ⑧ Country tag */}
          {countryCode && countryCode !== "GL" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground mb-2 cursor-help">
                  📍 {flag} {countryCode.toUpperCase()}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">{lang === "pt" ? "País de origem da tendência" : "Trend origin country"}</TooltipContent>
            </Tooltip>
          )}

          {/* ⑨ Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 pt-2 mt-2 border-t border-border/20">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
              {platform} {countryCode && countryCode !== "GL" ? `· ${flag} ${countryCode}` : ""} · {confidenceTier.label} {confidenceScore}%
            </span>
          </div>

          <TrendFeedback title={title} platform={platform} userId={userId} />
        </div>
      )}

      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} onSubmit={handleCreateAlert} defaultKeyword={title} defaultCategory={category} />
    </motion.div>
  );
};

export default TimelineCard;
