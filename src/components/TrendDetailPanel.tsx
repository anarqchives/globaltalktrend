import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Share2, Bookmark, Bell, ExternalLink, Sparkles, Info, Globe, ShieldCheck, Eye } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AlertModal from "./AlertModal";
import TrendFeedback from "./TrendFeedback";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PriorityResult, LIFECYCLE_LABELS, TIER_LABELS, getConfidenceLabel, computePriority } from "@/lib/priority-engine";

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

const SOURCE_HEX: Record<string, string> = {
  imprensa: "#5580AA", redes_sociais: "#C08040", google_trends: "#C09020",
  dados_oficiais: "#558855", cientifico: "#7070AA", enciclopedico: "#408888",
};
const SOURCE_LABELS: Record<string, Record<string, string>> = {
  imprensa: { pt: "Imprensa — veículos profissionais com equipe editorial", en: "Press — professional outlets with editorial teams" },
  dados_oficiais: { pt: "Dados Oficiais — instituições governamentais e organismos internacionais", en: "Official Data — government institutions and international organizations" },
  cientifico: { pt: "Acadêmico — publicações científicas revisadas por pares", en: "Academic — peer-reviewed scientific publications" },
  redes_sociais: { pt: "Social — redes sociais e comunidades online", en: "Social — social networks and online communities" },
  google_trends: { pt: "Buscas — dados de volume de pesquisa", en: "Searches — search engine volume data" },
  enciclopedico: { pt: "Enciclopédico — plataformas de conhecimento colaborativo", en: "Encyclopedic — collaborative knowledge platforms" },
};

function getSourceType(p: string): string {
  const l = p.toLowerCase();
  if (["guardian","npr","newsapi","gnews","bing","newsdata","thenewsapi","bbc","variety","reuters","nyt","bloomberg","ap","folha","estadão","le monde","el país","al jazeera"].some(s => l.includes(s))) return "imprensa";
  if (["reddit","bluesky","mastodon","twitter","youtube","hacker","lobster"].some(s => l.includes(s))) return "redes_sociais";
  if (l.includes("google trends")) return "google_trends";
  if (["world bank","fred","ibge","imf","who","noaa"].some(s => l.includes(s))) return "dados_oficiais";
  if (["arxiv","pubmed","openal","crossref","semantic"].some(s => l.includes(s))) return "cientifico";
  if (l.includes("wikipedia")) return "enciclopedico";
  return "imprensa";
}

const TERM_EXPLAIN: Record<string, Record<string, string>> = {
  pt: {
    "PMID": "PMID = PubMed Identifier — código único de artigo na base biomédica MEDLINE/PubMed",
    "FRED": "FRED = Federal Reserve Economic Data — base de dados econômicos do Fed de St. Louis com +800 mil séries temporais",
    "CPI": "CPI = Consumer Price Index — mede a inflação nos gastos domésticos",
    "GDP": "GDP = Produto Interno Bruto — principal indicador econômico de um país",
    "WHO": "WHO = Organização Mundial da Saúde — agência especializada da ONU",
    "IMF": "IMF = Fundo Monetário Internacional — monitora estabilidade financeira global",
    "DOI": "DOI = Identificador digital permanente para publicações acadêmicas",
    "CPIAUCSL": "CPI-U = Índice de Preços ao Consumidor dos EUA publicado pelo Bureau of Labor Statistics",
    "IBGE": "IBGE = Instituto Brasileiro de Geografia e Estatística — dados oficiais do Brasil",
    "PMI": "PMI = Purchasing Managers' Index — indicador antecedente da economia",
    "ARXIV": "arXiv = repositório de preprints científicos em física, matemática e computação",
  },
  en: {
    "PMID": "PMID = PubMed Identifier — unique code for articles in MEDLINE/PubMed biomedical database",
    "FRED": "FRED = Federal Reserve Economic Data — St. Louis Fed database with 800K+ economic time series",
    "CPI": "CPI = Consumer Price Index — measures household inflation",
    "GDP": "GDP = Gross Domestic Product — primary measure of economic output",
    "WHO": "WHO = World Health Organization — UN specialized health agency",
    "IMF": "IMF = International Monetary Fund — monitors global financial stability",
    "DOI": "DOI = Digital Object Identifier for academic publications",
    "CPIAUCSL": "CPI-U = US Consumer Price Index published by the Bureau of Labor Statistics",
    "IBGE": "IBGE = Brazilian Institute of Geography and Statistics — official data agency",
    "PMI": "PMI = Purchasing Managers' Index — leading economic indicator",
    "ARXIV": "arXiv = scientific preprint repository for physics, mathematics and computing",
  },
};

