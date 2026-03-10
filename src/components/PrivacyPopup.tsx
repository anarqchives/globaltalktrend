import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "gtt_privacy_accepted";

const copy: Record<string, { headline: string; subtext: string; items: string[]; button: string; link: string }> = {
  pt: {
    headline: "Bem-vindo ao GlobalTalk",
    subtext: "Monitoramento global de tendências em tempo real.",
    items: [
      "Sem coleta de dados pessoais",
      "Navegação anônima",
      "Código aberto e transparente",
    ],
    button: "Continuar",
    link: "Política de Privacidade",
  },
  en: {
    headline: "Welcome to GlobalTalk",
    subtext: "Real-time global trend monitoring.",
    items: [
      "No personal data collection",
      "Anonymous browsing",
      "Open source and transparent",
    ],
    button: "Continue",
    link: "Privacy Policy",
  },
  es: {
    headline: "Bienvenido a GlobalTalk",
    subtext: "Monitoreo global de tendencias en tiempo real.",
    items: [
      "Sin recopilación de datos personales",
      "Navegación anónima",
      "Código abierto y transparente",
    ],
    button: "Continuar",
    link: "Política de Privacidad",
  },
};

const dotColors = ["#00C896", "#4285F4", "#F5A623"];

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
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-background dark:bg-[#0F172A] rounded-[20px] w-full overflow-hidden"
            style={{ maxWidth: '380px', padding: '32px 28px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
          >
            {/* Logo mark */}
            <div className="text-2xl font-bold text-foreground select-none" style={{ fontSize: '24px' }}>G</div>

            {/* Headline */}
            <h2 className="text-foreground font-bold tracking-tight" style={{ fontSize: '20px', marginTop: '16px' }}>
              {t.headline}
            </h2>

            {/* Subtext */}
            <p className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px' }}>
              {t.subtext}
            </p>

            {/* Privacy items — simple rows */}
            <div className="space-y-0" style={{ marginTop: '20px' }}>
              {t.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5" style={{ height: '32px' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColors[i] }} />
                  <span className="text-muted-foreground" style={{ fontSize: '13px' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleAccept}
              className="w-full text-white font-semibold hover:brightness-110 transition-all"
              style={{
                background: '#2563EB',
                height: '44px',
                borderRadius: '12px',
                fontSize: '14px',
                marginTop: '24px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.button}
            </button>

            {/* Policy link */}
            <p className="text-center" style={{ marginTop: '12px' }}>
              <a href="/privacidade" className="text-muted-foreground hover:underline" style={{ fontSize: '12px' }}>
                {t.link}
              </a>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
