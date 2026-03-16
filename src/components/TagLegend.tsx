import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const sections = [
  {
    titleKey: "statusTags",
    items: [
      { icon: "🟢", label: "+novo", descKey: "newDesc" },
      { icon: "📈", label: "+trending", descKey: "trendingDesc" },
      { icon: "⭐", label: "+popular", descKey: "popularDesc" },
      { icon: "🚀", label: "+boosts", descKey: "boostsDesc" },
      { icon: "📊", label: "+alto impacto", descKey: "highImpactDesc" },
    ],
  },
  {
    titleKey: "verification",
    items: [
      { icon: "✓", label: "Imprensa Verificada", descKey: "verifiedPressDesc" },
      { icon: "🔬", label: "Ciência", descKey: "scienceDesc" },
    ],
  },
  {
    titleKey: "categories",
    items: [
      { icon: "", label: "Geral · Política · Tecnologia · Saúde · Cultura · Esportes · Negócios/Finanças · Conhecimento · Conflitos/Crises · Entretenimento · Declaração", descKey: "categoriesDesc" },
    ],
  },
  {
    titleKey: "alerts",
    items: [
      { icon: "🔥", label: "Crítico", descKey: "criticalDesc" },
      { icon: "⚡", label: "Crise", descKey: "crisisDesc" },
    ],
  },
];

const legendTranslations: Record<string, Record<string, string>> = {
  pt: {
    title: "O que significam as tags",
    statusTags: "STATUS",
    verification: "VERIFICAÇÃO",
    categories: "CATEGORIAS",
    alerts: "ALERTAS",
    newDesc: "Tendência surgida nas últimas horas",
    trendingDesc: "Volume crescendo rapidamente",
    popularDesc: "Alto engajamento acumulado",
    boostsDesc: "Impulsionado por compartilhamentos",
    highImpactDesc: "Alto número de citações ou interações",
    verifiedPressDesc: "Fonte jornalística reconhecida",
    scienceDesc: "Artigo científico revisado por pares",
    categoriesDesc: "",
    criticalDesc: "Evento com propagação geográfica ampla",
    crisisDesc: "Situação de emergência ou tensão ativa",
  },
  en: {
    title: "What do the tags mean",
    statusTags: "STATUS",
    verification: "VERIFICATION",
    categories: "CATEGORIES",
    alerts: "ALERTS",
    newDesc: "Trend emerged in the last few hours",
    trendingDesc: "Volume growing rapidly",
    popularDesc: "High accumulated engagement",
    boostsDesc: "Boosted by shares",
    highImpactDesc: "High number of citations or interactions",
    verifiedPressDesc: "Recognized journalistic source",
    scienceDesc: "Peer-reviewed scientific article",
    categoriesDesc: "",
    criticalDesc: "Event with wide geographic spread",
    crisisDesc: "Emergency or active tension situation",
  },
  es: {
    title: "Qué significan las etiquetas",
    statusTags: "ESTADO",
    verification: "VERIFICACIÓN",
    categories: "CATEGORÍAS",
    alerts: "ALERTAS",
    newDesc: "Tendencia surgida en las últimas horas",
    trendingDesc: "Volumen creciendo rápidamente",
    popularDesc: "Alto engagement acumulado",
    boostsDesc: "Impulsado por comparticiones",
    highImpactDesc: "Alto número de citas o interacciones",
    verifiedPressDesc: "Fuente periodística reconocida",
    scienceDesc: "Artículo científico revisado por pares",
    categoriesDesc: "",
    criticalDesc: "Evento con propagación geográfica amplia",
    crisisDesc: "Situación de emergencia o tensión activa",
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
            className="absolute top-full right-0 mt-1 z-50"
            style={{
              width: 280,
              padding: 16,
              borderRadius: 12,
              background: "hsl(var(--card))",
              border: "1px solid #E5E7EB",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold text-foreground">{tr.title}</span>
              <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-secondary">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {sections.map((section, si) => (
              <div key={si}>
                {/* Section header */}
                <div
                  className="text-muted-foreground/50 font-bold"
                  style={{ fontSize: 10, letterSpacing: "0.5px", marginTop: si > 0 ? 8 : 0, marginBottom: 4 }}
                >
                  {tr[section.titleKey]}
                </div>

                {/* Category section — just list inline */}
                {section.titleKey === "categories" ? (
                  <div className="text-[11px] text-muted-foreground leading-relaxed" style={{ marginBottom: 4 }}>
                    {section.items[0].label}
                  </div>
                ) : (
                  section.items.map((item, ii) => (
                    <motion.div
                      key={ii}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (si * 3 + ii) * 0.03, duration: 0.15 }}
                      className="flex items-center gap-2"
                      style={{ height: 28 }}
                    >
                      <span
                        className="inline-flex items-center gap-1 flex-shrink-0 rounded-full"
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: "0 8px",
                          height: 20,
                          background: "hsl(var(--secondary))",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      >
                        {item.icon && <span>{item.icon}</span>}
                        {item.label}
                      </span>
                      {tr[item.descKey] && (
                        <span className="text-[11px] text-muted-foreground/70">
                          — {tr[item.descKey]}
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
