import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const GROUPS = [
  {
    key: "status",
    title: { pt: "Status", en: "Status", es: "Estado" },
    items: [
      { icon: "🟢", tag: "+novo", desc: { pt: "Surgida nas últimas horas", en: "Emerged in last hours" }, when: { pt: "Primeiras 4h de vida", en: "First 4h of life" } },
      { icon: "📈", tag: "+trending", desc: { pt: "Volume crescendo rápido", en: "Volume growing fast" }, when: { pt: "Crescimento > 200%", en: "Growth > 200%" } },
      { icon: "⭐", tag: "+popular", desc: { pt: "Alto engajamento", en: "High engagement" }, when: { pt: "Crescimento > 50%", en: "Growth > 50%" } },
      { icon: "🌐", tag: "Multi", desc: { pt: "Confirmada em múltiplas plataformas", en: "Confirmed across platforms" }, when: { pt: "≥ 2 fontes independentes", en: "≥ 2 independent sources" } },
    ],
  },
  {
    key: "verification",
    title: { pt: "Verificação", en: "Verification", es: "Verificación" },
    items: [
      { icon: "✓", tag: "Verificado", desc: { pt: "Fonte jornalística reconhecida", en: "Recognized press outlet" }, when: { pt: "Reuters, BBC, Guardian, etc.", en: "Reuters, BBC, Guardian, etc." } },
      { icon: "🔬", tag: "Científico", desc: { pt: "Revisado por pares", en: "Peer-reviewed" }, when: { pt: "PubMed, arXiv, OpenAlex", en: "PubMed, arXiv, OpenAlex" } },
      { icon: "◆", tag: "Oficial", desc: { pt: "Dado institucional", en: "Institutional data" }, when: { pt: "World Bank, FRED, WHO", en: "World Bank, FRED, WHO" } },
    ],
  },
  {
    key: "categories",
    title: { pt: "Categorias", en: "Categories", es: "Categorías" },
    items: [
      { icon: "", tag: "", desc: { pt: "Entretenimento · Tecnologia · Geopolítica · Esportes · Ciências · Cultura · Economia", en: "Entertainment · Technology · Geopolitics · Sports · Sciences · Culture · Economy" }, when: { pt: "Classificação automática por conteúdo", en: "Auto-classified by content" } },
    ],
  },
  {
    key: "alerts",
    title: { pt: "Alertas", en: "Alerts", es: "Alertas" },
    items: [
      { icon: "🔥", tag: "Crítico", desc: { pt: "Propagação geográfica ampla", en: "Wide geographic spread" }, when: { pt: "≥ 5 países, volume alto", en: "≥ 5 countries, high volume" } },
      { icon: "⚡", tag: "Crise", desc: { pt: "Emergência ou tensão ativa", en: "Emergency or active tension" }, when: { pt: "Keywords de crise detectados", en: "Crisis keywords detected" } },
    ],
  },
];

export default function TagLegend() {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[9px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-secondary"
        title={lang === "pt" ? "Tags" : "Tags"}>
        <HelpCircle className="w-3 h-3" />
        <span className="hidden sm:inline">Tags</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute top-full right-0 mt-1 z-50 w-[320px] bg-card border border-border/40 rounded-xl shadow-lg overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h3 className="text-[13px] font-bold text-foreground">
                  {lang === "pt" ? "Legenda das Tags" : "Tag Legend"}
                </h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-secondary transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="px-4 pb-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                {GROUPS.map(group => (
                  <div key={group.key}>
                    <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/50 mb-1.5">
                      {group.title[lang as keyof typeof group.title] || group.title.en}
                    </div>

                    {group.key === "categories" ? (
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {group.items[0].desc[lang as "pt" | "en"] || group.items[0].desc.en}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {group.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-secondary text-foreground shrink-0 mt-0.5">
                              {item.icon && <span>{item.icon}</span>}
                              {item.tag}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] text-foreground leading-snug">
                                {item.desc[lang as "pt" | "en"] || item.desc.en}
                              </p>
                              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                {item.when[lang as "pt" | "en"] || item.when.en}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
