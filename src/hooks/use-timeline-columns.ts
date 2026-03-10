import { useState, useEffect, useRef, useCallback } from "react";

export function useTimelineColumns() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  const calculate = useCallback(() => {
    if (!timelineRef.current) return;
    const w = timelineRef.current.offsetWidth;
    if (w >= 900) setColumns(3);
    else if (w >= 560) setColumns(2);
    else setColumns(1);
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
