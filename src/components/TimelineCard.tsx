import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Link2, Bell, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, Newspaper, Bookmark, Flag, Share2, Eye, TrendingUp, Radio, Clock, BarChart3 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";
import TrendFeedback from "./TrendFeedback";
import PropagationTimeline from "./PropagationTimeline";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "hsl(0, 72%, 51%)" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "hsl(210, 100%, 40%)" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
  Bluesky: { emoji: "🦋", color: "hsl(200, 100%, 50%)" },
  Mastodon: { emoji: "🐘", color: "hsl(270, 60%, 55%)" },
  "Hacker News": { emoji: "🔶", color: "hsl(25, 100%, 50%)" },
  Wikipedia: { emoji: "📖", color: "hsl(0, 0%, 40%)" },
  "Stack Overflow": { emoji: "💻", color: "hsl(25, 90%, 50%)" },
  GitHub: { emoji: "🐙", color: "hsl(0, 0%, 20%)" },
  "X (Twitter)": { emoji: "𝕏", color: "hsl(0, 0%, 15%)" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const trustBadgeKeys: Record<string, { labelKey: string; icon: React.ReactNode; className: string }> = {
  official: { labelKey: "officialSource", icon: <Shield className="w-2.5 h-2.5" />, className: "bg-blue-100/80 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  verified: { labelKey: "verifiedPress", icon: <CheckCircle2 className="w-2.5 h-2.5" />, className: "bg-green-100/80 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  scientific: { labelKey: "scientificData", icon: <FlaskConical className="w-2.5 h-2.5" />, className: "bg-purple-100/80 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
  international: { labelKey: "internationalSource", icon: <Globe className="w-2.5 h-2.5" />, className: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/15 dark:text-amber-500" },
  press: { labelKey: "verifiedPress", icon: <Newspaper className="w-2.5 h-2.5" />, className: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  hot: { labelKey: "hotTopic", icon: <span className="text-[9px]">🔥</span>, className: "bg-red-100/80 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
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

// Signal type detection for tags
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

  // TVI Score: 0-100 with decomposition
  const tviBreakdown = useMemo(() => {
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    const velocity = Math.min(Math.round(ch / 10), 30); // 0-30
    const volStr = (volume || "0").toLowerCase();
    let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
    if (volStr.includes("m")) vol *= 1_000_000;
    else if (volStr.includes("k")) vol *= 1_000;
    const volumeScore = Math.min(Math.round(vol / 5000), 30); // 0-30
    const sourcesScore = Math.min((sources?.length || 1) * 5, 20); // 0-20
    let geoScore = 0;
    if (isMultiplatform) geoScore += 15;
    if (crossPlatformCluster && crossPlatformCluster.platformCount > 2) geoScore += 5;
    geoScore = Math.min(geoScore, 20); // 0-20
    const total = Math.min(velocity + volumeScore + sourcesScore + geoScore, 100);
    return { velocity, volume: volumeScore, sources: sourcesScore, geography: geoScore, total };
  }, [change, volume, sources, isMultiplatform, crossPlatformCluster]);
  const trendScore = tviBreakdown.total;

  const trendScoreLabel = trendScore >= 80
    ? { emoji: "🔥", text: "Explosive", cls: "border-destructive text-destructive bg-destructive/10" }
    : trendScore >= 60
    ? { emoji: "📈", text: "Rising", cls: "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10" }
    : trendScore >= 40
    ? { emoji: "➡️", text: "Stable", cls: "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-500/10" }
    : { emoji: "—", text: "Low", cls: "border-muted-foreground/30 text-muted-foreground bg-muted/30" };

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

  // Sparkline data for inline micro chart
  const sparkData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return null;
    return historicalData.slice(-12);
  }, [historicalData]);

  const changeNum = parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0");

  return (
    <motion.div
      className="timeline-card-wrapper"
      layout
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], delay: Math.min(staggerIndex * 0.04, 0.4) }}
    >
      <div className={`timeline-card group ${expanded ? 'timeline-card-expanded' : ''}`}>
        
        {/* === MAIN CONTENT: Click to expand === */}
        <div className="cursor-pointer" onClick={handleToggle}>
          
          {/* Image (when available) */}
          {thumbnail && !imgError && !compact && (
            <div className="relative w-full h-36 mb-3 rounded-lg overflow-hidden bg-secondary">
              <img src={thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={() => setImgError(true)} />
            </div>
          )}

          {/* === HEADER ROW: Platform + Time === */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: `${pf.color}12`, color: pf.color }}
            >
              {pf.emoji}
            </div>
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: pf.color }}>
              {platform}
            </span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{localizedTime}</span>
            {flag && <span className="text-[11px] flex-shrink-0">{flag}</span>}
          </div>
          {/* Title */}
          <h3 className={`font-semibold text-foreground leading-snug mb-1 ${compact ? 'text-xs line-clamp-1' : 'text-[14px] line-clamp-2'}`}>
            {title}
          </h3>

          {/* Contextual Description — the core intelligence layer */}
          {displayDescription && !compact && (
            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
              {displayDescription}
            </p>
          )}

          {/* === METRICS BAR: Horizontal, compact === */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] mb-1.5">
            {/* Growth */}
            <span className={`inline-flex items-center gap-0.5 font-bold ${changePositive ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
              <TrendingUp className="w-3 h-3" />
              {change}
            </span>

            {/* Volume */}
            {volume && volume !== "0" && (
              <span className="text-muted-foreground">
                💬 {volume}
              </span>
            )}

            {/* Sources */}
            {sources && sources.length > 0 && (
              <span className="text-muted-foreground inline-flex items-center gap-0.5">
                <Radio className="w-2.5 h-2.5" />
                {sources.length} {sources.length === 1 ? "fonte" : "fontes"}
              </span>
            )}

            {/* Region */}
            {countryCode && countryCode !== "GL" && (
              <span className="text-muted-foreground">
                📍 {countryCode}
              </span>
            )}

            {/* Multiplatform */}
            {isMultiplatform && crossPlatformCluster && (
              <span className="font-bold text-orange-600 dark:text-orange-400 inline-flex items-center gap-0.5">
                <Globe className="w-2.5 h-2.5" />
                {crossPlatformCluster.platformCount} plat.
              </span>
            )}

            {/* Micro sparkline */}
            {sparkData && !compact && (
              <div className="ml-auto flex-shrink-0 w-16 h-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={pf.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={pf.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={pf.color} strokeWidth={1} fill={`url(#spark-${gradientId})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* === TAGS ROW === */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground">
              {localizedCategory}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground">
              {signalType}
            </span>
            {trigger && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent/20 text-accent-foreground">
                {trigger.emoji} {t(trigger.labelKey as any)}
              </span>
            )}
            {isMultiplatform && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400">
                🔗 Cross-platform
              </span>
            )}
            {trendScore >= 80 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/10 text-destructive">
                🔥 Explosive
              </span>
            )}
          </div>
        </div>

        {/* === ACTION BAR === */}
        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/50">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {t("viewSource")}
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Eye className="w-3 h-3" />
            {expanded ? "Fechar" : "Análise"}
          </button>
          <button onClick={handleShare} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Share2 className="w-3 h-3" />
            {t("share")}
          </button>

          <div className="flex-1" />

          <button onClick={handleAlertClick} className="p-1 rounded-md text-muted-foreground/50 hover:text-primary transition-colors">
            <Bell className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, thumbnail, description: displayDescription, volume, change, changePositive, historicalData, platformColor: pf.color, sources }); }} className="p-1 rounded-md text-muted-foreground/50 hover:text-primary transition-colors">
            <Bookmark className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${title.slice(0, 40)}` }); }} className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive transition-colors">
            <Flag className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* === EXPANDED CONTENT === */}
      {expanded && (
        <div className="timeline-card-expanded-content">
          {/* Image */}
          {thumbnail && !imgError && (
            <div className="relative w-full mb-3 rounded-lg overflow-hidden bg-secondary aspect-video">
              <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setImgError(true)} />
            </div>
          )}

          {/* Full description */}
          {details && details !== displayDescription && (
            <p className="text-xs text-muted-foreground mb-3">{details}</p>
          )}

          {/* Intelligence Metrics Grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Growth</span>
              <span className={`block text-xs font-bold ${changePositive ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{change}</span>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Volume</span>
              <span className="block text-xs font-bold text-foreground">{volume || "—"}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded-lg bg-secondary/50 cursor-help">
                  <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">TVI</span>
                  <span className="block text-xs font-bold text-foreground">{trendScore}/100</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] space-y-0.5">
                <div className="font-bold mb-1">Trend Velocity Index</div>
                <div className="flex justify-between gap-3"><span>⚡ Velocity (30%)</span><span className="font-bold">{tviBreakdown.velocity}</span></div>
                <div className="flex justify-between gap-3"><span>💬 Volume (30%)</span><span className="font-bold">{tviBreakdown.volume}</span></div>
                <div className="flex justify-between gap-3"><span>📰 Sources (20%)</span><span className="font-bold">{tviBreakdown.sources}</span></div>
                <div className="flex justify-between gap-3"><span>🌍 Geography (20%)</span><span className="font-bold">{tviBreakdown.geography}</span></div>
              </TooltipContent>
            </Tooltip>
            <div className="text-center p-2 rounded-lg bg-secondary/50">
              <span className="block text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Sources</span>
              <span className="block text-xs font-bold text-foreground">{sources?.length || 1}</span>
            </div>
          </div>

          {/* Narrative Origin & Signal Confidence */}
          <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                🗺️ Narrative Origin
              </div>
              <div className="text-[11px] text-foreground font-medium">{platform}</div>
              {countryCode && countryCode !== "GL" && (
                <div className="text-[9px] text-muted-foreground">{flag} {countryCode}</div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Confidence
              </div>
              <div className={`text-[11px] font-bold ${trendScore >= 70 ? "text-green-600 dark:text-green-400" : trendScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {trendScore >= 70 ? "High" : trendScore >= 40 ? "Medium" : "Low"}
              </div>
              <div className="text-[9px] text-muted-foreground">{trendScore}%</div>
            </div>
          </div>

          {/* Propagation path (always show if multi-source) */}
          {sources && sources.length >= 2 && (
            <div className="mb-3">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                <Radio className="w-2.5 h-2.5" /> Propagation path
              </span>
              <div className="flex items-center gap-1 flex-wrap text-[9px]">
                {sources.slice(0, 5).map((s, idx) => (
                  <span key={s} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-muted-foreground/40">→</span>}
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources list (full) */}
          {sources && sources.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <BarChart3 className="w-3 h-3" /> Verified Sources
              </span>
              <div className="flex flex-wrap gap-1">
                {sources.slice(0, 5).map((s) => (
                  <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                <span className="text-[10px] text-muted-foreground">{metricLabel}</span>
              </div>
              <div className="h-24 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={pf.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={pf.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                      formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "valor"]}
                    />
                    <Area type="monotone" dataKey="value" stroke={pf.color} strokeWidth={1.5} fill={`url(#${gradientId})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Propagation Timeline (cross-platform) */}
          {isMultiplatform && crossPlatformCluster && crossPlatformCluster.platformCount >= 2 && (
            <div className="mb-3 border-t border-border pt-2">
              <PropagationTimeline cluster={crossPlatformCluster} compact />
            </div>
          )}

          <TrendFeedback title={title} platform={platform} userId={userId} />
        </div>
      )}

      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} onSubmit={handleCreateAlert} defaultKeyword={title} defaultCategory={category} />
    </motion.div>
  );
};

export default TimelineCard;
