import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Alert {
  id: string;
  keyword: string | null;
  country: string | null;
  category: string | null;
  threshold: number;
  frequency: string;
  notification_method: string;
  is_active: boolean;
  last_triggered: string | null;
  created_at: string;
}

export interface CreateAlertInput {
  keyword?: string;
  country?: string;
  category?: string;
  threshold: number;
  frequency: string;
  notification_method: string;
}

export function useAlerts(userId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!userId) { setAlerts([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAlerts(data as Alert[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const createAlert = async (input: CreateAlertInput) => {
    if (!userId) return;
    const { error } = await supabase.from("alerts").insert({
      user_id: userId,
      keyword: input.keyword || null,
      country: input.country || null,
      category: input.category || null,
      threshold: input.threshold,
      frequency: input.frequency,
      notification_method: input.notification_method,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🔔 Alerta criado!" });
      fetchAlerts();
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    await supabase.from("alerts").update({ is_active: !isActive }).eq("id", id);
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("alerts").delete().eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return { alerts, loading, createAlert, toggleAlert, deleteAlert, refetch: fetchAlerts };
}
