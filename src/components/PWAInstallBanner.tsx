import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallBanner = () => {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-lg max-w-sm w-[calc(100%-2rem)] md:bottom-6 mb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)] md:mb-0"
        >
          <Download className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {lang === "pt" ? "Instalar o GTT Monitor" : "Install GTT Monitor"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {lang === "pt" ? "Acesse mais rápido direto da tela inicial" : "Quick access from your home screen"}
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
            aria-label={lang === "pt" ? "Instalar aplicativo" : "Install app"}
          >
            {lang === "pt" ? "Instalar" : "Install"}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label={lang === "pt" ? "Fechar" : "Close"}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
