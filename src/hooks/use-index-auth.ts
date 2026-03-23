import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIndexAuth() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, s) => setUser(s?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
