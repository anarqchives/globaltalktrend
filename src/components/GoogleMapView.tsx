/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Map, Flame, Globe, RefreshCw, GitBranch, Heart, X, Plus, Minus } from "lucide-react";

// Tipos locais para evitar dependência do arquivo map-visualizations
type Sentiment = "positive" | "negative" | "mixed" | "neutral";

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

// Funções auxiliares (versão simplificada para não depender de map-visualizations)
const computeFlowArcs = (trends: TrendCardProps[], countryPoints: CountryPoint[]): FlowArc[] => {
  // Versão simplificada - retorna array vazio se não houver dados suficientes
  return [];
};

const computeSentimentBubbles = (trends: TrendCardProps[], countryPoints: CountryPoint[]): SentimentBubble[] => {
  // Versão simplificada - retorna array vazio se não houver dados suficientes
  return [];
};

const computeCurvePoints = (lat1: number, lng1: number, lat2: number, lng2: number, offset: number) => {
  return [{ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }];
};

interface CountryPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const countryPoints: CountryPoint[] = [
  // Americas
  { id: "BR", name: "Brasil", lat: -14.24, lng: -51.93 },
  { id: "US", name: "EUA", lat: 37.09, lng: -95.71 },
  { id: "CA", name: "Canadá", lat: 56.13, lng: -106.35 },
  { id: "MX", name: "México", lat: 23.63, lng: -102.55 },
  { id: "AR", name: "Argentina", lat: -38.42, lng: -63.62 },
  { id: "CO", name: "Colômbia", lat: 4.57, lng: -74.3 },
  { id: "CL", name: "Chile", lat: -35.68, lng: -71.54 },
  { id: "PE", name: "Peru", lat: -9.19, lng: -75.02 },
  { id: "VE", name: "Venezuela", lat: 6.42, lng: -66.59 },
  // Europe
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
  // Africa
  { id: "ZA", name: "África do Sul", lat: -30.56, lng: 22.94 },
  { id: "NG", name: "Nigéria", lat: 9.08, lng: 8.68 },
  { id: "EG", name: "Egito", lat: 26.82, lng: 30.8 },
  { id: "KE", name: "Quênia", lat: -0.02, lng: 37.91 },
  { id: "MA", name: "Marrocos", lat: 31.79, lng: -7.09 },
  { id: "ET", name: "Etiópia", lat: 9.15, lng: 40.49 },
  // Asia
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
  // Oceania
  { id: "AU", name: "Austrália", lat: -25.27, lng: 133.78 },
  { id: "NZ", name: "Nova Zelândia", lat: -40.9, lng: 174.89 },
];

type MapViewType = "roadmap" | "satellite" | "terrain";
type MapMode = "heatmap" | "flow" | "sentiment";

