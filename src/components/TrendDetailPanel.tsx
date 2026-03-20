import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Share2, Bookmark, Bell, ExternalLink, Sparkles } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";
import TrendFeedback from "./TrendFeedback";

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

const SOURCE_DOT: Record<string, string> = {
  imprensa: "#2557D6", redes_sociais: "#7C3AED", google_trends: "#D97706",
  dados_oficiais: "#059669", cientifico: "#0891B2",
};
function getSourceType(p: string): string {
  const l = p.toLowerCase();
  if (["guardian","npr","newsapi","gnews","bing","newsdata","thenewsapi","bbc","variety","reuters"].some(s => l.includes(s))) return "imprensa";
  if (["reddit","bluesky","mastodon","twitter","youtube","hacker"].some(s => l.includes(s))) return "redes_sociais";
  if (l.includes("google trends")) return "google_trends";
  if (["world bank","fred","ibge","imf","who"].some(s => l.includes(s))) return "dados_oficiais";
  if (["arxiv","pubmed","openal","crossref","semantic"].some(s => l.includes(s))) return "cientifico";
  return "imprensa";
}

interface TrendDetailPanelProps {
  trend: (TrendCardProps & { aiContext?: string; crossPlatformCluster?: CrossPlatformCluster | null; isMultiplatform?: boolean }) | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  userId?: string | null;
  onSaveCard?: (card: any) => void;
  onTrackAction?: (action: string, points: number, metadata?: Record<string, any>) => void;
}

