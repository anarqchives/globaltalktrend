import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SavedCard {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  category: string | null;
  country_code: string | null;
  source_url: string | null;
  thumbnail: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

export function useSavedCards(userId: string | null) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!userId) { setCards([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) { console.error("Error fetching saved cards:", error); }
    setCards((data as SavedCard[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const saveCard = useCallback(async (card: {
    title: string; platform: string; category?: string; country_code?: string;
    source_url?: string; thumbnail?: string; description?: string; metadata?: any;
  }) => {
    if (!userId) return;
    // Check if already saved
    const existing = cards.find(c => c.title === card.title && c.platform === card.platform);
    if (existing) {
      toast({ title: "📌 Já salvo", description: "Este card já está no seu painel." });
      return;
    }
    const { error } = await supabase.from("saved_cards").insert({
      user_id: userId,
      title: card.title,
      platform: card.platform,
      category: card.category || null,
      country_code: card.country_code || null,
      source_url: card.source_url || null,
      thumbnail: card.thumbnail || null,
      description: card.description || null,
      metadata: card.metadata || {},
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "📌 Salvo!", description: `"${card.title.slice(0, 40)}..." adicionado ao painel.` });
      fetchCards();
    }
  }, [userId, cards, fetchCards]);

  const removeCard = useCallback(async (id: string) => {
    const { error } = await supabase.from("saved_cards").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  return { cards, loading, saveCard, removeCard, refetch: fetchCards };
}
