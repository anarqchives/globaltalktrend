import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, ExternalLink, Bookmark, Bell, Share2, Flag } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import AbbrTooltip from "./AbbrTooltip";
import { AnomalyAlert } from "@/hooks/use-anomaly-alerts";

interface EmergingTrendsSectionProps {
  trends: TrendCardProps[];
  anomalies?: AnomalyAlert[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onClose?: () => void;
}

interface EmergingTrend {
  trend: TrendCardProps;
  ageMinutes: number;
  growthRate: number;
  sourceCount: number;
  score: number;
  signalType: "spike" | "rapid" | "emerging";
}

function detectEmergingTrends(trends: TrendCardProps[]): EmergingTrend[] {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const results: EmergingTrend[] = [];

  for (const trend of trends) {
    let ts: number | null = null;
    if (trend.firstSeenAt) ts = new Date(trend.firstSeenAt).getTime();
    else if (trend.publishedAt) ts = new Date(trend.publishedAt).getTime();
    if (!ts || isNaN(ts)) continue;

    const age = now - ts;
    if (age > TWO_HOURS || age < 0) continue;

    const changeStr = trend.change?.replace(/[^0-9.\-]/g, "") || "0";
    const growthRate = Math.abs(parseFloat(changeStr));
    if (growthRate < 30) continue;

    const sourceCount = trend.sources?.length || 1;
    const score = growthRate * (1 + 1 / Math.max(age / 60000, 1)) * (1 + sourceCount * 0.3);
    const signalType: "spike" | "rapid" | "emerging" = growthRate > 300 ? "spike" : growthRate > 150 ? "rapid" : "emerging";

    results.push({ trend, ageMinutes: Math.round(age / 60_000), growthRate, sourceCount, score, signalType });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 18);
}

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

const platformColors: Record<string, string> = {
  YouTube: "#FF0000",
  Reddit: "hsl(16, 100%, 50%)",
  "Google Trends": "#4285F4",
  NewsAPI: "hsl(142, 60%, 40%)",
  Bluesky: "hsl(200, 100%, 50%)",
  Mastodon: "#6364FF",
  "Hacker News": "#FF6600",
  GitHub: "#24292E",
  "The Guardian": "#0D6EFD",
  GNews: "hsl(160, 60%, 45%)",
  PubMed: "#007CBB",
  "X (Twitter)": "hsl(0, 0%, 15%)",
};

const COLUMNS = [
  {
    type: "spike" as const,
    icon: "📈",
    title: "Pico Anômalo",
    titleEn: "Anomalous Spike",
    subtitle: "Crescimento atípico detectado",
    subtitleEn: "Atypical growth detected",
    accent: "#FF4D4F",
    headerBg: "linear-gradient(180deg, #FFF1F0 0%, white 100%)",
    badgeBg: "bg-[#FFF1F0] dark:bg-red-900/20",
    badgeText: "text-[#CF1322] dark:text-red-400",
    badgeBorder: "border-[#FFCCC7] dark:border-red-800",
  },
  {
    type: "rapid" as const,
    icon: "⚡",
    title: "Crescimento Alto",
    titleEn: "High Growth",
    subtitle: "Volume acima da média histórica",
    subtitleEn: "Volume above historical average",
    accent: "#FA8C16",
    headerBg: "linear-gradient(180deg, #FFF7E6 0%, white 100%)",
    badgeBg: "bg-[#FFF7E6] dark:bg-amber-900/20",
    badgeText: "text-[#D46B08] dark:text-amber-400",
    badgeBorder: "border-[#FFD591] dark:border-amber-800",
  },
  {
    type: "emerging" as const,
    icon: "📡",
    title: "Sinal Emergente",
    titleEn: "Emerging Signal",
    subtitle: "Tendência nova em aceleração",
    subtitleEn: "New trend accelerating",
    accent: "#1677FF",
    headerBg: "linear-gradient(180deg, #E6F4FF 0%, white 100%)",
    badgeBg: "bg-[#E6F4FF] dark:bg-blue-900/20",
    badgeText: "text-[#0958D9] dark:text-blue-400",
    badgeBorder: "border-[#91CAFF] dark:border-blue-800",
  },
];

function emBrveToast() {
  toast({ title: "⏳ Em breve", description: "Esta funcionalidade será implementada em breve." });
}

function SignalCard({
  e,
  col,
  idx,
  lang,
}: {
  e: EmergingTrend;
  col: typeof COLUMNS[number];
  idx: number;
  lang: string;
}) {
  const pColor = platformColors[e.trend.platform] || "#666";
  const flag = countryCodeToFlag(e.trend.countryCode);
  const growth = Math.round(e.growthRate);
  const age = e.ageMinutes;
  const timeLabel = lang === "pt"
    ? (age < 30 ? "nos últimos 30 minutos" : age < 60 ? "na última hora" : `nas últimas ${Math.round(age / 60)}h`)
    : (age < 30 ? "in the last 30 minutes" : age < 60 ? "in the last hour" : `in the last ${Math.round(age / 60)}h`);

  const tviScore = Math.min(Math.round(e.growthRate * 0.3 + e.sourceCount * 10 + (120 - e.ageMinutes) * 0.3), 100);
  const tviLabel = tviScore >= 91 ? "Viral" : tviScore >= 61 ? "High" : tviScore >= 31 ? "Medium" : "Low";
  const tviColor = tviScore >= 91 ? "text-red-500" : tviScore >= 61 ? "text-orange-500" : tviScore >= 31 ? "text-amber-500" : "text-muted-foreground";

  const sparkRaw = e.trend.historicalData?.slice(-12) || [];
  const sparkData = sparkRaw.length > 0 ? sparkRaw : e.trend.sparkData?.map(v => ({ value: v })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.25 }}
      className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors duration-[120ms]"
      style={{ padding: "14px 16px" }}
    >
      {/* ① HEADER ROW */}
      <div className="flex items-center gap-1.5 h-5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
        <span className="text-[11px] font-medium" style={{ color: pColor }}>{e.trend.platform}</span>
        <span className="text-muted-foreground/40 text-[11px]">·</span>
        {flag && <span className="text-[11px]">{flag}</span>}
        {e.trend.countryCode && (
          <AbbrTooltip text={e.trend.countryCode.toUpperCase()} className="text-[11px] text-muted-foreground uppercase" />
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {age < 1 ? (lang === "pt" ? "agora" : "now") : age < 60 ? `há ${age}min` : `há ${Math.round(age / 60)}h`}
        </span>
      </div>

      {/* ② TITLE */}
      <h3 className="text-[14px] font-bold text-foreground leading-[1.35] line-clamp-2 mt-1.5">
        {decodeEntities(e.trend.title)}
      </h3>

      {/* ③ DESCRIPTION */}
      {e.trend.description && (
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
          {decodeEntities(e.trend.description)}
        </p>
      )}

      {/* ④ SIGNAL BADGE */}
      <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${col.badgeBg} ${col.badgeText} ${col.badgeBorder}`}>
        <AbbrTooltip text={col.type === "spike" ? "Pico anômalo" : col.type === "rapid" ? "Crescimento rápido" : "Sinal emergente"}>
          <span>+{growth}% {timeLabel}</span>
        </AbbrTooltip>
      </div>

      {/* ⑤ SPARKLINE */}
      {sparkData.length > 2 && (
        <div className="mt-2 h-9 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`emg-col-${idx}-${col.type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col.accent} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={col.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={col.accent} strokeWidth={1.5} fill={`url(#emg-col-${idx}-${col.type})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: col.accent }} />
        </div>
      )}

      {/* ⑥ METRICS + ACTIONS ROW */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <AbbrTooltip text="TVI" className="text-[9px] uppercase text-muted-foreground tracking-wide" />
            <span className={`text-base font-bold leading-none ${tviColor}`}>{tviScore}</span>
            <span className={`text-[10px] ${tviColor}`}>{tviLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={(ev) => { ev.stopPropagation(); emBrveToast(); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors" title="Salvar tendência">
            <Bookmark className="w-3.5 h-3.5" />
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); emBrveToast(); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors" title="Criar alerta">
            <Bell className="w-3.5 h-3.5" />
          </button>
          <button onClick={(ev) => {
            ev.stopPropagation();
            const url = e.trend.sourceUrl || window.location.href;
            if (navigator.share) navigator.share({ title: e.trend.title, url }).catch(() => {});
            else { navigator.clipboard.writeText(`${e.trend.title} — ${url}`); toast({ title: "🔗 Link copiado!" }); }
          }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors" title="Compartilhar">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(ev) => {
            ev.stopPropagation();
            toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${e.trend.title.slice(0, 40)}` });
          }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors" title="Denunciar">
            <Flag className="w-3.5 h-3.5" />
          </button>
          {e.trend.sourceUrl && (
            <a href={e.trend.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={ev => ev.stopPropagation()}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors" title="Abrir fonte original">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function EmergingTrendsSection({ trends, anomalies = [], onSelectTrend }: EmergingTrendsSectionProps) {
  const { lang } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  // Also classify anomalies into columns
  const anomalyItems: EmergingTrend[] = useMemo(() => {
    return anomalies.map(a => {
      const changeStr = a.trend.change?.replace(/[^0-9.\-]/g, "") || "0";
      const growthRate = Math.abs(parseFloat(changeStr));
      const signalType: "spike" | "rapid" | "emerging" = a.type === "spike" ? "spike" : a.type === "rapid_growth" ? "rapid" : growthRate > 300 ? "spike" : growthRate > 150 ? "rapid" : "emerging";
      return {
        trend: a.trend,
        ageMinutes: 0,
        growthRate,
        sourceCount: a.trend.sources?.length || 1,
        score: growthRate,
        signalType,
      };
    });
  }, [anomalies]);

  const allItems = useMemo(() => {
    const combined = [...anomalyItems, ...emerging];
    // Dedup by title
    const seen = new Set<string>();
    return combined.filter(e => {
      const key = e.trend.title.slice(0, 30).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [anomalyItems, emerging]);

  const columns = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      items: allItems.filter(e => e.signalType === col.type),
    }));
  }, [allItems]);

  if (allItems.length === 0) return null;

  // Build prediction text from anomalies
  const predictionText = useMemo(() => {
    if (anomalies.length === 0) return null;
    const platforms = new Set(anomalies.map(a => a.trend.platform));
    const avgChange = anomalies.reduce((s, a) => s + Math.abs(parseFloat(a.trend.change?.replace(/[^0-9.\-]/g, "") || "0")), 0) / anomalies.length;
    if (platforms.size >= 3 && avgChange > 200) {
      return lang === "pt"
        ? "Convergência global detectada — múltiplas plataformas em aceleração simultânea."
        : "Global convergence detected — simultaneous acceleration across platforms.";
    }
    if (avgChange > 150) {
      return lang === "pt"
        ? "Crescimento acelerado anômalo — possível viralização nas próximas 2-6h."
        : "Anomalous accelerated growth — possible viralization in the next 2-6h.";
    }
    return lang === "pt"
      ? "Monitorando padrões incomuns — sem convergência detectada ainda."
      : "Monitoring unusual patterns — no convergence detected yet.";
  }, [anomalies, lang]);

  return (
    <div className="flex flex-col h-full">
      {/* PREVISÃO banner */}
      {predictionText && (
        <div className="mx-3 mt-3 mb-3 px-4 py-3 rounded-lg border-b border-border/30" style={{ background: "linear-gradient(135deg, #FFF1F0, #FFF7E6)", borderLeft: "4px solid #FF4D4F" }}>
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">🔮</span>
            <div className="min-w-0">
              <AbbrTooltip text="PREVISÃO" className="text-[10px] font-bold uppercase tracking-wider text-[#CF1322]">
                {lang === "pt" ? "PREVISÃO" : "PREDICTION"}
              </AbbrTooltip>
              <p className="text-[11px] text-foreground/80 leading-relaxed mt-0.5">{predictionText}</p>
              <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                <span>{anomalies.length} anomalias</span>
                <span>·</span>
                <span>{new Set(anomalies.map(a => a.trend.platform)).size} plat.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-column folder tabs layout */}
      <div className="flex flex-1 min-h-0 px-3 pb-3 gap-0.5">
        {columns.map(col => (
          <div key={col.type} className="flex-1 min-w-0 flex flex-col">
            {/* Folder tab header */}
            <div className="flex-shrink-0 px-3 flex flex-col justify-center relative"
              style={{
                height: 40,
                background: 'hsl(var(--card))',
                borderTop: `2px solid ${col.accent}`,
                borderLeft: `1px solid ${col.accent}30`,
                borderRight: `1px solid ${col.accent}30`,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                marginBottom: -1,
                zIndex: 1,
              }}>
              <div className="flex items-center gap-1">
                <span className="text-sm">{col.icon}</span>
                <span className="text-[11px] font-bold text-foreground truncate">{lang === "pt" ? col.title : col.titleEn}</span>
                {col.items.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${col.accent}15`, color: col.accent }}>{col.items.length}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate">{lang === "pt" ? col.subtitle : col.subtitleEn}</span>
            </div>

            {/* Column body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin border rounded-b-lg"
              style={{
                borderColor: `${col.accent}20`,
                borderTop: `2px solid ${col.accent}`,
                background: 'hsl(var(--card))',
              }}>
              {col.items.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-[10px] text-muted-foreground/50">
                  {lang === "pt" ? "Nenhum sinal" : "No signals"}
                </div>
              ) : (
                col.items.map((e, idx) => (
                  <SignalCard key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}-${idx}`} e={e} col={col} idx={idx} lang={lang} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
