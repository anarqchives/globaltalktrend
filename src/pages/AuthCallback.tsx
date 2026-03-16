import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const finishAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;
      navigate("/", { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) {
        navigate("/", { replace: true });
      }
    });

    finishAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium">Concluindo login…</p>
        <p className="mt-2 text-xs text-muted-foreground">Você será redirecionado automaticamente.</p>
      </section>
    </main>
  );
};

export default AuthCallback;