// Apple Maps–inspired light style
const lightStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fa" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#a0afc0" }, { weight: 1 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#2d3748" }] },
  { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e0" }, { weight: 0.5 }] },
  { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d4e7ff" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f7fa" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#edf2f7" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#e9eef3" }] },
];

// Apple Maps–inspired dark style
const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#131620" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#131620" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#2d3348" }, { weight: 0.5 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1121" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#131620" }] },
  { featureType: "landscape.man_made", stylers: [{ visibility: "off" }] },
];

// Vibrant gradient-based color system
function getMarkerColor(intensity: number): { fill: string; glow: string; ring: string } {
  if (intensity > 0.8) return { fill: "#ff3300", glow: "rgba(255,51,0,0.45)", ring: "#ff6633" };
  if (intensity > 0.6) return { fill: "#ffaa00", glow: "rgba(255,170,0,0.4)", ring: "#ffcc44" };
  if (intensity > 0.4) return { fill: "#facc15", glow: "rgba(250,204,21,0.35)", ring: "#fde047" };
  if (intensity > 0.2) return { fill: "#00ff9d", glow: "rgba(0,255,157,0.3)", ring: "#4ade80" };
  return { fill: "#00a6ff", glow: "rgba(0,166,255,0.3)", ring: "#38bdf8" };
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

// Update notification component
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
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const hoverInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapRef = useRef<any>(null);
  const prevCountsRef = useRef<Record<string, number>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [openInfoCountry, setOpenInfoCountry] = useState<string | null>(null);
  const openInfoCountryRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapViewType, setMapViewType] = useState<MapViewType>("roadmap");
  const [mapMode, setMapModeRaw] = useState<MapMode>("heatmap");
  const [modeTransitioning, setModeTransitioning] = useState(false);
  const heatmapEnabled = mapMode === "heatmap";
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);
  const flowPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const flowHoverInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const sentimentMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const sentimentCirclesRef = useRef<google.maps.Circle[]>([]);
  const rafIdsRef = useRef<number[]>([]);

  const cancelAllRafs = useCallback(() => {
    rafIdsRef.current.forEach(id => cancelAnimationFrame(id));
    rafIdsRef.current = [];
  }, []);

  const trackRaf = useCallback((id: number) => {
    rafIdsRef.current.push(id);
    return id;
  }, []);

  // Smooth mode transition
  const setMapMode = useCallback((mode: MapMode) => {
    if (mode === mapMode) return;
    setModeTransitioning(true);
    setTimeout(() => {
      setMapModeRaw(mode);
      setTimeout(() => setModeTransitioning(false), 200);
    }, 150);
  }, [mapMode]);

  // Track updates for notification
  useEffect(() => {
    const prev = prevCountsRef.current;
    const prevKeys = Object.keys(prev).filter(k => prev[k] > 0);
    const curKeys = Object.keys(trendCounts).filter(k => trendCounts[k] > 0);
    if (prevKeys.length > 0) {
      let changed = 0;
      let newT = 0;
      curKeys.forEach(k => {
        if ((trendCounts[k] || 0) !== (prev[k] || 0)) changed++;
        newT += Math.max(0, (trendCounts[k] || 0) - (prev[k] || 0));
      });
      if (changed > 0) {
        setUpdateNotif({ countries: changed, trends: newT });
        const timer = setTimeout(() => setUpdateNotif(null), 5000);
      }
    }
    prevCountsRef.current = { ...trendCounts };
  }, [trendCounts]);

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Update styles when dark mode changes
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapViewType === "roadmap") {
      googleMapRef.current.setOptions({ styles: isDark ? darkStyles : lightStyles });
    }
  }, [isDark, mapLoaded, mapViewType]);

  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const avgCount = useMemo(() => {
    const vals = Object.values(trendCounts).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
  }, [trendCounts]);
  const activeCountries = useMemo(() => Object.values(trendCounts).filter(v => v > 0).length, [trendCounts]);
  const totalTrends = useMemo(() => Object.values(trendCounts).reduce((a, b) => a + b, 0), [trendCounts]);

  const retryMap = useCallback(() => {
    setMapError(null);
    setMapLoaded(false);
    setMapRetry((r) => r + 1);
  }, []);

  // Load Google Maps (CORRIGIDO)
  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
      try {
        const CACHE_KEY = "gtt_maps_api_key";
        let apiKey = sessionStorage.getItem(CACHE_KEY);
        if (!apiKey) {
          console.log("🔄 Buscando chave da API...");
          const { data, error: fnError } = await supabase.functions.invoke("get-maps-key");
          if (cancelled) return;
          if (fnError || !data?.key) {
            console.error("❌ Erro ao obter chave:", fnError);
            setMapError("Chave do mapa indisponível para este domínio");
            return;
          }
          apiKey = data.key;
          sessionStorage.setItem(CACHE_KEY, apiKey!);
        }
        if (cancelled || !apiKey) {
          console.error("❌ Sem chave de API");
          return;
        }

        console.log("✅ Chave obtida, carregando mapa...");

        // Configurar a chave
        setOptions({ key: apiKey, v: "weekly" });

        // Importar bibliotecas necessárias
        const { Map } = (await google.maps.importLibrary("maps")) as any;
        const { InfoWindow } = (await google.maps.importLibrary("maps")) as any;
        const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as any;

        if (!mapRef.current) {
          console.error("❌ mapRef.current é null");
          return;
        }

        console.log("✅ Bibliotecas carregadas, criando mapa...");

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
        console.log("✅ Mapa carregado com sucesso!");
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Erro no carregamento do mapa:", err);
          setMapError("Falha ao carregar mapa");
        }
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, [mapRetry, isDark]);

  // Fallback timeout
  useEffect(() => {
    if (mapLoaded || mapError) return;
    const timer = window.setTimeout(() => setMapError("Mapa indisponível no momento"), 12000);
    return () => window.clearTimeout(timer);
  }, [mapLoaded, mapError]);

  // Pan to selected/highlighted country
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;
    if (selectedCountry === "global") {
      map.panTo({ lat: 20, lng: 0 });
      map.setZoom(2);
      return;
    }
    const cp = countryPoints.find((c) => c.id === selectedCountry);
    if (cp) {
      map.panTo({ lat: cp.lat, lng: cp.lng });
      map.setZoom(5);
    }
  }, [selectedCountry, mapLoaded]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded || !highlightCountry) return;
    const cp = countryPoints.find((c) => c.id === highlightCountry);
    if (cp) {
      map.panTo({ lat: cp.lat, lng: cp.lng });
      map.setZoom(5);
    }
  }, [highlightCountry, mapLoaded]);

  // Map type change
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapViewType);
      if (mapViewType === "roadmap") {
        googleMapRef.current.setOptions({ styles: isDark ? darkStyles : lightStyles });
      }
    }
  }, [mapViewType, mapLoaded, isDark]);

  const mapModes: { key: MapMode; icon: typeof Flame; labelKey: string }[] = [
    { key: "heatmap", icon: Flame, labelKey: "mapHeatmap" },
    { key: "flow", icon: GitBranch, labelKey: "mapFlowMap" },
    { key: "sentiment", icon: Heart, labelKey: "mapSentiment" },
  ];

  const modeBtnBase = "relative z-10 h-7 px-3 rounded-full transition-colors duration-200 outline-none inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase";

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Map toolbar */}
      <div className="absolute top-0 left-0 right-0 z-[5] h-9 flex items-center px-2 bg-white/90 dark:bg-card/90 backdrop-blur-lg border-b border-border/20 pointer-events-auto">
        <div className="relative flex items-center gap-0 p-0.5 rounded-lg pointer-events-auto">
          {mapModes.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setMapMode(key)}
              className={`${modeBtnBase} ${
                mapMode === key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title={t(labelKey as any)}
            >
              {mapMode === key && (
                <motion.div
                  layoutId="map-mode-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{t(labelKey as any)}</span>
              </span>
            </button>
          ))}
          {selectedCountry !== "global" && (
            <button
              onClick={() => {
                onSelectCountry("global");
                googleMapRef.current?.panTo({ lat: 20, lng: 0 });
                googleMapRef.current?.setZoom(2.5);
              }}
              className={`${modeBtnBase} text-muted-foreground hover:text-foreground`}
              title={t("global")}
            >
              <Globe className="w-3 h-3" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors pointer-events-auto ml-1"
              title={t("mapCloseMap")}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Update notification */}
      <AnimatePresence>
        {updateNotif && <UpdateNotification countriesUpdated={updateNotif.countries} newTrends={updateNotif.trends} onDismiss={() => setUpdateNotif(null)} />}
      </AnimatePresence>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Custom zoom controls */}
      {mapLoaded && (
        <div className={`absolute z-20 flex flex-col gap-1 ${isMobile ? 'bottom-24 right-2' : 'bottom-[100px] right-3'}`}>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
            className={`${isMobile ? 'w-11 h-11' : 'w-9 h-9'} rounded-lg bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/30 shadow-sm flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-card transition-colors`}
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
            className={`${isMobile ? 'w-11 h-11' : 'w-9 h-9'} rounded-lg bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/30 shadow-sm flex items-center justify-center text-foreground hover:bg-white dark:hover:bg-card transition-colors`}
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode transition fade overlay */}
      <AnimatePresence>
        {modeTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="absolute inset-0 z-[3] bg-background/20 backdrop-blur-[2px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">{t("mapLoadingMap")}</span>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm">
          <div className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs">
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <p className="text-xs text-muted-foreground/60 mb-4">{t("mapReconnectMsg")}</p>
            <button onClick={retryMap} className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm">
              🔄 {t("mapRetry")}
            </button>
          </div>
        </div>
      )}

      {/* Active trend indicator */}
      {activeTrend && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] px-4 py-2 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer z-10"
          onClick={onDismissTrend}
        >
          <p className="text-[11px] font-medium text-foreground truncate">{activeTrend.title}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{activeTrend.platform} · {activeTrend.volume} · {t("clickToClose")}</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
