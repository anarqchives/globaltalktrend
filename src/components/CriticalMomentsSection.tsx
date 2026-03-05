import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, TrendingUp, Globe, Radio, Shield, X, ExternalLink,
  Clock, BarChart3, Zap, ChevronDown, ChevronUp, Bell, Share2,
} from "lucide-react";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/* ── i18n ─────────────────────────────────────── */

const reasonLabelsByLang: Record<LangCode, Record<string, string>> = {
  pt: { volumeSpike: "Pico de volume", acceleration: "Crescimento rápido", multiSource: "Múltiplas fontes", geographicSpread: "Vários países", verifiedSource: "Fonte verificada" },
  en: { volumeSpike: "Volume spike", acceleration: "Fast growth", multiSource: "Multiple sources", geographicSpread: "Multiple countries", verifiedSource: "Verified source" },
  es: { volumeSpike: "Pico de volumen", acceleration: "Crecimiento rápido", multiSource: "Múltiples fuentes", geographicSpread: "Varios países", verifiedSource: "Fuente verificada" },
  fr: { volumeSpike: "Pic de volume", acceleration: "Croissance rapide", multiSource: "Sources multiples", geographicSpread: "Plusieurs pays", verifiedSource: "Source vérifiée" },
  de: { volumeSpike: "Volumenspitze", acceleration: "Schnelles Wachstum", multiSource: "Mehrere Quellen", geographicSpread: "Mehrere Länder", verifiedSource: "Verifizierte Quelle" },
  it: { volumeSpike: "Picco di volume", acceleration: "Crescita rapida", multiSource: "Fonti multiple", geographicSpread: "Più paesi", verifiedSource: "Fonte verificata" },
  zh: { volumeSpike: "流量峰值", acceleration: "快速增长", multiSource: "多来源", geographicSpread: "多国家", verifiedSource: "已验证来源" },
  ja: { volumeSpike: "急増", acceleration: "急成長", multiSource: "複数ソース", geographicSpread: "複数の国", verifiedSource: "検証済みソース" },
  ko: { volumeSpike: "볼륨 급증", acceleration: "빠른 증가", multiSource: "다중 소스", geographicSpread: "다수 국가", verifiedSource: "검증된 소스" },
  ar: { volumeSpike: "ارتفاع حاد", acceleration: "نمو سريع", multiSource: "مصادر متعددة", geographicSpread: "عدة دول", verifiedSource: "مصدر موثّق" },
  hi: { volumeSpike: "वॉल्यूम स्पाइक", acceleration: "तेज़ वृद्धि", multiSource: "कई स्रोत", geographicSpread: "कई देश", verifiedSource: "सत्यापित स्रोत" },
  ru: { volumeSpike: "Скачок объема", acceleration: "Быстрый рост", multiSource: "Несколько источников", geographicSpread: "Несколько стран", verifiedSource: "Проверенный источник" },
};

const closeLabelByLang: Record<LangCode, string> = {
  pt: "Fechar momentos críticos", en: "Close critical moments", es: "Cerrar momentos críticos",
  fr: "Fermer les moments critiques", de: "Kritische Momente schließen", it: "Chiudi momenti critici",
  zh: "关闭关键时刻", ja: "クリティカルを閉じる", ko: "긴급 항목 닫기",
  ar: "إغلاق اللحظات الحرجة", hi: "महत्वपूर्ण क्षण बंद करें", ru: "Закрыть критические моменты",
};

const reasonIcons: Record<string, React.ReactNode> = {
  volumeSpike: <TrendingUp className="w-3 h-3" />,
  acceleration: <TrendingUp className="w-3 h-3" />,
  multiSource: <Radio className="w-3 h-3" />,
  geographicSpread: <Globe className="w-3 h-3" />,
  verifiedSource: <Shield className="w-3 h-3" />,
};

/* ── helpers ───────────────────────────────────── */

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const normalizeText = (v: string) => v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

const localizeCategory = (category: string, t: (k: any) => string) => {
  const n = normalizeText(category || "");
  const map: Record<string, string> = {
    politica: "politics", politics: "politics", entretenimento: "entertainment", entertainment: "entertainment",
    tecnologia: "technology", technology: "technology", esportes: "sports", sports: "sports",
    cultura: "culture", culture: "culture", negocios: "business", business: "business",
    ciencia: "science", science: "science", geral: "general", general: "general", social: "socialMedia",
  };
  const key = map[n];
  return key ? t(key as any) : category;
};

