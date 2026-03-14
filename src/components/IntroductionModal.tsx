import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, TrendingUp, Shield, Compass } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "gtt-intro-dismissed";

const IntroductionModal = () => {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-[460px] bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-lg)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-[hsl(var(--color-positive))] to-primary" />

            <div className="p-6 md:p-8">
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Compass className="w-5 h-5 text-primary" />
              </div>

              <h2 className="text-[20px] md:text-[24px] font-bold text-foreground tracking-tight leading-tight mb-2">
                {lang === "en" ? "Welcome to Global Talk Trend" : "Bem-vindo ao Global Talk Trend"}
              </h2>

              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                {lang === "en"
                  ? "A visual intelligence platform for discovering global trends and cultural signals across multiple sources."
                  : "Uma plataforma de inteligência visual para descobrir tendências globais e sinais culturais em múltiplas fontes."}
              </p>

              {/* Key points */}
              <div className="space-y-3 mb-5">
                {[
                  {
                    icon: Globe,
                    textEn: "Real-time signals from news, social media, and search engines worldwide.",
                    textPt: "Sinais em tempo real de notícias, redes sociais e buscadores de todo o mundo.",
                  },
                  {
                    icon: TrendingUp,
                    textEn: "Insights represent analytical signals — not predictions or recommendations.",
                    textPt: "Os insights representam sinais analíticos — não previsões ou recomendações.",
                  },
                  {
                    icon: Shield,
                    textEn: "Data is aggregated from public sources. No personal data is collected.",
                    textPt: "Os dados são agregados de fontes públicas. Nenhum dado pessoal é coletado.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {lang === "en" ? item.textEn : item.textPt}
                    </p>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="rounded-lg bg-secondary/40 border border-border/40 p-3 mb-5">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {lang === "en"
                    ? "⚠️ This platform is for informational and analytical purposes only. The signals displayed do not constitute advice or recommendations. Always verify information with primary sources."
                    : "⚠️ Esta plataforma é apenas para fins informativos e analíticos. Os sinais exibidos não constituem conselho ou recomendação. Sempre verifique as informações com fontes primárias."}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors"
              >
                {lang === "en" ? "Start Exploring" : "Começar a Explorar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroductionModal;
