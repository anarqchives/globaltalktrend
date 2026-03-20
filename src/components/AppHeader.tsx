import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, LogIn, Loader2, ChevronDown, Globe2, Info, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Data sources registry ─── */
interface SourceDef { name: string; fn: string; category: string; }
const DATA_SOURCES: SourceDef[] = [
  { name: "Google Trends", fn: "fetch-trends", category: "Buscas" },
  { name: "The Guardian / News Extra", fn: "fetch-news-extra", category: "Imprensa" },
  { name: "The News API", fn: "fetch-thenewsapi", category: "Imprensa" },
  { name: "GDELT", fn: "fetch-gdelt-trends", category: "Imprensa" },
  { name: "Fontes Extras (Reuters, BBC…)", fn: "fetch-extra-sources", category: "Imprensa" },
  { name: "Social Trends", fn: "fetch-social-trends", category: "Social" },
  { name: "Wikipedia / Open Data", fn: "fetch-open-data", category: "Enciclopédico" },
  { name: "Crossref", fn: "fetch-crossref", category: "Acadêmico" },
  { name: "Semantic Scholar", fn: "fetch-semantic-scholar", category: "Acadêmico" },
  { name: "OMS (WHO)", fn: "fetch-who-data", category: "Oficial" },
  { name: "FMI (IMF)", fn: "fetch-imf-data", category: "Oficial" },
  { name: "FRED Economics", fn: "fetch-fred", category: "Oficial" },
  { name: "Tech/Science Extra", fn: "fetch-tech-science-extra", category: "Ciência" },
];

