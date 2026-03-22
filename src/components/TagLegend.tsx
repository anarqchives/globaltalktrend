import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TagItem {
  icon: string;
  tag: string;
  desc: Record<string, string>;
  when: Record<string, string>;
  exampleCss: string;
}

interface TagGroup {
  key: string;
  title: Record<string, string>;
  items: TagItem[];
}

const GROUPS: TagGroup[] = [
  {
    key: "status",
    title: { pt: "Status", en: "Status" },
    items: [
      { icon: "🟢", tag: "+novo", desc: { pt: "Surgiu nas últimas horas", en: "Emerged recently" }, when: { pt: "Primeiras 4h", en: "First 4h" }, exampleCss: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success-fg))]" },
      { icon: "📈", tag: "+trending", desc: { pt: "Volume crescendo rápido", en: "Fast-growing volume" }, when: { pt: "Crescimento > 200%", en: "Growth > 200%" }, exampleCss: "bg-[hsl(var(--accent-coral)/0.1)] text-[hsl(var(--accent-coral))]" },
      { icon: "⭐", tag: "+popular", desc: { pt: "Alto engajamento", en: "High engagement" }, when: { pt: "Crescimento > 50%", en: "Growth > 50%" }, exampleCss: "bg-[hsl(var(--source-search)/0.1)] text-[hsl(var(--source-search))]" },
      { icon: "🌐", tag: "Multi", desc: { pt: "Múltiplas plataformas", en: "Multiple platforms" }, when: { pt: "≥ 2 fontes", en: "≥ 2 sources" }, exampleCss: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]" },
    ],
  },
  {
    key: "verification",
    title: { pt: "Verificação", en: "Verification" },
    items: [
      { icon: "✓", tag: "Verificado", desc: { pt: "Fonte jornalística reconhecida", en: "Recognized press" }, when: { pt: "Reuters, BBC, Guardian…", en: "Reuters, BBC, Guardian…" }, exampleCss: "bg-[hsl(var(--source-press)/0.1)] text-[hsl(var(--source-press))]" },
      { icon: "🔬", tag: "Científico", desc: { pt: "Revisado por pares", en: "Peer-reviewed" }, when: { pt: "PubMed, arXiv, OpenAlex", en: "PubMed, arXiv, OpenAlex" }, exampleCss: "bg-[hsl(var(--source-academic)/0.1)] text-[hsl(var(--source-academic))]" },
      { icon: "◆", tag: "Oficial", desc: { pt: "Dado institucional", en: "Institutional data" }, when: { pt: "World Bank, FRED, WHO", en: "World Bank, FRED, WHO" }, exampleCss: "bg-[hsl(var(--source-official)/0.1)] text-[hsl(var(--source-official))]" },
    ],
  },
  {
    key: "categories",
    title: { pt: "Categorias", en: "Categories" },
    items: [
      { icon: "🎭", tag: "Entretenimento", desc: { pt: "Cultura pop, celebridades, mídia", en: "Pop culture, celebrities, media" }, when: { pt: "Auto-classificado", en: "Auto-classified" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "💻", tag: "Tecnologia", desc: { pt: "Software, hardware, IA, startups", en: "Software, hardware, AI, startups" }, when: { pt: "Auto-classificado", en: "Auto-classified" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "🌍", tag: "Geopolítica", desc: { pt: "Política, diplomacia, conflitos", en: "Politics, diplomacy, conflicts" }, when: { pt: "Inclui política e conflitos", en: "Includes politics & conflicts" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "⚽", tag: "Esportes", desc: { pt: "Futebol, olimpíadas, competições", en: "Football, olympics, competitions" }, when: { pt: "Auto-classificado", en: "Auto-classified" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "🔬", tag: "Ciências", desc: { pt: "Pesquisa, descobertas, saúde", en: "Research, discoveries, health" }, when: { pt: "Auto-classificado", en: "Auto-classified" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "🎨", tag: "Cultura", desc: { pt: "Artes, literatura, patrimônio", en: "Arts, literature, heritage" }, when: { pt: "Auto-classificado", en: "Auto-classified" }, exampleCss: "bg-secondary text-foreground" },
      { icon: "📊", tag: "Economia", desc: { pt: "Finanças, negócios, mercados", en: "Finance, business, markets" }, when: { pt: "Inclui negócios e finanças", en: "Includes business & finance" }, exampleCss: "bg-secondary text-foreground" },
    ],
  },
  {
    key: "alerts",
    title: { pt: "Alertas", en: "Alerts" },
    items: [
      { icon: "🔥", tag: "Crítico", desc: { pt: "Propagação geográfica ampla", en: "Wide geographic spread" }, when: { pt: "≥ 5 países + volume alto", en: "≥ 5 countries + high volume" }, exampleCss: "bg-[hsl(var(--color-critical-bg))] text-[hsl(var(--color-critical))]" },
      { icon: "⚡", tag: "Crise", desc: { pt: "Emergência ou tensão ativa", en: "Active emergency or tension" }, when: { pt: "Keywords de crise", en: "Crisis keywords" }, exampleCss: "bg-[hsl(var(--color-critical-bg))] text-[hsl(var(--color-critical))]" },
    ],
  },
];

export default function TagLegend() {
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-7 h-[28px] rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
        title={lang === "pt" ? "Legenda das Tags" : "Tag Legend"}
        aria-label={lang === "pt" ? "Legenda das Tags" : "Tag Legend"}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9998] bg-black/20" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="fixed z-[9999] bg-card border border-border/40 rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden
                  inset-x-3 bottom-3 top-auto max-h-[75vh]
                  sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[380px] sm:max-h-[520px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                  <h3 className="text-[13px] font-bold text-foreground">
                    {lang === "pt" ? "Legenda das Tags" : "Tag Legend"}
                  </h3>
                  <button onClick={() => setOpen(false)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="px-4 pb-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(75vh - 52px)", scrollbarWidth: "thin" }}>
                  {GROUPS.map(group => (
                    <div key={group.key} className="pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60 mb-2">
                        {group.title[lang as keyof typeof group.title] || group.title.en}
                      </div>

                      <div className="space-y-2.5">
                        {group.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 mt-0.5 ${item.exampleCss}`}>
                              <span className="text-[11px]">{item.icon}</span>
                              {item.tag}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] text-foreground leading-snug font-medium">
                                {item.desc[lang as "pt" | "en"] || item.desc.en}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-snug">
                                {item.when[lang as "pt" | "en"] || item.when.en}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
