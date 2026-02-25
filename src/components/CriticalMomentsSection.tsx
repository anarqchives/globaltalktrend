import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Globe, Radio, Shield, X } from "lucide-react";
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
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend, onClose, horizontal }: Props) {
  if (!moments.length) return null;

  return (
    <div className={horizontal ? "h-full flex flex-col" : "px-4 md:px-6 py-2"}>
      <div className={`bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 ${horizontal ? "h-full flex flex-col rounded-none" : "rounded-2xl"} p-3`}>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <h2 className="text-xs font-bold text-foreground flex-1">
            CRÍTICOS ({moments.length})
          </h2>
          {onClose && (
            <motion.button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              title="Fechar momentos críticos"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>

        <div className={`space-y-1.5 overflow-y-auto scrollbar-thin pr-1 ${horizontal ? "flex-1 min-h-0" : "max-h-[28vh] md:max-h-none md:overflow-visible md:pr-0"}`}>
          <AnimatePresence>
            {moments.map((m, i) => (
              <motion.div
                key={`${m.trend.title}-${i}`}
                initial={{ opacity: 0, x: horizontal ? 0 : -10, y: horizontal ? -6 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelectTrend?.(m.trend)}
                className="flex items-start gap-2 p-2 rounded-lg bg-background/80 hover:bg-background cursor-pointer transition-colors border border-transparent hover:border-red-500/20"
              >
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Flame className="w-3 h-3 text-red-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                    {m.trend.title}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-red-500">
                      +{Math.round(m.changePercent)}%
                    </span>
                    {m.trend.countryCode && (
                      <span className="text-[10px] text-muted-foreground">
                        {countryCodeToFlag(m.trend.countryCode)} {m.trend.countryCode}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground">
                      {m.trend.category}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {m.reasons.map((r) => {
                      const info = reasonLabels[r];
                      if (!info) return null;
                      return (
                        <span
                          key={r}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[8px] font-medium"
                        >
                          {info.icon} {info.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className="text-[9px] text-muted-foreground">{m.trend.platform}</span>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{m.trend.volume}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
