import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Globe, Radio, Shield, ExternalLink, Share2, Zap, Eye, BarChart3, Newspaper, MessageCircle, Search, Video, Users, Database, ChevronRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import { mediaTypeEmojis } from "@/hooks/use-critical-moments";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const reasonLabelsByLang: Record<string, Record<string, string>> = {
  pt: {
    volumeSpike: "Pico de volume", acceleration: "Crescimento rápido", multiSource: "Multiplataforma",
    geographicSpread: "Vários países", verifiedSource: "Fonte verificada", mediaDiversity: "Mídias diversas",
    highVolume: "Volume alto", richContext: "Contexto rico",
  },
  en: {
    volumeSpike: "Volume spike", acceleration: "Fast growth", multiSource: "Multi-platform",
    geographicSpread: "Multiple countries", verifiedSource: "Verified source", mediaDiversity: "Diverse media",
    highVolume: "High volume", richContext: "Rich context",
  },
  es: {
    volumeSpike: "Pico de volumen", acceleration: "Crecimiento rápido", multiSource: "Multiplataforma",
    geographicSpread: "Varios países", verifiedSource: "Fuente verificada", mediaDiversity: "Medios diversos",
    highVolume: "Volumen alto", richContext: "Contexto rico",
  },
};

const reasonIcons: Record<string, React.ReactNode> = {
  volumeSpike: <TrendingUp className="w-2.5 h-2.5" />,
  acceleration: <Zap className="w-2.5 h-2.5" />,
  multiSource: <Radio className="w-2.5 h-2.5" />,
  geographicSpread: <Globe className="w-2.5 h-2.5" />,
  verifiedSource: <Shield className="w-2.5 h-2.5" />,
  mediaDiversity: <Newspaper className="w-2.5 h-2.5" />,
  highVolume: <BarChart3 className="w-2.5 h-2.5" />,
  richContext: <Eye className="w-2.5 h-2.5" />,
};

const mediaTypeIcons: Record<string, React.ReactNode> = {
  social: <MessageCircle className="w-3 h-3" />,
  press: <Newspaper className="w-3 h-3" />,
  search: <Search className="w-3 h-3" />,
  video: <Video className="w-3 h-3" />,
  community: <Users className="w-3 h-3" />,
  data: <Database className="w-3 h-3" />,
};

