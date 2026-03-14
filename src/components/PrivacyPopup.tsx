import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";

const STORAGE_KEY = "gtt_privacy_accepted";

const copy: Record<string, { headline: string; items: string[]; button: string; link: string }> = {
  pt: {
    headline: "🔒 Seus dados são seus",
    items: [
      "Mesmo quando logado, o GTT não coleta, armazena ou compartilha nenhuma informação pessoal.",
      "Seus alertas, cards salvos e preferências são armazenados localmente no seu navegador.",
      "Seu histórico, suas configurações, suas escolhas: tudo fica sob seu controle.",
    ],
    button: "Entendido",
    link: "Política de Privacidade",
  },
  en: {
    headline: "🔒 Your data is yours",
    items: [
      "Even when logged in, GTT does not collect, store or share any personal information.",
      "Your alerts, saved cards and preferences are stored locally in your browser.",
      "Your history, your settings, your choices: everything stays under your control.",
    ],
    button: "Got it",
    link: "Privacy Policy",
  },
  es: {
    headline: "🔒 Tus datos son tuyos",
    items: [
      "Incluso cuando inicias sesión, GTT no recopila, almacena ni comparte ninguna información personal.",
      "Tus alertas, tarjetas guardadas y preferencias se almacenan localmente en tu navegador.",
      "Tu historial, tu configuración, tus elecciones: todo permanece bajo tu control.",
    ],
    button: "Entendido",
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-background dark:bg-card rounded-2xl w-full overflow-hidden border border-border/30"
            style={{ maxWidth: '400px', padding: '32px 28px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}
          >
            {/* Headline */}
            <h2 className="text-foreground font-bold tracking-tight text-[18px]">
              {t.headline}
            </h2>

            {/* Privacy items */}
            <div className="space-y-3 mt-5">
              {t.items.map((item, i) => (
                <p key={i} className="text-muted-foreground text-[13px] leading-relaxed">
                  {item}
                </p>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleAccept}
              className="w-full font-semibold hover:brightness-110 transition-all mt-6"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                height: '44px',
                borderRadius: '12px',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.button}
            </button>

            {/* Policy link */}
            <p className="text-center mt-3">
              <a href="/privacidade" className="text-muted-foreground hover:underline text-[11px]">
                {t.link}
              </a>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
