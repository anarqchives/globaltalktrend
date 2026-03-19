/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Flame, Globe, RefreshCw, GitBranch, Heart, Plus, Minus, Map as MapIcon } from "lucide-react";
import { 
  computeFlowArcs, 
  computeSentimentBubbles, 
  computeCurvePoints,
  deriveSentiment,
  sentimentColors,
  type Sentiment,
  type FlowArc,
  type SentimentBubble
} from "@/lib/map-visualizations";

type MapMode = "heatmap" | "flow" | "sentiment" | "choropleth";

interface CountryPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const countryPoints: CountryPoint[] = [
  { id: "BR", name: "Brasil", lat: -14.24, lng: -51.93 },
  { id: "US", name: "EUA", lat: 37.09, lng: -95.71 },
  { id: "CA", name: "Canadá", lat: 56.13, lng: -106.35 },
  { id: "MX", name: "México", lat: 23.63, lng: -102.55 },
  { id: "AR", name: "Argentina", lat: -38.42, lng: -63.62 },
  { id: "CO", name: "Colômbia", lat: 4.57, lng: -74.3 },
  { id: "CL", name: "Chile", lat: -35.68, lng: -71.54 },
  { id: "PE", name: "Peru", lat: -9.19, lng: -75.02 },
  { id: "VE", name: "Venezuela", lat: 6.42, lng: -66.59 },
  { id: "GB", name: "Reino Unido", lat: 55.38, lng: -3.44 },
  { id: "FR", name: "França", lat: 46.23, lng: 2.21 },
  { id: "DE", name: "Alemanha", lat: 51.17, lng: 10.45 },
  { id: "ES", name: "Espanha", lat: 40.46, lng: -3.75 },
  { id: "IT", name: "Itália", lat: 41.87, lng: 12.57 },
  { id: "PT", name: "Portugal", lat: 39.4, lng: -8.22 },
  { id: "NL", name: "Holanda", lat: 52.13, lng: 5.29 },
  { id: "PL", name: "Polônia", lat: 51.92, lng: 19.15 },
  { id: "SE", name: "Suécia", lat: 60.13, lng: 18.64 },
  { id: "NO", name: "Noruega", lat: 60.47, lng: 8.47 },
  { id: "UA", name: "Ucrânia", lat: 48.38, lng: 31.17 },
  { id: "RU", name: "Rússia", lat: 61.52, lng: 105.32 },
  { id: "TR", name: "Turquia", lat: 38.96, lng: 35.24 },
  { id: "ZA", name: "África do Sul", lat: -30.56, lng: 22.94 },
  { id: "NG", name: "Nigéria", lat: 9.08, lng: 8.68 },
  { id: "EG", name: "Egito", lat: 26.82, lng: 30.8 },
  { id: "KE", name: "Quênia", lat: -0.02, lng: 37.91 },
  { id: "MA", name: "Marrocos", lat: 31.79, lng: -7.09 },
  { id: "ET", name: "Etiópia", lat: 9.15, lng: 40.49 },
  { id: "JP", name: "Japão", lat: 36.2, lng: 138.25 },
  { id: "KR", name: "Coreia do Sul", lat: 35.91, lng: 127.77 },
  { id: "IN", name: "Índia", lat: 20.59, lng: 78.96 },
  { id: "CN", name: "China", lat: 35.86, lng: 104.2 },
  { id: "ID", name: "Indonésia", lat: -0.79, lng: 113.92 },
  { id: "PH", name: "Filipinas", lat: 12.88, lng: 121.77 },
  { id: "TH", name: "Tailândia", lat: 15.87, lng: 100.99 },
  { id: "VN", name: "Vietnã", lat: 14.06, lng: 108.28 },
  { id: "SA", name: "Arábia Saudita", lat: 23.89, lng: 45.08 },
  { id: "AE", name: "Emirados Árabes", lat: 23.42, lng: 53.85 },
  { id: "PK", name: "Paquistão", lat: 30.38, lng: 69.35 },
  { id: "PS", name: "Palestina", lat: 31.95, lng: 35.23 },
  { id: "IR", name: "Irã", lat: 32.43, lng: 53.69 },
  { id: "IQ", name: "Iraque", lat: 33.22, lng: 43.68 },
  { id: "SY", name: "Síria", lat: 34.8, lng: 38.99 },
  { id: "LB", name: "Líbano", lat: 33.85, lng: 35.86 },
  { id: "JO", name: "Jordânia", lat: 30.59, lng: 36.24 },
  { id: "AU", name: "Austrália", lat: -25.27, lng: 133.78 },
  { id: "NZ", name: "Nova Zelândia", lat: -40.9, lng: 174.89 },
];

const lightStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f8fafb" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#d1d5db" }, { weight: 0.5 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e5f2ff" }] },
];

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1419" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1419" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }, { weight: 0.5 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c2847" }] },
];

interface GoogleMapViewProps {
  trendCounts: Record<string, number>;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  activeTrend?: TrendCardProps | null;
  onDismissTrend?: () => void;
  trends?: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  highlightCountry?: string | null;
  onClose?: () => void;
}

const UpdateNotification = ({ countriesUpdated, newTrends, onDismiss }: { countriesUpdated: number; newTrends: number; onDismiss: () => void }) => (
  <motion.div
    initial={{ x: 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 100, opacity: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className="absolute top-3 right-3 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-border/30 rounded-2xl px-4 py-3 shadow-lg"
  >
    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
      <RefreshCw className="w-4 h-4 text-primary animate-spin" />
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-foreground">Mapa atualizado</span>
      <span className="text-[10px] text-muted-foreground">{countriesUpdated} países · {newTrends} trends</span>
    </div>
    <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs ml-1">✕</button>
  </motion.div>
);

const HeatmapTooltip = React.memo(({ country, count, intensity, isDark }: {
  country: CountryPoint;
  count: number;
  intensity: number;
  isDark: boolean;
}) => {
  const criticality = intensity > 0.8 ? "🔥 CRÍTICO" : intensity > 0.6 ? "⚡ ALTO" : intensity > 0.4 ? "📊 MODERADO" : "ℹ️ NORMAL";
  const bgColor = intensity > 0.8 ? "#ef4444" : intensity > 0.6 ? "#f97316" : intensity > 0.4 ? "#eab308" : "#6b7280";
  const flag = String.fromCodePoint(...[...country.id.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "12px 16px",
      minWidth: "200px",
      background: isDark ? "rgba(19,24,39,0.97)" : "rgba(255,255,255,0.97)",
      color: isDark ? "#e2e8f0" : "#111827",
      borderRadius: "16px",
      backdropFilter: "blur(16px)",
      border: `1px solid ${isDark ? "rgba(71,84,103,0.5)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "24px" }}>{flag}</span>
        <div>
          <div style={{ fontWeight: "600", fontSize: "14px" }}>{country.name}</div>
          <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#6b7280", marginTop: "2px" }}>{count} trends ativas</div>
        </div>
      </div>
      <div style={{
        fontSize: "11px",
        background: bgColor,
        color: "#fff",
        padding: "2px 8px",
        borderRadius: "12px",
        display: "inline-block",
        marginBottom: "8px",
        fontWeight: "600",
      }}>
        {criticality}
      </div>
      <div style={{
        fontSize: "11px",
        color: isDark ? "#94a3b8" : "#475569",
        marginBottom: "0px",
        marginTop: "8px",
      }}>
        Clique para ver detalhes
      </div>
    </div>
  );
});

HeatmapTooltip.displayName = "HeatmapTooltip";

const SentimentTooltip = React.memo(({ bubble, isDark, trends }: {
  bubble: SentimentBubble;
  isDark: boolean;
  trends: TrendCardProps[];
}) => {
  const total = Object.values(bubble.sentiment).reduce((a, b) => a + b, 0) || 1;
  const flag = String.fromCodePoint(...[...bubble.countryId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));

  const countryTrends = trends.filter(t => t.countryCode === bubble.countryId).slice(0, 3);

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "12px 16px",
      minWidth: "240px",
      background: isDark ? "rgba(19,24,39,0.97)" : "rgba(255,255,255,0.97)",
      color: isDark ? "#e2e8f0" : "#111827",
      borderRadius: "16px",
      backdropFilter: "blur(16px)",
      border: `1px solid ${isDark ? "rgba(71,84,103,0.5)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "24px" }}>{flag}</span>
        <div>
          <div style={{ fontWeight: "600", fontSize: "14px" }}>{bubble.countryName}</div>
          <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#6b7280" }}>{bubble.volume} tendências</div>
        </div>
      </div>

      <div style={{ marginBottom: "8px", fontSize: "11px" }}>
        <div style={{ fontWeight: "600", marginBottom: "4px", color: isDark ? "#cbd5e1" : "#4b5563" }}>Sentimento</div>
        <div style={{ display: "flex", gap: "4px" }}>
          {Math.round((bubble.sentiment.positive / total) * 100) > 0 && (
            <div style={{ fontSize: "10px", background: "rgba(16,185,129,0.2)", color: "#10b981", padding: "2px 6px", borderRadius: "4px" }}>
              😊 {Math.round((bubble.sentiment.positive / total) * 100)}%
            </div>
          )}
          {Math.round((bubble.sentiment.negative / total) * 100) > 0 && (
            <div style={{ fontSize: "10px", background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px" }}>
              😠 {Math.round((bubble.sentiment.negative / total) * 100)}%
            </div>
          )}
          {Math.round((bubble.sentiment.mixed / total) * 100) > 0 && (
            <div style={{ fontSize: "10px", background: "rgba(245,158,11,0.2)", color: "#f59e0b", padding: "2px 6px", borderRadius: "4px" }}>
              😐 {Math.round((bubble.sentiment.mixed / total) * 100)}%
            </div>
          )}
        </div>
      </div>

      {countryTrends.length > 0 && (
        <div style={{ fontSize: "11px" }}>
          <div style={{ fontWeight: "600", marginBottom: "4px", color: isDark ? "#cbd5e1" : "#4b5563" }}>Top Trends</div>
          {countryTrends.map((t, i) => (
            <div key={i} style={{ fontSize: "10px", marginBottom: "2px", color: isDark ? "#cbd5e1" : "#374151" }}>
              • {t.title.slice(0, 40)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

SentimentTooltip.displayName = "SentimentTooltip";

const FlowTooltip = React.memo(({ arc, isDark }: {
  arc: FlowArc;
  isDark: boolean;
}) => {
  const originFlag = String.fromCodePoint(...[...arc.originId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  const destFlag = String.fromCodePoint(...[...arc.destId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "12px 16px",
      minWidth: "260px",
      background: isDark ? "rgba(19,24,39,0.97)" : "rgba(255,255,255,0.97)",
      color: isDark ? "#e2e8f0" : "#111827",
      borderRadius: "16px",
      backdropFilter: "blur(16px)",
      border: `1px solid ${isDark ? "rgba(71,84,103,0.5)" : "rgba(0,0,0,0.08)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <span style={{ fontSize: "20px" }}>{originFlag}</span>
        <div style={{ fontSize: "11px", fontWeight: "600" }}>{arc.originName}</div>
        <span style={{ fontSize: "12px", color: isDark ? "#64748b" : "#9ca3af" }}>→</span>
        <span style={{ fontSize: "20px" }}>{destFlag}</span>
        <div style={{ fontSize: "11px", fontWeight: "600" }}>{arc.destName}</div>
      </div>

      <div style={{ fontSize: "11px", marginBottom: "6px", lineHeight: "1.4" }}>
        <div style={{ fontWeight: "600", color: isDark ? "#cbd5e1" : "#4b5563" }}>{arc.trendTitle.slice(0, 50)}...</div>
      </div>

      <div style={{ fontSize: "10px", display: "flex", gap: "8px", color: isDark ? "#cbd5e1" : "#6b7280" }}>
        <span>📊 Vol: {arc.volume}</span>
        <span>⏱️ {arc.timeDelta.toFixed(1)}h</span>
        <span style={{ color: sentimentColors[arc.sentiment] }}>● {arc.sentiment}</span>
      </div>
    </div>
  );
});

FlowTooltip.displayName = "FlowTooltip";

const GoogleMapView = ({
  trendCounts,
  selectedCountry,
  onSelectCountry,
  activeTrend,
  onDismissTrend,
  trends = [],
  onSelectTrend,
  highlightCountry,
  onClose,
}: GoogleMapViewProps) => {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const hoverInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const particleAnimationsRef = useRef<number[]>([]);
  const geoJsonLoadedRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("heatmap");
  const [modeTransitioning, setModeTransitioning] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
      try {
        const CACHE_KEY = "gtt_maps_api_key";
        let apiKey = sessionStorage.getItem(CACHE_KEY);
        if (!apiKey) {
          const { data, error } = await supabase.functions.invoke("get-maps-key");
          if (cancelled) return;
          if (error || !data?.key) {
            setMapError("Chave do mapa indisponível");
            return;
          }
          apiKey = data.key;
          sessionStorage.setItem(CACHE_KEY, apiKey);
        }

        setOptions({ key: apiKey, v: "weekly" });

        const { Map } = (await google.maps.importLibrary("maps")) as any;
        const { InfoWindow } = (await google.maps.importLibrary("maps")) as any;

        if (!mapRef.current) return;

        const map = new Map(mapRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2.5,
          minZoom: 2,
          maxZoom: 8,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeId: "roadmap",
          styles: isDark ? darkStyles : lightStyles,
          gestureHandling: "greedy",
          backgroundColor: isDark ? "#0f1419" : "#f8fafb",
        });

        googleMapRef.current = map;
        hoverInfoRef.current = new InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch (err) {
        if (!cancelled) setMapError("Falha ao carregar mapa");
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, [mapRetry, isDark]);

  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const activeCountries = useMemo(() => Object.values(trendCounts).filter(v => v > 0).length, [trendCounts]);
  const totalTrends = useMemo(() => Object.values(trendCounts).reduce((a, b) => a + b, 0), [trendCounts]);

  const sentimentBubbles = useMemo(() => computeSentimentBubbles(trends, countryPoints), [trends]);
  const flowArcs = useMemo(() => computeFlowArcs(trends, countryPoints, 0.55), [trends]);

  const showTooltip = useCallback((content: React.ReactNode, position: { lat: number; lng: number }) => {
    if (!hoverInfoRef.current || !googleMapRef.current) return;

    const div = document.createElement("div");
    import("react-dom/client").then(({ createRoot }) => {
      const root = createRoot(div);
      root.render(content);
    });

    hoverInfoRef.current.setContent(div);
    hoverInfoRef.current.setPosition(position);
    hoverInfoRef.current.open(googleMapRef.current);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEATMAP RENDERING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderHeatmap = useCallback(async () => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (heatmapRef.current) heatmapRef.current.setMap(null);
    if (googleMapRef.current && geoJsonLoadedRef.current) googleMapRef.current.data.setStyle({ visible: false });

    try {
      const { HeatmapLayer } = (await google.maps.importLibrary("visualization")) as any;

      const heatmapData = countryPoints
        .filter(c => trendCounts[c.id] > 0)
        .flatMap(c => {
          const count = trendCounts[c.id];
          const intensity = Math.min(count / maxCount, 1);
          return Array(Math.max(2, Math.ceil(intensity * 15)))
            .fill(null)
            .map(() => ({
              location: new google.maps.LatLng(
                c.lat + (Math.random() - 0.5) * 3,
                c.lng + (Math.random() - 0.5) * 3
              ),
              weight: intensity,
            }));
        });

      heatmapRef.current = new HeatmapLayer({
        data: heatmapData,
        map: googleMapRef.current,
        radius: 45,
        opacity: 0.75,
        gradient: [
          "#00a6ff",
          "#00a6ff",
          "#00ff9d",
          "#ffff00",
          "#ffaa00",
          "#ff3300",
        ],
      });

      // Marcadores no topo com glow sutil
      countryPoints.forEach(c => {
        const count = trendCounts[c.id] || 0;
        if (count === 0) return;

        const intensity = Math.min(count / maxCount, 1);
        const scale = 5 + intensity * 14;

        const marker = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale,
            fillColor: intensity > 0.85 ? "#ff3300" : intensity > 0.7 ? "#ffaa00" : intensity > 0.55 ? "#ffff00" : "#00ff9d",
            fillOpacity: 0.85,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: `${c.name}: ${count} trends`,
          zIndex: Math.floor(intensity * 1000),
        });

        const originalIcon = marker.getIcon() as google.maps.Symbol;

        marker.addListener("click", () => onSelectCountry(c.id));
        marker.addListener("mouseover", () => {
          marker.setIcon({
            ...originalIcon,
            scale: scale * 1.2,
            fillOpacity: 1,
          } as google.maps.Symbol);
          showTooltip(
            <HeatmapTooltip country={c} count={count} intensity={intensity} isDark={isDark} />,
            { lat: c.lat, lng: c.lng }
          );
        });
        marker.addListener("mouseout", () => {
          marker.setIcon({
            ...originalIcon,
            scale,
            fillOpacity: 0.85,
          } as google.maps.Symbol);
          hoverInfoRef.current?.close();
        });

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Erro ao renderizar heatmap:", err);
    }
  }, [trendCounts, maxCount, onSelectCountry, showTooltip, isDark]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SENTIMENT RENDERING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderSentimentMarkers = useCallback(() => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (googleMapRef.current && geoJsonLoadedRef.current) googleMapRef.current.data.setStyle({ visible: false });

    sentimentBubbles.forEach((bubble) => {
      const c = countryPoints.find(p => p.id === bubble.countryId);
      if (!c || bubble.volume === 0) return;

      const intensity = Math.min(bubble.volume / maxCount, 1);
      const color = sentimentColors[bubble.dominantSentiment];
      const scale = 6 + intensity * 12;
      const pulseSpeed = 3.5 - intensity * 1.5; // Mais rápido com crescimento

      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: `${c.name}: ${bubble.volume} trends`,
        zIndex: Math.floor(intensity * 1000),
      });

      const el = (marker as any).getDiv?.() as HTMLElement | undefined;
      if (el) {
        el.style.animation = `pulse-bubble ${pulseSpeed}s cubic-bezier(0.25, 0.1, 0.25, 1) infinite`;
      }

      marker.addListener("click", () => onSelectCountry(c.id));
      marker.addListener("mouseover", () => {
        showTooltip(
          <SentimentTooltip bubble={bubble} isDark={isDark} trends={trends} />,
          { lat: c.lat, lng: c.lng }
        );
      });
      marker.addListener("mouseout", () => {
        hoverInfoRef.current?.close();
      });

      markersRef.current.push(marker);
    });
  }, [sentimentBubbles, maxCount, onSelectCountry, showTooltip, isDark, trends]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FLOW RENDERING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderFlowArcs = useCallback(() => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    particleAnimationsRef.current.forEach(id => cancelAnimationFrame(id));
    particleAnimationsRef.current = [];
    if (googleMapRef.current && geoJsonLoadedRef.current) googleMapRef.current.data.setStyle({ visible: false });

    // Renderizar arcos
    flowArcs.forEach((arc) => {
      const origin = countryPoints.find(p => p.id === arc.originId);
      const dest = countryPoints.find(p => p.id === arc.destId);
      if (!origin || !dest) return;

      const curvePoints = computeCurvePoints(origin.lat, origin.lng, dest.lat, dest.lng, 50);
      const color = sentimentColors[arc.sentiment];
      const strokeWeight = 1.5 + (arc.volume / maxCount) * 3.5;

      const polyline = new google.maps.Polyline({
        path: curvePoints.map(p => new google.maps.LatLng(p.lat, p.lng)),
        geodesic: false,
        strokeColor: color,
        strokeOpacity: 0.65,
        strokeWeight,
        map: googleMapRef.current,
        zIndex: 2,
      });

      polyline.addListener("mouseover", () => {
        polyline.setOptions({ strokeOpacity: 0.9 });
        showTooltip(
          <FlowTooltip arc={arc} isDark={isDark} />,
          { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 }
        );
      });
      polyline.addListener("mouseout", () => {
        polyline.setOptions({ strokeOpacity: 0.65 });
        hoverInfoRef.current?.close();
      });

      polylinesRef.current.push(polyline);

      // Partículas fluindo
      const particleCount = Math.max(2, Math.ceil((arc.volume / maxCount) * 6));
      const duration = Math.max(2000, 4000 - arc.timeDelta * 100);

      for (let i = 0; i < particleCount; i++) {
        const particle = new google.maps.Marker({
          position: { lat: origin.lat, lng: origin.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 2.5 + (arc.volume / maxCount) * 2,
            fillColor: color,
            fillOpacity: 0.8,
            strokeColor: "rgba(255,255,255,0.8)",
            strokeWeight: 1,
          },
          zIndex: 10,
        });

        const delay = i * (duration / particleCount);
        const animateParticle = (startTime: number) => {
          const elapsed = Date.now() - startTime;
          const progress = ((elapsed - delay) % duration) / duration;

          if (progress >= 0 && progress <= 1) {
            const pointIndex = Math.floor(progress * (curvePoints.length - 1));
            const point = curvePoints[pointIndex];
            if (point) {
              particle.setPosition(new google.maps.LatLng(point.lat, point.lng));
            }
          }

          const id = requestAnimationFrame(() => animateParticle(startTime));
          particleAnimationsRef.current.push(id);
        };

        animateParticle(Date.now());
      }
    });

    // Marcadores nos países
    countryPoints.forEach(c => {
      const count = trendCounts[c.id] || 0;
      if (count === 0) return;

      const intensity = Math.min(count / maxCount, 1);
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4 + intensity * 6,
          fillColor: "#3b82f6",
          fillOpacity: 0.7,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
        },
      });

      marker.addListener("click", () => onSelectCountry(c.id));

      markersRef.current.push(marker);
    });
  }, [flowArcs, trendCounts, maxCount, onSelectCountry, showTooltip, isDark]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHOROPLETH RENDERING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderChoropleth = useCallback(() => {
    if (!googleMapRef.current) return;
    const map = googleMapRef.current;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    particleAnimationsRef.current.forEach(id => cancelAnimationFrame(id));
    particleAnimationsRef.current = [];
    if (heatmapRef.current) heatmapRef.current.setMap(null);

    if (!geoJsonLoadedRef.current) {
      map.data.loadGeoJson("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
      geoJsonLoadedRef.current = true;

      map.data.addListener("mouseover", (event: any) => {
        map.data.revertStyle();
        map.data.overrideStyle(event.feature, { strokeWeight: 2, strokeColor: isDark ? "#ffffff" : "#000000", zIndex: 10 });
        
        const isoA2 = event.feature.getProperty("ISO_A2");
        const count = trendCounts[isoA2] || 0;
        const countryName = event.feature.getProperty("ADMIN") || isoA2;
        
        if (count > 0 && isoA2 !== "-99") {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          const intensity = Math.min(count / maxCount, 1);
          
          showTooltip(
            <HeatmapTooltip country={{id: isoA2, name: countryName, lat, lng}} count={count} intensity={intensity} isDark={isDark} />,
            { lat, lng }
          );
        }
      });
      
      map.data.addListener("mouseout", () => {
        map.data.revertStyle();
        hoverInfoRef.current?.close();
      });

      map.data.addListener("click", (event: any) => {
        const isoA2 = event.feature.getProperty("ISO_A2");
        if (trendCounts[isoA2] > 0 && isoA2 !== "-99") {
           onSelectCountry(isoA2);
        }
      });
    }

    map.data.setStyle((feature) => {
      const isoA2 = feature.getProperty("ISO_A2");
      if (isoA2 === "-99" || !isoA2) return { visible: false };

      const count = trendCounts[isoA2] || 0;
      const intensity = Math.min(count / maxCount, 1);

      if (count > 0) {
        return {
          fillColor: intensity > 0.85 ? "#ff3300" : intensity > 0.7 ? "#ffaa00" : intensity > 0.55 ? "#ffff00" : "#00a6ff",
          fillOpacity: 0.5 + intensity * 0.4,
          strokeColor: isDark ? "#0f1419" : "#f8fafb",
          strokeWeight: 1,
          visible: true,
          zIndex: 1
        };
      } else {
        return {
          fillColor: isDark ? "#1e293b" : "#e2e8f0",
          fillOpacity: 0.15,
          strokeColor: isDark ? "#0f1419" : "#f8fafb",
          strokeWeight: 0.5,
          visible: true,
          zIndex: 0
        };
      }
    });

  }, [trendCounts, maxCount, showTooltip, onSelectCountry, isDark]);

  // Renderizar quando modo muda
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    if (mapMode === "heatmap") {
      renderHeatmap();
    } else if (mapMode === "sentiment") {
      renderSentimentMarkers();
    } else if (mapMode === "flow") {
      renderFlowArcs();
    } else if (mapMode === "choropleth") {
      renderChoropleth();
    }
  }, [mapMode, mapLoaded, renderHeatmap, renderSentimentMarkers, renderFlowArcs, renderChoropleth]);

  const mapModes: { key: MapMode; icon: typeof Flame; labelKey: string }[] = [
    { key: "choropleth", icon: MapIcon, labelKey: "Coroplético" },
    { key: "heatmap", icon: Flame, labelKey: "Heatmap" },
    { key: "flow", icon: GitBranch, labelKey: "Fluxo" },
    { key: "sentiment", icon: Heart, labelKey: "Sentimento" },
  ];

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      <style>{`
        @keyframes pulse-bubble {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>

      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-lg p-1 border border-border/30 shadow-md">
        {mapModes.map(({ key, icon: Icon, labelKey }) => (
          <motion.button
            key={key}
            onClick={() => {
              setModeTransitioning(true);
              setTimeout(() => {
                setMapMode(key);
                setModeTransitioning(false);
              }, 150);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mapMode === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {labelKey}
            </span>
          </motion.button>
        ))}
        {selectedCountry !== "global" && (
          <motion.button
            onClick={() => onSelectCountry("global")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Global
          </motion.button>
        )}
      </div>

      {/* Update notification */}
      <AnimatePresence>
        {updateNotif && (
          <UpdateNotification
            countriesUpdated={updateNotif.countries}
            newTrends={updateNotif.trends}
            onDismiss={() => setUpdateNotif(null)}
          />
        )}
      </AnimatePresence>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Zoom controls */}
      {mapLoaded && (
        <div className={`absolute z-20 flex flex-col gap-1 ${isMobile ? 'bottom-24 right-3' : 'bottom-[100px] right-3'}`}>
          <motion.button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-border/30 shadow-md flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-border/30 shadow-md flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </motion.button>
        </div>
      )}

      {/* Transition overlay */}
      <AnimatePresence>
        {modeTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-[5] bg-background/20 backdrop-blur-[2px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Loading */}
      {!mapLoaded && !mapError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10"
        >
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <span className="font-medium">Carregando mapa…</span>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {mapError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs"
          >
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Tente recarregar</p>
            <motion.button
              onClick={() => setMapRetry(r => r + 1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              🔄 Tentar novamente
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-border/30 rounded-lg p-2 text-[10px] text-muted-foreground shadow-md"
      >
        {mapMode === "heatmap" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-20 h-2 rounded-full bg-gradient-to-r from-[#00a6ff] via-[#ffff00] to-[#ff3300]" />
              <span>Baixo → Alto</span>
            </div>
            <div className="flex gap-3 text-[9px]">
              <span>🔥 Máx: {maxCount}</span>
              <span>🌍 {activeCountries} países</span>
              <span>📊 {totalTrends} trends</span>
            </div>
          </>
        )}
        {mapMode === "flow" && (
          <div className="text-[10px]">🌊 Propagação entre países</div>
        )}
        {mapMode === "sentiment" && (
          <div className="text-[10px]">💭 Pulsação = Sentimento</div>
        )}
      </motion.div>
    </div>
  );
};

export default GoogleMapView;
