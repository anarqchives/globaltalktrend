import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, FileText, MapPin, ChevronRight, ChevronLeft, RotateCcw, Archive, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

interface ArchivedPanel {
  id: "radar" | "timeline" | "map";
  icon: typeof Radar;
  label: Record<string, string>;
  description: Record<string, string>;
  archivedAt: Date;
}

const PANEL_META: Record<string, { icon: typeof Radar; label: Record<string, string>; description: Record<string, string> }> = {
  radar: {
    icon: Radar,
    label: { pt: "Trend Radar", en: "Trend Radar" },
    description: { pt: "Sinais emergentes, críticos e análise semanal", en: "Emerging signals, critical alerts and weekly analysis" },
  },
  timeline: {
    icon: FileText,
    label: { pt: "Timeline", en: "Timeline" },
    description: { pt: "Feed cronológico de tendências em tempo real", en: "Chronological feed of real-time trends" },
  },
  map: {
    icon: MapPin,
    label: { pt: "Mapa Global", en: "Global Map" },
    description: { pt: "Visualização geográfica de tendências por país", en: "Geographic trend visualization by country" },
  },
};

interface ArchiveDrawerProps {
  closedPanels: ("radar" | "timeline" | "map")[];
  onRestore: (panel: "radar" | "timeline" | "map") => void;
}

export default function ArchiveDrawer({ closedPanels, onRestore }: ArchiveDrawerProps) {
  const { lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (closedPanels.length === 0) return null;

  const l = lang === "pt" ? "pt" : "en";

  return (
    <div className="flex-shrink-0 relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* ─── COLLAPSED: Stacked indicator ─── */
          <motion.div
            key="collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 44, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="h-full flex flex-col items-center py-3 bg-muted/15 border-r border-border/20 overflow-hidden"
          >
            {/* Stack indicator button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="relative flex flex-col items-center gap-2 group"
                >
                  {/* Stacked card visual */}
                  <div className="relative w-8 h-10">
                    {closedPanels.map((panel, i) => {
                      const meta = PANEL_META[panel];
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={panel}
                          initial={{ y: 0, scale: 0.9, opacity: 0 }}
                          animate={{
                            y: i * -3,
                            scale: 1 - i * 0.05,
                            opacity: 1,
                          }}
                          transition={{ delay: i * 0.05, duration: 0.2 }}
                          className="absolute inset-0 rounded-md border border-border/40 bg-card shadow-sm flex items-center justify-center"
                          style={{ zIndex: closedPanels.length - i }}
                        >
                          {i === 0 && <Icon className="w-3.5 h-3.5 text-primary/70" />}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Count badge */}
                  <span className="text-[8px] font-bold text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5 tabular-nums">
                    {closedPanels.length}
                  </span>

                  {/* Label */}
                  <span
                    className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70 group-hover:text-primary transition-colors"
                    style={{ writingMode: "vertical-lr" }}
                  >
                    {l === "pt" ? "Arquivados" : "Archived"}
                  </span>

                  {/* Expand arrow */}
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[10px]">
                {l === "pt"
                  ? `${closedPanels.length} painel(is) arquivado(s) — clique para expandir`
                  : `${closedPanels.length} archived panel(s) — click to expand`}
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ) : (
          /* ─── EXPANDED: Archive drawer ─── */
          <motion.div
            key="expanded"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="h-full flex flex-col bg-card/95 backdrop-blur-sm border-r border-border/30 shadow-lg overflow-hidden"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground">
                  {l === "pt" ? "Painéis Arquivados" : "Archived Panels"}
                </span>
                <span className="text-[8px] font-bold text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                  {closedPanels.length}
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Archived items list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <AnimatePresence>
                {closedPanels.map((panel, i) => {
                  const meta = PANEL_META[panel];
                  const Icon = meta.icon;

                  return (
                    <motion.div
                      key={panel}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ delay: i * 0.06, duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="group rounded-lg border border-border/30 bg-background hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div className="p-3 flex items-start gap-3">
                        {/* Icon container */}
                        <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground leading-tight">
                            {meta.label[l] || meta.label.en}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {meta.description[l] || meta.description.en}
                          </p>
                        </div>
                      </div>

                      {/* Restore action */}
                      <div className="px-3 pb-2.5">
                        <button
                          onClick={() => {
                            onRestore(panel);
                            if (closedPanels.length <= 1) setIsExpanded(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {l === "pt" ? "Restaurar painel" : "Restore panel"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            {closedPanels.length > 1 && (
              <div className="px-3 py-2 border-t border-border/15">
                <button
                  onClick={() => {
                    closedPanels.forEach(p => onRestore(p));
                    setIsExpanded(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-[9px] font-medium hover:bg-secondary/80 transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  {l === "pt" ? "Restaurar todos" : "Restore all"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
