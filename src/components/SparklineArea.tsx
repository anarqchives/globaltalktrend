import { useMemo } from "react";

interface SparklineAreaProps {
  data: number[];
  color: string;
  width: number;
  height: number;
  className?: string;
}

export default function SparklineArea({ data, color, width, height, className }: SparklineAreaProps) {
  const { pathD, areaD, gradId, lineColor, lastPoint } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "", gradId: "", lineColor: color, lastPoint: { x: 0, y: 0 } };
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pad = 3;
    const w = width;
    const h = height;

    const points = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));

    const pathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
    }, "");

    const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isUp ? color : "#EF4444";
    const gradId = `spark_${Math.random().toString(36).slice(2, 8)}`;

    return { pathD, areaD, gradId, lineColor, lastPoint: points[points.length - 1] };
  }, [data, color, width, height]);

  if (!data || data.length < 2) return null;

  return (
    <svg width={width} height={height} className={className} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} stroke={lineColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={lineColor}>
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
