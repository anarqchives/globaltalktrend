/**
 * use-events — GTT Event Resolver hook
 *
 * Orquestra o pipeline event-first do blueprint:
 * 1. Recebe sinais brutos de use-trends
 * 2. Envia para resolve-events (Edge Function)
 * 3. Retorna eventos consolidados com score e stage
 * 4. Opcional: busca radar persistido via get-radar
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "@/components/TrendCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GTTEvent {
  id?: string;
  fingerprint: string;
  headline: string;
  summary?: string;
  category: string;
  topics: string[];
  entities: string[];

  // Scoring
  velocity_score: number;
  spread_score: number;
  source_diversity: number;
  persistence_score: number;
  narrative_impact: number;
  trust_score: number;
  global_relevance_score: number;

  // Stage
  stage: "emergent" | "developing" | "viral" | "critical";

  // Propagation
  regions: string[];
  source_count: number;
  source_types: string[];
  platform_count: number;

  // Signals
  signal_titles: string[];
  signal_platforms: string[];

  // Temporal
  first_seen_at: string;
  last_seen_at: string;
  peak_at?: string;
}

export interface UseEventsReturn {
  events: GTTEvent[];
  loading: boolean;
  lastResolved: Date | null;
  resolveSignals: (signals: TrendCardProps[]) => Promise<void>;
  fetchRadar: (opts?: { stage?: string; category?: string; region?: string }) => Promise<GTTEvent[]>;
}

// ─── Stage label helpers ──────────────────────────────────────────────────────

export const STAGE_LABELS: Record<GTTEvent["stage"], { pt: string; en: string; color: string }> = {
  emergent:   { pt: "Emergente",    en: "Emergent",    color: "var(--lifecycle-emerging)" },
  developing: { pt: "Desenvolvendo", en: "Developing", color: "var(--lifecycle-accelerating)" },
  viral:      { pt: "Viral",        en: "Viral",       color: "var(--lifecycle-peak)" },
  critical:   { pt: "Crítico",      en: "Critical",    color: "var(--color-critical)" },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<GTTEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResolved, setLastResolved] = useState<Date | null>(null);
  const resolveInFlight = useRef(false);

  /**
   * resolveSignals: sends raw TrendCardProps to the Edge Function,
   * receives consolidated GTTEvents, updates state.
   */
  const resolveSignals = useCallback(async (signals: TrendCardProps[]) => {
    if (!signals.length || resolveInFlight.current) return;
    resolveInFlight.current = true;
    setLoading(true);

    try {
      const payload = signals.map(s => ({
        title: s.title,
        platform: s.platform,
        category: s.category,
        countryCode: s.countryCode,
        volume: s.volume,
        change: s.change,
        changePositive: s.changePositive,
        firstSeenAt: s.firstSeenAt,
        relevanceScore: s.relevanceScore,
      }));

      const { data, error } = await supabase.functions.invoke("resolve-events", {
        body: { signals: payload },
      });

      if (error) {
        console.error("[use-events] resolve-events error:", error);
        return;
      }

      if (data?.events && Array.isArray(data.events)) {
        setEvents(data.events);
        setLastResolved(new Date());
      }
    } catch (err) {
      console.error("[use-events] unexpected error:", err);
    } finally {
      setLoading(false);
      resolveInFlight.current = false;
    }
  }, []);

  /**
   * fetchRadar: reads persisted events from get-radar endpoint.
   * Use this to hydrate SSR or on initial load before signals arrive.
   */
  const fetchRadar = useCallback(async (opts?: {
    stage?: string;
    category?: string;
    region?: string;
  }): Promise<GTTEvent[]> => {
    try {
      const params = new URLSearchParams();
      if (opts?.stage) params.set("stage", opts.stage);
      if (opts?.category) params.set("category", opts.category);
      if (opts?.region) params.set("region", opts.region);
      params.set("limit", "20");

      const { data, error } = await supabase.functions.invoke("get-radar", {
        method: "GET",
        // pass as query string — Supabase SDK doesn't support query params natively
        // so we encode them in the body and the function reads from URL
        body: Object.fromEntries(params),
      });

      if (error || !data?.events) return [];

      setEvents(data.events);
      return data.events;
    } catch {
      return [];
    }
  }, []);

  return { events, loading, lastResolved, resolveSignals, fetchRadar };
}

// ─── Convenience: convert GTTEvent → TrendCardProps for existing components ──

export function eventToTrendCard(event: GTTEvent): Partial<TrendCardProps> {
  return {
    title: event.headline,
    platform: event.signal_platforms[0] || "GTT",
    category: event.category,
    countryCode: event.regions[0] || "GL",
    volume: String(event.source_count),
    change: `+${Math.round(event.velocity_score * 100)}%`,
    changePositive: true,
    relevanceScore: event.global_relevance_score * 100,
    firstSeenAt: event.first_seen_at,
    sources: event.signal_platforms,
    // trustBadge based on trust_score
    trustBadge: event.trust_score > 0.85
      ? "verified"
      : event.source_types.includes("official")
      ? "official"
      : event.source_types.includes("scientific")
      ? "scientific"
      : undefined,
  };
}
