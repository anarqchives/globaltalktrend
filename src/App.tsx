import React, { useEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserModeProvider } from "@/contexts/UserModeContext";
import { toast } from "@/hooks/use-toast";
import { ErrorBoundary, OfflineBanner } from "./components/ErrorBoundary";
import PWAInstallBanner from "./components/PWAInstallBanner";
import Index from "./pages/Index";
import PrivacyPopup from "./components/PrivacyPopup";

const Discover = lazy(() => import("./pages/Discover"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Methodology = lazy(() => import("./pages/Methodology"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Teste = lazy(() => import("./pages/Teste"));
const Admin = lazy(() => import("./pages/Admin"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const TopicPage = lazy(() => import("./pages/TopicPage"));
const Reports = lazy(() => import("./pages/Reports"));
const Collections = lazy(() => import("./pages/Collections"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const App = () => {
  const lastToastAtRef = useRef(0);

  useEffect(() => {
    const safeToast = () => {
      const now = Date.now();
      if (now - lastToastAtRef.current < 5000) return;
      lastToastAtRef.current = now;
      toast({
        title: "Erro temporário",
        description: "Houve uma falha inesperada. Tente atualizar a página.",
        variant: "destructive",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Global] Unhandled rejection:", event.reason);
      safeToast();
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UserModeProvider>
          <TooltipProvider>
            <ErrorBoundary fallbackTitle="Erro inesperado na aplicação">
              <OfflineBanner />
              <Toaster />
              <Sonner />
              <PrivacyPopup />
              <PWAInstallBanner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/dashboard" element={<Index />} />
                    <Route path="/mapa" element={<Index />} />
                    <Route path="/topic" element={<TopicPage />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/collections" element={<Collections />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/metodologia" element={<Methodology />} />
                    <Route path="/historico" element={<History />} />
                    <Route path="/perfil" element={<Profile />} />
                    <Route path="/teste" element={<Teste />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/@:username" element={<PublicProfile />} />
                    <Route path="/privacidade" element={<Privacidade />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </UserModeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