function findTermExplanation(title: string, lang: string): string | null {
  const terms = TERM_EXPLAIN[lang] || TERM_EXPLAIN.pt;
  const upper = title.toUpperCase();
  for (const [term, explanation] of Object.entries(terms)) { if (upper.includes(term)) return explanation; }
  return null;
}

/* ─── Priority tier colors ─── */
const TIER_COLORS: Record<string, string> = {
  critical: "hsl(var(--priority-critical))",
  high: "hsl(var(--priority-high))",
  medium: "hsl(var(--priority-medium))",
  low: "hsl(var(--priority-low))",
};

interface TrendDetailPanelProps {
  trend: (TrendCardProps & { aiContext?: string; crossPlatformCluster?: CrossPlatformCluster | null; isMultiplatform?: boolean; priority?: PriorityResult }) | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  userId?: string | null;
  onSaveCard?: (card: any) => void;
  onTrackAction?: (action: string, points: number, metadata?: Record<string, any>) => void;
  onAddToWatchlist?: (card: any) => void;
}

const TrendDetailPanel: React.FC<TrendDetailPanelProps> = ({
  trend, onClose, onPrev, onNext, hasPrev, hasNext, userId, onSaveCard, onTrackAction, onAddToWatchlist,
}) => {
  const { t, lang } = useLanguage();
  const [alertOpen, setAlertOpen] = React.useState(false);

  if (!trend) return null;

  const {
    platform, title, category, time, volume, change, changePositive,
    historicalData, sources, sourceUrl, trustBadge, thumbnail,
    countryCode, description, details, publishedAt, aiContext,
    isMultiplatform, crossPlatformCluster, priority,
  } = trend;

  const sourceType = getSourceType(platform);
  const dotHex = SOURCE_HEX[sourceType] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);
  const srcCount = sources?.length || 1;
  const sourceLabel = SOURCE_LABELS[sourceType]?.[lang] || SOURCE_LABELS[sourceType]?.en || "";
  const termExplanation = findTermExplanation(title, lang);
  const hasThumbnail = thumbnail && thumbnail.startsWith("http");

  const realDescription = (() => {
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw;
  })();

  const showAiContext = aiContext && aiContext.length > 20 && !aiContext.toLowerCase().includes("previsão climática geral");

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
      return date.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
      <motion.div className="fixed inset-0 bg-black/12 backdrop-blur-[2px] z-40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-card border-l border-border z-50 overflow-y-auto shadow-[-8px_0_40px_rgba(26,24,20,0.06)]"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground compact-btn">
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
            {lang === "pt" ? "Análise de Sinal" : "Signal Analysis"}
          </span>
          <div className="flex-1" />
          <button onClick={onPrev} disabled={!hasPrev} className="compact-btn p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={onNext} disabled={!hasNext} className="compact-btn p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-5">

            {/* ═══ INTELLIGENCE SUMMARY — first reading level ═══ */}
            {priority && (
              <div className="mb-4 rounded-lg border border-border/30 overflow-hidden">
                {/* Priority reason banner */}
                <div className="px-4 py-3" style={{ backgroundColor: `color-mix(in srgb, ${TIER_COLORS[priority.tier]} 6%, transparent)` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[18px] font-black tabular-nums" style={{ color: TIER_COLORS[priority.tier] }}>{priority.score}</span>
                    <div className="w-[48px] h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: `color-mix(in srgb, ${TIER_COLORS[priority.tier]} 15%, transparent)` }}>
                      <div className="h-full rounded-full" style={{ backgroundColor: TIER_COLORS[priority.tier], width: `${priority.score}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TIER_COLORS[priority.tier] }}>
                      {TIER_LABELS[priority.tier][lang as "pt" | "en"] || TIER_LABELS[priority.tier].en}
                    </span>
                  </div>
                  <p className="text-[12px] font-medium leading-snug" style={{ color: TIER_COLORS[priority.tier] }}>
                    {priority.reason}
                  </p>
                </div>

                {/* Intelligence metrics grid */}
                <div className="grid grid-cols-3 divide-x divide-border/20">
                  {/* Lifecycle */}
                  <div className="px-3 py-2.5 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                      {lang === "pt" ? "Estágio" : "Stage"}
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: `hsl(var(--lifecycle-${priority.lifecycle}))` }}>
                      {LIFECYCLE_LABELS[priority.lifecycle].icon} {LIFECYCLE_LABELS[priority.lifecycle][lang as "pt" | "en"] || LIFECYCLE_LABELS[priority.lifecycle].en}
                    </span>
                    <span className="text-[8px] text-muted-foreground/40 block mt-0.5">
                      {LIFECYCLE_LABELS[priority.lifecycle].desc[lang as "pt" | "en"] || LIFECYCLE_LABELS[priority.lifecycle].desc.en}
                    </span>
                  </div>
                  {/* Confidence */}
                  <div className="px-3 py-2.5 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                      {lang === "pt" ? "Confiança" : "Confidence"}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3" style={{ color: priority.confidenceScore > 0.7 ? "hsl(var(--success-fg))" : priority.confidenceScore > 0.4 ? "hsl(var(--warning-fg))" : "hsl(var(--destructive))" }} />
                      <span className="text-[11px] font-bold tabular-nums">{Math.round(priority.confidenceScore * 100)}%</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground/40 block mt-0.5">
                      {getConfidenceLabel(priority.confidenceScore, lang)}
                    </span>
                  </div>
                  {/* Source nature */}
                  <div className="px-3 py-2.5 text-center">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50 block mb-1">
                      {lang === "pt" ? "Natureza" : "Nature"}
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">{priority.sourceNature || sourceLabel.split("—")[0]?.trim()}</span>
                    <span className="text-[8px] text-muted-foreground/40 block mt-0.5">
                      {srcCount} {lang === "pt" ? (srcCount === 1 ? "fonte" : "fontes") : (srcCount === 1 ? "source" : "sources")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Source + time */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotHex }} />
              <span className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: dotHex }}>{platform}</span>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[11px] text-muted-foreground">{formattedTime}</span>
              {flag && <span className="text-sm">{flag}</span>}
              {category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">{category}</span>}
            </div>

            {/* Source type explanation */}
            {sourceLabel && !priority && (
              <div className="flex items-center gap-1.5 mb-2 text-[9px] text-muted-foreground/60">
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>{sourceLabel}</span>
              </div>
            )}

            {/* Thumbnail */}
            {hasThumbnail && (
              <div className="w-full h-32 rounded-lg overflow-hidden bg-muted mb-4">
                <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
              </div>
            )}

            {/* Title */}
            <h2 className="text-[20px] font-semibold leading-snug text-foreground mb-4">{decodeEntities(title)}</h2>

            {/* Term explanation */}
            {termExplanation && (
              <div className="flex items-start gap-1.5 mb-4 px-3 py-2 rounded-md bg-info-bg border-l-2 border-info-fg text-[10px] leading-relaxed text-info-fg">
                <span className="flex-shrink-0 mt-0.5">💡</span>
                <span>{termExplanation}</span>
              </div>
            )}

            {/* Original metrics row (subordinate) */}
            {hasMetrics && (
              <div className="grid grid-cols-3 gap-2 mb-5">
                {showVolume && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-md bg-background p-3 text-center cursor-help">
                        <span className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground/50 block mb-0.5">
                          {lang === "pt" ? "Vol. original" : "Original vol."}
                        </span>
                        <span className="text-[15px] font-bold text-foreground">{volume}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] max-w-[200px]">
                      {lang === "pt" ? "Métrica bruta da fonte original — não comparável diretamente entre fontes diferentes" : "Raw metric from original source — not directly comparable across different sources"}
                    </TooltipContent>
                  </Tooltip>
                )}
                {showChange && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-md bg-background p-3 text-center cursor-help">
                        <span className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground/50 block mb-0.5">
                          {lang === "pt" ? "Cresc." : "Growth"}
                        </span>
                        <span className={`text-[15px] font-bold ${changePositive ? "text-success-fg" : "text-destructive"}`}>
                          {changePositive ? "+" : ""}{change}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] max-w-[200px]">
                      {lang === "pt" ? "Variação percentual em relação ao período anterior" : "Percentage change vs. previous period"}
                    </TooltipContent>
                  </Tooltip>
                )}
                {srcCount > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-md bg-background p-3 text-center cursor-help">
                        <span className="text-[8px] uppercase tracking-[0.08em] text-muted-foreground/50 block mb-0.5">
                          {lang === "pt" ? "Fontes" : "Sources"}
                        </span>
                        <span className="text-[15px] font-bold text-foreground">{srcCount}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] max-w-[200px]">
                      {lang === "pt" ? "Número de fontes independentes cobrindo esta tendência" : "Number of independent sources covering this trend"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Normalized relevance bar (when priority available) */}
            {priority && (
              <div className="mb-5 px-3 py-2 rounded-md bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50">
                    {lang === "pt" ? "Relevância normalizada" : "Normalized relevance"}
                  </span>
                  <span className="text-[9px] font-bold tabular-nums text-muted-foreground">{Math.round(priority.normalizedVolume * 100)}%</span>
                </div>
                <div className="w-full h-[3px] rounded-full bg-muted/40 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${priority.normalizedVolume * 100}%`, backgroundColor: dotHex }} />
                </div>
                <span className="text-[8px] text-muted-foreground/40 mt-1 block">
                  {lang === "pt" ? "Comparável entre todas as fontes do feed" : "Comparable across all feed sources"}
                </span>
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
                        <linearGradient id="detail-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={dotHex} stopOpacity={0.12} />
                          <stop offset="100%" stopColor={dotHex} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.12)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Area type="monotone" dataKey="value" stroke={dotHex} strokeWidth={1.5} fill="url(#detail-gradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Propagation */}
            {showPropagation && crossPlatformCluster && (
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-2 block">
                  {lang === "pt" ? "Propagação entre plataformas" : "Cross-platform propagation"}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${dotHex}15`, color: dotHex }}>
                    {crossPlatformCluster.trends[0]?.platform}
                  </span>
                  <span className="text-muted-foreground/30">→</span>
                  {crossPlatformCluster.trends.slice(1).map(ct => ct.platform).filter((v, i, a) => a.indexOf(v) === i).map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[10px]">{p}</span>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1">
                  {lang === "pt"
                    ? `Detectada em ${crossPlatformCluster.platformCount} plataformas com volume total de ${crossPlatformCluster.totalVolume.toLocaleString()}`
                    : `Detected across ${crossPlatformCluster.platformCount} platforms with total volume of ${crossPlatformCluster.totalVolume.toLocaleString()}`}
                </p>
              </div>
            )}

            {/* Geographic coverage */}
            {countryCode && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-muted/20">
                <Globe className="w-3.5 h-3.5 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground">
                  {flag} {countryCode?.toUpperCase()}
                  {isMultiplatform && (
                    <span className="ml-1.5 text-[9px] text-[hsl(var(--source-official))]">
                      + {lang === "pt" ? "múltiplas regiões" : "multiple regions"}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* AI Context */}
            {showAiContext && (
              <div className="rounded-md bg-accent/5 border border-accent/10 p-4 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-foreground/50" />
                  <span className="text-[10px] font-medium text-foreground/50 uppercase tracking-[0.08em]">
                    {lang === "pt" ? "Contexto por IA" : "AI Context"}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/80">{aiContext}</p>
              </div>
            )}

            {/* Description */}
            {realDescription && !showAiContext && (
              <p className="text-[13px] leading-relaxed text-muted-foreground mb-4">{decodeEntities(realDescription)}</p>
            )}

            {/* Data absence notice */}
            {!realDescription && !showAiContext && !hasEvolution && (
              <div className="rounded-md bg-muted/20 px-3 py-2 mb-4 text-[10px] text-muted-foreground/50 italic">
                {lang === "pt" ? "Dados de contexto e histórico não disponíveis para este sinal." : "Context and historical data not available for this signal."}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Share2 className="w-3.5 h-3.5" /> {lang === "pt" ? "Compartilhar" : "Share"}
              </button>
              <button onClick={() => onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: realDescription || aiContext || "" })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Bookmark className="w-3.5 h-3.5" /> {lang === "pt" ? "Salvar" : "Save"}
              </button>
              {onAddToWatchlist && (
                <button onClick={() => onAddToWatchlist({ title, platform, category, countryCode, volume, change, changePositive, sources })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                  <Eye className="w-3.5 h-3.5" /> {lang === "pt" ? "Monitorar" : "Watch"}
                </button>
              )}
              <button onClick={() => {
                if (!userId) { toast({ title: t("loginRequired") }); return; }
                setAlertOpen(true);
              }} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-background hover:bg-muted text-[12px] font-medium transition-colors">
                <Bell className="w-3.5 h-3.5" /> {lang === "pt" ? "Alerta" : "Alert"}
              </button>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors ml-auto">
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
