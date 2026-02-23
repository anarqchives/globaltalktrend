import { useMemo } from "react";

interface MapRegion {
  id: string;
  name: string;
  path: string;
  cx: number;
  cy: number;
}

// Simplified world map regions with clickable areas
const regions: MapRegion[] = [
  { id: "BR", name: "Brasil", cx: 280, cy: 280, path: "M250,240 L310,240 L320,260 L310,300 L280,320 L250,300 L240,270 Z" },
  { id: "US", name: "EUA", cx: 170, cy: 140, path: "M100,120 L240,120 L250,140 L240,170 L100,170 L90,150 Z" },
  { id: "CA", name: "Canadá", cx: 170, cy: 95, path: "M100,70 L250,70 L260,100 L250,115 L100,115 L90,95 Z" },
  { id: "MX", name: "México", cx: 150, cy: 185, path: "M100,175 L200,175 L210,195 L190,210 L100,200 Z" },
  { id: "AR", name: "Argentina", cx: 270, cy: 340, path: "M250,310 L290,310 L295,350 L280,380 L255,370 L250,340 Z" },
  { id: "GB", name: "Reino Unido", cx: 430, cy: 105, path: "M425,90 L440,90 L442,110 L435,120 L425,115 Z" },
  { id: "FR", name: "França", cx: 440, cy: 135, path: "M425,125 L455,125 L460,145 L445,155 L425,150 Z" },
  { id: "DE", name: "Alemanha", cx: 460, cy: 118, path: "M450,105 L475,105 L478,130 L455,133 L448,120 Z" },
  { id: "ES", name: "Espanha", cx: 425, cy: 155, path: "M410,145 L445,145 L448,165 L412,168 Z" },
  { id: "IT", name: "Itália", cx: 465, cy: 150, path: "M458,135 L472,135 L475,165 L465,175 L458,160 Z" },
  { id: "PT", name: "Portugal", cx: 410, cy: 155, path: "M405,145 L412,145 L414,168 L405,168 Z" },
  { id: "ZA", name: "África do Sul", cx: 490, cy: 320, path: "M470,300 L510,300 L515,330 L480,340 L465,325 Z" },
  { id: "NG", name: "Nigéria", cx: 450, cy: 230, path: "M435,220 L465,220 L468,245 L440,248 Z" },
  { id: "EG", name: "Egito", cx: 500, cy: 185, path: "M485,170 L515,170 L518,200 L490,200 Z" },
  { id: "JP", name: "Japão", cx: 700, cy: 150, path: "M690,130 L715,130 L718,160 L695,165 Z" },
  { id: "KR", name: "Coreia do Sul", cx: 680, cy: 150, path: "M673,140 L690,140 L692,162 L675,162 Z" },
  { id: "IN", name: "Índia", cx: 610, cy: 210, path: "M590,180 L630,180 L635,230 L610,250 L590,230 Z" },
  { id: "CN", name: "China", cx: 650, cy: 150, path: "M620,110 L680,110 L685,170 L630,175 L615,150 Z" },
  { id: "AU", name: "Austrália", cx: 690, cy: 320, path: "M650,290 L730,290 L740,330 L720,350 L660,340 L645,315 Z" },
  { id: "NZ", name: "Nova Zelândia", cx: 750, cy: 345, path: "M745,335 L760,335 L762,360 L748,358 Z" },
  { id: "CO", name: "Colômbia", cx: 230, cy: 225, path: "M215,215 L250,215 L255,240 L220,242 Z" },
  { id: "CL", name: "Chile", cx: 250, cy: 340, path: "M245,310 L255,310 L258,380 L248,380 Z" },
];

interface WorldMapProps {
  trendCounts: Record<string, number>;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
}

const WorldMapPlaceholder = ({ trendCounts, selectedCountry, onSelectCountry }: WorldMapProps) => {
  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);

  const getHeatColor = (count: number) => {
    if (count === 0) return "hsl(var(--secondary))";
    const intensity = Math.min(count / maxCount, 1);
    // From cool blue to hot red
    if (intensity < 0.33) return `hsla(210, 100%, 50%, ${0.2 + intensity * 1.5})`;
    if (intensity < 0.66) return `hsla(40, 100%, 50%, ${0.4 + intensity * 0.6})`;
    return `hsla(0, 80%, 50%, ${0.5 + intensity * 0.5})`;
  };

  return (
    <div className="bg-card rounded-3xl p-4 border border-border mb-8" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-sm font-semibold text-foreground">🌍 Mapa global de tendências</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "hsla(210, 100%, 50%, 0.3)" }} /> baixo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "hsla(40, 100%, 50%, 0.7)" }} /> médio
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: "hsla(0, 80%, 50%, 0.9)" }} /> alto
          </span>
        </div>
      </div>
      <div className="h-[350px] md:h-[400px] w-full rounded-2xl bg-secondary/30 relative overflow-hidden">
        <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Ocean background */}
          <rect x="0" y="0" width="800" height="400" fill="transparent" />
          
          {/* Render regions */}
          {regions.map((region) => {
            const count = trendCounts[region.id] || 0;
            const isSelected = selectedCountry === region.id;
            
            return (
              <g key={region.id} className="cursor-pointer" onClick={() => onSelectCountry(region.id === selectedCountry ? "global" : region.id)}>
                <path
                  d={region.path}
                  fill={getHeatColor(count)}
                  stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isSelected ? 2.5 : 0.8}
                  className="transition-all duration-300 hover:brightness-110"
                />
                {/* Label */}
                <text
                  x={region.cx}
                  y={region.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isSelected ? 9 : 7}
                  fontWeight={isSelected ? 700 : 500}
                  fill="hsl(var(--foreground))"
                  className="pointer-events-none select-none"
                >
                  {region.name}
                </text>
                {/* Count badge */}
                {count > 0 && (
                  <>
                    <circle cx={region.cx + 20} cy={region.cy - 12} r={8} fill="hsl(var(--primary))" />
                    <text x={region.cx + 20} y={region.cy - 12} textAnchor="middle" dominantBaseline="middle" fontSize={7} fontWeight={700} fill="hsl(var(--primary-foreground))" className="pointer-events-none">
                      {count}
                    </text>
                  </>
                )}
                {/* Pulse for selected */}
                {isSelected && (
                  <circle cx={region.cx} cy={region.cy} r={6} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5}>
                    <animate attributeName="r" values="6;18" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default WorldMapPlaceholder;