const riskColors: Record<string, string> = {
  extreme: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  moderate: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

const riskLabels: Record<string, Record<string, string>> = {
  extreme: { pt: "EXTREMO", en: "EXTREME", es: "EXTREMO" },
  high: { pt: "ALTO", en: "HIGH", es: "ALTO" },
  moderate: { pt: "MODERADO", en: "MODERATE", es: "MODERADO" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

function CriticalCard({ m, i, lang, isExpanded, onToggle }: {
  m: CriticalMoment; i: number; lang: LangCode; isExpanded: boolean; onToggle: () => void;
}) {
  const trend = m.trend;
  const sparkData = trend.sparkData?.map((v, idx) => ({ value: v })) || [];
  const l = (reasonLabelsByLang[lang] || reasonLabelsByLang.pt);
  const riskLabel = (riskLabels[m.riskLevel]?.[lang] || riskLabels[m.riskLevel]?.pt || "ALTO");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
      className={`rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer ${
        isExpanded
          ? "border-destructive/60 shadow-lg shadow-destructive/10 bg-destructive/5"
          : "border-border bg-card hover:border-destructive/40 hover:shadow-md hover:shadow-destructive/5"
      }`}
      onClick={onToggle}
    >
      <div className="p-3 space-y-2">
        {/* Header: Risk level + Score + Change */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${riskColors[m.riskLevel]}`}>
              {m.riskLevel === "extreme" ? "🔥" : m.riskLevel === "high" ? "⚠️" : "📊"} {riskLabel}
            </span>
            <span className="text-[9px] text-muted-foreground font-medium">
              {m.score} sinais
            </span>
          </div>
          <span className="text-[12px] font-black text-destructive tabular-nums">
            +{Math.round(m.changePercent)}%
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-foreground leading-snug line-clamp-2">
          {trend.title}
        </h3>

        {/* Summary */}
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {m.summary}
        </p>

        {/* Media types bar */}
        <div className="flex items-center gap-1 flex-wrap">
          {m.mediaTypes.map(type => (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-secondary text-secondary-foreground">
                  {mediaTypeEmojis[type] || "📌"} {type === "social" ? "Social" : type === "press" ? "Imprensa" : type === "search" ? "Busca" : type === "video" ? "Vídeo" : type === "community" ? "Comunidade" : type === "data" ? "Dados" : type}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                {lang === "pt" ? "Detectado em" : "Detected in"}: {type}
              </TooltipContent>
            </Tooltip>
          ))}
          {m.countryCount > 1 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-secondary text-secondary-foreground">
              🌍 {m.countryCount} {lang === "pt" ? "países" : "countries"}
            </span>
          )}
          {m.platformCount > 1 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-secondary text-secondary-foreground">
              📡 {m.platformCount} {lang === "pt" ? "plataformas" : "platforms"}
            </span>
          )}
        </div>

        {/* Prediction */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-2.5 py-2">
          <div className="flex items-start gap-1.5">
            <span className="text-sm flex-shrink-0">{m.predictionEmoji}</span>
            <div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">
                {lang === "pt" ? "Previsão" : lang === "es" ? "Previsión" : "Prediction"}
              </span>
              <p className="text-[10px] text-foreground/80 leading-relaxed">{m.prediction}</p>
            </div>
          </div>
        </div>

        {/* Mini sparkline */}
        {sparkData.length > 3 && (
          <div className="h-6 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expand hint */}
        {!isExpanded && (
          <div className="flex items-center justify-center text-[9px] text-muted-foreground gap-0.5 pt-0.5">
            <ChevronRight className="w-2.5 h-2.5" />
            {lang === "pt" ? "Clique para detalhes" : "Click for details"}
          </div>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t border-destructive/15">
              {/* Description */}
              {trend.description && (
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
                  {trend.description}
                </p>
              )}

              {/* Reason tags */}
              <div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  {lang === "pt" ? "Sinais detectados" : "Detected signals"}
                </span>
                <div className="flex flex-wrap gap-1">
                  {m.reasons.map(r => (
                    <span key={r} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-destructive/10 text-destructive">
                      {reasonIcons[r]} {l[r] || r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related platforms */}
              {m.relatedTrends.length > 0 && (
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    {lang === "pt" ? "Também detectado em" : "Also detected in"}
                  </span>
                  <div className="space-y-1">
                    {m.relatedTrends.map((rt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] bg-secondary/50 rounded-md px-2 py-1">
                        <span className="font-medium text-foreground">{rt.platform}</span>
                        {rt.countryCode && <span>{countryCodeToFlag(rt.countryCode)}</span>}
                        <span className="text-muted-foreground ml-auto">{rt.volume || "—"}</span>
                        {rt.change && <span className="text-destructive font-medium">{rt.change}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {(trend.sources?.length || 0) > 0 && (
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    {lang === "pt" ? "Fontes" : "Sources"}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {trend.sources!.slice(0, 5).map((src, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground">{src}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                {trend.sourceUrl && (
                  <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" /> {lang === "pt" ? "Ver fonte" : "View source"}
                  </a>
                )}
                <button
                  onClick={() => trend.sourceUrl && navigator.clipboard.writeText(trend.sourceUrl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-[10px] font-medium hover:bg-secondary/80 transition-colors">
                  <Share2 className="w-2.5 h-2.5" /> {lang === "pt" ? "Compartilhar" : "Share"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend, onClose, horizontal }: Props) {
  const { lang } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!moments.length) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          {lang === "pt"
            ? "Nenhum momento crítico detectado agora. O sistema monitora picos, convergência de mídias e propagação geográfica em tempo real."
            : "No critical moments detected right now. The system monitors spikes, media convergence and geographic spread in real-time."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      {/* Summary bar */}
      <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className="text-[9px] font-normal">
          {moments.length} {lang === "pt" ? "alertas ativos" : "active alerts"}
        </Badge>
        <span>
          {lang === "pt" ? "Combinando" : "Combining"}{" "}
          {[...new Set(moments.flatMap(m => m.mediaTypes))].length}{" "}
          {lang === "pt" ? "tipos de mídia em tempo real" : "media types in real-time"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {moments.slice(0, 8).map((m, i) => (
          <CriticalCard
            key={`${m.trend.platform}-${m.trend.title.slice(0, 20)}-${i}`}
            m={m}
            i={i}
            lang={lang}
            isExpanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
