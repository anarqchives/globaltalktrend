import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

interface MapPoint {
  id: string;
  name: string;
  cx: number;
  cy: number;
}

const mapPoints: MapPoint[] = [
  // Americas
  { id: "BR", name: "Brasil", cx: 280, cy: 275 },
  { id: "US", name: "EUA", cx: 170, cy: 145 },
  { id: "CA", name: "Canadá", cx: 175, cy: 100 },
  { id: "MX", name: "México", cx: 145, cy: 190 },
  { id: "AR", name: "Argentina", cx: 268, cy: 340 },
  { id: "CO", name: "Colômbia", cx: 232, cy: 228 },
  { id: "CL", name: "Chile", cx: 252, cy: 345 },
  { id: "PE", name: "Peru", cx: 240, cy: 250 },
  { id: "VE", name: "Venezuela", cx: 250, cy: 218 },
  // Europe
  { id: "GB", name: "Reino Unido", cx: 432, cy: 108 },
  { id: "FR", name: "França", cx: 440, cy: 138 },
  { id: "DE", name: "Alemanha", cx: 462, cy: 120 },
  { id: "ES", name: "Espanha", cx: 425, cy: 155 },
  { id: "IT", name: "Itália", cx: 468, cy: 148 },
  { id: "PT", name: "Portugal", cx: 410, cy: 155 },
  { id: "NL", name: "Holanda", cx: 450, cy: 115 },
  { id: "PL", name: "Polônia", cx: 480, cy: 115 },
  { id: "SE", name: "Suécia", cx: 465, cy: 88 },
  { id: "NO", name: "Noruega", cx: 450, cy: 82 },
  { id: "UA", name: "Ucrânia", cx: 505, cy: 120 },
  { id: "RU", name: "Rússia", cx: 570, cy: 90 },
  { id: "TR", name: "Turquia", cx: 510, cy: 155 },
  // Africa
  { id: "ZA", name: "África do Sul", cx: 490, cy: 320 },
  { id: "NG", name: "Nigéria", cx: 448, cy: 232 },
  { id: "EG", name: "Egito", cx: 500, cy: 190 },
  { id: "KE", name: "Quênia", cx: 515, cy: 258 },
  { id: "MA", name: "Marrocos", cx: 420, cy: 175 },
  { id: "ET", name: "Etiópia", cx: 525, cy: 240 },
  // Asia
  { id: "JP", name: "Japão", cx: 702, cy: 152 },
  { id: "KR", name: "Coreia do Sul", cx: 682, cy: 152 },
  { id: "IN", name: "Índia", cx: 612, cy: 212 },
  { id: "CN", name: "China", cx: 650, cy: 155 },
  { id: "ID", name: "Indonésia", cx: 665, cy: 265 },
  { id: "PH", name: "Filipinas", cx: 690, cy: 215 },
  { id: "TH", name: "Tailândia", cx: 650, cy: 210 },
  { id: "VN", name: "Vietnã", cx: 665, cy: 205 },
  { id: "SA", name: "Arábia Saudita", cx: 540, cy: 195 },
  { id: "AE", name: "Emirados Árabes", cx: 555, cy: 205 },
  { id: "PK", name: "Paquistão", cx: 585, cy: 188 },
  { id: "PS", name: "Palestina", cx: 520, cy: 175 },
  // Oceania
  { id: "AU", name: "Austrália", cx: 695, cy: 318 },
  { id: "NZ", name: "Nova Zelândia", cx: 752, cy: 348 },
];

const continentPaths = [
  "M80,60 Q100,55 140,55 Q200,50 250,65 Q270,75 265,100 Q260,130 250,140 Q240,165 200,175 Q170,185 130,200 Q110,190 95,175 Q85,150 80,130 Q75,100 80,60 Z",
  "M210,210 Q240,205 260,215 Q280,225 290,240 Q310,260 315,280 Q310,310 295,340 Q285,365 275,380 Q265,385 255,375 Q248,345 245,310 Q235,280 225,260 Q215,240 210,220 Z",
  "M400,75 Q430,70 465,80 Q490,90 495,100 Q490,120 480,135 Q470,150 450,160 Q430,165 410,160 Q400,150 398,135 Q395,115 398,95 Z",
  "M410,170 Q430,165 460,170 Q485,175 510,185 Q525,200 530,225 Q528,260 520,290 Q510,315 495,330 Q480,340 465,335 Q445,320 435,295 Q425,260 420,235 Q415,205 410,180 Z",
  "M500,60 Q550,50 620,55 Q680,60 720,80 Q740,100 735,130 Q730,155 715,170 Q700,180 675,180 Q640,185 620,195 Q600,210 585,230 Q575,245 580,260 Q570,250 560,230 Q540,200 520,170 Q510,140 505,110 Q500,85 500,60 Z",
  "M640,280 Q670,275 710,278 Q740,285 750,300 Q748,320 735,340 Q720,352 695,350 Q665,345 650,330 Q640,310 638,295 Z",
];

type MapView = "map" | "satellite" | "terrain";

interface WorldMapProps {
  trendCounts: Record<string, number>;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  activeTrend?: TrendCardProps | null;
  onDismissTrend?: () => void;
}

