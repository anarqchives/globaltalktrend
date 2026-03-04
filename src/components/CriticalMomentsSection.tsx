import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Globe, Radio, Shield, X, ExternalLink } from "lucide-react";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";

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

const triggerLabelsByLang: Record<LangCode, Record<string, string>> = {
  pt: { volumeSpike: "Pico de atividade detectado", acceleration: "Crescimento acelerado", multiSource: "Reportado por múltiplas fontes", geographicSpread: "Repercussão internacional", verifiedSource: "Confirmado por fonte verificada" },
  en: { volumeSpike: "Activity spike detected", acceleration: "Accelerated growth", multiSource: "Reported by multiple sources", geographicSpread: "International impact", verifiedSource: "Confirmed by verified source" },
  es: { volumeSpike: "Pico de actividad detectado", acceleration: "Crecimiento acelerado", multiSource: "Reportado por múltiples fuentes", geographicSpread: "Repercusión internacional", verifiedSource: "Confirmado por fuente verificada" },
  fr: { volumeSpike: "Pic d'activité détecté", acceleration: "Croissance accélérée", multiSource: "Signalé par plusieurs sources", geographicSpread: "Impact international", verifiedSource: "Confirmé par source vérifiée" },
  de: { volumeSpike: "Aktivitätspeak erkannt", acceleration: "Beschleunigtes Wachstum", multiSource: "Von mehreren Quellen gemeldet", geographicSpread: "Internationale Auswirkung", verifiedSource: "Von verifizierter Quelle bestätigt" },
  it: { volumeSpike: "Picco di attività rilevato", acceleration: "Crescita accelerata", multiSource: "Segnalato da più fonti", geographicSpread: "Impatto internazionale", verifiedSource: "Confermato da fonte verificata" },
  zh: { volumeSpike: "检测到活动高峰", acceleration: "加速增长", multiSource: "多个来源报道", geographicSpread: "国际影响", verifiedSource: "已验证来源确认" },
  ja: { volumeSpike: "活動のピークを検出", acceleration: "加速的成長", multiSource: "複数ソースで報告", geographicSpread: "国際的影響", verifiedSource: "検証済みソースで確認" },
  ko: { volumeSpike: "활동 급증 감지", acceleration: "가속 성장", multiSource: "다수 소스에서 보도", geographicSpread: "국제적 영향", verifiedSource: "검증된 소스로 확인" },
  ar: { volumeSpike: "تم رصد ذروة نشاط", acceleration: "نمو متسارع", multiSource: "تم الإبلاغ من مصادر متعددة", geographicSpread: "تأثير دولي", verifiedSource: "تأكيد من مصدر موثق" },
  hi: { volumeSpike: "गतिविधि शिखर पाया गया", acceleration: "तेज वृद्धि", multiSource: "कई स्रोतों से रिपोर्ट", geographicSpread: "अंतर्राष्ट्रीय प्रभाव", verifiedSource: "सत्यापित स्रोत से पुष्टि" },
  ru: { volumeSpike: "Обнаружен пик активности", acceleration: "Ускоренный рост", multiSource: "Сообщено несколькими источниками", geographicSpread: "Международное влияние", verifiedSource: "Подтверждено проверенным источником" },
};

const closeLabelByLang: Record<LangCode, string> = {
  pt: "Fechar momentos críticos",
  en: "Close critical moments",
  es: "Cerrar momentos críticos",
  fr: "Fermer les moments critiques",
  de: "Kritische Momente schließen",
  it: "Chiudi momenti critici",
  zh: "关闭关键时刻",
  ja: "クリティカルを閉じる",
  ko: "긴급 항목 닫기",
  ar: "إغلاق اللحظات الحرجة",
  hi: "महत्वपूर्ण क्षण बंद करें",
  ru: "Закрыть критические моменты",
};

