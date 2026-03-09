import { useState, useEffect, useRef, useCallback } from "react";

const MIN_CARD_WIDTH = 320; // px — ensures cards remain readable

export function useTimelineColumns() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  const calculate = useCallback(() => {
    if (!timelineRef.current) return;
    const w = timelineRef.current.offsetWidth;
    // Calculate max columns that still respect MIN_CARD_WIDTH
    const maxByWidth = Math.max(1, Math.floor(w / MIN_CARD_WIDTH));
    // Also respect breakpoint thresholds
    let breakpointCols = 1;
    if (w >= 1100) breakpointCols = 3;
    else if (w >= 750) breakpointCols = 2;
    setColumns(Math.min(maxByWidth, breakpointCols));
  }, []);

  useEffect(() => {
    calculate();
    const el = timelineRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculate);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [calculate]);

  return { timelineRef, columns };
}
