import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "gtt_privacy_accepted";

const copy: Record<string, { title: string; body: string; items: string[]; detail: string; button: string; link: string }> = {
  pt: {
    title: "Privacidade e Transparência",
    body: "No Global Talk Trend, sua privacidade está em primeiro lugar. Nós NÃO coletamos, armazenamos ou compartilhamos nenhum dado pessoal seu.",
    items: [
      "Nenhum dado de navegação é retido",
      "Nenhuma informação pessoal é armazenada",
      "Você navega de forma 100% anônima",
    ],
    detail: "Para mais detalhes, consulte nossa",
    button: "Entendi",
    link: "Política de Privacidade",
  },
  en: {
    title: "Privacy & Transparency",
    body: "At Global Talk Trend, your privacy comes first. We do NOT collect, store, or share any of your personal data.",
    items: [
      "No browsing data is retained",
      "No personal information is stored",
      "You browse 100% anonymously",
    ],
    detail: "For more details, see our",
    button: "Got it",
    link: "Privacy Policy",
  },
};

export default function PrivacyPopup() {
  const [visible, setVisible] = useState(false);
  const { lang } = useLanguage();
  const t = copy[lang] || copy.en;

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the main UI renders first
      const id = setTimeout(() => setVisible(true), 800);
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card border border-border/50 rounded-3xl shadow-2xl max-w-[420px] w-full p-8 text-center"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-primary" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-foreground mb-4 tracking-tight">{t.title}</h2>

            {/* Body */}
            <div className="text-left space-y-4 mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{t.body}</p>

              <ul className="space-y-2.5">
                {t.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted-foreground">
                {t.detail}{" "}
                <a
                  href="/privacidade"
                  className="text-primary hover:underline font-medium"
                >
                  {t.link}
                </a>
                .
              </p>
            </div>

            {/* Accept */}
            <Button onClick={handleAccept} className="w-full h-12 text-base font-semibold rounded-2xl">
              {t.button}
            </Button>

            {/* Secondary link */}
            <a
              href="/privacidade"
              className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {t.link}
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
