import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Bookmark, Bell, Share2, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import AbbrTooltip from "./AbbrTooltip";
import SparklineArea from "./SparklineArea";
import { countryCodeToFlag } from "@/lib/shared-utils";

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

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend }: Props) {
  const { lang } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!moments.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {lang === "pt"
            ? "Nenhum momento crítico detectado agora."
            : "No critical moments detected right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
          {lang === "pt" ? "CRÍTICO" : "CRITICAL"} · {moments.length}
        </span>
      </div>

      {/* Compact card list */}
      <div className="space-y-1.5">
        {moments.slice(0, 12).map((m, i) => {
          const trend = m.trend;
          const pColor = platformColors[trend.platform] || "#666";
          const flag = countryCodeToFlag(trend.countryCode);
          const changeNum = Math.round(m.changePercent);
          const isExpanded = expandedIdx === i;

          const tviScore = Math.min(Math.round(Math.abs(changeNum) * 0.2 + m.platformCount * 10 + m.countryCount * 5 + m.mediaTypes.length * 8), 100);
          const tviColor = tviScore >= 91 ? "#FF2D2D" : tviScore >= 61 ? "#FA8C16" : tviScore >= 31 ? "#F5A623" : "#9CA3AF";

          const sparkValues = trend.sparkData && trend.sparkData.length > 2
            ? trend.sparkData
            : null;

          return (
            <motion.div
              key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className="rounded-xl border border-destructive/15 hover:border-destructive/30 transition-all duration-150 cursor-pointer bg-card overflow-hidden"
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
            >
              {/* Accent bar */}
              <div className="w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${tviColor}, transparent)` }} />

              <div className="px-3 py-2">
                {/* Row 1: Platform + Flag + Title + TVI + Change */}
                <div className="flex items-start gap-2 min-w-0">
                  {/* Platform dot */}
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: pColor }} />

                  {/* Title area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium" style={{ color: pColor }}>{trend.platform}</span>
                      {flag && <span className="text-[10px]">{flag}</span>}
                      <span className="text-[9px] text-muted-foreground">{trend.time || (lang === "pt" ? "agora" : "now")}</span>
                    </div>
                    <h3 className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">{trend.title}</h3>
                  </div>

                  {/* Right side: TVI + Change */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[14px] font-black leading-none" style={{ color: tviColor }}>{tviScore}</div>
                      <div className="text-[8px] text-muted-foreground mt-0.5">TVI</div>
                    </div>
                    {changeNum > 0 && (
                      <span className="text-[11px] font-bold text-destructive">+{changeNum}%</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Inline metadata + sparkline */}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-1 min-w-0">
                    <span className="inline-flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: pColor }} />
                      {m.platformCount} {lang === "pt" ? "plat." : "plat."}
                    </span>
                    <span>·</span>
                    <span>{flag} {m.countryCount} {lang === "pt" ? "país" : "countr"}{m.countryCount > 1 ? (lang === "pt" ? "es" : "ies") : (lang === "pt" ? "" : "y")}</span>
                    <span>·</span>
                    <span>{trend.category || (lang === "pt" ? "Geral" : "General")}</span>
                  </div>
                  {sparkValues && (
                    <div className="flex-shrink-0" style={{ width: 64, height: 24 }}>
                      <SparklineArea data={sparkValues} color={tviColor} width={64} height={24} />
                    </div>
                  )}
                  <ChevronDown className={`w-3 h-3 text-muted-foreground/40 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
                      {/* Context */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {lang === "pt"
                          ? `${trend.title.split(" ").slice(0, 4).join(" ")} está sendo discutido em ${m.platformCount} plataforma${m.platformCount > 1 ? "s" : ""} simultaneamente, com crescimento de ${Math.abs(changeNum)}% nas últimas horas.`
                          : `${trend.title.split(" ").slice(0, 4).join(" ")} is being discussed on ${m.platformCount} platform${m.platformCount > 1 ? "s" : ""} simultaneously, with ${Math.abs(changeNum)}% growth.`}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                        {trend.sourceUrl && (
                          <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            {lang === "pt" ? "Ver fonte" : "View source"}
                          </a>
                        )}
                        <button onClick={() => {
                          const url = trend.sourceUrl || window.location.href;
                          if (navigator.share) navigator.share({ title: trend.title, url }).catch(() => {});
                          else { navigator.clipboard.writeText(`${trend.title} — ${url}`); toast({ title: "🔗 Link copiado!" }); }
                        }} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                          <Share2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
