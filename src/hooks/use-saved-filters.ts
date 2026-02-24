import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FilterState } from "@/components/FilterBar";

export interface SavedFilter {
  id: string;
  name: string;
  country: string | null;
  period: string | null;
  category: string | null;
  media_type: string | null;
  created_at: string;
}

export function useSavedFilters(userId: string | null) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    if (!userId) { setSavedFilters([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_filters")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSavedFilters(data as SavedFilter[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  const saveFilter = async (name: string, filters: FilterState) => {
    if (!userId) return;
    const { error } = await supabase.from("saved_filters").insert({
      user_id: userId,
      name,
      country: filters.country,
      period: filters.period,
      category: filters.category,
      media_type: filters.type,
    });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✨ Filtro salvo!", description: name });
      fetchFilters();
    }
  };

  const deleteFilter = async (id: string) => {
    await supabase.from("saved_filters").delete().eq("id", id);
    fetchFilters();
  };

  return { savedFilters, loading, saveFilter, deleteFilter, refetch: fetchFilters };
}
