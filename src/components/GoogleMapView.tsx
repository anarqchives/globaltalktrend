/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Flame, Globe, RefreshCw, GitBranch, Heart, X, Plus, Minus } from "lucide-react";
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

type MapMode = "heatmap" | "flow" | "sentiment";

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
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
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

function getHeatmapColor(intensity: number): string {
  if (intensity > 0.85) return "#ff2d00";
  if (intensity > 0.7) return "#ff8c00";
  if (intensity > 0.55) return "#ffc107";
  if (intensity > 0.4) return "#00d4aa";
  if (intensity > 0.25) return "#00a8ff";
  return "#0066cc";
}

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
    initial={{ x: 100, opacity: 0, scale: 0.95 }}
    animate={{ x: 0, opacity: 1, scale: 1 }}
    exit={{ x: 100, opacity: 0, scale: 0.95 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className="absolute top-3 right-3 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl px-4 py-3 shadow-xl"
  >
    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
      <RefreshCw className="w-4 h-4 text-primary animate-spin" />
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-foreground">Mapa atualizado</span>
      <span className="text-[10px] text-muted-foreground">{countriesUpdated} países · {newTrends} trends</span>
    </div>
    <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs ml-1 transition-colors">✕</button>
  </motion.div>
);

const RichTooltip = ({ country, count, sentiment, topTrends, intensity, isDark }: {
  country: CountryPoint;
  count: number;
  sentiment: { positive: number; negative: number; neutral: number; mixed: number };
  topTrends: Array<{ title: string; sentiment: Sentiment; volume: number }>;
  intensity: number;
  isDark: boolean;
}) => {
  const total = Object.values(sentiment).reduce((a, b) => a + b, 0) || 1;
  const sentimentPerc = {
    positive: Math.round((sentiment.positive / total) * 100),
    negative: Math.round((sentiment.negative / total) * 100),
    neutral: Math.round((sentiment.neutral / total) * 100),
    mixed: Math.round((sentiment.mixed / total) * 100),
  };

  const flag = String.fromCodePoint(...[...country.id.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  const criticality = intensity > 0.8 ? "🔥 CRÍTICO" : intensity > 0.6 ? "⚡ ALTO" : intensity > 0.4 ? "📊 MODERADO" : "ℹ️ NORMAL";
  const criticalityColor = intensity > 0.8 ? "#ef4444" : intensity > 0.6 ? "#f97316" : intensity > 0.4 ? "#eab308" : "#6b7280";

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "16px",
      minWidth: "280px",
      background: isDark ? "rgba(17,24,39,0.98)" : "rgba(255,255,255,0.98)",
      color: isDark ? "#e2e8f0" : "#111827",
      borderRadius: "16px",
      backdropFilter: "blur(20px)",
      border: `1.5px solid ${isDark ? "rgba(71,84,103,0.4)" : "rgba(0,0,0,0.08)"}`,
      boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.4)" : "0 20px 40px rgba(0,0,0,0.1)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span style={{ fontSize: "28px" }}>{flag}</span>
        <div>
          <div style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "-0.3px" }}>{country.name}</div>
          <div style={{ fontSize: "12px", color: isDark ? "#cbd5e1" : "#6b7280", marginTop: "2px" }}>{count} trends ativas</div>
        </div>
      </div>

      {/* Criticality Badge */}
      <div style={{
        fontSize: "11px",
        fontWeight: "600",
        background: criticalityColor,
        color: "#fff",
        padding: "4px 10px",
        borderRadius: "12px",
        display: "inline-block",
        marginBottom: "12px",
      }}>
        {criticality}
      </div>

      {/* Sentiment Distribution */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: "600", color: isDark ? "#cbd5e1" : "#4b5563", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sentimento</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {sentimentPerc.positive > 0 && <div style={{ fontSize: "11px", background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "6px", fontWeight: "500" }}>😊 {sentimentPerc.positive}%</div>}
          {sentimentPerc.negative > 0 && <div style={{ fontSize: "11px", background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: "6px", fontWeight: "500" }}>😠 {sentimentPerc.negative}%</div>}
          {sentimentPerc.mixed > 0 && <div style={{ fontSize: "11px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "2px 8px", borderRadius: "6px", fontWeight: "500" }}>😐 {sentimentPerc.mixed}%</div>}
          {sentimentPerc.neutral > 0 && <div style={{ fontSize: "11px", background: "rgba(107,114,128,0.15)", color: "#9ca3af", padding: "2px 8px", borderRadius: "6px", fontWeight: "500" }}>😶 {sentimentPerc.neutral}%</div>}
        </div>
      </div>

      {/* Top Trends */}
      {topTrends.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: isDark ? "#cbd5e1" : "#4b5563", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Top Trends</div>
          {topTrends.slice(0, 3).map((t, i) => (
            <div key={i} style={{ fontSize: "11px", marginBottom: "4px", padding: "4px 0", display: "flex", gap: "6px", alignItems: "flex-start" }}>
              <span style={{ color: sentimentColors[t.sentiment], fontWeight: "700", minWidth: "16px" }}>●</span>
              <span style={{ flex: 1, lineHeight: "1.3" }}>{t.title.slice(0, 45)}{t.title.length > 45 ? "..." : ""}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "10px", color: isDark ? "#94a3b8" : "#6b7280", marginTop: "8px", textAlign: "center", paddingTop: "8px", borderTop: `1px solid ${isDark ? "rgba(71,84,103,0.2)" : "rgba(0,0,0,0.05)"}` }}>
        Clique para ver detalhes
      </div>
    </div>
  );
};

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
  const polyinesRef = useRef<google.maps.Polyline[]>([]);
  const flowParticlesRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("heatmap");
  const [modeTransitioning, setModeTransitioning] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);

  // Detectar modo escuro
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Carregar mapa
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

  // Computar bolhas de sentimento e arcos de fluxo
  const sentimentBubbles = useMemo(() => 
    computeSentimentBubbles(trends, countryPoints),
    [trends]
  );

  const flowArcs = useMemo(() => 
    computeFlowArcs(trends, countryPoints, 0.55),
    [trends]
  );

  // Tooltip rico
  const showRichTooltip = useCallback((country: CountryPoint, intensity: number, bubble?: SentimentBubble) => {
    if (!hoverInfoRef.current || !googleMapRef.current) return;

    const count = trendCounts[country.id] || 0;
    const countryTrends = trends.filter(t => t.countryCode === country.id);
    const topTrends = countryTrends
      .slice(0, 3)
      .map(t => ({ title: t.title, sentiment: deriveSentiment(t), volume: parseInt(String(t.volume || 0).replace(/[^0-9]/g, "")) || 0 }));

    const sentiment = bubble ? bubble.sentiment : { positive: 0, negative: 0, neutral: 0, mixed: 0 };

    hoverInfoRef.current.setContent(
      `<div id="rich-tooltip">${new XMLSerializer().serializeToString(
        document.createElement("div")
      )}</div>`
    );

    // Render com React
    const el = document.createElement("div");
    const root = ReactDOM.createRoot(el);
    root.render(
      <RichTooltip
        country={country}
        count={count}
        sentiment={sentiment}
        topTrends={topTrends}
        intensity={intensity}
        isDark={isDark}
      />
    );

    hoverInfoRef.current.setContent(el);
    hoverInfoRef.current.open({
      map: googleMapRef.current,
      anchor: new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: googleMapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
      }),
    });
  }, [trendCounts, trends, isDark]);

  // Renderizar heatmap com animações fluidas
  const renderHeatmap = useCallback(async () => {
    if (!googleMapRef.current) return;

    try {
      const { HeatmapLayer } = (await google.maps.importLibrary("visualization")) as any;

      // Limpar antigos
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (heatmapRef.current) heatmapRef.current.setMap(null);

      // Gerar dados do heatmap
      const heatmapData = countryPoints
        .filter(c => trendCounts[c.id] > 0)
        .flatMap(c => {
          const count = trendCounts[c.id];
          const intensity = Math.min(count / maxCount, 1);
          return Array(Math.max(1, Math.ceil(intensity * 12)))
            .fill(null)
            .map((_, i) => {
              const offsetLat = (Math.random() - 0.5) * 4;
              const offsetLng = (Math.random() - 0.5) * 4;
              return {
                location: new google.maps.LatLng(c.lat + offsetLat, c.lng + offsetLng),
                weight: intensity * (1 - i / 12),
              };
            });
        });

      heatmapRef.current = new HeatmapLayer({
        data: heatmapData,
        map: googleMapRef.current,
        radius: 40,
        opacity: 0.8,
        gradient: [
          "#0066cc",
          "#00a8ff",
          "#00d4aa",
          "#ffc107",
          "#ff8c00",
          "#ff2d00",
        ],
      });

      // Adicionar marcadores com pulsação
      countryPoints.forEach((c, idx) => {
        const count = trendCounts[c.id] || 0;
        if (count === 0) return;

        const intensity = Math.min(count / maxCount, 1);
        const color = getHeatmapColor(intensity);
        const scale = 6 + intensity * 16;

        const marker = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale,
            fillColor: color,
            fillOpacity: 0.85,
            strokeColor: "#fff",
            strokeWeight: 2.5,
          },
          title: `${c.name}: ${count} trends`,
          zIndex: Math.round(intensity * 1000),
        });

        marker.addListener("click", () => onSelectCountry(c.id));
        marker.addListener("mouseover", () => {
          marker.setIcon({
            ...marker.getIcon(),
            scale: scale * 1.15,
            fillOpacity: 0.95,
          } as any);
          showRichTooltip(c, intensity);
        });
        marker.addListener("mouseout", () => {
          marker.setIcon({
            ...marker.getIcon(),
            scale,
            fillOpacity: 0.85,
          } as any);
          hoverInfoRef.current?.close();
        });

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Erro ao renderizar heatmap:", err);
    }
  }, [trendCounts, maxCount, onSelectCountry, showRichTooltip]);

  // Renderizar modo sentimento com bolhas pulsantes
  const renderSentimentMarkers = useCallback(() => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    sentimentBubbles.forEach((bubble) => {
      const c = countryPoints.find(p => p.id === bubble.countryId);
      if (!c || bubble.volume === 0) return;

      const intensity = Math.min(bubble.volume / maxCount, 1);
      const color = sentimentColors[bubble.dominantSentiment];
      const scale = 8 + intensity * 14;
      const pulseDuration = 1.2 - intensity * 0.6; // Quanto mais crescimento, mais rápido

      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: `${c.name}: ${bubble.volume} trends`,
        zIndex: Math.round(intensity * 1000),
      });

      // Animação de pulsação com CSS
      const el = marker.getDiv() as HTMLElement;
      if (el) {
        el.style.animation = `pulse ${pulseDuration}s cubic-bezier(0.25, 0.1, 0.25, 1) infinite`;
      }

      marker.addListener("click", () => onSelectCountry(c.id));
      marker.addListener("mouseover", () => showRichTooltip(c, intensity, bubble));
      marker.addListener("mouseout", () => hoverInfoRef.current?.close());

      markersRef.current.push(marker);
    });
  }, [sentimentBubbles, maxCount, onSelectCountry, showRichTooltip]);

  // Renderizar fluxos com partículas animadas
  const renderFlowArcs = useCallback(() => {
    if (!googleMapRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polyinesRef.current.forEach(p => p.setMap(null));
    polyinesRef.current = [];
    flowParticlesRef.current.forEach(p => p.setMap?.(null));
    flowParticlesRef.current = [];

    // Renderizar arcos
    flowArcs.forEach((arc) => {
      const origin = countryPoints.find(p => p.id === arc.originId);
      const dest = countryPoints.find(p => p.id === arc.destId);
      if (!origin || !dest) return;

      const curvePoints = computeCurvePoints(origin.lat, origin.lng, dest.lat, dest.lng, 50);
      const color = sentimentColors[arc.sentiment] || "#9ca3b8";
      const strokeWeight = 1 + (arc.volume / maxCount) * 3;

      const polyline = new google.maps.Polyline({
        path: curvePoints.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: false,
        strokeColor: color,
        strokeOpacity: 0.6,
        strokeWeight,
        map: googleMapRef.current,
        zIndex: 1,
      });

      polyinesRef.current.push(polyline);

      // Partículas fluindo
      const particleCount = Math.max(2, Math.round((arc.volume / maxCount) * 5));
      for (let i = 0; i < particleCount; i++) {
        const particle = new google.maps.Marker({
          position: { lat: origin.lat, lng: origin.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 2 + (arc.volume / maxCount) * 2,
            fillColor: color,
            fillOpacity: 0.7,
            strokeColor: "#fff",
            strokeWeight: 0.5,
          },
          zIndex: 10,
        });

        const startTime = Date.now() + i * 200;
        const duration = 3000 - (arc.similarity * 1000);

        const animateParticle = () => {
          const elapsed = Date.now() - startTime;
          const progress = (elapsed % duration) / duration;
          const point = curvePoints[Math.floor(progress * (curvePoints.length - 1))];

          if (point) {
            particle.setPosition({ lat: point.lat, lng: point.lng });
          }

          if (!particle.getMap()) return;
          requestAnimationFrame(animateParticle);
        };

        animateParticle();
        flowParticlesRef.current.push(particle);
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
          scale: 5 + intensity * 8,
          fillColor: "#3b82f6",
          fillOpacity: 0.7,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => onSelectCountry(c.id));
      marker.addListener("mouseover", () => showRichTooltip(c, intensity));
      marker.addListener("mouseout", () => hoverInfoRef.current?.close());

      markersRef.current.push(marker);
    });
  }, [flowArcs, trendCounts, maxCount, onSelectCountry, showRichTooltip]);

  // Efeito: renderizar quando modo muda
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    if (mapMode === "heatmap") {
      renderHeatmap();
    } else if (mapMode === "sentiment") {
      renderSentimentMarkers();
    } else if (mapMode === "flow") {
      renderFlowArcs();
    }
  }, [mapMode, mapLoaded, renderHeatmap, renderSentimentMarkers, renderFlowArcs]);

  const mapModes: { key: MapMode; icon: typeof Flame; labelKey: string }[] = [
    { key: "heatmap", icon: Flame, labelKey: "Heatmap" },
    { key: "flow", icon: GitBranch, labelKey: "Fluxo" },
    { key: "sentiment", icon: Heart, labelKey: "Sentimento" },
  ];

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.95; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex gap-1 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl rounded-xl p-1 border border-border/40 shadow-lg">
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
            className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mapMode === key
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-1.5"
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
        <div className={`absolute z-20 flex flex-col gap-2 ${isMobile ? 'bottom-24 right-3' : 'bottom-[120px] right-3'}`}>
          <motion.button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-lg bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border border-border/40 shadow-lg flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-lg bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border border-border/40 shadow-lg flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-slate-900 transition-colors"
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
            className="absolute inset-0 z-[5] bg-background/10 backdrop-blur-sm pointer-events-none"
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full" />
            <span className="text-sm font-medium text-muted-foreground">Carregando mapa…</span>
          </motion.div>
        </motion.div>
      )}

      {/* Error */}
      {mapError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="text-center p-8 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/40 shadow-xl max-w-xs"
          >
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-sm font-semibold text-foreground mb-2">{mapError}</p>
            <p className="text-xs text-muted-foreground/70 mb-6">Tente recarregar</p>
            <motion.button
              onClick={() => setMapRetry(r => r + 1)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
            >
              🔄 Tentar novamente
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-3 left-3 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border border-border/40 rounded-xl p-3 text-[10px] text-muted-foreground shadow-lg"
      >
        {mapMode === "heatmap" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-[#0066cc] via-[#ffc107] to-[#ff2d00]" />
              <span className="font-medium">Intensidade</span>
            </div>
            <div className="flex gap-4 text-[9px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600" />Crítico</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />Alto</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" />Normal</span>
            </div>
            <div className="flex gap-3 text-[9px] mt-2 pt-2 border-t border-border/30">
              <span>🔥 Máx: {maxCount}</span>
              <span>🌍 {activeCountries} países</span>
              <span>📊 {totalTrends} trends</span>
            </div>
          </>
        )}
        {mapMode === "flow" && (
          <div className="text-[11px] font-medium">🌊 Fluxo de propagação entre países</div>
        )}
        {mapMode === "sentiment" && (
          <div className="text-[11px] font-medium">💭 Pulsação = sentimento dominante</div>
        )}
      </motion.div>
    </div>
  );
};

export default GoogleMapView;
