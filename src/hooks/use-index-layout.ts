import { useState, useCallback } from "react";

export function useIndexLayout() {
  const [viewMode, setViewMode] = useState<"timeline" | "map">("timeline");
  const [compactMode, setCompactMode] = useState(false);
  const [gridColumns, setGridColumns] = useState(2);
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

  return {
    viewMode, setViewMode,
    compactMode, setCompactMode,
    gridColumns, setGridColumns,
    panelVisibility, togglePanel,
  };
}
