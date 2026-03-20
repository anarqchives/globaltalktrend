/**
 * Map panel state management — extracted from Index.tsx
 */
import { useState, useCallback } from "react";
import { FilterState } from "@/components/FilterBar";

export function useMapPanel(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [mapSelectedCountry, setMapSelectedCountry] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "map">("timeline");
  const [panelVisibility, setPanelVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem("map-panel-open");
      const isMobileInit = window.innerWidth < 768;
      const mapOpen = saved !== null ? saved === "true" : !isMobileInit;
      return { timeline: true, map: mapOpen };
    } catch {
      return { timeline: true, map: true };
    }
  });

  const togglePanel = useCallback((panel: "timeline" | "map") => {
    setPanelVisibility(prev => {
      const next = { ...prev, [panel]: !prev[panel] };
      if (panel === "map") {
        try { localStorage.setItem("map-panel-open", String(next.map)); } catch {}
      }
      return next;
    });
  }, []);

  const handleMapClick = useCallback((code: string, setFilters: React.Dispatch<React.SetStateAction<FilterState>>) => {
    setMapSelectedCountry(code === "global" ? null : code);
    setFilters((f) => ({ ...f, country: code }));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [scrollRef]);

  const clearMapSelection = useCallback((setFilters: React.Dispatch<React.SetStateAction<FilterState>>) => {
    setMapSelectedCountry(null);
    setFilters(f => ({ ...f, country: "global" }));
  }, []);

  return {
    mapSelectedCountry,
    setMapSelectedCountry,
    viewMode,
    setViewMode,
    panelVisibility,
    togglePanel,
    handleMapClick,
    clearMapSelection,
  };
}
