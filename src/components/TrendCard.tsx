import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Share2, MessageCircle, ThumbsUp, MapPin, Newspaper, ExternalLink, Shield, CheckCircle2, FlaskConical, Globe, ChevronDown } from "lucide-react";
import SparklineArea from "./SparklineArea";
import { toast } from "@/hooks/use-toast";
import { countryCodeToFlag } from "@/lib/shared-utils";
import { supabase } from "@/integrations/supabase/client";

// Lazy-load recharts — only loaded when card is expanded
const LazyChart = lazy(() =>
  import("recharts").then(mod => ({
    default: ({ data, colors, gradientId, metricLabel }: any) => (
      <mod.ResponsiveContainer width="100%" height="100%">
        <mod.AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.2} />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <mod.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <mod.XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
          <mod.YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={35}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <mod.Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, metricLabel || "valor"]}
          />
          <mod.Area type="monotone" dataKey="value" stroke={colors.stroke} strokeWidth={2} fill={`url(#${gradientId})`} />
        </mod.AreaChart>
      </mod.ResponsiveContainer>
    ),
  }))
);

export interface TrendCardProps {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  limited?: boolean;
  details?: string;
  likeRatio?: number;
  commentCount?: number;
  region?: string;
  countryCode?: string;
  sources?: string[];
  sourceUrl?: string;
  trustBadge?: string;
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
  thumbnail?: string;
  publishedAt?: string;
  description?: string;
  firstSeenAt?: string;
  peakAt?: string;
  relevanceScore?: number;
  translated?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "entretenimento": "var(--cat-entretenimento)",
  "entertainment": "var(--cat-entretenimento)",
  "tecnologia": "var(--cat-tecnologia)",
  "technology": "var(--cat-tecnologia)",
  "geopolítica": "var(--cat-geopolitica)",
  "geopolitics": "var(--cat-geopolitica)",
  "política": "var(--cat-geopolitica)",
  "politics": "var(--cat-geopolitica)",
  "esportes": "var(--cat-esportes)",
  "sports": "var(--cat-esportes)",
  "ciências": "var(--cat-ciencias)",
  "science": "var(--cat-ciencias)",
  "ciência": "var(--cat-ciencias)",
  "cultura": "var(--cat-cultura)",
  "culture": "var(--cat-cultura)",
  "economia": "var(--cat-economia)",
  "economy": "var(--cat-economia)",
  "business": "var(--cat-economia)",
};

function getCategoryColor(category: string): string {
  const key = category?.toLowerCase().trim() || "";
  return CATEGORY_COLORS[key] || "var(--muted-foreground)";
}

const platformColors: Record<string, { stroke: string; fill: string }> = {
  YouTube: { stroke: "hsl(0, 72%, 51%)", fill: "hsl(0, 72%, 51%)" },
  Reddit: { stroke: "hsl(16, 100%, 50%)", fill: "hsl(16, 100%, 50%)" },
  "Google Trends": { stroke: "hsl(210, 100%, 40%)", fill: "hsl(210, 100%, 40%)" },
  NewsAPI: { stroke: "hsl(142, 60%, 40%)", fill: "hsl(142, 60%, 40%)" },
  "The Guardian": { stroke: "hsl(210, 70%, 35%)", fill: "hsl(210, 70%, 35%)" },
  "World Bank": { stroke: "hsl(200, 80%, 45%)", fill: "hsl(200, 80%, 45%)" },
  IBGE: { stroke: "hsl(130, 60%, 35%)", fill: "hsl(130, 60%, 35%)" },
  OpenAlex: { stroke: "hsl(270, 60%, 50%)", fill: "hsl(270, 60%, 50%)" },
};

const trustBadgeMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  official: { label: "Fonte Oficial", icon: <Shield className="w-2.5 h-2.5" />, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  verified: { label: "Verificado", icon: <CheckCircle2 className="w-2.5 h-2.5" />, className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  scientific: { label: "Científico", icon: <FlaskConical className="w-2.5 h-2.5" />, className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  international: { label: "Fonte Internacional", icon: <Globe className="w-2.5 h-2.5" />, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

const TrendCard = ({
  icon, platform, title, category, time, volume, change, changePositive,
  sparkData, limited, details, likeRatio, commentCount, region, countryCode,
  sources, sourceUrl, trustBadge, historicalData: initialHistoricalData, metricLabel,
}: TrendCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState(initialHistoricalData ?? []);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const flag = countryCodeToFlag(countryCode);
  const colors = platformColors[platform] || platformColors["Google Trends"];
  const catColor = getCategoryColor(category);
  const gradientId = useMemo(
    () => `grad-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
    [title]
  );

  // Busca dados reais quando o card é expandido
  useEffect(() => {
    if (!expanded) return;
    const hasRealData = historicalData.length > 0 &&
      historicalData.some(p => p.value > 0);
    if (hasRealData) return;

    setLoadingHistory(true);
    supabase.functions.invoke("fetch-trend-history", {
      body: { title, platform },
    }).then(({ data }) => {
      if (data?.historicalData && data.historicalData.length > 0) {
        setHistoricalData(data.historicalData);
      }
    }).finally(() => setLoadingHistory(false));
  }, [expanded, title, platform]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = sourceUrl || window.location.href;
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})\n${shareUrl}`);
    toast({ title: "Link copiado!", description: title.slice(0, 60) });
  };

  return (
    <div className="trend-card-base group" onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-secondary text-base ${limited ? "opacity-50 grayscale-[50%]" : ""}`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground/70">{platform}</span>
          {flag && <span className="text-sm" title={countryCode}>{flag}</span>}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
            style={{ backgroundColor: `hsl(${catColor} / 0.12)`, color: `hsl(${catColor})` }}>
            {category}
          </span>
          {trustBadge && trustBadgeMap[trustBadge] && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${trustBadgeMap[trustBadge].className}`}>
              {trustBadgeMap[trustBadge].icon} {trustBadgeMap[trustBadge].label}
            </span>
          )}
          {limited && <span className="warning-badge">⚠ acesso limitado</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleShare}
            className="p-1.5 rounded-full hover:bg-secondary transition-colors text-foreground/40 hover:text-foreground"
            title="Compartilhar">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={`w-3.5 h-3.5 text-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      <h3 className="text-[17px] font-bold font-outfit tracking-tight mb-1.5 line-clamp-2 leading-snug">{title}</h3>

      <div className="flex gap-3 text-xs text-foreground/50 mb-3">
        <span>{time}</span>
      </div>

      {/* Volume + Change + Platform Metrics */}
      <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
        <span className="volume-badge">{volume}</span>
        <span className={changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
          {change}
        </span>
        {platform === "YouTube" && likeRatio !== undefined && likeRatio > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
            <ThumbsUp className="w-3 h-3" /> {likeRatio}%
          </span>
        )}
        {platform === "Reddit" && commentCount !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
            <MessageCircle className="w-3 h-3" /> {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount}
          </span>
        )}
        {platform === "Google Trends" && region && (
          <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
            <MapPin className="w-3 h-3" /> {region}
          </span>
        )}
        {platform === "NewsAPI" && sources && sources.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
            <Newspaper className="w-3 h-3" /> {sources[0]}
          </span>
        )}
      </div>

      {/* Mini sparkline */}
      <div className="h-10 mt-3">
        <SparklineArea data={sparkData} color={colors.stroke} width={200} height={40} className="w-full" />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-300">
          {details && <p className="text-sm text-foreground/60 mb-4">{details}</p>}
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-4 group">
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              {platform === "YouTube" ? "Assistir no YouTube" : platform === "Reddit" ? "Ver no Reddit" : "Ler artigo original"}
            </a>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Evolução 24h</span>
              <span className="text-xs text-foreground/40">{metricLabel}</span>
            </div>
            <div className="h-36 -mx-1">
              {loadingHistory ? (
                <div className="h-full bg-muted/30 rounded animate-pulse flex items-center justify-center">
                  <span className="text-xs text-foreground/30">Carregando dados reais...</span>
                </div>
              ) : historicalData.length > 0 ? (
                <Suspense fallback={<div className="h-full bg-muted/30 rounded animate-pulse" />}>
                  <LazyChart data={historicalData} colors={colors} gradientId={gradientId} metricLabel={metricLabel} />
                </Suspense>
              ) : (
                <div className="h-full bg-muted/30 rounded flex items-center justify-center">
                  <span className="text-xs text-foreground/30">Dados históricos indisponíveis</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TrendCard);
