/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Flame, Globe, RefreshCw, GitBranch, Heart, X, Plus, Minus } from "lucide-react";

// Tipos
type Sentiment = "positive" | "negative" | "mixed" | "neutral";
type MapMode = "heatmap" | "flow" | "sentiment";

interface CountryPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface FlowArc {
  originId: string;
  originName: string;
  destId: string;
  destName: string;
  trendTitle: string;
  volume: number;
  sentiment: Sentiment;
  timeDelta: number;
  similarity: number;
}

interface SentimentBubble {
  countryId: string;
  countryName: string;
  volume: number;
  growth: number;
  sentiment: { positive: number; negative: number; neutral: number; mixed: number };
  dominantSentiment: Sentiment;
  trendCount: number;
  topTrends: Array<{ title: string; sentiment: Sentiment; volume: number }>;
}

const sentimentColors: Record<Sentiment, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  mixed: "#f59e0b",
  neutral: "#6b7280",
};

// Pontos dos países (lista completa)
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

// Estilos do mapa
const lightStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fa" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#a0afc0" }, { weight: 1 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#2d3748" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d4e7ff" }] },
];

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#131620" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#131620" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#2d3348" }, { weight: 0.5 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1121" }] },
];

function getMarkerColor(intensity: number): { fill: string; glow: string } {
  if (intensity > 0.8) return { fill: "#ff3300", glow: "rgba(255,51,0,0.45)" };
  if (intensity > 0.6) return { fill: "#ffaa00", glow: "rgba(255,170,0,0.4)" };
  if (intensity > 0.4) return { fill: "#facc15", glow: "rgba(250,204,21,0.35)" };
  if (intensity > 0.2) return { fill: "#00ff9d", glow: "rgba(0,255,157,0.3)" };
  return { fill: "#00a6ff", glow: "rgba(0,166,255,0.3)" };
}

