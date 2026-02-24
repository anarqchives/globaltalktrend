import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Trophy, ExternalLink } from "lucide-react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { countryCodeToFlag, formatVolume } from "@/lib/categorize-trend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "hsl(0, 72%, 51%)" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "hsl(210, 100%, 40%)" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
  Bluesky: { emoji: "🦋", color: "hsl(200, 100%, 50%)" },
  Mastodon: { emoji: "🐘", color: "hsl(270, 60%, 55%)" },
  "The Guardian": { emoji: "📰", color: "hsl(210, 70%, 35%)" },
  "World Bank": { emoji: "🏛", color: "hsl(200, 80%, 45%)" },
  IBGE: { emoji: "🏛", color: "hsl(130, 60%, 35%)" },
  OpenAlex: { emoji: "🔬", color: "hsl(270, 60%, 50%)" },
  GNews: { emoji: "📰", color: "hsl(160, 60%, 45%)" },
  NewsData: { emoji: "📰", color: "hsl(35, 90%, 50%)" },
  "Bing News": { emoji: "📰", color: "hsl(190, 80%, 40%)" },
};

const countryNames: Record<string, string> = {
  BR: "Brasil", US: "EUA", GB: "Reino Unido", DE: "Alemanha", FR: "França",
  ES: "Espanha", IT: "Itália", JP: "Japão", KR: "Coreia do Sul", CN: "China",
  IN: "Índia", RU: "Rússia", MX: "México", AR: "Argentina", CO: "Colômbia",
  TR: "Turquia", SA: "Arábia Saudita", AE: "Emirados", EG: "Egito",
  AU: "Austrália", CA: "Canadá", PT: "Portugal", NL: "Holanda", SE: "Suécia",
  NO: "Noruega", PL: "Polônia", UA: "Ucrânia", ZA: "África do Sul",
  NG: "Nigéria", KE: "Quênia", IL: "Israel", TH: "Tailândia", ID: "Indonésia",
  PH: "Filipinas", VN: "Vietnã", PK: "Paquistão", BD: "Bangladesh",
  CL: "Chile", PE: "Peru", VE: "Venezuela", NZ: "Nova Zelândia",
  MA: "Marrocos", ET: "Etiópia", TW: "Taiwan",
};

interface GlobalRankingProps {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onFilterCountry?: (code: string) => void;
  collapsed?: boolean;
}

const GlobalRanking = ({ trends, onSelectTrend, onFilterCountry, collapsed: initialCollapsed }: GlobalRankingProps) => {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? false);
  const [modalOpen, setModalOpen] = useState(false);

  const ranked = useMemo(() => {
    return [...trends]
      .sort((a, b) => {
        const volA = parseInt(String(a.volume).replace(/[^0-9]/g, "")) || 0;
        const volB = parseInt(String(b.volume).replace(/[^0-9]/g, "")) || 0;
        return volB - volA;
      })
      .slice(0, 50);
  }, [trends]);

  const top = ranked.slice(0, 10);

  const RankItem = ({ trend, index, compact }: { trend: TrendCardProps; index: number; compact?: boolean }) => {
    const pf = platformIcons[trend.platform] || { emoji: "●", color: "hsl(var(--muted-foreground))" };
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
    const flag = countryCodeToFlag(trend.countryCode);
    const countryName = trend.countryCode ? countryNames[trend.countryCode.slice(0, 2).toUpperCase()] || trend.countryCode : "";
    const displayTitle = trend.title.length > 50 ? trend.title.slice(0, 47) + "…" : trend.title;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-secondary/60 hover:scale-[1.02] cursor-pointer transition-all group"
              onClick={() => onSelectTrend?.(trend)}
            >
              <span className="text-[10px] font-bold text-muted-foreground w-4 text-right tabular-nums flex-shrink-0">
                {medal || `${index + 1}`}
              </span>
              <span className="flex-shrink-0 text-xs" style={{ color: pf.color }}>{pf.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-foreground truncate ${compact ? "text-[10px]" : "text-xs"}`}>
                  {trend.sourceUrl ? (
                    <a
                      href={trend.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {displayTitle}
                    </a>
                  ) : displayTitle}
                </p>
              </div>
              {flag && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cc = trend.countryCode?.slice(0, 2).toUpperCase();
                    if (cc && onFilterCountry) onFilterCountry(cc);
                  }}
                  className="flex-shrink-0 text-[10px] hover:scale-125 transition-transform"
                  title={countryName}
                >
                  {flag}
                </button>
              )}
              <span className="text-[9px] font-semibold text-muted-foreground tabular-nums flex-shrink-0 max-w-[60px] truncate">
                {formatVolume(trend.volume)}
              </span>
              {trend.sourceUrl && (
                <a
                  href={trend.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground hover:text-primary" />
                </a>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[250px]">
            <p className="text-xs font-medium">{trend.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {trend.platform} · {trend.volume}
              {countryName && ` · ${flag} ${countryName}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (top.length === 0) return null;

  return (
    <>
      <div className="absolute top-3 right-3 z-10 w-72 max-w-[calc(100%-80px)]">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/40 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-foreground">🔥 Top Trends</span>
              <span className="text-[9px] text-muted-foreground">· 15min</span>
            </div>
            {collapsed ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronUp className="w-3 h-3 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-1 pb-1">
                  {top.map((trend, i) => (
                    <RankItem key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`} trend={trend} index={i} compact />
                  ))}
                </div>
                {ranked.length > 10 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-border"
                  >
                    Ver ranking completo ({ranked.length})
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full ranking modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-amber-500" />
              🔥 Ranking Global de Trends
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground -mt-2">Atualizado a cada 15 min · {ranked.length} trends ordenadas por volume</p>
          <div className="flex-1 overflow-y-auto scrollbar-thin -mx-2 px-2 mt-2">
            {ranked.map((trend, i) => (
              <RankItem key={`modal-${trend.platform}-${trend.title.slice(0, 20)}-${i}`} trend={trend} index={i} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalRanking;
