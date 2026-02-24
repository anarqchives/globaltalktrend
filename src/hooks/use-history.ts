import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HistoryItem {
  id: string;
  trend_id: string;
  trend_title: string;
  platform: string;
  viewed_at: string;
  metadata: any;
}

export function useHistory(userId: string | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!userId) { setHistory([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("history")
      .select("*")
      .order("viewed_at", { ascending: false })
      .limit(100);
    if (data) setHistory(data as HistoryItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const trackView = async (trendTitle: string, platform: string, metadata?: any) => {
    if (!userId) return;
    const trendId = `${platform}-${trendTitle}`.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 100);
    await supabase.from("history").insert({
      user_id: userId,
      trend_id: trendId,
      trend_title: trendTitle,
      platform,
      metadata: metadata || {},
    });
  };

  const clearHistory = async () => {
    if (!userId) return;
    await supabase.from("history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    setHistory([]);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("history").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return { history, loading, trackView, clearHistory, deleteItem, refetch: fetchHistory };
}
