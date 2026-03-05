import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, TrendingUp, Globe, Radio, Shield, X, ExternalLink,
  Clock, BarChart3, Zap, ChevronDown, ChevronUp, Bell, Share2,
} from "lucide-react";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
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

/* ── CriticalSquare (compact square card) ──────── */

function CriticalSquare({ m, i, lang, t, isExpanded, onToggle, onSelectTrend }: {
  m: CriticalMoment; i: number; lang: LangCode;
  t: (k: any) => string; isExpanded: boolean;
  onToggle: () => void; onSelectTrend?: (trend: any) => void;
}) {
  const trend = m.trend;
  const hasLink = !!trend.sourceUrl;
  const timeWindow = getTimeWindow(trend.firstSeenAt, trend.peakAt);
  const trigger = detectTrigger(trend.title, m.reasons);
  const startTime = formatTime(trend.firstSeenAt);
  const peakTime = formatTime(trend.peakAt);
  const sources = trend.sources || [];

  // Explanation sentence
  const explParts: string[] = [];
  if (m.changePercent > 500) explParts.push(`crescimento explosivo de ${Math.round(m.changePercent)}%`);
  else if (m.changePercent > 200) explParts.push(`alta aceleração de ${Math.round(m.changePercent)}%`);
  else if (m.changePercent > 50) explParts.push(`crescimento de ${Math.round(m.changePercent)}%`);
  if (timeWindow) explParts.push(`em ${timeWindow}`);
  if (m.reasons.includes("multiSource")) explParts.push("múltiplas fontes");
  if (m.reasons.includes("geographicSpread")) explParts.push("repercussão internacional");
  if (explParts.length === 0) explParts.push("atividade anômala detectada");

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trend.sourceUrl) navigator.clipboard.writeText(trend.sourceUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer ${
        isExpanded
          ? "border-destructive shadow-lg shadow-destructive/10 bg-destructive/5"
          : "border-destructive/20 bg-background hover:border-destructive hover:shadow-md hover:shadow-destructive/10 hover:-translate-y-0.5"
      }`}
      onClick={onToggle}
    >
      {/* ─── Minimized view (always visible) ─── */}
      <div className="p-4">
        {/* Header: title + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1">
            {trend.title}
          </h3>
          <span className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 text-sm">
            🔥
          </span>
        </div>

        {/* Growth + time preview */}
        <div className="flex items-baseline justify-between mb-3 py-2 border-y border-dashed border-destructive/20">
          <span className="text-xl font-bold text-destructive">
            +{Math.round(m.changePercent)}%
          </span>
          {timeWindow && (
            <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {timeWindow}
            </span>
          )}
        </div>

        {/* Quick metrics */}
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            📱 {trend.platform}
          </span>
          {trend.countryCode && (
            <span className="inline-flex items-center gap-1">
              {countryCodeToFlag(trend.countryCode)} {trend.countryCode}
            </span>
          )}
        </div>
      </div>

      {/* ─── Expanded view ─── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-destructive/20">
              {/* Explanation */}
              <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-destructive/30 pl-2 mt-3 bg-background/60 rounded-r py-1">
                {explParts.join(" · ")}
              </p>

              {/* Detailed metrics */}
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              {/* Sources breakdown */}
              {sources.length > 0 && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-2 uppercase tracking-wide">
                    <BarChart3 className="w-3 h-3 text-muted-foreground" /> Onde está sendo discutido
                  </h4>
                  <div className="space-y-1.5">
                    {sources.slice(0, 4).map((src, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground flex-shrink-0 w-20 truncate">{src}</span>
                        <Progress value={100 - idx * 20} className="h-1.5 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peak timeline */}
              {(startTime || peakTime) && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <Clock className="w-3 h-3 text-muted-foreground" /> Evolução do pico
                  </h4>
                  <div className="flex items-center gap-2">
                    {startTime && (
                      <div className="text-center">
                        <span className="block text-[9px] text-muted-foreground">Início</span>
                        <span className="block text-[11px] font-semibold text-foreground">{startTime}</span>
                      </div>
                    )}
                    <div className="flex-1 h-0.5 bg-border rounded-full relative">
                      <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-destructive/60 to-destructive rounded-full" />
                    </div>
                    {peakTime && (
                      <div className="text-center">
                        <span className="block text-[9px] text-destructive font-semibold">Pico</span>
                        <span className="block text-[11px] font-semibold text-foreground">{peakTime}</span>
                      </div>
                    )}
                    <div className="flex-1 h-0.5 bg-border rounded-full relative">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-destructive/40 to-border rounded-full" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-primary font-semibold">Agora</span>
                      <span className="block text-[11px] font-semibold text-foreground">
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trigger */}
              {trigger && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                  <strong className="block text-[11px] text-primary flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3" /> Possível gatilho
                  </strong>
                  <p className="text-xs text-foreground">{trigger}</p>
                </div>
              )}

              {/* Reason badges */}
              <div className="flex flex-wrap gap-1">
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

              {/* Sparkline */}
              {trend.historicalData && trend.historicalData.length > 0 && (
                <div className="bg-background rounded-xl p-3">
                  <h4 className="text-[11px] font-semibold text-foreground mb-2">📈 Últimas 24h</h4>
                  <div className="flex items-end gap-px h-8">
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
              <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                {hasLink && (
                  <a
                    href={trend.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!moments.length) return null;

  return (
    <div className={horizontal ? "h-full flex flex-col" : "px-4 md:px-6 py-2"}>
      <div className={`bg-destructive/5 border border-destructive/20 ${horizontal ? "h-full flex flex-col rounded-none" : "rounded-2xl"} p-3`}>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-destructive animate-pulse" />
          <h2 className="text-xs font-bold text-foreground flex-1 uppercase tracking-wider">
            🔥 {t("critical")} ({moments.length})
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

        {/* Square grid */}
        <div className={`overflow-y-auto scrollbar-thin pr-1 ${horizontal ? "flex-1 min-h-0" : "max-h-[60vh] md:max-h-none md:overflow-visible md:pr-0"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" style={{ gridAutoRows: "min-content" }}>
            <AnimatePresence>
              {moments.map((m, i) => (
                <CriticalSquare
                  key={`${m.trend.title}-${i}`}
                  m={m}
                  i={i}
                  lang={lang}
                  t={t}
                  isExpanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  onSelectTrend={onSelectTrend}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
