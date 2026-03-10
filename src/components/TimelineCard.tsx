import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { SentimentDonut, EmotionBars } from "./SentimentCharts";
import { ChevronDown, ChevronUp, Link2, Bell, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, Newspaper, Bookmark, Flag, Share2, Eye, TrendingUp, Radio, Clock } from "lucide-react";
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

// Source brand colors — consistent everywhere per design system
const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "#FF0000" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "#4285F4" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
  Bluesky: { emoji: "🦋", color: "hsl(200, 100%, 50%)" },
  Mastodon: { emoji: "🐘", color: "#6364FF" },
  "Hacker News": { emoji: "🔶", color: "#FF6600" },
  Wikipedia: { emoji: "📖", color: "hsl(0, 0%, 40%)" },
  "Stack Overflow": { emoji: "💻", color: "hsl(25, 90%, 50%)" },
  GitHub: { emoji: "🐙", color: "#24292E" },
  "X (Twitter)": { emoji: "𝕏", color: "hsl(0, 0%, 15%)" },
  "The Guardian": { emoji: "📰", color: "#0D6EFD" },
  "GNews": { emoji: "📰", color: "hsl(160, 60%, 45%)" },
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

function detectSignalType(platform: string, change?: string): string {
  const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  if (ch > 200) return "🔥 Spike";
  if (platform === "Google Trends") return "🔍 Search";
  if (["Reddit", "Bluesky", "Mastodon", "X (Twitter)"].includes(platform)) return "📱 Social";
  if (["NewsAPI", "GNews", "The Guardian", "Bing News", "NewsData"].includes(platform)) return "📰 News";
  if (["GitHub", "Stack Overflow", "Hacker News"].includes(platform)) return "💻 Dev";
  if (["Wikipedia", "OpenAlex", "World Bank"].includes(platform)) return "📚 Knowledge";
  return "📊 Signal";
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

  useEffect(() => { setExpanded(!!forceExpanded); }, [forceExpanded]);

  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const flag = countryCodeToFlag(countryCode);
  const gradientId = `tl-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 5)}`;
  const trigger = useMemo(() => detectTriggerFromTitle(title), [title]);
  const signalType = useMemo(() => detectSignalType(platform, change), [platform, change]);

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

  const trendScoreLabel = trendScore >= 80
    ? { emoji: "🔥", text: "Explosive", cls: "text-destructive bg-destructive/8" }
    : trendScore >= 60
    ? { emoji: "📈", text: "Rising", cls: "text-orange-600 dark:text-orange-400 bg-orange-500/8" }
    : trendScore >= 40
    ? { emoji: "➡️", text: "Stable", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/8" }
    : { emoji: "—", text: "Low", cls: "text-muted-foreground bg-muted/50" };

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

  const sparkData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;
    return historicalData.slice(-12);
  }, [historicalData]);

  const changeNum = parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0");

  // Determine tier
  const tier = trendScore >= 70 ? "critical" : trendScore >= 40 ? "moderate" : "low";

  return (
    <motion.div
      className={`timeline-card-wrapper ${expanded ? 'timeline-card-expanded-wrapper' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: Math.min(staggerIndex * 0.04, 0.4) }}
    >
      <div className={`timeline-card group ${expanded ? 'timeline-card-expanded' : ''}`} data-tier={tier}>
        
        {/* === MAIN CONTENT: Click to expand === */}
        <div className="cursor-pointer" onClick={handleToggle}>
          
          {/* Image (when available) */}
          {thumbnail && !imgError && !compact && (
            <div className="relative w-full overflow-hidden rounded-md bg-secondary/50 mb-2.5" style={{ height: 120 }}>
              <img src={thumbnail} alt="" className="w-full h-full object-cover block transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" onError={() => setImgError(true)} />
            </div>
          )}

          {/* === HEADER ROW: Platform + Time === */}
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={handlePlatformClick}
              className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: `${pf.color}10`, color: pf.color }}
              >
                {pf.emoji}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: pf.color }}>
                {platform}
              </span>
            </button>
            <FreshnessIndicator publishedAt={publishedAt} time={time} />
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{localizedTime}</span>
            {flag && <span className="text-[11px] flex-shrink-0">{flag}</span>}
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-foreground leading-snug mb-1 break-words ${compact ? 'text-xs line-clamp-1' : 'text-[13px] line-clamp-3'}`} style={{ overflowWrap: 'anywhere' }}>
            {decodeEntities(title)}
          </h3>

          {/* Contextual Description */}
          {displayDescription && !compact && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2 break-words" style={{ overflowWrap: 'anywhere' }}>
              {decodeEntities(displayDescription)}
            </p>
          )}

          {/* === METRICS BAR === */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-2 w-full min-w-0">
            {/* TVI Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold cursor-help ${trendScoreLabel.cls}`}>
                  <span className="opacity-60 font-medium text-[9px]">TVI</span>
                  <span>{trendScore}</span>
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
                <div className="text-[11px] font-medium text-center text-foreground">{trendScore}% - {trendScoreLabel.text}</div>
              </TooltipContent>
            </Tooltip>

            {/* Region */}
            {countryCode && countryCode !== "GL" && (
              <AbbrTooltip text={countryCode.toUpperCase()} className="text-muted-foreground">
                📍 {countryCode}
              </AbbrTooltip>
            )}

            {/* Multiplatform */}
            {isMultiplatform && crossPlatformCluster && (
              <span className="font-bold text-orange-600 dark:text-orange-400 inline-flex items-center gap-0.5">
                <Globe className="w-2.5 h-2.5" />
                {crossPlatformCluster.platformCount} plat.
              </span>
            )}

            {/* Growth */}
            <span className={`inline-flex items-center gap-0.5 font-bold ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              <TrendingUp className="w-3 h-3" />
              {change}
            </span>

            {/* Volume */}
            {volume && volume !== "0" && (
              <span className="text-muted-foreground font-medium">
                💬 {volume}
              </span>
            )}

            {/* Sources */}
            {sources && sources.length > 0 && (
              <span className="text-muted-foreground font-medium inline-flex items-center gap-0.5">
                <Radio className="w-2.5 h-2.5" />
                {sources.length} {sources.length === 1 ? t("sourcesSingular" as any) : t("sourcesPlural" as any)}
              </span>
            )}

            {/* Sparkline with pulsing endpoint */}
            {sparkData && !compact && (
              <div className="ml-auto flex-shrink-0 w-20 h-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={changePositive ? 'hsl(162,100%,39%)' : 'hsl(0,100%,59%)'} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={changePositive ? 'hsl(162,100%,39%)' : 'hsl(0,100%,59%)'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={changePositive ? 'hsl(162,100%,39%)' : 'hsl(0,100%,59%)'} strokeWidth={1.5} fill={`url(#spark-${gradientId})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Pulsing endpoint dot */}
                <span
                  className="absolute right-0 bottom-1 w-1.5 h-1.5 rounded-full spark-endpoint"
                  style={{ background: changePositive ? 'hsl(162,100%,39%)' : 'hsl(0,100%,59%)' }}
                />
              </div>
            )}
          </div>

          {/* === TAGS ROW — unified semantic types === */}
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            {/* TYPE tag */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
              {localizedCategory}
            </span>
            {/* VERIFICATION tag */}
            {trustBadge && (trustBadge === "verified" || trustBadge === "press") && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {t(trustBadgeKeys[trustBadge]?.labelKey as any)}
              </span>
            )}
            {/* ALERT tags */}
            {trigger && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                ⚡ {t(trigger.labelKey as any)}
              </span>
            )}
            {translated && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground">🌐 {t("autoTranslated")}</span>
            )}
          </div>
        </div>

        {/* Bookmark — always visible, top-right */}
        <button
          onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, thumbnail, description: displayDescription, volume, change, changePositive, historicalData, platformColor: pf.color, sources }); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors z-10"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        {/* === ACTION BAR — hidden by default, visible on hover === */}
        <div className="card-actions-row flex items-center gap-0.5 bg-secondary/40 rounded-xl p-0.5 mt-1">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 min-h-[28px] rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {t("viewSource")}
            </a>
          )}
          <button onClick={handleShare} className="inline-flex items-center gap-1 px-2 py-1 min-h-[28px] rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            <Share2 className="w-3 h-3" />
            {t("share")}
          </button>
          <div className="flex-1" />
          <button onClick={handleAlertClick} className="p-1.5 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-card transition-colors">
            <Bell className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${title.slice(0, 40)}` }); }} className="p-1.5 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-card transition-colors">
            <Flag className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* === EXPANDED CONTENT === */}
      {expanded && (
        <div className="timeline-card-expanded-content">
          {thumbnail && !imgError && compact && (
            <div className="relative w-full mb-3 rounded-xl overflow-hidden bg-secondary/50 aspect-video">
              <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            </div>
          )}

          {details && details !== displayDescription && (
            <p className="text-xs text-muted-foreground mb-3">{details}</p>
          )}

          {/* TVI Hero + supporting metrics */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wide mb-1">TVI</span>
              <span className="block text-4xl font-bold text-foreground leading-none">{trendScore}</span>
              <span className={`block text-[10px] font-semibold mt-0.5 ${trendScoreLabel.cls}`}>{trendScoreLabel.text}</span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">{t("growth" as any)}</span>
                <span className={`block text-sm font-bold ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{change}</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">{t("volumeLabel" as any)}</span>
                <span className="block text-sm font-bold text-foreground">{volume || "—"}</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-secondary/50">
                <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">{t("sourcesLabel" as any)}</span>
                <span className="block text-sm font-bold text-foreground">{sources?.length || 1}</span>
              </div>
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

          {/* Sentiment Analysis — collapsible */}
          <details className="mb-3 rounded-xl bg-secondary/30 overflow-hidden">
            <summary className="px-2.5 py-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors select-none">
              📊 {t("sentimentAnalysis" as any)}
            </summary>
            <div className="px-2.5 pb-2.5">
              <div className="flex items-center gap-4">
                <SentimentDonut
                  positive={changePositive ? 55 : 25}
                  neutral={30}
                  negative={changePositive ? 15 : 45}
                  size={56}
                  showLegend
                />
              </div>
              <div className="mt-2 pt-2 border-t border-border/30">
                <EmotionBars
                  emotions={[
                    { icon: "😊", label: t("positive"), percentage: changePositive ? 55 : 25, color: "hsl(142, 60%, 45%)" },
                    { icon: "😐", label: t("neutral"), percentage: 30, color: "hsl(var(--muted-foreground))" },
                    { icon: "😠", label: t("negative"), percentage: changePositive ? 15 : 45, color: "hsl(var(--destructive))" },
                  ]}
                />
              </div>
            </div>
          </details>

          {/* Platform-specific metrics */}
          <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
            {platform === "YouTube" && likeRatio !== undefined && likeRatio > 0 && (
              <span className="source-tag text-[10px] py-0.5 px-2">👍 {likeRatio}% {t("likes")}</span>
            )}
            {platform === "Reddit" && commentCount !== undefined && (
              <span className="source-tag text-[10px] py-0.5 px-2">💬 {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount} {t("comments")}</span>
            )}
            {platform === "Google Trends" && region && (
              <span className="source-tag text-[10px] py-0.5 px-2">📍 {region}</span>
            )}
          </div>

          {/* 24h Chart */}
          {historicalData && historicalData.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("evolution24h")}
                </span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-0.5 rounded-full" style={{ background: pf.color }} />
                  {metricLabel || "Volume"}
                </span>
              </div>
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={pf.color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={pf.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 11 }}
                      formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "Volume"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={pf.color} strokeWidth={1.5} fill={`url(#${gradientId})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Propagation Timeline (cross-platform) */}
          {isMultiplatform && crossPlatformCluster && crossPlatformCluster.platformCount >= 2 && (
            <div className="mb-3 pt-2">
              <PropagationTimeline cluster={crossPlatformCluster} compact />
            </div>
          )}

          {/* Narrative origin + confidence — subtle footnote */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/70 pt-2 mt-2 border-t border-border/20">
            <span>🗺️ {platform} {countryCode && countryCode !== "GL" ? `· ${flag} ${countryCode}` : ""}</span>
            <span>{t("confidenceLabel" as any)}: {trendScore}%</span>
          </div>

          <TrendFeedback title={title} platform={platform} userId={userId} />
        </div>
      )}

      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} onSubmit={handleCreateAlert} defaultKeyword={title} defaultCategory={category} />
    </motion.div>
  );
};

export default TimelineCard;