// Componente principal
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
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const hoverInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("heatmap");
  const [modeTransitioning, setModeTransitioning] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);
  const prevCountsRef = useRef<Record<string, number>>({});

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
        const { HeatmapLayer } = (await google.maps.importLibrary("visualization")) as any;

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
          backgroundColor: isDark ? "#131620" : "#f0f0f0",
        });

        googleMapRef.current = map;
        infoWindowRef.current = new InfoWindow();
        hoverInfoRef.current = new InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch (err) {
        if (!cancelled) setMapError("Falha ao carregar mapa");
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, [mapRetry, isDark]);

  // Atualizar tooltip de hover
  const showHoverTooltip = useCallback((country: CountryPoint, intensity: number) => {
    if (!hoverInfoRef.current || !googleMapRef.current) return;

    const count = trendCounts[country.id] || 0;
    const criticality = intensity > 0.8 ? "🔥 CRÍTICO" : intensity > 0.6 ? "⚡ ALTO" : intensity > 0.4 ? "📊 MODERADO" : "ℹ️ NORMAL";
    const bg = isDark ? "rgba(19,22,32,0.97)" : "rgba(255,255,255,0.97)";
    const text = isDark ? "#e2e8f0" : "#111827";
    const border = isDark ? "rgba(45,51,72,0.5)" : "rgba(0,0,0,0.08)";

    const flag = country.id.length === 2 
      ? String.fromCodePoint(...[...country.id.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
      : "";

    hoverInfoRef.current.setContent(`
      <div style="font-family:Inter,sans-serif;padding:12px 16px;min-width:200px;background:${bg};color:${text};border-radius:16px;backdrop-filter:blur(16px);border:1px solid ${border};">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:24px;">${flag}</span>
          <div>
            <div style="font-weight:600;font-size:14px;">${country.name}</div>
            <div style="font-size:11px;color:#94a3b8;">${count} trends ativas</div>
          </div>
        </div>
        <div style="font-size:11px;background:${intensity > 0.8 ? '#ef4444' : intensity > 0.6 ? '#f97316' : '#eab308'};color:#fff;padding:2px 8px;border-radius:12px;display:inline-block;margin-bottom:8px;">
          ${criticality}
        </div>
        <div style="font-size:11px;color:${isDark ? '#94a3b8' : '#475569'};margin-bottom:8px;">Clique para ver detalhes</div>
      </div>
    `);

    hoverInfoRef.current.open({
      map: googleMapRef.current,
      anchor: new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: googleMapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
      }),
    });
  }, [trendCounts, isDark]);

  // Renderizar visualizações do mapa
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;

    // Limpar marcadores antigos
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    if (mapMode === "heatmap") {
      renderHeatmap();
    } else if (mapMode === "sentiment") {
      renderSentimentMarkers();
    } else if (mapMode === "flow") {
      renderFlowArcs();
    }
  }, [mapMode, mapLoaded, trendCounts]);

  const renderHeatmap = useCallback(async () => {
    if (!googleMapRef.current) return;

    try {
      const { HeatmapLayer } = (await google.maps.importLibrary("visualization")) as any;
      
      // Gerar dados para o heatmap
      const heatmapData = countryPoints
        .filter(country => trendCounts[country.id] > 0)
        .flatMap(country => {
          const count = trendCounts[country.id];
          const intensity = Math.min(count / maxCount, 1);
          // Criar múltiplos pontos ponderados pela intensidade
          return Array(Math.max(1, Math.round(intensity * 10)))
            .fill(null)
            .map(() => ({
              location: new google.maps.LatLng(country.lat, country.lng),
              weight: intensity,
            }));
        });

      heatmapRef.current = new HeatmapLayer({
        data: heatmapData,
        map: googleMapRef.current,
        radius: 30,
        opacity: 0.7,
      });

      // Adicionar marcadores customizados
      countryPoints.forEach(country => {
        const count = trendCounts[country.id] || 0;
        if (count === 0) return;

        const intensity = Math.min(count / maxCount, 1);
        const colors = getMarkerColor(intensity);

        const marker = new google.maps.Marker({
          position: { lat: country.lat, lng: country.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8 + intensity * 12,
            fillColor: colors.fill,
            fillOpacity: 0.9,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          title: `${country.name}: ${count} trends`,
        });

        marker.addListener("click", () => onSelectCountry(country.id));
        marker.addListener("mouseover", () => showHoverTooltip(country, intensity));
        marker.addListener("mouseout", () => hoverInfoRef.current?.close());

        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Erro ao renderizar heatmap:", err);
    }
  }, [trendCounts, maxCount, onSelectCountry, showHoverTooltip]);

  const renderSentimentMarkers = useCallback(() => {
    if (!googleMapRef.current) return;

    countryPoints.forEach(country => {
      const count = trendCounts[country.id] || 0;
      if (count === 0) return;

      const intensity = Math.min(count / maxCount, 1);
      // Placeholder: usar sentimento neutro por padrão
      const sentiment: Sentiment = "neutral";
      const color = sentimentColors[sentiment];

      const marker = new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8 + intensity * 12,
          fillColor: color,
          fillOpacity: 0.85,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: `${country.name}: ${count} trends`,
      });

      marker.addListener("click", () => onSelectCountry(country.id));
      marker.addListener("mouseover", () => showHoverTooltip(country, intensity));
      marker.addListener("mouseout", () => hoverInfoRef.current?.close());

      markersRef.current.push(marker);
    });
  }, [trendCounts, maxCount, onSelectCountry, showHoverTooltip]);

  const renderFlowArcs = useCallback(() => {
    if (!googleMapRef.current) return;

    // Placeholder: renderizar marcadores simples por enquanto
    countryPoints.forEach(country => {
      const count = trendCounts[country.id] || 0;
      if (count === 0) return;

      const intensity = Math.min(count / maxCount, 1);

      const marker = new google.maps.Marker({
        position: { lat: country.lat, lng: country.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6 + intensity * 10,
          fillColor: "#3b82f6",
          fillOpacity: 0.7,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: `${country.name}: ${count} trends`,
      });

      marker.addListener("click", () => onSelectCountry(country.id));
      marker.addListener("mouseover", () => showHoverTooltip(country, intensity));
      marker.addListener("mouseout", () => hoverInfoRef.current?.close());

      markersRef.current.push(marker);
    });
  }, [trendCounts, maxCount, onSelectCountry, showHoverTooltip]);

  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const activeCountries = useMemo(() => Object.values(trendCounts).filter(v => v > 0).length, [trendCounts]);
  const totalTrends = useMemo(() => Object.values(trendCounts).reduce((a, b) => a + b, 0), [trendCounts]);

  const mapModes: { key: MapMode; icon: typeof Flame; labelKey: string }[] = [
    { key: "heatmap", icon: Flame, labelKey: "Heatmap" },
    { key: "flow", icon: GitBranch, labelKey: "Fluxo" },
    { key: "sentiment", icon: Heart, labelKey: "Sentimento" },
  ];

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex gap-1 bg-white/90 dark:bg-card/90 backdrop-blur-xl rounded-lg p-1 border border-border/30 shadow-sm">
        {mapModes.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            onClick={() => {
              setModeTransitioning(true);
              setTimeout(() => {
                setMapMode(key);
                setModeTransitioning(false);
              }, 150);
            }}
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
          </button>
        ))}
        {selectedCountry !== "global" && (
          <button
            onClick={() => onSelectCountry("global")}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            Global
          </button>
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
        <div className={`absolute z-20 flex flex-col gap-1 ${isMobile ? 'bottom-24 right-2' : 'bottom-[100px] right-3'}`}>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
            className="w-9 h-9 rounded-lg bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/30 shadow-sm flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-card transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
            className="w-9 h-9 rounded-lg bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/30 shadow-sm flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-card transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
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
            className="absolute inset-0 z-[3] bg-background/20 backdrop-blur-[2px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Loading */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">Carregando mapa…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm">
          <div className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs">
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Tente recarregar</p>
            <button
              onClick={() => setMapRetry(r => r + 1)}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            >
              🔄 Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/30 rounded-lg p-2 text-[10px] text-muted-foreground">
        {mapMode === "heatmap" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-20 h-2 rounded-full bg-gradient-to-r from-[#00a6ff] via-[#00ff9d] via-[#ffff00] via-[#ffaa00] to-[#ff3300]" />
              <span>Baixo → Alto volume</span>
            </div>
            <div className="flex gap-3 text-[9px]">
              <span>🔥 Máx: {maxCount}</span>
              <span>🌍 {activeCountries} países</span>
              <span>📊 {totalTrends} trends</span>
            </div>
          </>
        )}
        {mapMode === "flow" && (
          <div className="text-[10px]">🌊 Fluxo de tendências entre países</div>
        )}
        {mapMode === "sentiment" && (
          <div className="text-[10px]">💭 Cores = sentimento · Tamanho = volume</div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapView;