const TrendDetailPanel: React.FC<TrendDetailPanelProps> = ({
  trend, onClose, onPrev, onNext, hasPrev, hasNext, userId, onSaveCard, onTrackAction,
}) => {
  const { t, lang } = useLanguage();
  const [alertOpen, setAlertOpen] = React.useState(false);

  if (!trend) return null;

  const {
    platform, title, category, time, volume, change, changePositive,
    historicalData, metricLabel, sources, sourceUrl, trustBadge,
    countryCode, description, details, publishedAt, aiContext,
    isMultiplatform, crossPlatformCluster,
  } = trend;

  const dotColor = SOURCE_DOT[getSourceType(platform)] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);
  const srcCount = sources?.length || 1;

  // Real description only
  const realDescription = (() => {
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw;
  })();

  // AI context: only if specific
  const showAiContext = aiContext && aiContext.length > 20 && !aiContext.toLowerCase().includes("previsão climática geral");

  // Volume/change
  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  const showPropagation = isMultiplatform && crossPlatformCluster && crossPlatformCluster.platformCount >= 2;
  const hasMetrics = showVolume || showChange || srcCount > 1;
  const hasEvolution = historicalData && historicalData.length > 3;

  const formattedTime = (() => {
    if (!publishedAt) return time;
    try {
      const date = new Date(publishedAt);
      if (isNaN(date.getTime())) return time;
      const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMin < 1) return lang === "pt" ? "agora" : "now";
      if (diffMin < 60) return lang === "pt" ? `há ${diffMin}min` : `${diffMin}min ago`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return lang === "pt" ? `há ${diffH}h` : `${diffH}h ago`;
      return date.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short" });
    } catch { return time; }
  })();

  const handleShare = () => {
    const url = sourceUrl || window.location.href;
    if (navigator.share) navigator.share({ title, url }).catch(() => {});
    else { navigator.clipboard.writeText(`${title} — ${url}`); toast({ title: "🔗 Link copiado!" }); }
    onTrackAction?.("share", 5, { title, platform });
  };

  const handleCreateAlert = async (input: any) => {
    if (!userId) return;
    const { error } = await supabase.from("alerts").insert({
      user_id: userId, keyword: title, category: category || null,
      threshold: input.threshold, frequency: input.frequency, notification_method: input.notification_method,
    });
    if (error) toast({ title: t("error"), description: error.message, variant: "destructive" });
    else toast({ title: `🔔 ${t("alertCreated")}` });
  };

  return (
    <>
      <motion.div className="fixed inset-0 bg-black/15 backdrop-blur-[2px] z-40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-card border-l border-border z-50 overflow-y-auto shadow-[-8px_0_40px_rgba(26,24,20,0.08)]"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
            {lang === "pt" ? "Detalhes" : "Details"}
          </span>
          <div className="flex-1" />
          <button onClick={onPrev} disabled={!hasPrev} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={onNext} disabled={!hasNext} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-5">

            {/* Source + time */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
              <span className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: dotColor }}>{platform}</span>
              <span className="text-[11px] text-muted-foreground/40">·</span>
              <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{formattedTime}</span>
              {flag && <span className="text-sm">{flag}</span>}
            </div>

            {/* Title */}
            <h2 className="text-[20px] font-semibold leading-snug text-foreground mb-4">{decodeEntities(title)}</h2>

            {/* Metrics */}
            {hasMetrics && (
              <div className="grid grid-cols-3 gap-2 mb-5">
                {showVolume && (
                  <div className="rounded-lg bg-background p-3 text-center">
                    <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground block mb-0.5">Volume</span>
                    <span className="text-[15px] font-bold text-foreground">{volume}</span>
                  </div>
                )}
                {showChange && (
                  <div className="rounded-lg bg-background p-3 text-center">
                    <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground block mb-0.5">
                      {lang === "pt" ? "Cresc." : "Growth"}
                    </span>
                    <span className={`text-[15px] font-bold ${changePositive ? "text-[#059669]" : "text-[#E03C31]"}`}>
                      {changePositive ? "+" : ""}{change}
                    </span>
                  </div>
                )}
                {srcCount > 1 && (
                  <div className="rounded-lg bg-background p-3 text-center">
                    <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground block mb-0.5">
                      {lang === "pt" ? "Fontes" : "Sources"}
                    </span>
                    <span className="text-[15px] font-bold text-foreground">{srcCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* 24h chart */}
            {hasEvolution && (
              <div className="mb-5">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2 block">
                  {lang === "pt" ? "Evolução 24h" : "24h Evolution"}
                </span>
                <div style={{ height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={dotColor} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={dotColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.15)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={5} />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={30}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 11 }} />
                      <Area type="monotone" dataKey="value" stroke={dotColor} strokeWidth={1.5} fill="url(#dg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Propagation */}
            {showPropagation && crossPlatformCluster && (
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2 block">
                  {lang === "pt" ? "Propagação" : "Propagation"}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${dotColor}15`, color: dotColor }}>
                    {crossPlatformCluster.trends[0]?.platform}
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  {crossPlatformCluster.trends.slice(1).map(ct => ct.platform).filter((v, i, a) => a.indexOf(v) === i).map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[10px]">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Context */}
            {showAiContext && (
              <div className="rounded-xl bg-[#2557D6]/5 border border-[#2557D6]/10 p-4 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#2557D6]" />
                  <span className="text-[10px] font-bold text-[#2557D6] uppercase tracking-[0.08em]">
                    {lang === "pt" ? "Resumo por IA" : "AI Insight"}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/80">{aiContext}</p>
              </div>
            )}

            {/* Description */}
            {realDescription && !showAiContext && (
              <p className="text-[13px] leading-relaxed text-muted-foreground mb-4">{decodeEntities(realDescription)}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Share2 className="w-3.5 h-3.5" /> {lang === "pt" ? "Compartilhar" : "Share"}
              </button>
              <button onClick={() => onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: realDescription || aiContext || "" })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Bookmark className="w-3.5 h-3.5" /> {lang === "pt" ? "Salvar" : "Save"}
              </button>
              <button onClick={() => {
                if (!userId) { toast({ title: t("loginRequired") }); return; }
                setAlertOpen(true);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Bell className="w-3.5 h-3.5" /> {lang === "pt" ? "Alerta" : "Alert"}
              </button>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2557D6] text-white text-[12px] font-medium hover:bg-[#2557D6]/90 transition-colors ml-auto">
                  <ExternalLink className="w-3.5 h-3.5" /> {lang === "pt" ? "Fonte" : "Source"}
                </a>
              )}
            </div>

            <div className="mt-4">
              <TrendFeedback title={title} platform={platform} userId={userId} />
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} onSubmit={handleCreateAlert} defaultKeyword={title} defaultCategory={category} />
    </>
  );
};

export default React.memo(TrendDetailPanel);
