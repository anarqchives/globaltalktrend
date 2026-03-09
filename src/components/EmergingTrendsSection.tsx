import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Clock, Radio, ExternalLink, ArrowRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceDot } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmergingTrendsSectionProps {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onClose?: () => void;
}

interface EmergingTrend {
  trend: TrendCardProps;
  ageMinutes: number;
  growthRate: number;
  sourceCount: number;
  score: number;
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

    results.push({ trend, ageMinutes: Math.round(age / 60_000), growthRate, sourceCount, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 12);
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

/** Generate a plain-language context descriptor for the topic */
function generateContextDescriptor(trend: TrendCardProps, lang: string): string {
  const platform = trend.platform;
  const category = trend.category || "Geral";

  const categoryContexts: Record<string, Record<string, string>> = {
    pt: {
      Tecnologia: "tópico de tecnologia", Technology: "tópico de tecnologia",
      Entretenimento: "conteúdo de entretenimento", Entertainment: "conteúdo de entretenimento",
      Notícias: "notícia em destaque", News: "notícia em destaque",
      Política: "assunto político", Politics: "assunto político",
      Economia: "tema econômico", Economy: "tema econômico",
      Ciência: "pesquisa científica", Science: "pesquisa científica",
      Esportes: "notícia esportiva", Sports: "notícia esportiva",
      Geral: "tópico em alta", General: "tópico em alta",
    },
    en: {
      Tecnologia: "technology topic", Technology: "technology topic",
      Entretenimento: "entertainment content", Entertainment: "entertainment content",
      Notícias: "breaking news", News: "breaking news",
      Política: "political topic", Politics: "political topic",
      Economia: "economic topic", Economy: "economic topic",
      Ciência: "scientific research", Science: "scientific research",
      Esportes: "sports news", Sports: "sports news",
      Geral: "trending topic", General: "trending topic",
    },
  };

  const platformContexts: Record<string, Record<string, string>> = {
    pt: {
      Reddit: "ganhando tração em comunidades",
      "Google Trends": "em alta nas buscas",
      "Hacker News": "em destaque entre desenvolvedores",
      GitHub: "crescendo entre desenvolvedores",
      YouTube: "em alta em vídeos",
      Bluesky: "viral em redes descentralizadas",
      Mastodon: "em alta no fediverso",
      NewsAPI: "coberto pela imprensa",
      GNews: "coberto pela mídia",
      "The Guardian": "reportado pela imprensa internacional",
    },
    en: {
      Reddit: "gaining traction in communities",
      "Google Trends": "trending in search",
      "Hacker News": "highlighted among developers",
      GitHub: "growing among developers",
      YouTube: "trending in video",
      Bluesky: "viral on decentralized networks",
      Mastodon: "trending on the fediverse",
      NewsAPI: "covered by the press",
      GNews: "covered by media",
      "The Guardian": "reported by international press",
    },
  };

  const l = lang === "pt" ? "pt" : "en";
  const catCtx = categoryContexts[l]?.[category] || categoryContexts[l]?.Geral || "trending topic";
  const platCtx = platformContexts[l]?.[platform] || "";

  return platCtx ? `${catCtx} ${platCtx}` : catCtx;
}

/** Generate a plain-language explanation of why this signal is emerging */
function generateWhyExplanation(e: EmergingTrend, lang: string): string {
  const parts: string[] = [];
  const growth = Math.round(e.growthRate);
  const age = e.ageMinutes;

  if (lang === "pt") {
    parts.push(`+${growth}% de crescimento`);
    if (age < 30) parts.push("nos últimos 30 minutos");
    else if (age < 60) parts.push("na última hora");
    else parts.push(`nas últimas ${Math.round(age / 60)}h`);
    if (e.sourceCount > 1) parts.push(`em ${e.sourceCount} fontes`);
    return `Sinal emergente: ${parts.join(" ")}`;
  } else {
    parts.push(`+${growth}% growth`);
    if (age < 30) parts.push("in the last 30 minutes");
    else if (age < 60) parts.push("in the last hour");
    else parts.push(`in the last ${Math.round(age / 60)}h`);
    if (e.sourceCount > 1) parts.push(`across ${e.sourceCount} sources`);
    return `Emerging signal: ${parts.join(" ")}`;
  }
}

/** Generate a plain-language where description */
function generateWhereDescription(e: EmergingTrend, lang: string): string {
  const parts: string[] = [];
  parts.push(e.trend.platform);
  if (e.trend.countryCode) {
    const flag = countryCodeToFlag(e.trend.countryCode);
    const countryNames: Record<string, string> = {
      US: lang === "pt" ? "EUA" : "USA", BR: lang === "pt" ? "Brasil" : "Brazil",
      GB: lang === "pt" ? "Reino Unido" : "UK", DE: lang === "pt" ? "Alemanha" : "Germany",
      FR: lang === "pt" ? "França" : "France", JP: lang === "pt" ? "Japão" : "Japan",
      CA: lang === "pt" ? "Canadá" : "Canada", IN: lang === "pt" ? "Índia" : "India",
      AU: lang === "pt" ? "Austrália" : "Australia", IT: lang === "pt" ? "Itália" : "Italy",
      ES: lang === "pt" ? "Espanha" : "Spain", PT: "Portugal", MX: lang === "pt" ? "México" : "Mexico",
      AR: "Argentina", KR: lang === "pt" ? "Coreia do Sul" : "South Korea",
    };
    const name = countryNames[e.trend.countryCode.toUpperCase()] || e.trend.countryCode;
    parts.push(`${flag || ""} ${name}`);
  }
  if (e.sourceCount > 1) {
    parts.push(lang === "pt" ? `${e.sourceCount} fontes` : `${e.sourceCount} sources`);
  }
  return parts.join(" · ");
}

export default function EmergingTrendsSection({ trends, onSelectTrend }: EmergingTrendsSectionProps) {
  const { lang } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  if (emerging.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {emerging.map((e, i) => {
            const sparkRaw = e.trend.historicalData?.slice(-12) || [];
            const sparkData = sparkRaw.length > 0 ? sparkRaw : e.trend.sparkData?.map(v => ({ value: v })) || [];
            const tviScore = Math.min(Math.round(e.growthRate * 0.3 + e.sourceCount * 10 + (120 - e.ageMinutes) * 0.3), 100);
            const contextDesc = generateContextDescriptor(e.trend, lang);
            const whyExplanation = generateWhyExplanation(e, lang);
            const whereDesc = generateWhereDescription(e, lang);

            // Find peak index for chart marker
            let peakIdx = 0;
            let peakVal = 0;
            sparkData.forEach((d: any, idx: number) => {
              const v = d.value || d.v || 0;
              if (v > peakVal) { peakVal = v; peakIdx = idx; }
            });

            return (
              <motion.div
                key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}`}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group relative overflow-hidden rounded-xl border border-border/30 bg-card hover:border-emerald-500/30 transition-colors duration-200 text-left p-3 flex flex-col gap-1.5"
              >
                {/* ─── LAYER 1: WHAT — Title + Context ─── */}
                <div>
                  <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-snug">
                    {decodeEntities(e.trend.title)}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70 italic mt-0.5 capitalize">
                    {contextDesc}
                  </p>
                </div>

                {/* ─── LAYER 2: WHY — Explanation ─── */}
                <div className="rounded-md bg-emerald-500/8 border border-emerald-500/15 px-2 py-1">
                  <p className="text-[9px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    {whyExplanation}
                  </p>
                </div>

                {/* ─── LAYER 3: WHERE — Platform + Geography ─── */}
                <p className="text-[9px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Radio className="w-2.5 h-2.5 text-emerald-500/70 flex-shrink-0" />
                  {whereDesc}
                </p>

                {/* ─── LAYER 4: SIGNAL STRENGTH — Chart ─── */}
                {sparkData.length > 2 && (
                  <div className="h-8 w-full mt-0.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs>
                          <linearGradient id={`emg-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1.5}
                          fill={`url(#emg-grad-${i})`}
                          dot={false}
                        />
                        {peakVal > 0 && (
                          <ReferenceDot
                            x={peakIdx}
                            y={peakVal}
                            r={3}
                            fill="hsl(var(--primary))"
                            stroke="hsl(var(--background))"
                            strokeWidth={1.5}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ─── LAYER 5: SCORE + ACTIONS ─── */}
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/15">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black tabular-nums ${tviScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      TVI {tviScore}
                    </span>
                    <span className="text-[8px] text-muted-foreground/60 inline-flex items-center gap-0.5">
                      <Clock className="w-2 h-2" />
                      {e.ageMinutes < 1 ? "agora" : e.ageMinutes < 60 ? `${e.ageMinutes}min` : `${Math.round(e.ageMinutes / 60)}h`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {e.trend.sourceUrl && (
                      <a
                        href={e.trend.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[8px] font-medium hover:bg-secondary/80 transition-colors"
                      >
                        <ExternalLink className="w-2 h-2" />
                        {lang === "pt" ? "Fonte" : "Source"}
                      </a>
                    )}
                    <button
                      onClick={() => onSelectTrend?.(e.trend)}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[8px] font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Timeline <ArrowRight className="w-2 h-2" />
                    </button>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