const AppHeader = () => {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  /* Source health from localStorage (written by use-trends) */
  const [sourceHealth, setSourceHealth] = useState<Record<string, { ok: boolean; count: number; lastUpdate: string }>>({});
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHealth = () => {
    try {
      const raw = localStorage.getItem("gtt_source_health");
      if (raw) setSourceHealth(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Load health when about modal opens
  useEffect(() => {
    if (aboutOpen) loadHealth();
  }, [aboutOpen]);

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth/callback` });
      if (result?.error) { toast({ title: "Falha no login", variant: "destructive" }); setLoginLoading(null); }
    } catch { toast({ title: "Erro inesperado", variant: "destructive" }); setLoginLoading(null); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const currentLang = languages.find(l => l.code === lang);

  const sourcesWithStatus = useMemo(() => {
    return DATA_SOURCES.map(src => {
      const health = sourceHealth[src.name];
      return {
        ...src,
        online: health ? health.ok : null,
        count: health?.count || 0,
        lastUpdate: health?.lastUpdate || null,
      };
    });
  }, [sourceHealth]);

  const onlineCount = sourcesWithStatus.filter(s => s.online === true).length;
  const offlineCount = sourcesWithStatus.filter(s => s.online === false).length;

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/25" style={{ WebkitBackdropFilter: "blur(16px) saturate(1.5)" }} role="banner">
        <div className="h-11 sm:h-12 flex items-center gap-1 sm:gap-2 px-3 sm:px-6 max-w-[1440px] mx-auto">
          <Link to="/welcome" className="flex items-center gap-1 sm:gap-1.5 shrink-0" aria-label="GTT Monitor">
            <span className="text-[14px] sm:text-[15px] font-bold tracking-tight text-foreground">GTT</span>
            <span className="text-[12px] sm:text-[15px] font-medium tracking-tight text-muted-foreground hidden sm:inline">Monitor</span>
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            {/* Language dropdown */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-0.5 sm:gap-1 h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg text-[10px] sm:text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{currentLang?.label || "PT"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1.5 z-50 min-w-[140px] max-h-[320px] overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-lg backdrop-blur-xl scrollbar-thin"
                  >
                    <div className="p-1">
                      {languages.map(l => (
                        <button
                          key={l.code}
                          onClick={() => { setLang(l.code); setLangOpen(false); window.dispatchEvent(new Event("trend-refresh")); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            lang === l.code ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="font-bold">{l.label}</span>
                          <span className="text-[9px] text-muted-foreground">{l.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dark/Light toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
              aria-label={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <div className="w-px h-4 bg-border/40 mx-0.5 hidden sm:block" />

            {/* Support — VISIBLE ON ALL SIZES */}
            <a href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00" target="_blank" rel="noopener noreferrer"
              className="apoie-pill compact-link touch-manipulation">{t("support")}</a>

            {/* About / Methodology */}
            <button
              onClick={() => setAboutOpen(true)}
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
              aria-label={lang === "pt" ? "Sobre" : "About"}
              title={lang === "pt" ? "Sobre / Metodologia" : "About / Methodology"}
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Avatar / Login */}
            {user ? (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button onClick={() => navigate("/perfil")}
                  className="compact-btn flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:ring-2 hover:ring-ring/20 transition-all touch-manipulation">
                  <Avatar className="w-6 h-6">
                    {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                    <AvatarFallback className="text-[9px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                  </Avatar>
                </button>
                <button onClick={handleLogout}
                  className="hidden sm:flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                  title={lang === "pt" ? "Sair" : "Log out"}>
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)}
                className="compact-btn flex items-center gap-1 h-7 px-2.5 sm:px-3 rounded-full text-[10px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors touch-manipulation">
                <LogIn className="w-3 h-3" />
                <span className="hidden sm:inline">{t("enter")}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* About / Methodology Modal — with fade-in + scale animation */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto p-0 rounded-2xl border-border/50 bg-card" asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto p-6 rounded-2xl border border-border/50 bg-card shadow-xl"
          >
            <DialogHeader>
              <DialogTitle className="text-[16px] font-bold">
                {lang === "pt" ? "Sobre o GTT Monitor" : "About GTT Monitor"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                {lang === "pt" ? "Metodologia, fontes e transparência" : "Methodology, sources & transparency"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-3 text-[12px] text-foreground/90 leading-relaxed">
              <section>
                <h3 className="text-[13px] font-semibold mb-1.5">{lang === "pt" ? "O que é" : "What it is"}</h3>
                <p className="text-muted-foreground">
                  {lang === "pt"
                    ? "O GTT Monitor é uma plataforma de inteligência de tendências que agrega, cruza e classifica dados de 21+ fontes públicas em tempo real, incluindo Google Trends, NewsAPI, GDELT, YouTube, Reddit, além de fontes acadêmicas e institucionais."
                    : "GTT Monitor is a trend intelligence platform that aggregates, cross-references and classifies data from 21+ public sources in real time, including Google Trends, NewsAPI, GDELT, YouTube, Reddit, plus academic and institutional sources."}
                </p>
              </section>
              <section>
                <h3 className="text-[13px] font-semibold mb-1.5">{lang === "pt" ? "Metodologia" : "Methodology"}</h3>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>{lang === "pt" ? "Coleta multi-fonte com fallback em 5 camadas" : "Multi-source collection with 5-layer fallback"}</li>
                  <li>{lang === "pt" ? "Classificação por volume, crescimento e cross-platform" : "Classification by volume, growth and cross-platform presence"}</li>
                  <li>{lang === "pt" ? "Prioridade para imprensa verificada (Reuters, BBC, Guardian)" : "Priority for verified press (Reuters, BBC, Guardian)"}</li>
                  <li>{lang === "pt" ? "Atualização a cada 15 minutos" : "Updates every 15 minutes"}</li>
                  <li>{lang === "pt" ? "Selos de confiabilidade: oficial, verificado, científico, internacional" : "Reliability badges: official, verified, scientific, international"}</li>
                </ul>
              </section>

              {/* ─── Data Sources Status ─── */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-semibold">
                    {lang === "pt" ? "Fontes de Dados" : "Data Sources"}
                  </h3>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="flex items-center gap-1 text-[hsl(var(--success-fg))]">
                      <CheckCircle2 className="w-3 h-3" />{onlineCount}
                    </span>
                    {offlineCount > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="w-3 h-3" />{offlineCount}
                      </span>
                    )}
                    <button onClick={loadHealth} className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                      <RefreshCw className={`w-3 h-3 ${healthLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {sourcesWithStatus.map((src, i) => (
                    <motion.div
                      key={src.name}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        src.online === true ? "bg-[hsl(var(--success-fg))]" :
                        src.online === false ? "bg-destructive" :
                        "bg-muted-foreground/30"
                      }`} />
                      <span className="text-[10px] font-medium text-foreground flex-1 truncate">{src.name}</span>
                      <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">{src.category}</span>
                      {src.count > 0 && (
                        <span className="text-[8px] font-semibold text-muted-foreground tabular-nums">{src.count}</span>
                      )}
                      <span className={`text-[8px] font-bold uppercase ${
                        src.online === true ? "text-[hsl(var(--success-fg))]" :
                        src.online === false ? "text-destructive" :
                        "text-muted-foreground/40"
                      }`}>
                        {src.online === true ? "ON" : src.online === false ? "OFF" : "—"}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1.5 italic">
                  {lang === "pt"
                    ? "Status baseado na última coleta. Fontes client-side (Reddit, Bluesky, Mastodon) não listadas."
                    : "Status based on last fetch. Client-side sources (Reddit, Bluesky, Mastodon) not listed."}
                </p>
              </section>

              <section>
                <h3 className="text-[13px] font-semibold mb-1.5">{lang === "pt" ? "Transparência" : "Transparency"}</h3>
                <p className="text-muted-foreground">
                  {lang === "pt"
                    ? "Cada card exibe a origem dos dados e justificativas qualitativas. Os usuários podem dar feedback (👍 👎 🚩) para calibrar o algoritmo. Nenhum dado pessoal é coletado sem consentimento."
                    : "Each card shows data origin and qualitative justifications. Users can give feedback (👍 👎 🚩) to calibrate the algorithm. No personal data is collected without consent."}
                </p>
              </section>
              <div className="pt-2 border-t border-border/30">
                <Link to="/metodologia" onClick={() => setAboutOpen(false)}
                  className="text-[11px] font-semibold text-primary hover:underline">
                  {lang === "pt" ? "Ver metodologia completa →" : "View full methodology →"}
                </Link>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-[360px] p-6 rounded-2xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-center text-[16px] font-bold">{lang === "pt" ? "Entrar" : "Sign in"}</DialogTitle>
            <DialogDescription className="text-center text-[11px] text-muted-foreground">
              {lang === "pt" ? "Acesse para salvar, alertar e personalizar." : "Sign in to save, alert and personalize."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-3">
            <button onClick={() => handleOAuthLogin("google")} disabled={!!loginLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Google
            </button>
            <button onClick={() => handleOAuthLogin("apple")} disabled={!!loginLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50">
              {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z" /></svg>
              )}
              Apple
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppHeader;