function getTimeWindow(firstSeenAt?: string, peakAt?: string): string | null {
  if (!firstSeenAt) return null;
  const start = new Date(firstSeenAt).getTime();
  const end = peakAt ? new Date(peakAt).getTime() : Date.now();
  if (isNaN(start)) return null;
  const hours = Math.max(0, Math.round((end - start) / 3600000));
  if (hours < 1) return "< 1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
}

function detectTrigger(title: string, reasons: string[]): string | null {
  const t = title.toLowerCase();
  if (t.includes("release") || t.includes("lançamento") || t.includes("launch")) return "Lançamento recente";
  if (t.includes("declara") || t.includes("statement") || t.includes("anuncia")) return "Declaração pública";
  if (t.includes("acidente") || t.includes("crash") || t.includes("queda")) return "Evento inesperado";
  if (t.includes("eleição") || t.includes("election") || t.includes("voto")) return "Contexto eleitoral";
  if (reasons.includes("verifiedSource")) return "Confirmação de fonte oficial";
  if (reasons.includes("multiSource")) return "Cobertura massiva simultânea";
  return null;
}

/* ── CriticalCard (individual expanded card) ──── */

function CriticalCard({ m, i, lang, t, onSelectTrend }: {
  m: CriticalMoment; i: number; lang: LangCode;
  t: (k: any) => string; onSelectTrend?: (trend: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const trend = m.trend;
  const hasLink = !!trend.sourceUrl;
  const timeWindow = getTimeWindow(trend.firstSeenAt, trend.peakAt);
  const trigger = detectTrigger(trend.title, m.reasons);
  const startTime = formatTime(trend.firstSeenAt);
  const peakTime = formatTime(trend.peakAt);
  const sources = trend.sources || [];

  // Build contextual explanation sentence
  const explParts: string[] = [];
  if (m.changePercent > 500) explParts.push(`crescimento explosivo de ${Math.round(m.changePercent)}%`);
  else if (m.changePercent > 200) explParts.push(`alta aceleração de ${Math.round(m.changePercent)}%`);
  else if (m.changePercent > 50) explParts.push(`crescimento de ${Math.round(m.changePercent)}%`);
  if (timeWindow) explParts.push(`em ${timeWindow}`);
  if (m.reasons.includes("multiSource")) explParts.push("reportado por múltiplas fontes");
  if (m.reasons.includes("geographicSpread")) explParts.push("repercussão internacional");
  if (m.reasons.includes("verifiedSource")) explParts.push("confirmado por fonte verificada");
  if (explParts.length === 0) explParts.push("atividade anômala detectada");

  const explanation = explParts.join(" · ");

  const handleClick = () => {
    if (hasLink) window.open(trend.sourceUrl, "_blank", "noopener,noreferrer");
    else onSelectTrend?.(trend);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trend.sourceUrl) navigator.clipboard.writeText(trend.sourceUrl);
  };

  return (
    <motion.div
      key={`${trend.title}-${i}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-2xl bg-destructive/5 border border-destructive/20 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-destructive/10"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2 cursor-pointer" onClick={handleClick}>
        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Flame className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-destructive dark:text-red-400 line-clamp-2 leading-snug flex-1">
              {trend.title}
            </h3>
            <Badge variant="destructive" className="text-[10px] px-2 py-0.5 flex-shrink-0 uppercase tracking-wider">
              🔥 {t("critical")}
            </Badge>
          </div>
          {/* Contextual explanation */}
          <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-destructive/30 pl-2 bg-background/60 rounded-r py-1">
            {explanation}
          </p>
        </div>
      </div>

      {/* Metrics grid – always visible */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2">
        <div className="bg-background rounded-xl p-2 text-center">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Crescimento</span>
          <span className="block text-base font-bold text-destructive">+{Math.round(m.changePercent)}%</span>
          {timeWindow && <span className="block text-[10px] text-muted-foreground">em {timeWindow}</span>}
        </div>
        <div className="bg-background rounded-xl p-2 text-center">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Volume</span>
          <span className="block text-base font-bold text-foreground">{trend.volume || "—"}</span>
          <span className="block text-[10px] text-muted-foreground">menções</span>
        </div>
        <div className="bg-background rounded-xl p-2 text-center">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">Plataforma</span>
          <span className="block text-base font-bold text-foreground">{trend.platform}</span>
          <span className="block text-[10px] text-muted-foreground">{localizeCategory(trend.category, t)}</span>
        </div>
        <div className="bg-background rounded-xl p-2 text-center">
          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">País</span>
          <span className="block text-base font-bold text-foreground">
            {trend.countryCode ? `${countryCodeToFlag(trend.countryCode)} ${trend.countryCode}` : "🌐 GL"}
          </span>
          {trend.region && <span className="block text-[10px] text-muted-foreground">{trend.region}</span>}
        </div>
      </div>

      {/* Reason badges */}
      <div className="flex flex-wrap gap-1 px-4 pb-2">
        {m.reasons.map((r) => {
          const icon = reasonIcons[r];
          const label = reasonLabelsByLang[lang]?.[r] || reasonLabelsByLang.pt[r] || r;
          if (!icon) return null;
          return (
            <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">
              {icon} {label}
            </span>
          );
        })}
      </div>

      {/* Expand toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors border-t border-border/50"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Menos detalhes" : "Mais detalhes"}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Peak timeline */}
              {(startTime || peakTime) && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Evolução do pico
                  </h4>
                  <div className="flex items-center gap-2">
                    {startTime && (
                      <div className="text-center">
                        <span className="block text-[10px] text-muted-foreground">Início</span>
                        <span className="block text-xs font-semibold text-foreground">{startTime}</span>
                      </div>
                    )}
                    <div className="flex-1 h-0.5 bg-border rounded-full relative">
                      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-destructive/60 to-destructive rounded-full" />
                    </div>
                    {peakTime && (
                      <div className="text-center">
                        <span className="block text-[10px] text-destructive font-semibold">Pico</span>
                        <span className="block text-xs font-semibold text-foreground">{peakTime}</span>
                      </div>
                    )}
                    <div className="flex-1 h-0.5 bg-border rounded-full relative">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-destructive/40 to-border rounded-full" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-primary font-semibold">Agora</span>
                      <span className="block text-xs font-semibold text-foreground">
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources breakdown */}
              {sources.length > 0 && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> Fontes reportando
                  </h4>
                  <div className="space-y-1.5">
                    {sources.slice(0, 5).map((src, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground flex-shrink-0 w-24 truncate">{src}</span>
                        <Progress value={100 - idx * 18} className="h-1.5 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger */}
              {trigger && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5" /> Possível gatilho
                  </h4>
                  <p className="text-xs text-foreground">{trigger}</p>
                </div>
              )}

              {/* Historical mini-chart placeholder using sparkData */}
              {trend.historicalData && trend.historicalData.length > 0 && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-xs font-semibold text-foreground mb-2">📈 Últimas 24h</h4>
                  <div className="flex items-end gap-px h-10">
                    {trend.historicalData.slice(-24).map((d, idx) => {
                      const max = Math.max(...trend.historicalData!.slice(-24).map(x => x.value));
                      const h = max > 0 ? (d.value / max) * 100 : 10;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-destructive/60 rounded-t-sm min-w-[2px]"
                          style={{ height: `${Math.max(h, 4)}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {hasLink && (
                  <a
                    href={trend.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Ver fonte
                  </a>
                )}
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium hover:bg-secondary transition-colors"
                >
                  <Share2 className="w-3 h-3" /> Compartilhar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium hover:bg-secondary transition-colors"
                >
                  <Bell className="w-3 h-3" /> Alerta
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main section ──────────────────────────────── */

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend, onClose, horizontal }: Props) {
  const { t, lang } = useLanguage();

  if (!moments.length) return null;

  return (
    <div className={horizontal ? "h-full flex flex-col" : "px-4 md:px-6 py-2"}>
      <div className={`bg-destructive/5 border border-destructive/20 ${horizontal ? "h-full flex flex-col rounded-none" : "rounded-2xl"} p-3`}>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-destructive animate-pulse" />
          <h2 className="text-xs font-bold text-foreground flex-1">
            {t("critical")} ({moments.length})
          </h2>
          {onClose && (
            <motion.button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              title={closeLabelByLang[lang] || closeLabelByLang.pt}
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        {/* Cards list */}
        <div className={`space-y-3 overflow-y-auto scrollbar-thin pr-1 ${horizontal ? "flex-1 min-h-0" : "max-h-[60vh] md:max-h-none md:overflow-visible md:pr-0"}`}>
          <AnimatePresence>
            {moments.map((m, i) => (
              <CriticalCard key={`${m.trend.title}-${i}`} m={m} i={i} lang={lang} t={t} onSelectTrend={onSelectTrend} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