const reasonIcons: Record<string, React.ReactNode> = {
  volumeSpike: <TrendingUp className="w-3 h-3" />,
  acceleration: <TrendingUp className="w-3 h-3" />,
  multiSource: <Radio className="w-3 h-3" />,
  geographicSpread: <Globe className="w-3 h-3" />,
  verifiedSource: <Shield className="w-3 h-3" />,
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const normalizeText = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

const localizeCategory = (category: string, t: (key: any) => string) => {
  const normalized = normalizeText(category || "");
  const map: Record<string, string> = {
    politica: "politics", politics: "politics",
    entretenimento: "entertainment", entertainment: "entertainment",
    tecnologia: "technology", technology: "technology",
    esportes: "sports", sports: "sports",
    cultura: "culture", culture: "culture",
    negocios: "business", "negocios/financas": "business", business: "business",
    ciencia: "science", science: "science",
    geral: "general", general: "general",
    social: "socialMedia",
  };
  const key = map[normalized];
  return key ? t(key as any) : category;
};

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend, onClose, horizontal }: Props) {
  const { t, lang } = useLanguage();

  if (!moments.length) return null;

  const handleCardClick = (m: CriticalMoment, e: React.MouseEvent) => {
    const sourceUrl = m.trend.sourceUrl;
    if (sourceUrl) {
      e.stopPropagation();
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    } else {
      onSelectTrend?.(m.trend);
    }
  };

  const getPrimaryTriggerLabel = (reasons: string[]): string | null => {
    const triggers = triggerLabelsByLang[lang] || triggerLabelsByLang.pt;
    if (reasons.length > 0) {
      return triggers[reasons[0]] || null;
    }
    return null;
  };

  return (
    <div className={horizontal ? "h-full flex flex-col" : "px-4 md:px-6 py-2"}>
      <div className={`bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 ${horizontal ? "h-full flex flex-col rounded-none" : "rounded-2xl"} p-3`}>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <h2 className="text-xs font-bold text-foreground flex-1">
            {t("critical")} ({moments.length})
          </h2>
          {onClose && (
            <motion.button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              title={closeLabelByLang[lang] || closeLabelByLang.pt}
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        <div className={`space-y-2 overflow-y-auto scrollbar-thin pr-1 ${horizontal ? "flex-1 min-h-0" : "max-h-[28vh] md:max-h-none md:overflow-visible md:pr-0"}`}>
          <AnimatePresence>
            {moments.map((m, i) => {
              const triggerLabel = getPrimaryTriggerLabel(m.reasons);
              const hasLink = !!m.trend.sourceUrl;
              return (
                <motion.div
                  key={`${m.trend.title}-${i}`}
                  initial={{ opacity: 0, x: horizontal ? 0 : -10, y: horizontal ? -6 : 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={(e) => handleCardClick(m, e)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl bg-background/80 cursor-pointer transition-all border border-transparent
                    hover:bg-background hover:border-red-500/20 hover:shadow-md hover:shadow-red-500/5
                    ${hasLink ? 'group/card' : ''}`}
                  role={hasLink ? "link" : "button"}
                  aria-label={m.trend.title}
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Flame className="w-3.5 h-3.5 text-red-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 line-clamp-2 leading-snug">
                      {m.trend.title}
                    </p>

                    {triggerLabel && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic leading-tight">
                        💡 {triggerLabel}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-red-500 whitespace-nowrap">
                        +{Math.round(m.changePercent)}%
                      </span>
                      {m.trend.countryCode && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {countryCodeToFlag(m.trend.countryCode)} {m.trend.countryCode}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {localizeCategory(m.trend.category, t)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.reasons.map((r) => {
                        const icon = reasonIcons[r];
                        const label = reasonLabelsByLang[lang]?.[r] || reasonLabelsByLang.pt[r] || r;
                        if (!icon) return null;
                        return (
                          <span
                            key={r}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-medium whitespace-nowrap"
                          >
                            {icon} {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{m.trend.platform}</span>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">{m.trend.volume}</div>
                    {hasLink && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
