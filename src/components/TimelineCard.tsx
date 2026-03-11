import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ExternalLink, Bell, Bookmark, Flag, Share2, TrendingUp, Info, MoreHorizontal } from "lucide-react";
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
import AbbrTooltip from "./AbbrTooltip";
import SparklineArea from "./SparklineArea";
import { useIsMobile } from "@/hooks/use-mobile";

// Source brand colors
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

const trustBadgeKeys: Record<string, { labelKey: string; cls: string }> = {
  official: { labelKey: "officialSource", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  verified: { labelKey: "verifiedPress", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  scientific: { labelKey: "scientificData", cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" },
  international: { labelKey: "internationalSource", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  press: { labelKey: "verifiedPress", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  hot: { labelKey: "hotTopic", cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
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

const categoryEmojis: Record<string, string> = {
  esportes: "🏈", sports: "🏈", politica: "🏛️", politics: "🏛️",
  tecnologia: "💻", technology: "💻", entretenimento: "🎬", entertainment: "🎬",
  negocios: "📈", business: "📈", ciencia: "🔬", science: "🔬",
  cultura: "🎭", culture: "🎭", saude: "🏥", geral: "📌", general: "📌",
};

interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onExpand?: (title: string, platform: string, metadata?: any) => void;
  onToggleExpand?: (expanded: boolean) => void;
  userId?: string | null;
  onTrackAction?: (action: string, points: number, metadata?: Record<string, any>) => void;
  forceExpanded?: boolean;
  isMultiplatform?: boolean;
  crossPlatformCluster?: CrossPlatformCluster | null;
  onSaveCard?: (card: any) => void;
  aiContext?: string;
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

// Generate local context fallback
function generateLocalContext(platform: string, title: string, volume?: string, countryCode?: string, category?: string, likeRatio?: number, commentCount?: number, trustBadge?: string, lang: string = "pt"): string {
  const flag = countryCodeToFlag(countryCode);
  const countryStr = countryCode && countryCode !== "GL" ? `${flag || ""} ${countryCode}` : "";
  const isPt = lang === "pt";

  switch (platform) {
    case "Google Trends":
      return isPt
        ? `Termo em alta nas buscas do Google${volume ? ` com ${volume}` : ""}${countryStr ? ` em ${countryStr}` : ""}${category && category !== "Geral" ? ` · ${category}` : ""}`
        : `Trending search on Google${volume ? ` with ${volume}` : ""}${countryStr ? ` in ${countryStr}` : ""}`;
    case "YouTube":
      return isPt
        ? `Vídeo em destaque no YouTube${volume ? ` · ${volume}` : ""}${likeRatio ? ` · ${likeRatio}% aprovação` : ""}`
        : `Trending video on YouTube${volume ? ` · ${volume}` : ""}${likeRatio ? ` · ${likeRatio}% approval` : ""}`;
    case "Reddit":
      return isPt
        ? `Discussão popular no Reddit${commentCount ? ` · ${commentCount} comentários` : ""}${category ? ` em ${category}` : ""}`
        : `Popular Reddit discussion${commentCount ? ` · ${commentCount} comments` : ""}`;
    case "Hacker News":
      return isPt ? `Em destaque no Hacker News${volume ? ` · ${volume}` : ""}` : `Trending on Hacker News${volume ? ` · ${volume}` : ""}`;
    default:
      if (trustBadge === "official") return isPt ? `Dados oficiais de ${platform}${volume ? ` · ${volume}` : ""}` : `Official data from ${platform}`;
      if (trustBadge === "scientific") return isPt ? `Publicação científica via ${platform}` : `Scientific publication via ${platform}`;
      if (trustBadge === "international") return isPt ? `Reportagem internacional via ${platform}${volume ? ` · ${volume}` : ""}` : `International report via ${platform}`;
      return isPt ? `Em discussão via ${platform}${volume ? ` · ${volume}` : ""}` : `Being discussed on ${platform}${volume ? ` · ${volume}` : ""}`;
  }
}

// TVI
function getTVITier(score: number) {
  if (score >= 70) return { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400", pulse: true };
  if (score >= 50) return { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", pulse: false };
  if (score >= 30) return { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", pulse: false };
  return { bg: "bg-secondary", text: "text-muted-foreground", pulse: false };
}

function getGrowthPill(change: string, changePositive: boolean) {
  const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  if (ch === 0) return null;
  if (ch > 200) return { label: "+trending", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" };
  if (changePositive && ch > 50) return { label: "+popular", cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" };
  if (changePositive) return { label: "+novo", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" };
  return null;
}

function getConfidenceScore(platform: string, sources?: string[], trendScore?: number) {
  let score = 0;
  const isVerifiedPress = ["The Guardian", "NPR", "PubMed", "IBGE", "World Bank", "OpenAlex"].includes(platform);
  if (isVerifiedPress) score += 40;
  else if (["NewsAPI", "GNews", "Bing News", "NewsData"].includes(platform)) score += 25;
  else score += 10;
  score += isVerifiedPress ? 25 : 15;
  const srcCount = sources?.length || 1;
  score += Math.min(srcCount * 5, 20);
  score += 10;
  return Math.min(score, 100);
}

function getConfidenceTier(score: number) {
  if (score >= 71) return { label: "Alta", color: "#3B82F6" };
  if (score >= 41) return { label: "Boa", color: "#10B981" };
  if (score >= 21) return { label: "Moderada", color: "#F59E0B" };
  return { label: "Baixa", color: "#EF4444" };
}

const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  details, historicalData, metricLabel, likeRatio, commentCount, region,
  countryCode, sources, sourceUrl, trustBadge, thumbnail, publishedAt,
  description, firstSeenAt, peakAt, relevanceScore, translated,
  onClick, onFilterPlatform, onExpand, onToggleExpand, userId, onTrackAction,
  forceExpanded, isMultiplatform, crossPlatformCluster, onSaveCard,
  aiContext,
  staggerIndex = 0, compact = false,
}: TimelineCardProps & { staggerIndex?: number; compact?: boolean }) => {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(forceExpanded || false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setExpanded(!!forceExpanded); }, [forceExpanded]);

  const pf = platformIcons[platform] || { emoji: "📰", color: "#666" };
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

  // Deduplicate title/description
  const contextText = useMemo(() => {
    const rawDesc = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = rawDesc.toLowerCase().trim();

    // If AI context is available, use it
    if (aiContext) return aiContext;

    // If description is different from title, use it
    if (normDesc && normDesc !== normTitle && !normDesc.startsWith(normTitle.slice(0, 30))) {
      return rawDesc;
    }

    // Generate local context
    return generateLocalContext(platform, title, volume, countryCode, category, likeRatio, commentCount, trustBadge, lang);
  }, [description, details, title, aiContext, platform, volume, countryCode, category, likeRatio, commentCount, trustBadge, lang]);

  const localizedCategory = useMemo(() => localizeCategory(category, t), [category, t]);
  const localizedTime = useMemo(() => formattedDate || localizeFallbackTime(time, lang), [formattedDate, time, lang]);

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
    onToggleExpand?.(next);
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

  // Tags
  const allTags = useMemo(() => {
    const tags: { label: string; cls: string; priority: number }[] = [];
    const catNorm = normalizeText(category || "");
    const catEmoji = categoryEmojis[catNorm] || "📌";

    if (trigger && ["crisis"].includes(trigger.labelKey)) {
      tags.push({ label: `⚡ ${t(trigger.labelKey as any)}`, cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", priority: 0 });
    } else if (trigger) {
      tags.push({ label: `${trigger.emoji} ${t(trigger.labelKey as any)}`, cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", priority: 1 });
    }
    if (trustBadge && trustBadgeKeys[trustBadge]) {
      tags.push({ label: `✓ ${t(trustBadgeKeys[trustBadge].labelKey as any)}`, cls: trustBadgeKeys[trustBadge].cls, priority: 1 });
    }
    tags.push({ label: `${catEmoji} ${localizedCategory}`, cls: "bg-secondary text-muted-foreground", priority: 2 });
    if (growthPill) {
      tags.push({ label: growthPill.label, cls: growthPill.cls, priority: 2 });
    }
    if (translated) {
      tags.push({ label: "🌐", cls: "bg-secondary text-muted-foreground", priority: 3 });
    }
    tags.sort((a, b) => a.priority - b.priority);
    return tags;
  }, [trigger, trustBadge, localizedCategory, translated, t, category, growthPill]);

  const visibleTags = allTags.slice(0, 3);
  const overflowCount = Math.max(0, allTags.length - 3);

  const hasThumbnail = thumbnail && !imgError && !compact;

  // Expanded context summary
  const expandedContext = useMemo(() => {
    if (aiContext) return aiContext;
    const isPt = lang === "pt";
    const acceleration = trendScore >= 60 ? (isPt ? "acelerando" : "accelerating") : trendScore >= 30 ? (isPt ? "em alta" : "trending") : (isPt ? "sendo discutido" : "being discussed");
    const locationStr = countryCode && countryCode !== "GL" ? `${isPt ? "em" : "in"} ${flag} ${countryCode}` : (isPt ? "globalmente" : "globally");
    const platformCount = sources?.length || 1;
    const platformStr = platformCount > 1 ? `${platformCount} ${isPt ? "plataformas" : "platforms"}` : `1 ${isPt ? "plataforma" : "platform"}`;

    const rawDesc = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = rawDesc.toLowerCase().trim();
    const hasRealDesc = normDesc && normDesc !== normTitle && !normDesc.startsWith(normTitle.slice(0, 30));

    if (hasRealDesc) {
      return rawDesc;
    }

    return isPt
      ? `${decodeEntities(title.split(/[—–:]/)[0].trim())} está ${acceleration} ${locationStr}. Discutido em ${platformStr} com ${change} de crescimento.`
      : `${decodeEntities(title.split(/[—–:]/)[0].trim())} is ${acceleration} ${locationStr}. Discussed across ${platformStr} with ${change} growth.`;
  }, [aiContext, lang, trendScore, countryCode, flag, sources, change, title, description, details]);

  return (
    <motion.div
      className="timeline-card-wrapper"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: Math.min(staggerIndex * 0.03, 0.18) }}
    >
      <div className={`timeline-card group ${expanded ? 'timeline-card-expanded' : ''}`} data-tier={trendScore >= 70 ? "critical" : trendScore >= 40 ? "moderate" : "low"}>

        {/* ═══ CLOSED STATE ═══ */}
        {!expanded && (
          <div className="cursor-pointer p-3" onClick={handleToggle}>
            {/* Thumbnail */}
            {hasThumbnail && (
              <div className="relative w-full overflow-hidden rounded-md mb-2" style={{ maxHeight: 140 }}>
                <img src={thumbnail!} alt="" className="w-full h-full object-cover block" loading="lazy" onError={() => setImgError(true)} />
              </div>
            )}

            {/* ① Header: platform · time · flag · [bookmark] */}
            <div className="flex items-center gap-1.5 mb-1">
              <button onClick={handlePlatformClick} className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brandColor }} />
                <span className="text-[11px] font-semibold" style={{ color: brandColor }}>{platform}</span>
              </button>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-muted-foreground">{localizedTime}</span>
              {flag && <span className="text-[11px]">{flag}</span>}
              <div className="flex-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, thumbnail, description: contextText }); }}
                className="p-1 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ② Title */}
            <h3 className={`font-semibold text-foreground leading-snug mb-1 break-words ${compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`} style={{ overflowWrap: 'anywhere' }}>
              {decodeEntities(title)}
            </h3>

            {/* ③ Tags — immediately below title */}
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              {visibleTags.map((tag, i) => (
                <span key={i} className={`inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium ${tag.cls}`}>
                  {tag.label}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-[9px] text-muted-foreground/50">+{overflowCount}</span>
              )}
            </div>

            {/* ④ Context text — NEVER the title repeated */}
            {contextText && !compact && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-1.5 break-words" style={{ overflowWrap: 'anywhere' }}>
                {decodeEntities(contextText)}
              </p>
            )}

            {/* ⑤ Metrics inline */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5 overflow-hidden">
              {volume && volume !== "0" && (
                <span className="font-medium truncate">📊 {volume}</span>
              )}
              <span className={`font-bold flex items-center gap-0.5 flex-shrink-0 ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                <TrendingUp className="w-2.5 h-2.5" />
                {change}
              </span>
              {commentCount != null && commentCount > 0 && (
                <span className="truncate">💬 {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount}</span>
              )}
              {likeRatio != null && likeRatio > 0 && (
                <span className="flex-shrink-0">👍 {likeRatio}%</span>
              )}
            </div>

            {/* ⑥ Sparkline */}
            {sparkData && !compact && (
              <div className="w-full" style={{ height: 32 }}>
                <SparklineArea data={sparkData} color={brandColor} width={300} height={32} className="w-full" />
              </div>
            )}
          </div>
        )}

        {/* ═══ EXPANDED STATE ═══ */}
        {expanded && (
          <div className={`p-3 overflow-y-auto ${isMobile ? 'max-h-[350px]' : 'max-h-[500px]'}`}>
            {/* Header + collapse */}
            <div className="flex items-center gap-1.5 mb-1.5 cursor-pointer" onClick={handleToggle}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brandColor }} />
              <span className="text-[11px] font-semibold" style={{ color: brandColor }}>{platform}</span>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-muted-foreground">{localizedTime}</span>
              {flag && <span className="text-[11px]">{flag}</span>}
              <div className="flex-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, thumbnail, description: contextText }); }}
                className="p-1 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>

            {/* Title */}
            <h2 className="text-base font-bold text-foreground leading-snug mb-1.5">{decodeEntities(title)}</h2>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {allTags.map((tag, i) => (
                <span key={i} className={`inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-medium ${tag.cls}`}>
                  {tag.label}
                </span>
              ))}
            </div>

            {/* ── CONTEXT SECTION ── */}
            <div className="rounded-lg p-2.5 mb-3" style={{ background: 'hsl(var(--secondary))', borderLeft: `3px solid ${brandColor}` }}>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                {decodeEntities(expandedContext)}
              </p>
            </div>

            {/* ── METRICS GRID — responsive ── */}
            <div className={`grid gap-1 mb-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              {[
                { value: String(trendScore), label: "TVI", highlight: trendScore >= 60 },
                { value: change, label: lang === "pt" ? "Cresc." : "Growth" },
                { value: volume || "—", label: "Volume" },
                { value: String(sources?.length || 1), label: lang === "pt" ? "Fontes" : "Sources" },
              ].map((m, i) => (
                <div key={i} className="text-center rounded-lg px-1 py-1.5 bg-secondary/50 min-w-0 overflow-hidden">
                  <span className={`block text-xs font-bold leading-tight truncate ${m.highlight ? 'text-destructive' : changePositive && i === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {m.value}
                  </span>
                  <span className="block text-[7px] text-muted-foreground mt-0.5 uppercase tracking-wider truncate">{m.label}</span>
                </div>
              ))}
            </div>

            {/* ── EVOLUTION 24H ── */}
            {historicalData && historicalData.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">{t("evolution24h")}</span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-0.5 rounded-full" style={{ background: brandColor }} />
                    📊 {metricLabel || (lang === "pt" ? "volume/hora" : "volume/hour")}
                  </span>
                </div>
                <div style={{ height: isMobile ? 80 : 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id={`hist-${platform.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={brandColor} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={brandColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.15)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "Volume"]}
                      />
                      <Area type="monotone" dataKey="value" stroke={brandColor} strokeWidth={1.5} fill={`url(#hist-${platform.replace(/\s/g, "")})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Confidence inline ── */}
            <div className="flex items-center gap-1.5 mb-2 text-[10px] overflow-hidden">
              <span className="text-muted-foreground flex-shrink-0">{lang === "pt" ? "Confiança" : "Confidence"}:</span>
              <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden max-w-[80px] min-w-[40px]">
                <div className="h-full rounded-full transition-all" style={{ width: `${confidenceScore}%`, background: confidenceTier.color }} />
              </div>
              <span className="font-medium flex-shrink-0" style={{ color: confidenceTier.color }}>{confidenceScore}%</span>
              {["The Guardian", "NPR", "PubMed", "IBGE", "World Bank", "OpenAlex"].includes(platform) && (
                <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 truncate">✓</span>
              )}
              {(sources?.length || 1) === 1 && (
                <span className="text-amber-600 dark:text-amber-400 flex-shrink-0 truncate">⚠</span>
              )}
            </div>

            {/* Sentiment inline */}
            {(() => {
              const pos = changePositive ? 55 : 25;
              const neu = 30;
              const neg = changePositive ? 15 : 45;
              return (
                <div className="flex items-center gap-2 mb-2 text-[10px]">
                  <span className="text-emerald-600">😊 {pos}%</span>
                  <span className="text-muted-foreground">😐 {neu}%</span>
                  <span className="text-red-500">😠 {neg}%</span>
                </div>
              );
            })()}

            {/* Propagation */}
            {isMultiplatform && crossPlatformCluster && crossPlatformCluster.platformCount >= 2 && (
              <div className="mb-2">
                <PropagationTimeline cluster={crossPlatformCluster} compact />
              </div>
            )}

            {/* Source link */}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors mb-2"
              >
                <ExternalLink className="w-3 h-3" />
                🔗 {lang === "pt" ? "Ver fonte original" : "View original source"} →
              </a>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
              <button onClick={handleShare} className="hover:text-foreground transition-colors flex items-center gap-1">
                <Share2 className="w-3 h-3" /> {t("share")}
              </button>
              <button onClick={handleAlertClick} className="hover:text-foreground transition-colors flex items-center gap-1">
                <Bell className="w-3 h-3" /> {lang === "pt" ? "Alerta" : "Alert"}
              </button>
              <div className="flex-1" />
              <span className="text-muted-foreground/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: brandColor }} />
                {platform} · {confidenceTier.label} {confidenceScore}%
              </span>
            </div>

            <TrendFeedback title={title} platform={platform} userId={userId} />
          </div>
        )}
      </div>

      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} onSubmit={handleCreateAlert} defaultKeyword={title} defaultCategory={category} />
    </motion.div>
  );
};

export default React.memo(TimelineCard);
