import { useState, useMemo, useEffect } from "react";
import { Share2, ChevronDown, ChevronUp, Sparkles, Link2, Bell, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, Newspaper, Search } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserMode } from "@/contexts/UserModeContext";
import { TrendCardProps } from "./TrendCard";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";
import TrendContextTab from "./TrendContextTab";
import TrendHistoryTab from "./TrendHistoryTab";
import TrendFeedback from "./TrendFeedback";

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

const sentimentKeys = {
  positive: { icon: "😊", color: "text-green-600", key: "positive" as const },
  negative: { icon: "😟", color: "text-red-500", key: "negative" as const },
  neutral: { icon: "😐", color: "text-muted-foreground", key: "neutral" as const },
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

// Client-side quick trigger detection (before AI analysis)
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
}

function formatTemporalBadge(firstSeenAt?: string, peakAt?: string, startedLabel = "Começou há", peakLabel = "Pico às"): { started: string | null; peak: string | null } {
  if (!firstSeenAt) return { started: null, peak: null };
  const now = new Date();
  const first = new Date(firstSeenAt);
  const diffMs = now.getTime() - first.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin = Math.floor(diffMs / (1000 * 60));

  let started: string | null = null;
  if (diffMin < 60) started = `⏰ ${startedLabel} ${diffMin}min`;
  else if (diffH < 24) started = `⏰ ${startedLabel} ${diffH}h`;
  else started = `⏰ ${startedLabel} ${Math.floor(diffH / 24)}d`;

  let peak: string | null = null;
  if (peakAt) {
    const peakDate = new Date(peakAt);
    peak = `📈 ${peakLabel} ${peakDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return { started, peak };
}

const TimelineCard = ({
  platform,
  title,
  category,
  time,
  volume,
  change,
  changePositive,
  details,
  historicalData,
  metricLabel,
  likeRatio,
  commentCount,
  region,
  countryCode,
  sources,
  sourceUrl,
  trustBadge,
  thumbnail,
  publishedAt,
  description,
  firstSeenAt,
  peakAt,
  relevanceScore,
  translated,
  onClick,
  onFilterPlatform,
  onExpand,
  userId,
  onTrackAction,
  forceExpanded,
}: TimelineCardProps) => {
  const { t, lang } = useLanguage();
  const { mode, config: modeConfig } = useUserMode();
  const [expanded, setExpanded] = useState(forceExpanded || false);
  const [alertOpen, setAlertOpen] = useState(false);

  // Sync with external forceExpanded prop
  useEffect(() => {
    setExpanded(!!forceExpanded);
  }, [forceExpanded]);
  const [aiSummary, setAiSummary] = useState<{ summary: string; sentiment: string; impact: string } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const isPeak = change && parseInt(change.replace(/[^0-9]/g, "")) > 100;
  const flag = countryCodeToFlag(countryCode);
  const gradientId = `tl-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 5)}`;
  const [imgError, setImgError] = useState(false);
  const trigger = useMemo(() => detectTriggerFromTitle(title), [title]);
  const [activeTab, setActiveTab] = useState<"details" | "context" | "history">("details");
  const temporal = useMemo(() => formatTemporalBadge(firstSeenAt, peakAt, t("startedAgo"), t("peakAt")), [firstSeenAt, peakAt, lang]);

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
      const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", ar: "ar-SA", hi: "hi-IN", ru: "ru-RU" };
      return date.toLocaleDateString(localeMap[lang] || "pt-BR", { day: "2-digit", month: "short" });
    } catch { return null; }
  }, [publishedAt, lang]);

  const displayDescription = description || details;

  const handlePlatformClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterPlatform?.(platform);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})`);
    toast({ title: t("copied"), description: title.slice(0, 60) });
    onTrackAction?.("share", 5, { title, platform, countryCode, category });
  };

  const handleShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: `🔗 ${t("linkCopied")}`, description: t("linkCopiedDesc") });
  };


  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded) {
      onExpand?.(title, platform, { volume, category, countryCode });
      onTrackAction?.("expand", 2, { title, platform, countryCode, category });
    }
  };

  const handleAlertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast({ title: t("loginRequired"), description: t("loginRequiredDesc") });
      return;
    }
    setAlertOpen(true);
  };

  const handleCreateAlert = async (input: any) => {
    if (!userId) return;
    const { error } = await supabase.from("alerts").insert({
      user_id: userId,
      keyword: title,
      category: category || null,
      threshold: input.threshold,
      frequency: input.frequency,
      notification_method: input.notification_method,
    });
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: `🔔 ${t("alertCreated")}`, description: `${t("monitoring")}: ${title.slice(0, 40)}` });
    }
  };

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiSummary || summarizing) return;
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-trend", {
        body: { title, details, platform, volume },
      });
      if (error) throw error;
      setAiSummary(data);
    } catch (err: any) {
      console.error("Summarize error:", err);
      toast({ title: t("errorSummarize"), description: t("tryAgain"), variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const sentiment = aiSummary ? sentimentKeys[aiSummary.sentiment as keyof typeof sentimentKeys] || sentimentKeys.neutral : null;

  return (
    <div className="timeline-card-wrapper">
      <div className={`timeline-card group ${expanded ? 'timeline-card-expanded' : ''}`}>
        <div className="flex items-start gap-3 cursor-pointer" onClick={(e) => {
          e.stopPropagation();
          const newExpanded = !expanded;
          setExpanded(newExpanded);
          if (newExpanded) {
            onExpand?.(title, platform, { volume, category, countryCode });
            onTrackAction?.("expand", 2, { title, platform, countryCode, category });
          }
        }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform"
            style={{ background: `${pf.color}15`, color: pf.color }}
            onClick={handlePlatformClick}
            title={`${t("filterByPlatform")} ${platform}`}
          >
            {pf.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap overflow-hidden">
              <span
                className="text-[11px] font-semibold cursor-pointer active:underline hover:underline flex-shrink-0"
                style={{ color: pf.color }}
                onClick={handlePlatformClick}
              >
                {platform}
              </span>
              {flag && <span className="text-xs flex-shrink-0" title={countryCode}>{flag}</span>}
              <span className="text-[11px] text-muted-foreground flex-shrink-0">{formattedDate || time}</span>
               {isPeak && <span className="peak-badge flex-shrink-0 whitespace-nowrap">🔥 {t("peak")}</span>}
               {trustBadge && trustBadgeKeys[trustBadge] && (
                 <span
                   className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] flex-shrink-0 cursor-help ${trustBadgeKeys[trustBadge].className}`}
                 >
                   {trustBadgeKeys[trustBadge].icon}
                   {t(trustBadgeKeys[trustBadge].labelKey as any)}
                 </span>
               )}
               {isPeak && !trustBadge && trustBadgeKeys.hot && (
                 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${trustBadgeKeys.hot.className}`}>
                   🔥 {t("hotTopic")}
                 </span>
                 )}
                {translated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-help" title={t("autoTranslated")}>
                    🌐
                  </span>
                )}
               {trigger && (
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground border border-border whitespace-nowrap flex-shrink-0">
                   {trigger.emoji} {t(trigger.labelKey as any)}
                 </span>
               )}
               {modeConfig.extraBadge && modeConfig.sortWeight({ title, category, change, trustBadge, sources, commentCount, likeRatio, platform }) > 20 && (
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap flex-shrink-0">
                   {modeConfig.extraBadge.emoji} {modeConfig.extraBadge.label}
                 </span>
               )}
               {sentiment && (
                <span className={`text-xs flex-shrink-0 ${sentiment.color}`} title={t(sentiment.key)}>
                  {sentiment.icon}
                </span>
              )}
            </div>

            {/* Title + Thumbnail row */}
            <div className="flex gap-2.5 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {title}
                </p>
                {displayDescription && (
                  <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed mt-0.5">
                    {displayDescription}
                  </p>
                )}
              </div>
              {thumbnail && !imgError && !expanded && (
                <img
                  src={thumbnail}
                  alt=""
                  className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-secondary"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              )}
              {!thumbnail && !expanded && (
                <div className="w-16 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-lg" style={{ color: pf.color }}>{pf.emoji}</span>
                </div>
              )}
            </div>

            {/* Thumbnail - full width when expanded, shown AFTER title */}
            {expanded && (
              <div className="mb-2">
                {thumbnail && !imgError ? (
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-full aspect-video rounded-lg object-cover bg-secondary transition-all duration-200"
                    loading="lazy"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    className="w-full aspect-video rounded-lg flex items-center justify-center bg-gradient-to-br from-secondary to-muted transition-all duration-200"
                  >
                    <span className="text-4xl opacity-60" style={{ color: pf.color }}>{pf.emoji}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] flex-wrap min-h-[18px]">
              <span className="text-muted-foreground whitespace-nowrap">{category}</span>
              <span className="volume-badge text-[10px] py-0 whitespace-nowrap">{volume}</span>
              <span className={`whitespace-nowrap ${changePositive ? "text-green-600 font-medium" : "text-red-500 font-medium"}`}>
                {change}
              </span>
              {temporal.started && (
                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{temporal.started}</span>
              )}
              {temporal.peak && (
                <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap">{temporal.peak}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button onClick={handleShare} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" title={t("share")}>
              <Share2 className="w-3 h-3" />
            </button>
            <button onClick={handleShareLink} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" title={t("copyLinkFilters")}>
              <Link2 className="w-3 h-3" />
            </button>
            <button onClick={handleAlertClick} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" title={t("createAlert")}>
              <Bell className="w-3 h-3" />
            </button>
            <button onClick={handleExpand} className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT — rendered OUTSIDE timeline-card to prevent layout overlap */}
      {expanded && (
        <div className="timeline-card-expanded-content">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-3 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("details"); }}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                activeTab === "details"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              📋 {t("tabDetails")}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("context"); }}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                activeTab === "context"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              🔍 {t("tabContext")}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab("history"); }}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              📊 {t("tabHistory")}
            </button>
          </div>

          {activeTab === "details" ? (
            <>
              {details && <p className="text-xs text-muted-foreground mb-3">{details}</p>}

              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-3 group"
                >
                  <span className="text-sm flex-shrink-0" style={{ color: pf.color }} title={platform}>{pf.emoji}</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  {platform === "YouTube" ? `${t("watchOn")} YouTube` :
                   platform === "Reddit" ? `${t("viewOn")} Reddit` :
                   platform === "Google Trends" ? `${t("viewOn")} Google Trends` :
                   platform === "Bluesky" ? `${t("viewOn")} Bluesky` :
                   platform === "Mastodon" ? `${t("viewOn")} Mastodon` :
                   platform === "The Guardian" ? `${t("readOn")} The Guardian` :
                   platform === "World Bank" ? `${t("viewOn")} World Bank` :
                   platform === "IBGE" ? `${t("viewOn")} IBGE` :
                   platform === "OpenAlex" ? `${t("viewSource")}` :
                   t("viewSource")}
                </a>
              )}

              {!aiSummary && (
                <button
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-3 disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 ${summarizing ? "animate-spin" : ""}`} />
                  {summarizing ? t("analyzing") : `✨ ${t("summarizeAI")}`}
                </button>
              )}

              {aiSummary && (
                <div className="mb-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{t("aiSummary")}</span>
                    {sentiment && (
                      <span className={`text-xs ${sentiment.color} ml-auto`}>
                        {sentiment.icon} {t(sentiment.key)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{aiSummary.summary}</p>
                  {aiSummary.impact && (
                    <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      aiSummary.impact === "high" ? "bg-red-500/10 text-red-500" :
                      aiSummary.impact === "medium" ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-green-500/10 text-green-600"
                    }`}>
                      {aiSummary.impact === "high" ? t("impactHigh") : aiSummary.impact === "medium" ? t("impactMedium") : t("impactLow")}
                    </span>
                  )}
                </div>
              )}

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
                {platform === "NewsAPI" && sources && sources.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sources.slice(0, 3).map((s) => (
                      <span key={s} className="source-tag text-[10px] py-0.5 px-2">📰 {s}</span>
                    ))}
                  </div>
                )}
              </div>

              {historicalData && historicalData.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("evolution24h")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{metricLabel}</span>
                  </div>
                  <div className="h-28 -mx-1">
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
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                          formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "valor"]}
                        />
                        <Area type="monotone" dataKey="value" stroke={pf.color} strokeWidth={1.5} fill={`url(#${gradientId})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === "context" ? (
            <TrendContextTab
              title={title}
              details={details}
              description={description}
              platform={platform}
              volume={volume}
              category={category}
              sources={sources}
            />
          ) : (
            <TrendHistoryTab
              title={title}
              platform={platform}
              category={category}
              platformColor={pf.color}
            />
          )}

          {/* Feedback buttons */}
          <TrendFeedback title={title} platform={platform} userId={userId} />
        </div>
      )}

      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        onSubmit={handleCreateAlert}
        defaultKeyword={title}
        defaultCategory={category}
      />
    </div>
  );
};

export default TimelineCard;
