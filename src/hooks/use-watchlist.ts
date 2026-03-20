import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WatchlistItem {
  id?: string;
  title: string;
  platform: string;
  category?: string;
  countryCode?: string;
  addedAt: number;
  lastScore?: number;
  lastVolume?: string;
  lastChange?: string;
}

// localStorage fallback for anonymous users
function loadLocal(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem("gtt_watchlist");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLocal(items: WatchlistItem[]) {
  try { localStorage.setItem("gtt_watchlist", JSON.stringify(items)); } catch {}
}

export function useWatchlist(userId: string | null, lang: string) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadLocal);
  const [loaded, setLoaded] = useState(false);

  // Load from DB when user is authenticated
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .order("added_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        const items: WatchlistItem[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          platform: r.platform,
          category: r.category ?? undefined,
          countryCode: r.country_code ?? undefined,
          addedAt: new Date(r.added_at).getTime(),
          lastScore: r.last_score ?? undefined,
          lastVolume: r.last_volume ?? undefined,
          lastChange: r.last_change ?? undefined,
        }));
        setWatchlist(items);
        saveLocal(items); // keep local in sync
      }
      setLoaded(true);
    };

    // Migrate localStorage items to DB on first load
    const migrateLocal = async () => {
      const local = loadLocal();
      if (local.length === 0) return;

      for (const item of local) {
        await supabase.from("watchlist").upsert({
          user_id: userId,
          title: item.title,
          platform: item.platform,
          category: item.category || null,
          country_code: item.countryCode || null,
          last_score: item.lastScore ?? null,
          last_volume: item.lastVolume || null,
          last_change: item.lastChange || null,
          added_at: new Date(item.addedAt).toISOString(),
        }, { onConflict: "user_id,title,platform" });
      }
    };

    migrateLocal().then(load);
  }, [userId]);

  const addToWatchlist = useCallback((card: {
    title: string; platform: string; category?: string;
    countryCode?: string; volume?: string; change?: string;
  }) => {
    const exists = watchlist.find(w => w.title === card.title && w.platform === card.platform);
    if (exists) {
      toast({ title: lang === "pt" ? "Já monitorado" : "Already watched", description: card.title.slice(0, 50) });
      return;
    }

    const item: WatchlistItem = {
      title: card.title,
      platform: card.platform,
      category: card.category,
      countryCode: card.countryCode,
      addedAt: Date.now(),
      lastVolume: card.volume,
      lastChange: card.change,
    };

    const next = [item, ...watchlist].slice(0, 50);
    setWatchlist(next);
    saveLocal(next);

    if (userId) {
      supabase.from("watchlist").upsert({
        user_id: userId,
        title: item.title,
        platform: item.platform,
        category: item.category || null,
        country_code: item.countryCode || null,
        last_score: null,
        last_volume: item.lastVolume || null,
        last_change: item.lastChange || null,
        added_at: new Date(item.addedAt).toISOString(),
      }, { onConflict: "user_id,title,platform" }).then(() => {});
    }

    toast({ title: lang === "pt" ? "👁 Monitorando" : "👁 Watching", description: card.title.slice(0, 50) });
  }, [watchlist, userId, lang]);

  const removeFromWatchlist = useCallback((title: string, platform: string) => {
    const next = watchlist.filter(w => !(w.title === title && w.platform === platform));
    setWatchlist(next);
    saveLocal(next);

    if (userId) {
      supabase.from("watchlist")
        .delete()
        .eq("user_id", userId)
        .eq("title", title)
        .eq("platform", platform)
        .then(() => {});
    }
  }, [watchlist, userId]);

  // Update scores in DB periodically
  const updateScores = useCallback((updates: Array<{ title: string; platform: string; score: number }>) => {
    if (!userId) return;
    const newWatchlist = watchlist.map(w => {
      const upd = updates.find(u => u.title === w.title && u.platform === w.platform);
      if (upd) return { ...w, lastScore: upd.score };
      return w;
    });
    setWatchlist(newWatchlist);
    saveLocal(newWatchlist);

    for (const u of updates) {
      supabase.from("watchlist")
        .update({ last_score: u.score })
        .eq("user_id", userId)
        .eq("title", u.title)
        .eq("platform", u.platform)
        .then(() => {});
    }
  }, [watchlist, userId]);

  return { watchlist, loaded, addToWatchlist, removeFromWatchlist, updateScores };
}
