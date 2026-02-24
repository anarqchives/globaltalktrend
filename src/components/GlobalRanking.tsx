import { useState, useMemo, useEffect } from "react";
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
  "Hacker News": { emoji: "🔶", color: "hsl(25, 100%, 50%)" },
  Wikipedia: { emoji: "📖", color: "hsl(0, 0%, 40%)" },
  "Stack Overflow": { emoji: "💻", color: "hsl(25, 90%, 50%)" },
  GitHub: { emoji: "🐙", color: "hsl(0, 0%, 20%)" },
  "X (Twitter)": { emoji: "𝕏", color: "hsl(0, 0%, 15%)" },
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
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? true);
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
      <div className="absolute top-1/2 -translate-y-1/2 right-5 z-10 w-[260px] max-w-[calc(100%-80px)]">
        <div className="bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] overflow-hidden outline-none ring-0">
          {/* Header */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-200 outline-none ring-0 focus:outline-none focus:ring-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Trophy className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-foreground tracking-tight">Top Trends</span>
              <span className="text-[9px] text-muted-foreground/70 font-medium">15min</span>
            </div>
            <div className="w-5 h-5 rounded-lg flex items-center justify-center hover:bg-white/20 dark:hover:bg-white/10 transition-colors">
              {collapsed ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronUp className="w-3 h-3 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="px-1.5 pb-1.5 max-h-[320px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {top.map((trend, i) => (
                    <RankItem key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`} trend={trend} index={i} compact />
                  ))}
                </div>
                {ranked.length > 10 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full py-2 text-[10px] font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 transition-all duration-200 border-t border-border/20"
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
        <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col bg-card/80 backdrop-blur-2xl border-border/20 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.5)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              Ranking Global de Trends
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground/70 -mt-2 font-medium">Atualizado a cada 15 min · {ranked.length} trends ordenadas por volume</p>
          <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-2 px-2 mt-2">
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
