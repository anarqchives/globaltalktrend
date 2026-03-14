import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, LogOut, LogIn, Info, ChevronDown, User, FileText,
  Star, BookOpen, Users, Loader2, Compass, BarChart3, Map, Menu, X
} from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "discover", path: "/", icon: Compass, labelPt: "Descobrir", labelEn: "Discover" },
  { key: "dashboard", path: "/dashboard", icon: BarChart3, labelPt: "Dashboard", labelEn: "Dashboard" },
  { key: "map", path: "/mapa", icon: Map, labelPt: "Mapa", labelEn: "Map" },
  { key: "reports", path: "/perfil?tab=reports", icon: FileText, labelPt: "Relatórios", labelEn: "Reports" },
  { key: "methodology", path: "/metodologia", icon: BookOpen, labelPt: "Metodologia", labelEn: "Methodology" },
];

interface AppHeaderProps {
  /** Hide nav links (e.g. on landing page) */
  minimal?: boolean;
}

const AppHeader = ({ minimal = false }: AppHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
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
        return;
      }
      if (!result?.redirected) { setLoginOpen(false); setLoginLoading(null); }
    } catch {
      toast({ title: "Erro inesperado", description: "Houve um problema ao iniciar o login.", variant: "destructive" });
      setLoginLoading(null);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const getNavLabel = (item: typeof NAV_ITEMS[0]) => lang === "en" ? item.labelEn : item.labelPt;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-[56px] flex items-center px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="w-full flex items-center justify-between">

          {/* ─── LEFT: Logo ─── */}
          <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0">
            <h1 className="text-[15px] sm:text-base font-bold tracking-tight whitespace-nowrap select-none text-foreground">
              <span className="hidden sm:inline">Global Talk Trend</span>
              <span className="sm:hidden">GTT</span>
            </h1>
            <span className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground/60 font-medium">
              <span className="relative flex items-center justify-center w-1.5 h-1.5">
                <span className="absolute w-full h-full rounded-full live-pulse-dot bg-positive" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-positive" />
              </span>
              LIVE
            </span>
          </Link>

          {/* ─── CENTER: Navigation ─── */}
          {!minimal && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                      active
                        ? "text-foreground bg-secondary/80"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {getNavLabel(item)}
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ─── RIGHT: Utilities ─── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-0.5 px-2 rounded-lg border border-border/50 hover:border-border hover:bg-secondary/50 transition-all" style={{ height: 30, fontSize: 11, fontWeight: 500 }}>
                  <span className="text-muted-foreground">{lang.toUpperCase()}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px] max-h-[300px] overflow-y-auto">
                {languages.map((l) =>
                  <DropdownMenuItem
                    key={l.code}
                    className={cn("text-body gap-2", lang === l.code && "bg-primary/10 text-primary font-semibold")}
                    onClick={() => setLang(l.code)}>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-muted-foreground text-caption">{l.name}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode */}
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center justify-center w-[30px] h-[30px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              title={dark ? "Modo claro" : "Modo escuro"}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Support */}
            <a
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center rounded-full text-white hover:brightness-110 transition-all text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FF2D2D)', height: 30, padding: '0 12px', borderRadius: 999 }}
            >
              {t("support")}
            </a>

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-[30px] h-[30px] rounded-full hover:ring-2 hover:ring-primary/30 transition-all">
                    <Avatar className="w-7 h-7">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=dashboard"><Users className="w-3.5 h-3.5" /> Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=reports"><FileText className="w-3.5 h-3.5" /> {lang === "en" ? "Reports" : "Relatórios"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=stats"><Star className="w-3.5 h-3.5" /> {lang === "en" ? "Stats" : "Estatísticas"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/historico"><BookOpen className="w-3.5 h-3.5" /> {lang === "en" ? "History" : "Histórico"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-body gap-2 text-destructive focus:text-destructive">
                    <LogOut className="w-3.5 h-3.5" /> {lang === "en" ? "Sign out" : "Sair"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="flex items-center gap-1 rounded-full text-white hover:brightness-110 transition-all text-xs font-semibold"
                style={{ background: 'hsl(var(--primary))', height: 30, padding: '0 12px', borderRadius: 999 }}>
                <span className="hidden sm:inline">{t("enter")}</span>
                <LogIn className="w-3.5 h-3.5 sm:hidden" />
              </button>
            )}

            {/* Mobile nav toggle */}
            {!minimal && (
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden flex items-center justify-center w-[30px] h-[30px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Mobile Nav Drawer ─── */}
      <AnimatePresence>
        {!minimal && mobileNavOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed top-[56px] inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex flex-col gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "text-foreground bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {getNavLabel(item)}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ─── LOGIN DIALOG ─── */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm w-[92vw] bg-background dark:bg-card border-border/50 shadow-2xl rounded-2xl overflow-hidden">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}>
            <DialogHeader className="text-center space-y-1 pb-4">
              <DialogTitle className="text-lg font-semibold">Entrar no Global Talk Trend</DialogTitle>
              <DialogDescription className="text-body text-muted-foreground">Salve trends, crie alertas e acompanhe seu histórico</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <button onClick={() => handleOAuthLogin("google")} disabled={loginLoading !== null} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-60 min-h-[44px]">
                {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                Continuar com Google
              </button>
              <button onClick={() => handleOAuthLogin("apple")} disabled={loginLoading !== null} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-60 min-h-[44px]">
                {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                Continuar com Apple
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(AppHeader);
