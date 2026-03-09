/// <reference types="google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Map, Flame, Globe, RefreshCw, GitBranch, Heart, X } from "lucide-react";
import {
  computeFlowArcs, computeSentimentBubbles, computeCurvePoints,
  sentimentColors, type FlowArc, type SentimentBubble, type Sentiment,
} from "@/lib/map-visualizations";

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

function getIntensityLabel(intensity: number, t?: (key: any) => string): { label: string; tag: string; color: string } {
  if (intensity > 0.8) return { label: t?.("mapIntCritical") || "🔥 CRÍTICO", tag: t?.("mapIntCritical") || "🔥 CRÍTICO", color: "#ef4444" };
  if (intensity > 0.6) return { label: t?.("mapIntHigh") || "⚡ ALTO", tag: t?.("mapIntHigh") || "⚡ ALTO", color: "#f97316" };
  if (intensity > 0.4) return { label: t?.("mapIntModerate") || "📊 MODERADO", tag: t?.("mapIntModerate") || "📊 MODERADO", color: "#eab308" };
  if (intensity > 0.2) return { label: t?.("mapIntAttention") || "📈 ATENÇÃO", tag: t?.("mapIntAttention") || "📈 ATENÇÃO", color: "#3b82f6" };
  return { label: t?.("mapIntNormal") || "ℹ️ NORMAL", tag: t?.("mapIntNormal") || "ℹ️ NORMAL", color: "#94a3b8" };
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
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const rippleOverlaysRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const hoverInfoRef = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const prevCountsRef = useRef<Record<string, number>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [openInfoCountry, setOpenInfoCountry] = useState<string | null>(null);
  const openInfoCountryRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapViewType, setMapViewType] = useState<MapViewType>("roadmap");
  const [mapMode, setMapMode] = useState<MapMode>("heatmap");
  const heatmapEnabled = mapMode === "heatmap"; // derived from mapMode
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);
  const flowPolylinesRef = useRef<any[]>([]);
  const flowHoverInfoRef = useRef<any>(null);
  const sentimentMarkersRef = useRef<any[]>([]);
  const sentimentCirclesRef = useRef<any[]>([]);

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
        // cleanup not strictly needed but good practice
      }
    }
    prevCountsRef.current = { ...trendCounts };
  }, [trendCounts]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-maps-key");
        if (cancelled) return;
        if (fnError || !data?.key) {
          setMapError("Chave do mapa indisponível para este domínio");
          return;
        }
        setOptions({ key: data.key, v: "weekly", libraries: ["marker"] });
        const [mapsLib, markerLib] = await Promise.all([importLibrary("maps"), importLibrary("marker")]);
        let vizLib: any = null;
        try { vizLib = await importLibrary("visualization"); } catch { /* ok */ }
        if (cancelled || !mapRef.current) return;
        const { Map: GMap, InfoWindow } = mapsLib;
        const { Marker } = markerLib;
        googleRef.current = {
          maps: { Map: GMap, Marker, InfoWindow, SymbolPath: google.maps.SymbolPath, Animation: google.maps.Animation },
          visualization: vizLib,
        };
        const map = new GMap(mapRef.current, {
          center: { lat: 20, lng: 0 }, zoom: 2.5, minZoom: 2, maxZoom: 8,
          disableDefaultUI: true, zoomControl: true, zoomControlOptions: { position: 3 },
          mapTypeId: "roadmap", styles: isDark ? darkStyles : lightStyles,
          gestureHandling: "greedy", backgroundColor: isDark ? "#131620" : "#f0f0f0",
        });
        googleMapRef.current = map;
        infoWindowRef.current = new InfoWindow();
        hoverInfoRef.current = new InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch (err) {
        if (!cancelled) { console.error("Google Maps load error:", err); setMapError("Falha ao carregar mapa"); }
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, [mapRetry]);

  // Fallback timeout
  useEffect(() => {
    if (mapLoaded || mapError) return;
    const timer = window.setTimeout(() => setMapError("Mapa indisponível no momento"), 12000);
    return () => window.clearTimeout(timer);
  }, [mapLoaded, mapError]);

  // Heatmap with vibrant gradient
  useEffect(() => {
    const map = googleMapRef.current;
    const viz = googleRef.current?.visualization as any;
    if (!map || !mapLoaded || !viz?.HeatmapLayer) return;
    if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    const heatmapData = countryPoints
      .filter((cp) => (trendCounts[cp.id] || 0) > 0)
      .map((cp) => ({ location: new google.maps.LatLng(cp.lat, cp.lng), weight: (trendCounts[cp.id] || 1) * 3 }));
    if (heatmapData.length > 0) {
      const heatmap = new viz.HeatmapLayer({
        data: heatmapData,
        map: heatmapEnabled ? map : null,
        radius: 90,
        opacity: 0.7,
        dissipating: true,
        maxIntensity: 80,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(70, 130, 200, 0.1)",
          "rgba(100, 180, 255, 0.25)",
          "rgba(0, 200, 255, 0.4)",
          "rgba(0, 255, 200, 0.5)",
          "rgba(100, 255, 100, 0.55)",
          "rgba(255, 255, 0, 0.65)",
          "rgba(255, 150, 0, 0.75)",
          "rgba(255, 50, 0, 0.85)",
          "rgba(200, 0, 50, 0.95)",
        ],
      });
      heatmapRef.current = heatmap;
    }
  }, [trendCounts, mapLoaded]);

  // Sync heatmap visibility with mapMode
  useEffect(() => {
    if (heatmapRef.current) heatmapRef.current.setMap(mapMode === "heatmap" ? googleMapRef.current : null);
  }, [mapMode]);

  // ─── FLOW MAP rendering with enhanced animations ───
  const flowArcs = useMemo(() => computeFlowArcs(trends, countryPoints), [trends]);
  const [hoveredArcId, setHoveredArcId] = useState<string | null>(null);
  const [lockedArcId, setLockedArcId] = useState<string | null>(null);
  const flowOriginPulsesRef = useRef<any[]>([]);
  const flowParticlesRef = useRef<any[]>([]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;

    // Cleanup previous flow elements
    flowPolylinesRef.current.forEach(p => p.setMap(null));
    flowPolylinesRef.current = [];
    flowOriginPulsesRef.current.forEach(p => p.setMap(null));
    flowOriginPulsesRef.current = [];
    flowParticlesRef.current.forEach(p => p.setMap(null));
    flowParticlesRef.current = [];

    if (mapMode !== "flow") return;
    if (flowArcs.length === 0) return;

    if (!flowHoverInfoRef.current && googleRef.current) {
      flowHoverInfoRef.current = new googleRef.current.maps.InfoWindow({ disableAutoPan: true });
    }

    const g = googleRef.current;
    if (!g) return;

    const maxVol = Math.max(...flowArcs.map(a => a.volume), 1);

    flowArcs.forEach((arc, arcIndex) => {
      const cpOrigin = countryPoints.find(c => c.id === arc.originId);
      const cpDest = countryPoints.find(c => c.id === arc.destId);
      if (!cpOrigin || !cpDest) return;

      const arcId = `${arc.originId}-${arc.destId}-${arcIndex}`;
      const curvePoints = computeCurvePoints(cpOrigin.lat, cpOrigin.lng, cpDest.lat, cpDest.lng, 60);
      const path = curvePoints.map(p => ({ lat: p.lat, lng: p.lng }));
      const color = sentimentColors[arc.sentiment];
      const baseWeight = 2 + (arc.volume / maxVol) * 4;
      const baseOpacity = 0.35 + (arc.volume / maxVol) * 0.4;

      // Arc base line with subtle throbbing
      const polyline = new google.maps.Polyline({
        path,
        geodesic: false,
        strokeColor: color,
        strokeOpacity: baseOpacity,
        strokeWeight: baseWeight,
        map,
        zIndex: 5,
      });

      // Store original properties for hover effects
      (polyline as any)._arcId = arcId;
      (polyline as any)._baseOpacity = baseOpacity;
      (polyline as any)._baseWeight = baseWeight;

      // Soft glow underlayer for depth
      const glowLine = new google.maps.Polyline({
        path,
        geodesic: false,
        strokeColor: color,
        strokeOpacity: 0.15,
        strokeWeight: baseWeight * 2.5,
        map,
        zIndex: 4,
      });
      (glowLine as any)._arcId = arcId;

      // Subtle arc throbbing animation (scale 1.0 → 1.02)
      let throbStart = performance.now();
      const throbDuration = 2500 + Math.random() * 1000;
      const animateThrobbing = (now: number) => {
        if (!polyline.getMap()) return;
        const progress = ((now - throbStart) % throbDuration) / throbDuration;
        const throbScale = 1 + 0.02 * Math.sin(progress * Math.PI * 2);
        const throbOpacity = baseOpacity * (0.95 + 0.05 * Math.sin(progress * Math.PI * 2));
        polyline.setOptions({
          strokeWeight: baseWeight * throbScale,
          strokeOpacity: throbOpacity,
        });
        requestAnimationFrame(animateThrobbing);
      };
      requestAnimationFrame(animateThrobbing);

      // Particle flow animation (soft glowing dot traveling along arc)
      const particleSpeed = 0.3 + (1 - arc.timeDelta / 8) * 0.7; // 0.3-1.0 based on propagation speed
      const particleDuration = 6000 / particleSpeed;
      let particleStart = performance.now() - Math.random() * particleDuration;

      const particleMarker = new g.maps.Marker({
        map,
        position: path[0],
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: "#ffffff",
          fillOpacity: 0.9,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.8,
          scale: 4 + (arc.volume / maxVol) * 3,
        },
        zIndex: 8,
        optimized: false,
        clickable: false,
      });
      (particleMarker as any)._arcId = arcId;

      // Particle glow trail
      const particleGlow = new g.maps.Marker({
        map,
        position: path[0],
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.3,
          strokeOpacity: 0,
          scale: 12 + (arc.volume / maxVol) * 6,
        },
        zIndex: 7,
        optimized: false,
        clickable: false,
      });
      (particleGlow as any)._arcId = arcId;

      const animateParticle = (now: number) => {
        if (!particleMarker.getMap()) return;
        const elapsed = (now - particleStart) % particleDuration;
        const progress = elapsed / particleDuration;
        const pathIndex = Math.floor(progress * (path.length - 1));
        const nextIndex = Math.min(pathIndex + 1, path.length - 1);
        const localProgress = (progress * (path.length - 1)) % 1;
        
        // Interpolate position
        const lat = path[pathIndex].lat + (path[nextIndex].lat - path[pathIndex].lat) * localProgress;
        const lng = path[pathIndex].lng + (path[nextIndex].lng - path[pathIndex].lng) * localProgress;
        
        particleMarker.setPosition({ lat, lng });
        particleGlow.setPosition({ lat, lng });

        // Pulse the particle slightly
        const pulseScale = 1 + 0.15 * Math.sin(progress * Math.PI * 8);
        particleMarker.setIcon({
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: "#ffffff",
          fillOpacity: 0.85 + 0.1 * Math.sin(progress * Math.PI * 8),
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.8,
          scale: (4 + (arc.volume / maxVol) * 3) * pulseScale,
        });

        requestAnimationFrame(animateParticle);
      };
      requestAnimationFrame(animateParticle);

      // Origin country pulsing ripple
      const originPulse = new g.maps.Marker({
        map,
        position: { lat: cpOrigin.lat, lng: cpOrigin.lng },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.4,
          scale: 15,
        },
        zIndex: 3,
        optimized: false,
        clickable: false,
      });
      (originPulse as any)._arcId = arcId;

      let originPulseStart = performance.now();
      const originPulseDuration = 2000;
      const animateOriginPulse = (now: number) => {
        if (!originPulse.getMap()) return;
        const progress = ((now - originPulseStart) % originPulseDuration) / originPulseDuration;
        const scale = 15 + progress * 25;
        const opacity = 0.5 * (1 - progress);
        originPulse.setIcon({
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0,
          strokeColor: color,
          strokeWeight: 2 * (1 - progress * 0.5),
          strokeOpacity: opacity,
          scale,
        });
        requestAnimationFrame(animateOriginPulse);
      };
      requestAnimationFrame(animateOriginPulse);

      // Hover interactions
      const handleHover = (e: any, isEnter: boolean) => {
        if (isEnter) {
          setHoveredArcId(arcId);
          
          // Brighten this arc
          polyline.setOptions({
            strokeOpacity: Math.min(baseOpacity * 1.5, 1),
            strokeWeight: baseWeight * 1.3,
          });
          glowLine.setOptions({
            strokeOpacity: 0.35,
            strokeWeight: baseWeight * 3.5,
          });

          // Show tooltip with smooth animation styling
          if (flowHoverInfoRef.current && !isMobile) {
            const bg = isDark ? "rgba(19,22,32,0.97)" : "rgba(255,255,255,0.97)";
            const txt = isDark ? "#e2e8f0" : "#111827";
            const sub = isDark ? "#94a3b8" : "#6b7280";
            const border = isDark ? "rgba(45,51,72,0.5)" : "rgba(0,0,0,0.08)";
            const originFlag = arc.originId.length === 2 ? String.fromCodePoint(...[...arc.originId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
            const destFlag = arc.destId.length === 2 ? String.fromCodePoint(...[...arc.destId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';

            flowHoverInfoRef.current.setContent(`
              <div class="flow-tooltip-enter" style="font-family:Inter,system-ui,sans-serif;padding:14px 18px;min-width:220px;max-width:300px;background:${bg};color:${txt};border-radius:16px;backdrop-filter:blur(20px);border:1px solid ${border};box-shadow:0 12px 40px rgba(0,0,0,0.18);animation:tooltipEnter 0.25s cubic-bezier(0.25,0.1,0.25,1) forwards;">
                <style>
                  @keyframes tooltipEnter { from { opacity: 0; transform: translateY(6px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
                  @keyframes barGrow { from { width: 0; } }
                </style>
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;line-height:1.35;letter-spacing:-0.01em;">${arc.trendTitle.slice(0, 55)}${arc.trendTitle.length > 55 ? '…' : ''}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:${isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)'};border-radius:10px;">
                  <div style="text-align:center;">
                    <span style="font-size:20px;display:block;">${originFlag}</span>
                    <span style="font-size:9px;color:${sub};display:block;margin-top:2px;">${arc.originName}</span>
                  </div>
                  <div style="flex:1;display:flex;align-items:center;justify-content:center;">
                    <div style="height:2px;flex:1;background:linear-gradient(90deg,${color},${color}50);border-radius:1px;"></div>
                    <span style="font-size:14px;margin:0 6px;color:${color};">→</span>
                    <div style="height:2px;flex:1;background:linear-gradient(90deg,${color}50,${color});border-radius:1px;"></div>
                  </div>
                  <div style="text-align:center;">
                    <span style="font-size:20px;display:block;">${destFlag}</span>
                    <span style="font-size:9px;color:${sub};display:block;margin-top:2px;">${arc.destName}</span>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span style="background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:9px;font-weight:700;letter-spacing:0.3px;">${t("mapSent" + arc.sentiment.charAt(0).toUpperCase() + arc.sentiment.slice(1) as any)}</span>
                  <span style="font-size:10px;color:${sub};">~${arc.timeDelta}h ${t("mapFlowTimeDelta")}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:${isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.6)'};border-radius:8px;margin-bottom:8px;">
                  <span style="font-size:10px;color:${sub};">📊 ${arc.volume.toLocaleString()} ${t("mapMentions")}</span>
                  <span style="font-size:10px;color:${sub};">·</span>
                  <span style="font-size:10px;color:${sub};">${Math.round(arc.similarity * 100)}% ${t("mapSimilarity")}</span>
                </div>
                <div style="font-size:10px;color:${isDark ? '#60a5fa' : '#3b82f6'};text-align:center;font-weight:600;padding-top:8px;border-top:1px solid ${border};">👆 ${t("mapFlowClickToFilter")}</div>
              </div>
            `);
            flowHoverInfoRef.current.setPosition(e.latLng);
            flowHoverInfoRef.current.open(map);
          }
        } else {
          if (lockedArcId !== arcId) {
            setHoveredArcId(null);
            polyline.setOptions({
              strokeOpacity: baseOpacity,
              strokeWeight: baseWeight,
            });
            glowLine.setOptions({
              strokeOpacity: 0.15,
              strokeWeight: baseWeight * 2.5,
            });
          }
          flowHoverInfoRef.current?.close();
        }
      };

      polyline.addListener("mouseover", (e: any) => handleHover(e, true));
      polyline.addListener("mouseout", (e: any) => handleHover(e, false));
      glowLine.addListener("mouseover", (e: any) => handleHover(e, true));
      glowLine.addListener("mouseout", (e: any) => handleHover(e, false));

      // Click to filter with success animation
      const handleClick = () => {
        setLockedArcId(arcId);
        
        // Brief glow flash animation
        polyline.setOptions({
          strokeOpacity: 1,
          strokeWeight: baseWeight * 1.6,
        });
        glowLine.setOptions({
          strokeOpacity: 0.6,
          strokeWeight: baseWeight * 4,
        });

        setTimeout(() => {
          onSelectCountry(arc.originId);
          flowHoverInfoRef.current?.close();
          setLockedArcId(null);
          setHoveredArcId(null);
        }, 150);
      };

      polyline.addListener("click", handleClick);
      glowLine.addListener("click", handleClick);

      flowPolylinesRef.current.push(polyline, glowLine);
      flowOriginPulsesRef.current.push(originPulse);
      flowParticlesRef.current.push(particleMarker, particleGlow);
    });

    // Dim non-hovered arcs effect
    const updateArcVisibility = () => {
      if (!hoveredArcId && !lockedArcId) {
        // Reset all arcs to normal
        flowPolylinesRef.current.forEach(p => {
          const base = (p as any)._baseOpacity || 0.5;
          if (p.getOptions?.().strokeWeight > 5) {
            // It's a glow line
            p.setOptions({ strokeOpacity: 0.15 });
          }
        });
      }
    };
    
  }, [mapMode, flowArcs, mapLoaded, isDark, isMobile, t, onSelectCountry, lang]);

  // ─── SENTIMENT BUBBLE MAP rendering with enhanced animations ───
  const sentimentBubbles = useMemo(() => computeSentimentBubbles(trends, countryPoints), [trends]);
  const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null);
  const sentimentRipplesRef = useRef<any[]>([]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;

    // Cleanup previous sentiment overlays
    sentimentMarkersRef.current.forEach(m => m.setMap(null));
    sentimentMarkersRef.current = [];
    sentimentCirclesRef.current.forEach(c => c.setMap(null));
    sentimentCirclesRef.current = [];
    sentimentRipplesRef.current.forEach(r => r.setMap(null));
    sentimentRipplesRef.current = [];

    if (mapMode !== "sentiment") return;
    if (sentimentBubbles.length === 0) return;

    const g = googleRef.current;
    if (!g) return;

    const maxVol = Math.max(...sentimentBubbles.map(b => b.volume), 1);

    sentimentBubbles.forEach((bubble, bubbleIndex) => {
      const cp = countryPoints.find(c => c.id === bubble.countryId);
      if (!cp) return;

      const bubbleId = `${bubble.countryId}-${bubbleIndex}`;
      const color = sentimentColors[bubble.dominantSentiment];
      const logScale = Math.log10(Math.max(bubble.volume, 10)) / Math.log10(maxVol || 10);
      const baseRadius = 100000 + logScale * 550000;
      
      // Organic pulse: 3-4s cycle, speed modulated by growth
      const basePulseSpeed = 3500 - Math.min(bubble.growth, 100) * 15; // 2000-3500ms
      const pulseSpeed = Math.max(basePulseSpeed, 1800);

      // Main bubble circle with smooth color transitions
      const circle = new google.maps.Circle({
        center: { lat: cp.lat, lng: cp.lng },
        radius: baseRadius,
        fillColor: color,
        fillOpacity: 0.22,
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 0.55,
        map,
        zIndex: 3,
        clickable: true,
      });
      (circle as any)._bubbleId = bubbleId;
      (circle as any)._baseRadius = baseRadius;
      (circle as any)._color = color;

      // Inner glow circle for depth
      const innerGlow = new google.maps.Circle({
        center: { lat: cp.lat, lng: cp.lng },
        radius: baseRadius * 0.6,
        fillColor: color,
        fillOpacity: 0.12,
        strokeOpacity: 0,
        map,
        zIndex: 2,
        clickable: false,
      });

      // Organic pulsing animation (scale: 1.0 → 1.03 → 1.0)
      let pulseStart = performance.now() + Math.random() * pulseSpeed;
      let isPaused = false;
      
      const animateBubblePulse = (now: number) => {
        if (!circle.getMap()) return;
        
        if (!isPaused) {
          const elapsed = (now - pulseStart) % pulseSpeed;
          const progress = elapsed / pulseSpeed;
          // Smooth sine wave for organic feel
          const pulseScale = 1 + 0.03 * Math.sin(progress * Math.PI * 2);
          const opacityPulse = 0.22 + 0.04 * Math.sin(progress * Math.PI * 2);
          
          circle.setRadius(baseRadius * pulseScale);
          circle.setOptions({ fillOpacity: opacityPulse });
          innerGlow.setRadius(baseRadius * 0.6 * pulseScale);
        }
        
        requestAnimationFrame(animateBubblePulse);
      };
      requestAnimationFrame(animateBubblePulse);

      // Outer breathing ring
      const breathingRing = new g.maps.Marker({
        map,
        position: { lat: cp.lat, lng: cp.lng },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.08,
          strokeColor: color,
          strokeWeight: 1,
          strokeOpacity: 0.25,
          scale: 18 + logScale * 22,
        },
        clickable: false,
        zIndex: 1,
        optimized: false,
      });

      let breathStart = performance.now();
      const breathDuration = 4000;
      const animateBreathing = (now: number) => {
        if (!breathingRing.getMap()) return;
        const progress = ((now - breathStart) % breathDuration) / breathDuration;
        const baseScale = 18 + logScale * 22;
        const breathScale = baseScale * (1 + 0.15 * Math.sin(progress * Math.PI * 2));
        const breathOpacity = 0.08 + 0.04 * Math.sin(progress * Math.PI * 2);
        breathingRing.setIcon({
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: breathOpacity,
          strokeColor: color,
          strokeWeight: 1,
          strokeOpacity: 0.2 + 0.1 * Math.sin(progress * Math.PI * 2),
          scale: breathScale,
        });
        requestAnimationFrame(animateBreathing);
      };
      requestAnimationFrame(animateBreathing);

      // Flag label
      const flag = bubble.countryId.length === 2
        ? String.fromCodePoint(...[...bubble.countryId.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
        : "";

      const labelMarker = new g.maps.Marker({
        map,
        position: { lat: cp.lat, lng: cp.lng },
        label: { text: flag, fontSize: "20px" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillOpacity: 0,
          strokeOpacity: 0,
          scale: 0,
        },
        zIndex: 12,
        optimized: false,
      });

      // Hover ripple effect
      const hoverRipple = new g.maps.Marker({
        map: null, // Hidden by default
        position: { lat: cp.lat, lng: cp.lng },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.5,
          scale: 25,
        },
        zIndex: 0,
        optimized: false,
        clickable: false,
      });

      // Tooltip with staggered reveal animation
      const showTooltip = (anchor: any, isHover = false) => {
        if (!infoWindowRef.current) return;
        
        // Pause pulse on hover
        isPaused = isHover;
        
        // Expand bubble on hover
        if (isHover) {
          circle.setRadius(baseRadius * 1.08);
          circle.setOptions({ fillOpacity: 0.32, strokeWeight: 2.5 });
          
          // Show ripple
          hoverRipple.setMap(map);
          let rippleStart = performance.now();
          const animateRipple = (now: number) => {
            if (!hoverRipple.getMap()) return;
            const elapsed = now - rippleStart;
            if (elapsed > 800) {
              rippleStart = now;
            }
            const progress = Math.min(elapsed / 800, 1);
            const rippleScale = 30 + progress * 35;
            const rippleOpacity = 0.4 * (1 - progress);
            hoverRipple.setIcon({
              path: g.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 0,
              strokeColor: color,
              strokeWeight: 2 * (1 - progress * 0.5),
              strokeOpacity: rippleOpacity,
              scale: rippleScale,
            });
            requestAnimationFrame(animateRipple);
          };
          requestAnimationFrame(animateRipple);
        }

        const bg = isDark ? "rgba(19,22,32,0.97)" : "rgba(255,255,255,0.97)";
        const txt = isDark ? "#e2e8f0" : "#111827";
        const sub = isDark ? "#94a3b8" : "#6b7280";
        const border = isDark ? "rgba(45,51,72,0.5)" : "rgba(0,0,0,0.08)";

        // Animated sentiment bars
        const sentBar = (label: string, pct: number, barColor: string, delay: number) =>
          `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;opacity:0;animation:barFadeIn 0.3s ease ${delay}ms forwards;">
            <span style="font-size:9px;color:${sub};width:55px;">${label}</span>
            <div style="flex:1;height:7px;border-radius:4px;background:${isDark ? 'rgba(30,41,59,0.8)' : '#f1f5f9'};overflow:hidden;">
              <div style="width:0;height:100%;border-radius:4px;background:${barColor};animation:barGrow 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay + 100}ms forwards;" data-width="${Math.round(pct * 100)}%"></div>
            </div>
            <span style="font-size:9px;color:${sub};width:32px;text-align:right;font-weight:500;">${Math.round(pct * 100)}%</span>
          </div>`;

        const trendsHtml = bubble.topTrends.map((tr, i) =>
          `<div style="display:flex;align-items:center;gap:5px;padding:5px 0;opacity:0;animation:trendFadeIn 0.25s ease ${400 + i * 80}ms forwards;">
            <span style="width:7px;height:7px;border-radius:50%;background:${sentimentColors[tr.sentiment]};flex-shrink:0;box-shadow:0 0 6px ${sentimentColors[tr.sentiment]}40;"></span>
            <span style="font-size:10px;color:${txt};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;font-weight:450;">${tr.title.slice(0, 42)}${tr.title.length > 42 ? '…' : ''}</span>
          </div>`
        ).join('');

        const tooltipW = isMobile ? 'min-width:270px;max-width:92vw' : 'min-width:250px;max-width:290px';
        const fs = isMobile ? '13px' : '11px';

        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,system-ui,sans-serif;padding:${isMobile ? '18px' : '16px'};${tooltipW};background:${bg};color:${txt};border-radius:18px;backdrop-filter:blur(24px);border:1px solid ${border};box-shadow:0 16px 48px rgba(0,0,0,0.18);animation:tooltipEnter 0.3s cubic-bezier(0.25,0.1,0.25,1) forwards;">
            <style>
              @keyframes tooltipEnter { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
              @keyframes barFadeIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
              @keyframes barGrow { to { width: var(--target-width); } }
              @keyframes trendFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;animation:barFadeIn 0.25s ease forwards;">
              <span style="font-size:${isMobile ? '32px' : '26px'};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${flag}</span>
              <div style="flex:1;">
                <div style="font-size:${isMobile ? '17px' : '15px'};font-weight:700;letter-spacing:-0.02em;">${bubble.countryName}</div>
                <div style="font-size:10px;color:${sub};margin-top:1px;">${bubble.trendCount} ${t("mapSentActiveTrends")}</div>
              </div>
              <span style="background:linear-gradient(135deg,${color},${color}cc);color:#fff;padding:4px 12px;border-radius:14px;font-size:9px;font-weight:700;letter-spacing:0.4px;box-shadow:0 2px 8px ${color}40;">${t("mapSent" + bubble.dominantSentiment.charAt(0).toUpperCase() + bubble.dominantSentiment.slice(1) as any)}</span>
            </div>
            <div style="font-size:10px;font-weight:700;color:${txt};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;opacity:0;animation:barFadeIn 0.25s ease 100ms forwards;">${t("mapSentBreakdown")}</div>
            ${sentBar(t("mapSentPositive"), bubble.sentiment.positive, sentimentColors.positive, 150)}
            ${sentBar(t("mapSentNeutral"), bubble.sentiment.neutral, sentimentColors.neutral, 200)}
            ${sentBar(t("mapSentNegative"), bubble.sentiment.negative, sentimentColors.negative, 250)}
            ${sentBar(t("mapSentMixed"), bubble.sentiment.mixed, sentimentColors.mixed, 300)}
            ${bubble.topTrends.length > 0 ? `<div style="font-size:10px;font-weight:700;color:${txt};text-transform:uppercase;letter-spacing:0.6px;margin:12px 0 6px;opacity:0;animation:barFadeIn 0.25s ease 350ms forwards;">${t("mapSentTopTrends")}</div>${trendsHtml}` : ''}
            <div style="display:flex;gap:14px;margin-top:12px;padding-top:10px;border-top:1px solid ${border};opacity:0;animation:barFadeIn 0.3s ease 500ms forwards;">
              <div style="text-align:center;flex:1;">
                <div style="font-size:${isMobile ? '15px' : '13px'};font-weight:700;color:${txt};">${bubble.volume.toLocaleString()}</div>
                <div style="font-size:8px;color:${sub};text-transform:uppercase;letter-spacing:0.5px;">${t("mapSentVolume")}</div>
              </div>
              <div style="text-align:center;flex:1;">
                <div style="font-size:${isMobile ? '15px' : '13px'};font-weight:700;color:${bubble.growth > 0 ? sentimentColors.positive : sentimentColors.negative};">${bubble.growth > 0 ? '+' : ''}${Math.round(bubble.growth)}%</div>
                <div style="font-size:8px;color:${sub};text-transform:uppercase;letter-spacing:0.5px;">${t("mapSentGrowth")}</div>
              </div>
            </div>
            <button onclick="document.dispatchEvent(new CustomEvent('map-sentiment-filter',{detail:'${bubble.countryId}'}))" style="width:100%;background:linear-gradient(135deg,${isDark ? 'rgba(59,130,246,0.95)' : '#3b82f6'},${isDark ? 'rgba(37,99,235,0.95)' : '#2563eb'});color:white;border:none;border-radius:${isMobile ? '14px' : '10px'};padding:${isMobile ? '14px' : '10px'};font-size:${fs};font-weight:600;cursor:pointer;margin-top:10px;min-height:${isMobile ? '50px' : 'auto'};touch-action:manipulation;box-shadow:0 4px 12px rgba(59,130,246,0.3);transition:transform 0.15s ease,box-shadow 0.15s ease;opacity:0;animation:barFadeIn 0.3s ease 550ms forwards;" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 6px 16px rgba(59,130,246,0.4)';" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)';">${t("mapFlowClickToFilter")}</button>
          </div>
          <script>
            document.querySelectorAll('[data-width]').forEach(el => {
              el.style.setProperty('--target-width', el.getAttribute('data-width'));
            });
          </script>
        `);
        infoWindowRef.current.open({ anchor, map });
      };

      const hideTooltip = () => {
        isPaused = false;
        circle.setRadius(baseRadius);
        circle.setOptions({ fillOpacity: 0.22, strokeWeight: 2 });
        hoverRipple.setMap(null);
      };

      // Click with "pop" animation
      const handleClick = () => {
        // Pop animation
        const popStart = performance.now();
        const popDuration = 150;
        const animatePop = (now: number) => {
          const progress = Math.min((now - popStart) / popDuration, 1);
          // Elastic easing out
          const eased = 1 - Math.pow(1 - progress, 3);
          const popScale = progress < 0.5 
            ? 1 + 0.15 * (progress / 0.5)
            : 1.15 - 0.15 * ((progress - 0.5) / 0.5);
          circle.setRadius(baseRadius * popScale);
          circle.setOptions({ fillOpacity: 0.22 + 0.15 * (1 - eased) });
          
          if (progress < 1) {
            requestAnimationFrame(animatePop);
          }
        };
        requestAnimationFrame(animatePop);
        
        showTooltip(labelMarker, false);
      };

      labelMarker.addListener("click", handleClick);
      circle.addListener("click", handleClick);

      if (!isMobile) {
        labelMarker.addListener("mouseover", () => {
          setHoveredBubbleId(bubbleId);
          showTooltip(labelMarker, true);
        });
        labelMarker.addListener("mouseout", () => {
          setHoveredBubbleId(null);
          hideTooltip();
          infoWindowRef.current?.close();
        });
        circle.addListener("mouseover", () => {
          setHoveredBubbleId(bubbleId);
          showTooltip(labelMarker, true);
        });
        circle.addListener("mouseout", () => {
          setHoveredBubbleId(null);
          hideTooltip();
          infoWindowRef.current?.close();
        });
      }

      sentimentMarkersRef.current.push(breathingRing, labelMarker);
      sentimentCirclesRef.current.push(circle, innerGlow);
      sentimentRipplesRef.current.push(hoverRipple);
    });

    // Listen for filter event from tooltip button
    const handler = (e: Event) => {
      const cc = (e as CustomEvent).detail;
      onSelectCountry(cc);
      infoWindowRef.current?.close();
    };
    document.addEventListener('map-sentiment-filter', handler);
    return () => document.removeEventListener('map-sentiment-filter', handler);
  }, [mapMode, sentimentBubbles, mapLoaded, isDark, isMobile, t, onSelectCountry]);

  // Sync heatmap/markers visibility based on mapMode
  useEffect(() => {
    // Show/hide heatmap markers based on mode
    markersRef.current.forEach(m => m.setVisible(mapMode === "heatmap"));
    rippleOverlaysRef.current.forEach(r => r.setVisible(mapMode === "heatmap"));
  }, [mapMode]);

  // Markers with animated ripple + vibrant colors
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    rippleOverlaysRef.current.forEach((o) => o.setMap(null));
    rippleOverlaysRef.current = [];
    const g = googleRef.current;
    if (!g) return;

    countryPoints.forEach((cp) => {
      const count = trendCounts[cp.id] || 0;
      const intensity = maxCount > 0 ? count / maxCount : 0;
      const isSelected = selectedCountry === cp.id;
      const { fill, glow, ring } = getMarkerColor(intensity);
      const scale = 5 + intensity * 14;
      const isHighActivity = intensity > 0.5;
      const isMedActivity = intensity > 0.25;

      // Animated ripple rings
      if (count > 0 && (isHighActivity || isMedActivity)) {
        const rippleScale = scale * 2.8;
        const ripple = new g.maps.Marker({
          map, position: { lat: cp.lat, lng: cp.lng },
          icon: { path: g.maps.SymbolPath.CIRCLE, fillColor: fill, fillOpacity: 0, strokeColor: ring, strokeWeight: 2, strokeOpacity: 0.5, scale: rippleScale },
          clickable: false, zIndex: 0, optimized: false,
        });
        rippleOverlaysRef.current.push(ripple);
        let startTime = performance.now();
        const duration = isHighActivity ? 1800 : 2800;
        const animateRipple = (now: number) => {
          if (!ripple.getMap()) return;
          const elapsed = (now - startTime) % duration;
          const progress = elapsed / duration;
          const currentScale = scale + (rippleScale - scale) * progress;
          const opacity = 0.6 * (1 - progress);
          ripple.setIcon({ path: g.maps.SymbolPath.CIRCLE, fillColor: fill, fillOpacity: 0, strokeColor: ring, strokeWeight: 2 * (1 - progress * 0.5), strokeOpacity: opacity, scale: currentScale });
          requestAnimationFrame(animateRipple);
        };
        requestAnimationFrame(animateRipple);

        // Second ring for high activity
        if (isHighActivity) {
          const ripple2 = new g.maps.Marker({
            map, position: { lat: cp.lat, lng: cp.lng },
            icon: { path: g.maps.SymbolPath.CIRCLE, fillColor: fill, fillOpacity: 0, strokeColor: ring, strokeWeight: 1.5, strokeOpacity: 0.35, scale: rippleScale },
            clickable: false, zIndex: 0, optimized: false,
          });
          rippleOverlaysRef.current.push(ripple2);
          const startTime2 = performance.now() - 600;
          const animateRipple2 = (now: number) => {
            if (!ripple2.getMap()) return;
            const elapsed = (now - startTime2) % duration;
            const progress = elapsed / duration;
            const currentScale = scale + (rippleScale * 1.2 - scale) * progress;
            const opacity = 0.4 * (1 - progress);
            ripple2.setIcon({ path: g.maps.SymbolPath.CIRCLE, fillColor: fill, fillOpacity: 0, strokeColor: ring, strokeWeight: 1.2 * (1 - progress * 0.5), strokeOpacity: opacity, scale: currentScale });
            requestAnimationFrame(animateRipple2);
          };
          requestAnimationFrame(animateRipple2);
        }
      }

      // Main marker with glow stroke
      const marker = new g.maps.Marker({
        map,
        position: { lat: cp.lat, lng: cp.lng },
        title: `${cp.name} · ${count} trends`,
        label: count > 0 ? { text: String(count), color: "#fff", fontSize: scale > 12 ? "11px" : "9px", fontWeight: "700", fontFamily: "Inter, system-ui, sans-serif" } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: fill,
          fillOpacity: count > 0 ? 0.92 : 0.3,
          strokeColor: isSelected ? "#fff" : glow,
          strokeWeight: isSelected ? 3 : count > 0 ? 7 : 0,
          scale,
          labelOrigin: { x: 0, y: 0 } as google.maps.Point,
        },
        zIndex: isSelected ? 20 : count > avgCount ? 10 : 1,
        optimized: false,
      });

      // Hover scale animation
      const animateMarkerScale = (from: number, to: number, duration = 200) => {
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = from + (to - from) * eased;
          const icon = marker.getIcon();
          if (icon) marker.setIcon({ ...icon, scale: current });
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      const hoverScale = scale * 1.4;
      const flag = cp.id.length === 2 ? String.fromCodePoint(...[...cp.id.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : "";

      // Hover: show lightweight preview tooltip (desktop only — on mobile use tap)
      if (!isMobile) {
        marker.addListener("mouseover", () => {
          animateMarkerScale(scale, hoverScale);
          if (openInfoCountryRef.current === cp.id) return;
          if (!hoverInfoRef.current) return;
          const hBg = isDark ? "rgba(19,22,32,0.97)" : "rgba(255,255,255,0.97)";
          const hText = isDark ? "#e2e8f0" : "#111827";
          const hSub = isDark ? "#94a3b8" : "#6b7280";
          const { tag: hTag, color: hColor } = getIntensityLabel(intensity, t);
          
          let statusExplain = "";
          if (intensity > 0.8) statusExplain = t("mapStatusExceptional");
          else if (intensity > 0.6) statusExplain = t("mapStatusHigh");
          else if (intensity > 0.4) statusExplain = t("mapStatusModerate");
          else if (intensity > 0.2) statusExplain = t("mapStatusLow");
          else statusExplain = t("mapStatusNormal");
          
          hoverInfoRef.current.setContent(`
            <div style="font-family:Inter,system-ui,sans-serif;padding:10px 14px;min-width:190px;max-width:240px;background:${hBg};color:${hText};border-radius:14px;backdrop-filter:blur(16px);border:1px solid ${isDark ? 'rgba(45,51,72,0.5)' : 'rgba(0,0,0,0.08)'}; box-shadow:0 8px 24px rgba(0,0,0,0.12);">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="font-size:20px;">${flag}</span>
                <div>
                  <div style="font-size:13px;font-weight:700;letter-spacing:-0.01em;">${cp.name}</div>
                  <div style="font-size:10px;color:${hSub};margin-top:1px;">${count} trend${count !== 1 ? 's' : ''} ${t("mapTrendsActiveLabel")}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="background:${hColor};color:#fff;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:700;letter-spacing:0.5px;">${hTag}</span>
              </div>
              <div style="font-size:10px;color:${hSub};line-height:1.4;margin-bottom:8px;">${statusExplain}</div>
              <div style="font-size:9px;color:${isDark ? '#60a5fa' : '#3b82f6'};text-align:center;font-weight:600;padding-top:6px;border-top:1px solid ${isDark ? 'rgba(45,51,72,0.4)' : 'rgba(0,0,0,0.06)'};">👆 ${t("mapClickDetails")}</div>
            </div>
          `);
          hoverInfoRef.current.open({ anchor: marker, map });
        });

        marker.addListener("mouseout", () => {
          animateMarkerScale(hoverScale, scale);
          if (openInfoCountryRef.current !== cp.id && hoverInfoRef.current) {
            hoverInfoRef.current.close();
          }
        });
      }

      // Click: close hover tooltip, open persistent detail tooltip or filter
      marker.addListener("click", () => {
        // Close hover tooltip first
        if (hoverInfoRef.current) hoverInfoRef.current.close();
        // If this country's info is already open, filter instead
        if (openInfoCountryRef.current === cp.id) {
          infoWindowRef.current?.close();
          openInfoCountryRef.current = null;
          setOpenInfoCountry(null);
          onSelectCountry(cp.id === selectedCountry ? "global" : cp.id);
          map.panTo({ lat: cp.lat, lng: cp.lng });
          map.setZoom(cp.id === selectedCountry ? 2.5 : 5);
          return;
        }

        if (!infoWindowRef.current) return;
        const countryTrends = trends.filter((tr) => tr.countryCode === cp.id).slice(0, 5);
        const platformColors: Record<string, string> = { YouTube: "#FF0000", Reddit: "#FF4500", "Google Trends": "#3b82f6", NewsAPI: "#22C55E", Bluesky: "#0085FF" };
        const bg = isDark ? "rgba(19,22,32,0.97)" : "rgba(255,255,255,0.97)";
        const text = isDark ? "#e2e8f0" : "#111827";
        const subtext = isDark ? "#6b7280" : "#9ca3af";
        const border = isDark ? "rgba(45,51,72,0.5)" : "rgba(0,0,0,0.06)";
        const badgeBg = isDark ? "rgba(30,41,59,0.8)" : "rgba(241,245,249,0.8)";
        const hoverBg = isDark ? "rgba(30,41,59,0.5)" : "rgba(248,250,252,1)";
        const { tag: critTag, color: critColor } = getIntensityLabel(intensity, t);

        // Calculate criticality from real trend data
        const totalVolume = countryTrends.reduce((acc, tr) => {
          const v = parseInt(String(tr.volume).replace(/[^0-9]/g, '')) || 0;
          return acc + v;
        }, 0);
        const platforms = [...new Set(countryTrends.map(t => t.platform))];
        const avgChange = countryTrends.length > 0
          ? countryTrends.reduce((acc, tr) => acc + (parseFloat(String(tr.change).replace(/[^0-9.-]/g, '')) || 0), 0) / countryTrends.length
          : 0;

        let critReason = "";
        if (totalVolume > 10000) {
          critReason = `🔥 ${t("mapCritVolume")}: ${totalVolume.toLocaleString()} ${t("mapMentions")}`;
        } else if (avgChange > 100) {
          critReason = `⚡ ${t("mapCritGrowth")}: +${Math.round(avgChange)}%`;
        } else if (platforms.length > 3) {
          critReason = `📊 ${t("mapCritMultiplatform")}: ${platforms.join(', ')}`;
        } else if (count > 15) {
          critReason = `📈 ${count} ${t("mapCritActive")}`;
        } else if (count > 0) {
          critReason = `ℹ️ ${count} trend${count > 1 ? 's' : ''} ${t("mapCritMonitoring")}`;
        } else {
          critReason = `ℹ️ ${t("mapCritNone")}`;
        }

        const critSectionBg = isDark
          ? intensity > 0.6 ? "rgba(127,29,29,0.3)" : "rgba(30,41,59,0.5)"
          : intensity > 0.6 ? "rgba(254,242,242,0.9)" : "rgba(241,245,249,0.9)";

        const trendsList = countryTrends.length > 0
          ? countryTrends.map((tr, idx) => {
              const pColor = platformColors[tr.platform] || "#888";
              const changeVal = parseFloat(String(tr.change).replace(/[^0-9.-]/g, '')) || 0;
              const growthBadge = changeVal > 50
                ? `<span style="position:absolute;top:${isMobile ? '10px' : '8px'};right:${isMobile ? '10px' : '8px'};background:#ef4444;color:#fff;font-size:${isMobile ? '10px' : '9px'};font-weight:600;padding:${isMobile ? '3px 8px' : '2px 6px'};border-radius:10px;">+${Math.round(changeVal)}%</span>`
                : '';
              return `<div class="map-tooltip-trend" data-trend-idx="${idx}" style="position:relative;display:flex;align-items:center;gap:${isMobile ? '10px' : '6px'};padding:${isMobile ? '12px 14px' : '8px 10px'};border-radius:${isMobile ? '12px' : '8px'};cursor:pointer;margin-bottom:${isMobile ? '6px' : '4px'};background:transparent;border:1px solid ${border};transition:all 0.15s ease;min-height:${isMobile ? '48px' : 'auto'};touch-action:manipulation;">
                <div style="width:${isMobile ? '4px' : '3px'};height:${isMobile ? '24px' : '20px'};border-radius:2px;background:${pColor};flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:${isMobile ? '13px' : '11px'};color:${text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:${isMobile ? '220px' : '180px'};font-weight:500;">${tr.title.slice(0, isMobile ? 50 : 40)}${tr.title.length > (isMobile ? 50 : 40) ? '…' : ''}</div>
                  <div style="display:flex;align-items:center;gap:${isMobile ? '6px' : '4px'};margin-top:${isMobile ? '4px' : '2px'};">
                    <span style="font-size:${isMobile ? '10px' : '8px'};background:${badgeBg};color:${subtext};padding:${isMobile ? '2px 7px' : '1px 5px'};border-radius:4px;font-weight:600;">${tr.volume}</span>
                    <span style="font-size:${isMobile ? '10px' : '8px'};color:${subtext};">${tr.platform}</span>
                  </div>
                </div>
                ${growthBadge}
              </div>`;
            }).join('')
          : `<div style="font-size:${isMobile ? '13px' : '11px'};color:${subtext};padding:12px 0;text-align:center;">${t("noTrends")}</div>`;

        const moreCount = trends.filter(tr => tr.countryCode === cp.id).length - 5;
        const moreSection = moreCount > 0
          ? `<div style="text-align:center;font-size:${isMobile ? '12px' : '10px'};color:${subtext};padding:${isMobile ? '8px' : '6px'};background:${badgeBg};border-radius:8px;margin-bottom:10px;">+ ${moreCount} ${t("mapMoreTrends")}</div>`
          : '';

        const closeBtnSize = isMobile ? '32' : '22';
        const closeBtn = `<button id="map-tooltip-close" style="position:absolute;top:${isMobile ? '8px' : '10px'};right:${isMobile ? '8px' : '10px'};width:${closeBtnSize}px;height:${closeBtnSize}px;border-radius:${parseInt(closeBtnSize)/2}px;background:${isDark ? 'rgba(30,41,59,0.8)' : '#f1f5f9'};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:${isMobile ? '14px' : '11px'};color:${subtext};transition:all 0.15s ease;z-index:10;touch-action:manipulation;">✕</button>`;
        
        const filterBtn = `<button id="map-tooltip-filter" style="width:100%;background:${isDark ? 'rgba(59,130,246,0.9)' : '#3b82f6'};color:white;border:none;border-radius:${isMobile ? '12px' : '8px'};padding:${isMobile ? '12px' : '8px'};font-size:${isMobile ? '13px' : '11px'};font-weight:600;cursor:pointer;transition:all 0.2s ease;margin-top:8px;touch-action:manipulation;min-height:${isMobile ? '48px' : 'auto'};">${lang === "pt" ? "Filtrar timeline por este país" : "Filter timeline by country"}</button>`;

        const tooltipWidth = isMobile ? 'min-width:280px;max-width:92vw' : 'min-width:260px;max-width:290px';
        const tooltipPadding = isMobile ? '18px' : '16px';

        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,system-ui,-apple-system,sans-serif;position:relative;padding:${tooltipPadding};${tooltipWidth};background:${bg};color:${text};border-radius:16px;backdrop-filter:blur(20px);border:1px solid ${border};box-shadow:0 12px 32px rgba(0,0,0,0.15);">
            ${closeBtn}
            <div style="display:flex;align-items:center;gap:${isMobile ? '12px' : '8px'};padding-bottom:${isMobile ? '12px' : '10px'};border-bottom:1px solid ${border};">
              <span style="font-size:${isMobile ? '28px' : '24px'};line-height:1;">${flag}</span>
              <div>
                <div style="font-size:${isMobile ? '17px' : '15px'};font-weight:700;color:${text};letter-spacing:-0.02em;">${cp.name}</div>
                <div style="font-size:${isMobile ? '12px' : '10px'};color:${subtext};margin-top:1px;">${count} trends ${lang === "pt" ? "ativas" : "active"}</div>
              </div>
            </div>
            <div style="margin:${isMobile ? '12px 0' : '10px 0'};background:${critSectionBg};border-radius:12px;padding:${isMobile ? '12px 14px' : '10px 12px'};border-left:3px solid ${critColor};">
              <span style="display:inline-flex;align-items:center;gap:4px;background:${critColor};color:#fff;padding:${isMobile ? '3px 10px' : '2px 8px'};border-radius:10px;font-weight:700;font-size:${isMobile ? '10px' : '9px'};letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">${critTag}</span>
              <p style="font-size:${isMobile ? '12px' : '11px'};color:${isDark ? '#94a3b8' : '#475569'};line-height:1.4;margin:0;">${critReason}</p>
            </div>
            ${countryTrends.length > 0 ? `<div style="font-size:${isMobile ? '11px' : '10px'};font-weight:700;color:${text};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${lang === "pt" ? "Principais tendências" : "Top trends"}</div>` : ''}
            <div style="border-radius:10px;max-height:${isMobile ? '200px' : '140px'};overflow-y:auto;-webkit-overflow-scrolling:touch;">${trendsList}</div>
            ${moreSection}
            ${filterBtn}
          </div>
        `);
        infoWindowRef.current.open({ anchor: marker, map });
        openInfoCountryRef.current = cp.id;
        setOpenInfoCountry(cp.id);
        map.panTo({ lat: cp.lat, lng: cp.lng });

        // Attach click handlers after InfoWindow DOM is ready
        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          // Close button
          const closeBtn = document.getElementById('map-tooltip-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              infoWindowRef.current?.close();
              openInfoCountryRef.current = null;
              setOpenInfoCountry(null);
            });
            closeBtn.addEventListener('mouseenter', () => {
              closeBtn.style.background = isDark ? 'rgba(51,65,85,1)' : '#e2e8f0';
            });
            closeBtn.addEventListener('mouseleave', () => {
              closeBtn.style.background = isDark ? 'rgba(30,41,59,0.8)' : '#f1f5f9';
            });
          }
          
          // Filter button
          const filterBtn = document.getElementById('map-tooltip-filter');
          if (filterBtn) {
            filterBtn.addEventListener('click', () => {
              onSelectCountry(cp.id === selectedCountry ? "global" : cp.id);
              infoWindowRef.current?.close();
              openInfoCountryRef.current = null;
              setOpenInfoCountry(null);
              map.panTo({ lat: cp.lat, lng: cp.lng });
              map.setZoom(cp.id === selectedCountry ? 2.5 : 5);
            });
            filterBtn.addEventListener('mouseenter', () => {
              filterBtn.style.background = '#2563eb';
            });
            filterBtn.addEventListener('mouseleave', () => {
              filterBtn.style.background = '#3b82f6';
            });
          }
          
          // Trend items
          const items = document.querySelectorAll('.map-tooltip-trend');
          items.forEach((item) => {
            const idx = parseInt(item.getAttribute('data-trend-idx') || '0');
            const trend = countryTrends[idx];
            if (!trend) return;
            (item as HTMLElement).addEventListener('mouseenter', () => {
              (item as HTMLElement).style.background = hoverBg;
              (item as HTMLElement).style.transform = 'translateX(4px)';
            });
            (item as HTMLElement).addEventListener('mouseleave', () => {
              (item as HTMLElement).style.background = 'transparent';
              (item as HTMLElement).style.transform = 'translateX(0)';
            });
            item.addEventListener('click', () => {
              if (onSelectTrend) onSelectTrend(trend);
              infoWindowRef.current?.close();
              openInfoCountryRef.current = null;
              setOpenInfoCountry(null);
            });
          });
        });

        // Close listener to reset state
        google.maps.event.addListenerOnce(infoWindowRef.current, 'closeclick', () => {
          openInfoCountryRef.current = null;
          setOpenInfoCountry(null);
        });
      });

      markersRef.current.push(marker);
    });
  }, [trendCounts, maxCount, avgCount, selectedCountry, mapLoaded, onSelectCountry, t, trends, isDark, isMobile]);

  // Pan to selected/highlighted country
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;
    if (selectedCountry === "global") { map.panTo({ lat: 20, lng: 0 }); map.setZoom(2); return; }
    const cp = countryPoints.find((c) => c.id === selectedCountry);
    if (cp) { map.panTo({ lat: cp.lat, lng: cp.lng }); map.setZoom(5); }
  }, [selectedCountry, mapLoaded]);

  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded || !highlightCountry) return;
    const cp = countryPoints.find((c) => c.id === highlightCountry);
    if (cp) { map.panTo({ lat: cp.lat, lng: cp.lng }); map.setZoom(5); }
  }, [highlightCountry, mapLoaded]);

  useEffect(() => {
    const handler = (e: Event) => {
      const cc = (e as CustomEvent).detail;
      const map = googleMapRef.current;
      if (!map || !mapLoaded) return;
      const cp = countryPoints.find((c) => c.id === cc);
      if (cp) { map.panTo({ lat: cp.lat, lng: cp.lng }); map.setZoom(5); }
    };
    window.addEventListener('trend-expand-country', handler);
    return () => window.removeEventListener('trend-expand-country', handler);
  }, [mapLoaded]);

  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapViewType);
      if (mapViewType === "roadmap") googleMapRef.current.setOptions({ styles: isDark ? darkStyles : lightStyles });
    }
  }, [mapViewType, mapLoaded, isDark]);

  const mapModes: { key: MapMode; icon: typeof Flame; labelKey: string }[] = [
    { key: "heatmap", icon: Flame, labelKey: "mapHeatmap" },
    { key: "flow", icon: GitBranch, labelKey: "mapFlowMap" },
    { key: "sentiment", icon: Heart, labelKey: "mapSentiment" },
  ];

  const modeBtnClass = (active: boolean) =>
    `relative z-10 h-6 min-h-[24px] max-h-[24px] px-2 rounded-full transition-colors duration-200 outline-none ring-0 focus:outline-none focus:ring-0 inline-flex items-center gap-1 text-[9px] font-semibold tracking-wide uppercase ${
      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  // Current max intensity for legend marker position
  const currentMaxIntensity = useMemo(() => {
    if (maxCount <= 0) return 0;
    const topCount = Math.max(...Object.values(trendCounts));
    return Math.min(topCount / Math.max(maxCount, 1), 1);
  }, [trendCounts, maxCount]);

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Map controls + Top Trends */}
      <div className="absolute top-3 left-3 right-3 z-[5] flex items-center justify-between pointer-events-none">
        <div className="relative flex items-center gap-0 p-0.5 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/20 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] pointer-events-auto">
          {/* Sliding pill indicator */}
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded-full bg-primary shadow-sm"
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              left: `${mapModes.findIndex(m => m.key === mapMode) * (100 / mapModes.length)}%`,
              width: `${100 / mapModes.length}%`,
            }}
            animate={{
              left: `${mapModes.findIndex(m => m.key === mapMode) * (100 / mapModes.length)}%`,
            }}
          />
          {mapModes.map(({ key, icon: Icon, labelKey }) => (
            <button key={key} onClick={() => setMapMode(key)} className={modeBtnClass(mapMode === key)} title={t(labelKey as any)}>
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{t(labelKey as any)}</span>
            </button>
          ))}
          {selectedCountry !== "global" && (
            <button
              onClick={() => { onSelectCountry("global"); googleMapRef.current?.panTo({ lat: 20, lng: 0 }); googleMapRef.current?.setZoom(2.5); }}
              className={modeBtnClass(false)}
              title={t("global")}
            >
              <Globe className="w-3 h-3" />
            </button>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-background/80 hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/30 shadow-sm backdrop-blur-sm transition-all duration-200 pointer-events-auto mr-8"
            title={lang === "pt" ? "Fechar Mapa" : "Close Map"}
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Update notification */}
      <AnimatePresence>
        {updateNotif && <UpdateNotification countriesUpdated={updateNotif.countries} newTrends={updateNotif.trends} onDismiss={() => setUpdateNotif(null)} />}
      </AnimatePresence>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">Carregando mapa...</span>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm">
          <div className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs">
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <p className="text-xs text-muted-foreground/60 mb-4">O mapa será exibido assim que a conexão for restabelecida.</p>
            <button onClick={retryMap} className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm">
              🔄 Tentar novamente
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

      {/* Dynamic legend — changes based on mapMode */}
      <AnimatePresence mode="wait">
        {mapMode === "heatmap" && (
          <motion.div
            key="legend-heatmap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`absolute z-20 bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/15 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] ${
              isMobile ? 'bottom-2 left-2 right-2 rounded-lg px-2.5 py-1.5' : 'bottom-[30px] right-5 rounded-xl px-2.5 py-2 max-w-[180px]'
            }`}
          >
            {isMobile ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="relative h-2 rounded-full overflow-hidden">
                    <div className="w-full h-full" style={{ background: "linear-gradient(90deg, #00a6ff, #00ff9d, #ffff00, #ffaa00, #ff3300)" }} />
                  </div>
                  <div className="flex justify-between text-[7px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    <span>{t("low")}</span><span>{t("critical")}</span>
                  </div>
                </div>
                <div className="flex gap-2 text-center flex-shrink-0">
                  <div><span className="text-[10px] font-semibold text-foreground tabular-nums">{activeCountries}</span><span className="text-[7px] text-muted-foreground block">{t("countries")}</span></div>
                  <div><span className="text-[10px] font-semibold text-foreground tabular-nums">{totalTrends}</span><span className="text-[7px] text-muted-foreground block">Trends</span></div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[9px] font-semibold text-foreground mb-1 tracking-wide flex items-center gap-1">🌡️ {t("heatmapDensity")}</p>
                <div className="relative h-3 rounded-md overflow-hidden mb-1">
                  <div className="w-full h-full" style={{ background: "linear-gradient(90deg, #00a6ff, #00ff9d, #ffff00, #ffaa00, #ff3300)" }} />
                  <motion.div className="absolute top-[-1px] w-0.5 h-[14px] bg-white border border-foreground/60 rounded-sm" style={{ left: `${currentMaxIntensity * 100}%` }} animate={{ left: `${currentMaxIntensity * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} />
                </div>
                <div className="flex justify-between text-[7px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  <span>{t("low")}</span><span>{t("high")}</span><span>{t("critical")}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border/20 text-center">
                  <div><span className="text-[7px] text-muted-foreground uppercase block">Max</span><span className="text-[10px] font-medium text-foreground">{maxCount}</span></div>
                  <div><span className="text-[7px] text-muted-foreground uppercase block">{t("countries")}</span><span className="text-[10px] font-medium text-foreground">{activeCountries}</span></div>
                  <div><span className="text-[7px] text-muted-foreground uppercase block">Total</span><span className="text-[10px] font-medium text-foreground">{totalTrends}</span></div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {mapMode === "flow" && (
          <motion.div
            key="legend-flow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`absolute z-20 bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/15 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] ${
              isMobile ? 'bottom-2 left-2 right-2 rounded-lg px-2.5 py-1.5' : 'bottom-[30px] right-5 rounded-xl px-2.5 py-2 max-w-[160px]'
            }`}
          >
            <p className="text-[9px] font-semibold text-foreground mb-1.5 tracking-wide flex items-center gap-1">
              🌐 {t("mapFlowLegendTitle")}
            </p>
            {flowArcs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">{t("mapFlowNoData")}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 mb-2">
                  {(["positive", "negative", "mixed", "neutral"] as Sentiment[]).map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-5 h-[3px] rounded-full" style={{ background: sentimentColors[s] }} />
                      <span className="text-[9px] text-muted-foreground">{t(`mapSent${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <div className="w-5 h-[2px] rounded-full bg-foreground/20" />
                  <span>{lang === "pt" ? "Fino = baixo volume" : "Thin = low volume"}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                  <div className="w-5 h-[5px] rounded-full bg-foreground/40" />
                  <span>{lang === "pt" ? "Grosso = alto volume" : "Thick = high volume"}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                  {flowArcs.length} {lang === "pt" ? "arcos de propagação" : "propagation arcs"}
                </div>
              </>
            )}
          </motion.div>
        )}

        {mapMode === "sentiment" && (
          <motion.div
            key="legend-sentiment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`absolute z-20 bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-border/15 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] ${
              isMobile ? 'bottom-2 left-2 right-2 rounded-lg px-2.5 py-1.5' : 'bottom-[30px] right-5 rounded-xl px-2.5 py-2 max-w-[160px]'
            }`}
          >
            <p className="text-[9px] font-semibold text-foreground mb-1.5 tracking-wide flex items-center gap-1">
              💭 {t("mapSentLegendTitle")}
            </p>
            {sentimentBubbles.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">{t("mapSentNoData")}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 mb-2">
                  {(["positive", "negative", "mixed", "neutral"] as Sentiment[]).map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: sentimentColors[s], opacity: 0.7 }} />
                      <span className="text-[9px] text-muted-foreground">{t(`mapSent${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1">
                  <div className="w-2 h-2 rounded-full bg-foreground/20" />
                  <span>→</span>
                  <div className="w-4 h-4 rounded-full bg-foreground/20" />
                  <span>{lang === "pt" ? "Tamanho = volume" : "Size = volume"}</span>
                </div>
                <div className="text-[9px] text-muted-foreground italic">
                  {lang === "pt" ? "Pulso rápido = crescimento acelerado" : "Fast pulse = rapid growth"}
                </div>
                <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                  {sentimentBubbles.length} {t("countries")}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoogleMapView;
