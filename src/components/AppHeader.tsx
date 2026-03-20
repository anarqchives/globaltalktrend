import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, LogOut, LogIn, Info, ChevronDown, User, FileText,
  Loader2, Menu, X, BarChart3, BookOpen, RefreshCw, Heart
} from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  minimal?: boolean;
}

const AppHeader = ({ minimal = false }: AppHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const redirectUri = `${window.location.origin}/auth/callback`;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
      if (result?.error) {
        toast({ title: "Falha no login", description: "Não foi possível concluir o login.", variant: "destructive" });
        setLoginLoading(null);
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Houve um problema ao iniciar o login.", variant: "destructive" });
      setLoginLoading(null);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-50 h-14 flex items-center px-4 md:px-6 lg:px-8 bg-[#F4F4F0]/90 dark:bg-[hsl(215,28%,7%)]/90 backdrop-blur-md border-b border-border/20"
        role="banner"
      >
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">

          {/* ─── LEFT: Logo ─── */}
          <Link to="/welcome" className="flex items-center gap-2 min-w-0 shrink-0" aria-label="GTT Monitor - Home">
            <img 
              src="/logo-icon.png" 
              alt="GTT Logo" 
              className="h-5 w-auto object-contain dark:invert" 
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                const nextEl = e.currentTarget.nextElementSibling;
                if(nextEl) nextEl.classList.remove('hidden'); 
              }} 
            />
            <span className="hidden text-[14px] font-semibold tracking-tight whitespace-nowrap select-none text-foreground">
              <span className="hidden sm:inline">GTT Monitor</span>
              <span className="sm:hidden">GTT</span>
            </span>
          </Link>

          {/* ─── RIGHT: Controls ─── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Language selector + refresh */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="compact-btn inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200 text-[11px] font-medium"
                  aria-label={lang === "en" ? "Change language" : "Mudar idioma"}
                >
                  <span className="text-xs">🌐</span>
                  <span>{lang.toUpperCase()}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] max-h-[340px] overflow-y-auto rounded-2xl">
                {languages.map((l) =>
                  <DropdownMenuItem
                    key={l.code}
                    className={cn("gap-2 text-[13px]", lang === l.code && "bg-accent/8 text-accent font-semibold")}
                    onClick={() => setLang(l.code)}>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-muted-foreground text-[11px]">{l.name}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-[11px] text-muted-foreground" onClick={() => {
                  window.dispatchEvent(new Event("trend-refresh"));
                  toast({ title: lang === "en" ? "Refreshing translations..." : "Atualizando traduções..." });
                }}>
                  <RefreshCw className="w-3 h-3" />
                  {lang === "en" ? "Force re-translate" : "Forçar retradução"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Separator */}
            <div className="w-px h-4 bg-border/40" />

            {/* Dark mode */}
            <button
              onClick={() => setDark(!dark)}
              className="compact-btn flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* About */}
            <button
              onClick={() => navigate("/metodologia")}
              className="compact-btn hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200"
              aria-label={lang === "en" ? "About" : "Sobre"}
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="hidden sm:block w-px h-4 bg-border/40" />

            {/* Support — highlighted with coral */}
            <a
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center h-8 px-4 rounded-full bg-[#E03C31] text-white text-[11px] font-semibold transition-all duration-200 hover:brightness-110 hover:shadow-md"
              aria-label={lang === "en" ? "Support the project" : "Apoie o projeto"}
            >
              {t("support")}
            </a>

            {/* Separator */}
            <div className="hidden sm:block w-px h-4 bg-border/40" />

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="compact-btn flex items-center justify-center w-8 h-8 rounded-full hover:ring-2 hover:ring-accent/20 transition-all" aria-label="User menu">
                    <Avatar className="w-7 h-7">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="text-[10px] font-bold bg-foreground text-background">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                  <div className="px-3 py-2.5 border-b border-border/30">
                    <p className="text-[12px] font-semibold text-foreground truncate">{userName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                    <Link to="/dashboard"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                    <Link to="/reports"><FileText className="w-3.5 h-3.5" /> {lang === "en" ? "Generate Report" : "Gerar Relatório"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                    <Link to="/perfil"><User className="w-3.5 h-3.5" /> {lang === "en" ? "Profile" : "Perfil"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                    <Link to="/metodologia"><BookOpen className="w-3.5 h-3.5" /> {lang === "en" ? "Methodology" : "Metodologia"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-[13px] text-destructive focus:text-destructive">
                    <LogOut className="w-3.5 h-3.5" /> {lang === "en" ? "Sign out" : "Sair"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.button
                onClick={() => setLoginOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="compact-btn flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-semibold transition-all bg-foreground text-background"
              >
                <span className="hidden sm:inline">{t("enter")}</span>
                <LogIn className="w-3.5 h-3.5 sm:hidden" />
              </motion.button>
            )}

            {/* Mobile hamburger */}
            {!minimal && (
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="compact-btn md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* ─── Mobile Nav Drawer ─── */}
      <AnimatePresence>
        {!minimal && mobileNavOpen && (
          <motion.nav
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: "0%" }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="md:hidden fixed top-14 inset-x-0 z-40 bg-background/98 backdrop-blur-xl border-b border-border/30 px-4 py-4 flex flex-col gap-1"
            aria-label="Mobile navigation"
          >
            {[
              { path: "/", labelPt: "Explorar", labelEn: "Explore" },
              { path: "/dashboard", labelPt: "Dashboard", labelEn: "Dashboard" },
              { path: "/mapa", labelPt: "Mapa", labelEn: "Maps" },
              { path: "/reports", labelPt: "Relatórios", labelEn: "Reports" },
              { path: "/metodologia", labelPt: "Sobre", labelEn: "About" },
              { path: "/perfil", labelPt: "Perfil", labelEn: "Profile" },
            ].map((item, i) => {
              const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium transition-all",
                      active ? "text-foreground bg-secondary/60" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    )}
                  >
                    {lang === "en" ? item.labelEn : item.labelPt}
                  </Link>
                </motion.div>
              );
            })}
            {/* Mobile support button */}
            <motion.a
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center gap-2 mx-4 mt-2 h-11 rounded-full bg-[#E03C31] text-white text-[13px] font-semibold"
            >
              {t("support")}
            </motion.a>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ─── LOGIN DIALOG ─── */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm w-[92vw] bg-card border-border/30 shadow-elevation-xl rounded-3xl overflow-hidden p-0">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }} className="p-6">
            <DialogHeader className="text-center space-y-1.5 pb-5">
              <DialogTitle className="text-[18px] font-semibold tracking-tight">
                {lang === "en" ? "Sign in to GTT Monitor" : "Entrar no GTT Monitor"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                {lang === "en" ? "Save trends, create alerts and track your history" : "Salve trends, crie alertas e acompanhe seu histórico"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <motion.button
                onClick={() => handleOAuthLogin("google")}
                disabled={loginLoading !== null}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-border/40 bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]"
              >
                {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                {lang === "en" ? "Continue with Google" : "Continuar com Google"}
              </motion.button>
              <motion.button
                onClick={() => handleOAuthLogin("apple")}
                disabled={loginLoading !== null}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-border/40 bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]"
              >
                {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                {lang === "en" ? "Continue with Apple" : "Continuar com Apple"}
              </motion.button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(AppHeader);