const WorldMapPlaceholder = ({
  trendCounts,
  selectedCountry,
  onSelectCountry,
  activeTrend,
  onDismissTrend,
}: WorldMapProps) => {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>("map");

  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const avgCount = useMemo(() => {
    const vals = Object.values(trendCounts).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
  }, [trendCounts]);

  const getBulletProps = (count: number) => {
    if (count === 0) return { r: 3.5, color: "hsl(210, 60%, 60%)", glow: false };
    const intensity = count / maxCount;
    const isPeak = count > avgCount;
    let color = "hsl(210, 80%, 55%)";
    if (intensity > 0.33) color = "hsl(45, 100%, 50%)";
    if (intensity > 0.66) color = "hsl(0, 80%, 55%)";
    const r = isPeak ? 5 + intensity * 5 : 3.5 + intensity * 2;
    return { r, color, glow: isPeak };
  };

  const viewStyles: Record<MapView, { bg: string; continent: string; continentOpacity: number; border: string }> = {
    map: { bg: "hsl(210, 30%, 96%)", continent: "hsl(210, 15%, 88%)", continentOpacity: 0.9, border: "hsl(210, 10%, 82%)" },
    satellite: { bg: "hsl(220, 30%, 12%)", continent: "hsl(140, 25%, 28%)", continentOpacity: 0.85, border: "hsl(140, 20%, 20%)" },
    terrain: { bg: "hsl(40, 30%, 92%)", continent: "hsl(100, 25%, 72%)", continentOpacity: 0.85, border: "hsl(80, 15%, 60%)" },
  };
  const vs = viewStyles[mapView];

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* Map view toggle */}
      <div className="absolute top-3 right-3 z-10 flex rounded-lg overflow-hidden border border-border shadow-sm">
        {(["map", "satellite", "terrain"] as MapView[]).map((view) => (
          <button
            key={view}
            onClick={() => setMapView(view)}
            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
              mapView === view
                ? "bg-primary text-primary-foreground"
                : "bg-card/90 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t(view)}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 800 420"
        className="w-full h-full flex-1"
        preserveAspectRatio="xMidYMid meet"
        style={{ background: vs.bg, transition: "background 0.3s" }}
      >
        {/* Grid lines for satellite/terrain */}
        {mapView !== "map" && (
          <g opacity={0.1}>
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 60} x2="800" y2={i * 60} stroke={vs.border} strokeWidth={0.5} />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 65} y1="0" x2={i * 65} y2="420" stroke={vs.border} strokeWidth={0.5} />
            ))}
          </g>
        )}

        {/* Continents */}
        {continentPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={vs.continent}
            stroke={vs.border}
            strokeWidth={0.8}
            opacity={vs.continentOpacity}
            style={{ transition: "fill 0.3s, opacity 0.3s" }}
          />
        ))}

        {/* Bullet points */}
        {mapPoints.map((pt) => {
          const count = trendCounts[pt.id] || 0;
          const { r, color, glow } = getBulletProps(count);
          const isSelected = selectedCountry === pt.id;
          const isHov = hovered === pt.id;

          return (
            <g
              key={pt.id}
              className="cursor-pointer"
              onClick={() => onSelectCountry(pt.id === selectedCountry ? "global" : pt.id)}
              onMouseEnter={() => setHovered(pt.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {glow && (
                <>
                  <circle cx={pt.cx} cy={pt.cy} r={r} fill="none" stroke={color} strokeWidth={1} opacity={0.3}>
                    <animate attributeName="r" values={`${r};${r + 14}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={pt.cx} cy={pt.cy} r={r} fill="none" stroke={color} strokeWidth={0.8} opacity={0.2}>
                    <animate attributeName="r" values={`${r};${r + 9}`} dur="2s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0" dur="2s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {isSelected && (
                <circle cx={pt.cx} cy={pt.cy} r={r + 4} fill="none" stroke="hsl(var(--primary))" strokeWidth={2}>
                  <animate attributeName="r" values={`${r + 4};${r + 16}`} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              <circle
                cx={pt.cx}
                cy={pt.cy}
                r={isHov || isSelected ? r + 1.5 : r}
                fill={color}
                opacity={0.9}
                className="transition-all duration-300"
                style={glow ? { filter: `drop-shadow(0 0 ${r}px ${color})` } : {}}
              />

              <circle cx={pt.cx} cy={pt.cy} r={Math.max(r * 0.3, 1.2)} fill="white" opacity={0.7} className="pointer-events-none" />

              {isHov && (
                <g className="pointer-events-none">
                  <rect
                    x={pt.cx - 48}
                    y={pt.cy - r - 26}
                    width={96}
                    height={20}
                    rx={6}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
                  />
                  <text
                    x={pt.cx}
                    y={pt.cy - r - 13}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={mapView === "satellite" ? "white" : "hsl(var(--foreground))"}
                  >
                    {pt.name} · {count} {t("trendCount")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Active trend mini-card overlay */}
      {activeTrend && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg max-w-xs w-[90%] animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer"
          onClick={onDismissTrend}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary">{activeTrend.platform}</span>
            <span className="text-xs text-muted-foreground">{activeTrend.time}</span>
          </div>
          <p className="text-sm font-semibold text-foreground line-clamp-2">{activeTrend.title}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="volume-badge py-0">{activeTrend.volume}</span>
            <span className={activeTrend.changePositive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
              {activeTrend.change}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">{t("clickToClose")}</p>
        </div>
      )}
    </div>
  );
};

export default WorldMapPlaceholder;
