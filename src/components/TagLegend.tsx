import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const legendItems = [
  { icon: "TVI 50", description: "tviDesc", color: "bg-primary/10 text-primary border-primary/30" },
  { icon: "🇧🇷 BR", description: "countryDesc", color: "bg-secondary text-muted-foreground" },
  { icon: "📰", description: "sourceDesc", color: "bg-secondary text-muted-foreground" },
  { icon: "✅", description: "verifiedDesc", color: "bg-green-100/80 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
  { icon: "📌", description: "reliableDesc", color: "bg-amber-100/80 text-amber-700 dark:bg-amber-500/15 dark:text-amber-500" },
  { icon: "⚠️", description: "checkDesc", color: "bg-red-100/80 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  { icon: "🌐", description: "translatedDesc", color: "bg-blue-100/80 text-blue-600" },
];

const legendTranslations: Record<string, Record<string, string>> = {
  pt: {
    title: "O que significam as tags",
    tviDesc: "Velocidade de propagação da trend (0-100)",
    countryDesc: "País de origem da trend",
    sourceDesc: "Fonte original da informação",
    verifiedDesc: "Alta confiabilidade – fonte verificada",
    reliableDesc: "Média confiabilidade – fonte confiável",
    checkDesc: "Baixa confiabilidade – verificar",
    translatedDesc: "Conteúdo traduzido automaticamente",
  },
  en: {
    title: "What do the tags mean",
    tviDesc: "Trend propagation velocity (0-100)",
    countryDesc: "Trend's country of origin",
    sourceDesc: "Original information source",
    verifiedDesc: "High reliability – verified source",
    reliableDesc: "Medium reliability – reliable source",
    checkDesc: "Low reliability – needs verification",
    translatedDesc: "Automatically translated content",
  },
  es: {
    title: "Qué significan las etiquetas",
    tviDesc: "Velocidad de propagación (0-100)",
    countryDesc: "País de origen",
    sourceDesc: "Fuente original",
    verifiedDesc: "Alta fiabilidad – fuente verificada",
    reliableDesc: "Media fiabilidad – fuente confiable",
    checkDesc: "Baja fiabilidad – verificar",
    translatedDesc: "Contenido traducido automáticamente",
  },
};

export default function TagLegend() {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const tr = legendTranslations[lang] || legendTranslations.en;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[9px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-secondary"
        title={tr.title}
      >
        <HelpCircle className="w-3 h-3" />
        <span className="hidden sm:inline">{tr.title}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full left-0 mt-1 z-50 w-72 p-3 rounded-xl bg-popover border border-border shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-foreground">{tr.title}</span>
              <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-secondary">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2">
              {legendItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${item.color} flex-shrink-0`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{tr[item.description]}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
