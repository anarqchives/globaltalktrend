import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const DISMISSED_KEY = "gtt-intro-dismissed";

const IntroductionModal = () => {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
  }, []);

  useEffect(() => {
    if (isLoggedIn === true) return; // Don't show for logged-in users
    if (isLoggedIn === null) return; // Still checking
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  const pt = lang !== "en";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={dismiss}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-[520px] bg-card rounded-3xl border border-border/30 shadow-elevation-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-5 right-5 z-10 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ─── BLOCK A: Platform Introduction ─── */}
            <div className="px-7 pt-8 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/logo-icon.png"
                  alt="GTT"
                  className="h-5 w-auto object-contain dark:invert"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="text-[13px] font-bold tracking-tight text-foreground uppercase">
                  GTT
                </span>
              </div>

              <p className="text-[13px] text-muted-foreground leading-[1.65]">
                {pt
                  ? "Olá. O Global Talk Trend é uma rede interativa e gratuita que agrega +200 fontes (entre imprensa, redes sociais, buscadores, dados oficiais e científicos) disponíveis por classificação de filtros por país, categoria e tipo de mídia. A plataforma detecta anomalias em tempo real, com análise de sentimento e selos de confiabilidade. Atualiza a cada 15 minutos e gera relatórios personalizáveis usando dados reais. Seu apoio é importante para manter a ferramenta online, atualizada e funcional. A plataforma é um projeto individual e compartilhado para oferecer uma visão limpa do que realmente importa. Sem bolhas do algoritmo. Entre em contato à qualquer hora."
                  : "Hello. Global Talk Trend is a free interactive network that aggregates 200+ sources (press, social media, search engines, official and scientific data) with filters by country, category and media type. The platform detects anomalies in real time, with sentiment analysis and trust badges. It updates every 15 minutes and generates customizable reports using real data. Your support helps keep the tool online, updated and functional. This is an individual project shared to offer a clean view of what really matters. No algorithm bubbles. Get in touch anytime."}
              </p>
            </div>

            {/* ─── Divider ─── */}
            <div className="mx-7 h-px bg-border/40" />

            {/* ─── BLOCK B: Privacy & Responsibility ─── */}
            <div className="px-7 pt-5 pb-7">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[13px] font-semibold text-foreground">
                  {pt ? "Seus dados são seus." : "Your data is yours."}
                </h3>
              </div>

              <p className="text-[12px] text-muted-foreground leading-[1.6] mb-4">
                {pt
                  ? "Mesmo quando logado, o GTT não coleta, armazena ou compartilha nenhuma informação pessoal de seus usuários. Seus alertas, cards salvos e preferências são armazenados localmente no seu navegador. Seu histórico, suas configurações, suas escolhas: tudo fica sob seu controle."
                  : "Even when logged in, GTT does not collect, store, or share any personal information from its users. Your alerts, saved cards and preferences are stored locally in your browser. Your history, settings, choices: everything stays under your control."}
              </p>

              {/* Legal disclaimer */}
              <div className="rounded-2xl bg-secondary/50 border border-border/30 p-4 mb-5">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-2">
                  {pt ? "Termo de Responsabilidade" : "Terms of Use"}
                </p>
                <p className="text-[10px] text-muted-foreground/80 leading-[1.7]">
                  {pt
                    ? "Esta plataforma é fornecida exclusivamente para fins informativos e analíticos. Os sinais, tendências e dados exibidos não constituem conselho, recomendação ou orientação de qualquer natureza. O GTT não se responsabiliza por decisões tomadas com base nas informações apresentadas. Sempre verifique com fontes primárias antes de tomar qualquer ação. Ao utilizar a plataforma, você concorda com estes termos."
                    : "This platform is provided for informational and analytical purposes only. The signals, trends and data displayed do not constitute advice, recommendation or guidance of any kind. GTT is not responsible for decisions made based on the information presented. Always verify with primary sources before taking any action. By using the platform, you agree to these terms."}
                </p>
              </div>

              {/* CTA */}
              <motion.button
                onClick={dismiss}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-foreground text-background text-[13px] font-semibold transition-colors hover:bg-foreground/90"
              >
                {pt ? "Entendido" : "Understood"}
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroductionModal;
