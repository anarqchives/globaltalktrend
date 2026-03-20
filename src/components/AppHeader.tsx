import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, LogIn, ChevronRight, User, Loader2, Menu, X, BarChart3, BookOpen, Globe, Bookmark, FileText } from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppHeaderProps {
  minimal?: boolean;
  onOpenSavedCollections?: () => void;
}

const AppHeader = ({ minimal = false, onOpenSavedCollections }: AppHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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

  // Show top 4 languages as pills
  const topLangs = languages.slice(0, 4);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30" role="banner">
        <div className="h-12 flex items-center px-4 md:px-6 max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link to="/welcome" className="flex items-center gap-1.5 shrink-0" aria-label="GTT Monitor">
            <span className="text-[15px] font-bold tracking-tight text-foreground">GTT</span>
            <span className="text-[15px] font-medium tracking-tight text-muted-foreground">Monitor</span>
          </Link>

          <div className="flex-1" />

          {/* Right controls: Language + Theme + Apoie + Avatar + Menu */}
          <div className="flex items-center gap-1.5">
            {/* Language pills */}
            <div className="hidden sm:flex items-center gap-0.5 mr-1">
              {topLangs.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); window.dispatchEvent(new Event("trend-refresh")); }}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    lang === l.code
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Dark/Light toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="w-px h-5 bg-border/40 mx-0.5 hidden sm:block" />

            {/* Support */}
            <a href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00" target="_blank" rel="noopener noreferrer"
              className="apoie-pill compact-link hidden sm:flex">{t("support")}</a>

            {/* Avatar / Login */}
            {user ? (
              <button onClick={() => navigate("/perfil")}
                className="compact-btn flex items-center justify-center w-8 h-8 rounded-full hover:ring-2 hover:ring-ring/20 transition-all">
                <Avatar className="w-6 h-6">
                  {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                  <AvatarFallback className="text-[9px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)}
                className="compact-btn flex items-center gap-1 h-7 px-3 rounded-full text-[10px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors">
                <LogIn className="w-3 h-3" />
                <span className="hidden sm:inline">{t("enter")}</span>
              </button>
            )}

            {/* Menu */}
            <button onClick={() => setDrawerOpen(true)}
              className="compact-btn flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Menu className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer — secondary: account, preferences, navigation */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[360px] p-0">
          <SheetHeader className="p-4 pb-3 border-b border-border/30">
            <SheetTitle className="text-[14px] font-bold">{lang === "pt" ? "Menu" : "Menu"}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-5">
              {/* Settings */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "pt" ? "Configurações" : "Settings"}
                </h4>
                <div className="space-y-1">
                  {/* All languages in drawer */}
                  <div className="px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground mb-1 block">{lang === "pt" ? "Idioma" : "Language"}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {languages.map(l => (
                        <button key={l.code} onClick={() => { setLang(l.code); window.dispatchEvent(new Event("trend-refresh")); }}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${lang === l.code ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "pt" ? "Navegação" : "Navigation"}
                </h4>
                <div className="space-y-0.5">
                  <Link to="/dashboard" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> Dashboard</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <Link to="/historico" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Histórico" : "History"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <button onClick={() => { setDrawerOpen(false); onOpenSavedCollections?.(); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium text-left">
                    <span className="flex items-center gap-2"><Bookmark className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Salvos" : "Saved"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </button>
                  <Link to="/reports" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Relatórios" : "Reports"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <Link to="/metodologia" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Sobre / Metodologia" : "About / Methodology"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                </div>
              </div>

              {/* Auth */}
              <div className="border-t border-border/30 pt-4">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Avatar className="w-6 h-6">
                        {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                        <AvatarFallback className="text-[8px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{userName}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                    <button onClick={() => { handleLogout(); setDrawerOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-destructive hover:bg-destructive/5 transition-colors text-[11px] font-medium">
                      <LogOut className="w-3.5 h-3.5" /> {lang === "pt" ? "Sair" : "Log out"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setDrawerOpen(false); setLoginOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-foreground text-background text-[11px] font-semibold hover:bg-foreground/90 transition-colors">
                    <LogIn className="w-3.5 h-3.5" /> {lang === "pt" ? "Entrar" : "Sign in"}
                  </button>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
