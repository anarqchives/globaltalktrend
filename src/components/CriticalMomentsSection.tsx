import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Globe, Radio, Shield } from "lucide-react";
import type { CriticalMoment } from "@/hooks/use-critical-moments";

const reasonLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  volumeSpike: { label: "Pico de volume", icon: <TrendingUp className="w-3 h-3" /> },
  acceleration: { label: "Crescimento rápido", icon: <TrendingUp className="w-3 h-3" /> },
  multiSource: { label: "Múltiplas fontes", icon: <Radio className="w-3 h-3" /> },
  geographicSpread: { label: "Vários países", icon: <Globe className="w-3 h-3" /> },
  verifiedSource: { label: "Fonte verificada", icon: <Shield className="w-3 h-3" /> },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
}

export default function CriticalMomentsSection({ moments, onSelectTrend }: Props) {
  if (!moments.length) return null;

  return (
    <div className="px-4 md:px-6 py-3">
      <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-foreground">
            MOMENTOS CRÍTICOS ({moments.length})
          </h2>
        </div>

        <div className="space-y-2 max-h-[34vh] overflow-y-auto pr-1 scrollbar-thin md:max-h-none md:overflow-visible md:pr-0">
          <AnimatePresence>
            {moments.map((m, i) => (
              <motion.div
                key={`${m.trend.title}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectTrend?.(m.trend)}
                className="flex items-start gap-3 p-3 rounded-xl bg-background/80 hover:bg-background cursor-pointer transition-colors border border-transparent hover:border-red-500/20"
              >
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-4 h-4 text-red-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    {m.trend.title}
                  </p>

                  {/* Detailed "WHY" explanation */}
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">
                      🔴 POR QUE É CRÍTICO:
                    </p>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5">
                      {m.reasons.includes("volumeSpike") && (
                        <li>• Aumento de <span className="font-bold text-red-500">+{Math.round(m.changePercent)}%</span> na última hora</li>
                      )}
                      {m.reasons.includes("acceleration") && (
                        <li>• Crescimento acelerado ({Math.round(m.changePercent)}% de variação)</li>
                      )}
                      {m.reasons.includes("multiSource") && (
                        <li>• Aparecendo em <span className="font-bold">múltiplas plataformas</span> simultaneamente</li>
                      )}
                      {m.reasons.includes("geographicSpread") && (
                        <li>• Detectado em <span className="font-bold">vários países</span> diferentes</li>
                      )}
                      {m.reasons.includes("verifiedSource") && (
                        <li>• Reportado por <span className="font-bold">fonte verificada/oficial</span></li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-bold text-red-500">
                      +{Math.round(m.changePercent)}%
                    </span>
                    {m.trend.countryCode && (
                      <span className="text-xs text-muted-foreground">
                        {countryCodeToFlag(m.trend.countryCode)} {m.trend.countryCode}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {m.trend.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.reasons.map((r) => {
                      const info = reasonLabels[r];
                      if (!info) return null;
                      return (
                        <span
                          key={r}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-medium"
                        >
                          {info.icon} {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="text-[10px] text-muted-foreground">{m.trend.platform}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{m.trend.volume}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
