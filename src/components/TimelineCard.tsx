import { useState, useMemo, useEffect } from "react";
import { Share2, ChevronDown, ChevronUp, Sparkles, Link2, Bell, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, Newspaper } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";


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

const sentimentConfig = {
  positive: { icon: "😊", color: "text-green-600", label: "Positivo" },
  negative: { icon: "😟", color: "text-red-500", label: "Negativo" },
  neutral: { icon: "😐", color: "text-muted-foreground", label: "Neutro" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const trustBadgeMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  official: { label: "Fonte Oficial", icon: <Shield className="w-2.5 h-2.5" />, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  verified: { label: "Verificado", icon: <CheckCircle2 className="w-2.5 h-2.5" />, className: "bg-green-500/10 text-green-500 border-green-500/20" },
  scientific: { label: "Acadêmico/Científico", icon: <FlaskConical className="w-2.5 h-2.5" />, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  international: { label: "Internacional", icon: <Globe className="w-2.5 h-2.5" />, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  press: { label: "Imprensa", icon: <Newspaper className="w-2.5 h-2.5" />, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onExpand?: (title: string, platform: string, metadata?: any) => void;
  userId?: string | null;
  onTrackAction?: (action: string, points: number, metadata?: Record<string, any>) => void;
  forceExpanded?: boolean;
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
  onClick,
  onFilterPlatform,
  onExpand,
  userId,
  onTrackAction,
  forceExpanded,
}: TimelineCardProps) => {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(forceExpanded || false);
  const [alertOpen, setAlertOpen] = useState(false);

  // Sync with external forceExpanded prop
  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);
  const [aiSummary, setAiSummary] = useState<{ summary: string; sentiment: string; impact: string } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const isPeak = change && parseInt(change.replace(/[^0-9]/g, "")) > 100;
  const flag = countryCodeToFlag(countryCode);
  const gradientId = `tl-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 5)}`;
  const [imgError, setImgError] = useState(false);

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
    toast({ title: "🔗 Link copiado!", description: "Link com filtros atuais copiado." });
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
      toast({ title: "Faça login", description: "Login necessário para criar alertas." });
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
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🔔 Alerta criado!", description: `Monitorando: ${title.slice(0, 40)}` });
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
      toast({ title: "Erro ao resumir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const sentiment = aiSummary ? sentimentConfig[aiSummary.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral : null;

  return (
    <>
      <div className="timeline-card group">
        <div className="flex items-start gap-3" onClick={onClick}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform"
            style={{ background: `${pf.color}15`, color: pf.color }}
            onClick={handlePlatformClick}
            title={`Filtrar por ${platform}`}
          >
            {pf.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[11px] font-semibold cursor-pointer hover:underline"
                style={{ color: pf.color }}
                onClick={handlePlatformClick}
              >
                {platform}
              </span>
              {flag && <span className="text-xs" title={countryCode}>{flag}</span>}
              <span className="text-[11px] text-muted-foreground">{formattedDate || time}</span>
               {isPeak && <span className="peak-badge">🔥 {t("peak")}</span>}
               {trustBadge && trustBadgeMap[trustBadge] && (
                 <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${trustBadgeMap[trustBadge].className}`} title={trustBadgeMap[trustBadge].label}>
                   {trustBadgeMap[trustBadge].icon}
                 </span>
               )}
               {sentiment && (
                <span className={`text-xs ${sentiment.color}`} title={sentiment.label}>
                  {sentiment.icon}
                </span>
              )}
            </div>

            {/* Thumbnail - full width when expanded, with platform fallback */}
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

            {/* Title + Thumbnail row */}
            <div className="flex gap-2.5 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
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

            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className="text-muted-foreground">{category}</span>
              <span className="volume-badge text-[10px] py-0">{volume}</span>
              <span className={changePositive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {change}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button onClick={handleShare} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" title={t("share")}>
              <Share2 className="w-3 h-3" />
            </button>
            <button onClick={handleShareLink} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" title="Copiar link com filtros">
              <Link2 className="w-3 h-3" />
            </button>
            <button onClick={handleAlertClick} className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" title="Criar alerta">
              <Bell className="w-3 h-3" />
            </button>
            <button onClick={handleExpand} className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
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
                      {sentiment.icon} {sentiment.label}
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
          </div>
        )}
      </div>

      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        onSubmit={handleCreateAlert}
        defaultKeyword={title}
        defaultCategory={category}
      />
    </>
  );
};

export default TimelineCard;
