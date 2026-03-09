import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "gtt_privacy_accepted";

const copy: Record<string, { title: string; subtitle: string; body: string; items: { icon: string; text: string }[]; detail: string; button: string; link: string }> = {
  pt: {
    title: "Sua privacidade importa",
    subtitle: "Transparência desde o primeiro acesso",
    body: "O Global Talk Trend foi projetado para proteger sua privacidade. Não coletamos, armazenamos ou compartilhamos dados pessoais.",
    items: [
      { icon: "🛡️", text: "Nenhum dado de navegação é retido" },
      { icon: "🔒", text: "Nenhuma informação pessoal é armazenada" },
      { icon: "👁️", text: "Navegação 100% anônima" },
    ],
    detail: "Consulte nossa",
    button: "Continuar para o Global Talk Trend",
    link: "Política de Privacidade",
  },
  en: {
    title: "Your privacy matters",
    subtitle: "Transparency from the first visit",
    body: "Global Talk Trend is designed to protect your privacy. We do not collect, store, or share personal data.",
    items: [
      { icon: "🛡️", text: "No browsing data is retained" },
      { icon: "🔒", text: "No personal information is stored" },
      { icon: "👁️", text: "100% anonymous browsing" },
    ],
    detail: "See our",
    button: "Continue to Global Talk Trend",
    link: "Privacy Policy",
  },
  es: {
    title: "Tu privacidad importa",
    subtitle: "Transparencia desde el primer acceso",
    body: "Global Talk Trend fue diseñado para proteger tu privacidad. No recopilamos, almacenamos ni compartimos datos personales.",
    items: [
      { icon: "🛡️", text: "No se retienen datos de navegación" },
      { icon: "🔒", text: "No se almacena información personal" },
      { icon: "👁️", text: "Navegación 100% anónima" },
    ],
    detail: "Consulta nuestra",
    button: "Continuar a Global Talk Trend",
    link: "Política de Privacidad",
  },
};

export default function PrivacyPopup() {
  const [visible, setVisible] = useState(false);
  const { lang } = useLanguage();
  const t = copy[lang] || copy[lang.substring(0, 2) as keyof typeof copy] || copy.en;

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const id = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(id);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border border-border/40 rounded-2xl shadow-2xl max-w-[460px] w-full overflow-hidden"
          >
            {/* Gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="p-8">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-5">
                <Shield className="w-6 h-6 text-primary" />
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-foreground text-center mb-1 tracking-tight">
                {t.title}
              </h2>
              <p className="text-xs text-muted-foreground text-center mb-6">
                {t.subtitle}
              </p>

              {/* Body */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 text-center">
                {t.body}
              </p>

              {/* Items */}
              <div className="space-y-3 mb-6">
                {t.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30"
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="text-sm text-foreground/80 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Policy link */}
              <p className="text-xs text-muted-foreground text-center mb-5">
                {t.detail}{" "}
                <a href="/privacidade" className="text-primary hover:underline font-medium">
                  {t.link}
                </a>
              </p>

              {/* Accept button */}
              <Button
                onClick={handleAccept}
                className="w-full h-11 text-sm font-semibold rounded-xl"
              >
                {t.button}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
