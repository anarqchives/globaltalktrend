/// <reference types="google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import GlobalRanking from "./GlobalRanking";
import { Map, Flame, Globe, RefreshCw } from "lucide-react";

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

function getIntensityLabel(intensity: number): { label: string; tag: string; color: string } {
  if (intensity > 0.8) return { label: "Crítica", tag: "🔥 CRÍTICO", color: "#ef4444" };
  if (intensity > 0.6) return { label: "Alta", tag: "⚡ ALTO", color: "#f97316" };
  if (intensity > 0.4) return { label: "Média", tag: "📊 MODERADO", color: "#eab308" };
  if (intensity > 0.2) return { label: "Baixa", tag: "📈 ATENÇÃO", color: "#3b82f6" };
  return { label: "Mínima", tag: "ℹ️ NORMAL", color: "#94a3b8" };
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
}: GoogleMapViewProps) => {
  const { t } = useLanguage();
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
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [updateNotif, setUpdateNotif] = useState<{ countries: number; trends: number } | null>(null);
  const [mapRetry, setMapRetry] = useState(0);

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

  useEffect(() => {
    if (heatmapRef.current) heatmapRef.current.setMap(heatmapEnabled ? googleMapRef.current : null);
  }, [heatmapEnabled]);

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

      // Hover: show lightweight preview tooltip
      marker.addListener("mouseover", () => {
        animateMarkerScale(scale, hoverScale);
        // Don't show hover tooltip if click tooltip is already open for this country
        if (openInfoCountryRef.current === cp.id) return;
        if (!hoverInfoRef.current) return;
        const hBg = isDark ? "rgba(19,22,32,0.95)" : "rgba(255,255,255,0.95)";
        const hText = isDark ? "#e2e8f0" : "#111827";
        const hSub = isDark ? "#6b7280" : "#9ca3af";
        const { tag: hTag, color: hColor } = getIntensityLabel(intensity);
        hoverInfoRef.current.setContent(`
          <div style="font-family:Inter,system-ui,sans-serif;padding:10px 12px;min-width:180px;max-width:220px;background:${hBg};color:${hText};border-radius:12px;backdrop-filter:blur(12px);border:1px solid ${isDark ? 'rgba(45,51,72,0.4)' : 'rgba(0,0,0,0.06)'};">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="font-size:18px;">${flag}</span>
              <div>
                <div style="font-size:13px;font-weight:600;">${cp.name}</div>
                <div style="font-size:10px;color:${hSub};">${count} trends</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="background:${hColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:600;letter-spacing:0.3px;">${hTag}</span>
            </div>
            <div style="margin-top:8px;font-size:10px;color:${hSub};text-align:center;font-style:italic;">Clique para ver detalhes</div>
          </div>
        `);
        hoverInfoRef.current.open({ anchor: marker, map });
      });

      marker.addListener("mouseout", () => {
        animateMarkerScale(hoverScale, scale);
        // Close hover tooltip (but not click tooltip)
        if (openInfoCountryRef.current !== cp.id && hoverInfoRef.current) {
          hoverInfoRef.current.close();
        }
      });

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
        const { tag: critTag, color: critColor } = getIntensityLabel(intensity);

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
          critReason = `🔥 Volume excepcionalmente alto: ${totalVolume.toLocaleString()} menções detectadas`;
        } else if (avgChange > 100) {
          critReason = `⚡ Crescimento acelerado: +${Math.round(avgChange)}% de variação média`;
        } else if (platforms.length > 3) {
          critReason = `📊 Multiplataforma: presente em ${platforms.join(', ')}`;
        } else if (count > 15) {
          critReason = `📈 ${count} tendências ativas simultaneamente neste país`;
        } else if (count > 0) {
          critReason = `ℹ️ ${count} tendência${count > 1 ? 's' : ''} em monitoramento — atividade dentro da média`;
        } else {
          critReason = `ℹ️ Nenhuma tendência ativa no momento`;
        }

        const critSectionBg = isDark
          ? intensity > 0.6 ? "rgba(127,29,29,0.3)" : "rgba(30,41,59,0.5)"
          : intensity > 0.6 ? "rgba(254,242,242,0.9)" : "rgba(241,245,249,0.9)";

        const trendsList = countryTrends.length > 0
          ? countryTrends.map((tr, idx) => {
              const pColor = platformColors[tr.platform] || "#888";
              const changeVal = parseFloat(String(tr.change).replace(/[^0-9.-]/g, '')) || 0;
              const growthBadge = changeVal > 50
                ? `<span style="position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:9px;font-weight:600;padding:2px 6px;border-radius:10px;">+${Math.round(changeVal)}%</span>`
                : '';
              return `<div class="map-tooltip-trend" data-trend-idx="${idx}" style="position:relative;display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:6px;background:transparent;border:1px solid ${border};transition:all 0.15s ease;">
                <div style="width:3px;height:24px;border-radius:2px;background:${pColor};flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;color:${text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;font-weight:500;">${tr.title.slice(0, 45)}${tr.title.length > 45 ? '…' : ''}</div>
                  <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
                    <span style="font-size:9px;background:${badgeBg};color:${subtext};padding:2px 6px;border-radius:6px;font-weight:600;">${tr.volume}</span>
                    <span style="font-size:9px;color:${subtext};">${tr.platform}</span>
                    <span style="font-size:9px;color:${subtext};">${tr.time || ''}</span>
                  </div>
                </div>
                ${growthBadge}
              </div>`;
            }).join('')
          : `<div style="font-size:11px;color:${subtext};padding:12px 0;text-align:center;">${t("noTrends")}</div>`;

        const moreCount = trends.filter(tr => tr.countryCode === cp.id).length - 5;
        const moreSection = moreCount > 0
          ? `<div style="text-align:center;font-size:10px;color:${subtext};padding:6px;background:${badgeBg};border-radius:8px;margin-bottom:10px;">+ ${moreCount} outras tendências</div>`
          : '';

        infoWindowRef.current.setContent(`
          <div style="font-family:Inter,system-ui,-apple-system,sans-serif;padding:16px 14px;min-width:280px;max-width:340px;background:${bg};color:${text};border-radius:20px;backdrop-filter:blur(20px);border:1px solid ${border};">
            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid ${border};">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:24px;line-height:1;">${flag}</span>
                <div>
                  <div style="font-size:16px;font-weight:600;color:${text};letter-spacing:-0.02em;">${cp.name}</div>
                  <div style="font-size:11px;color:${subtext};margin-top:2px;">${count} trends ativas</div>
                </div>
              </div>
            </div>
            <div style="margin:12px 0;background:${critSectionBg};border-radius:12px;padding:12px 14px;border-left:4px solid ${critColor};">
              <span style="display:inline-block;background:${critColor};color:#fff;padding:3px 10px;border-radius:20px;font-weight:600;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">${critTag}</span>
              <p style="font-size:12px;color:${isDark ? '#94a3b8' : '#475569'};line-height:1.5;margin:0;">${critReason}</p>
            </div>
            ${countryTrends.length > 0 ? `<div style="font-size:11px;font-weight:600;color:${text};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Principais tendências</div>` : ''}
            <div style="max-height:200px;overflow-y:auto;">${trendsList}</div>
            ${moreSection}
            <div style="text-align:center;padding-top:10px;border-top:1px solid ${border};">
              <span style="font-size:10px;color:${subtext};font-style:italic;">Clique em uma tendência para ver detalhes</span>
            </div>
          </div>
        `);
        infoWindowRef.current.open({ anchor: marker, map });
        openInfoCountryRef.current = cp.id;
        setOpenInfoCountry(cp.id);
        map.panTo({ lat: cp.lat, lng: cp.lng });

        // Attach click handlers to trend items after InfoWindow DOM is ready
        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const items = document.querySelectorAll('.map-tooltip-trend');
          items.forEach((item) => {
            const idx = parseInt(item.getAttribute('data-trend-idx') || '0');
            const trend = countryTrends[idx];
            if (!trend) return;
            // Hover effect
            (item as HTMLElement).addEventListener('mouseenter', () => {
              (item as HTMLElement).style.background = hoverBg;
              (item as HTMLElement).style.transform = 'translateX(4px)';
            });
            (item as HTMLElement).addEventListener('mouseleave', () => {
              (item as HTMLElement).style.background = 'transparent';
              (item as HTMLElement).style.transform = 'translateX(0)';
            });
            // Click to select trend
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
  }, [trendCounts, maxCount, avgCount, selectedCountry, mapLoaded, onSelectCountry, t, trends, isDark]);

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

  const controlBtnClass = (active: boolean) =>
    `p-2 rounded-xl transition-all duration-200 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/30 ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10"
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
      <div className="absolute top-3 left-3 z-[5] flex items-start gap-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          <button onClick={() => setMapViewType("roadmap")} className={controlBtnClass(mapViewType === "roadmap")} title={t("map")}>
            <Map className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-5 bg-border/40 mx-0.5" />
          <button onClick={() => setHeatmapEnabled(!heatmapEnabled)} className={controlBtnClass(heatmapEnabled)} title="Heatmap">
            <Flame className="w-3.5 h-3.5" />
          </button>
          {selectedCountry !== "global" && (
            <>
              <div className="w-px h-5 bg-border/40 mx-0.5" />
              <button
                onClick={() => { onSelectCountry("global"); googleMapRef.current?.panTo({ lat: 20, lng: 0 }); googleMapRef.current?.setZoom(2.5); }}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200"
                title={t("global")}
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        {mapLoaded && trends.length > 0 && (
          <GlobalRanking trends={trends} onSelectTrend={onSelectTrend} onFilterCountry={onSelectCountry} collapsed={true} />
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

      {/* Dynamic interactive legend */}
      <AnimatePresence>
        {heatmapEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-[30px] right-5 z-20 bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] px-3 py-2.5 min-w-[200px]"
          >
            <p className="text-[11px] font-medium text-foreground mb-1.5 tracking-wide flex items-center gap-1.5">
              🌡️ Densidade de Trends
            </p>
            {/* Animated gradient bar with shine */}
            <div className="relative h-5 rounded-[10px] overflow-hidden mb-1.5" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
              <div
                className="w-full h-full"
                style={{
                  background: "linear-gradient(90deg, #00a6ff, #00ff9d, #ffff00, #ffaa00, #ff3300)",
                  backgroundSize: "200% 100%",
                  animation: "gradientFlow 8s ease infinite",
                }}
              />
              {/* Shine overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
                  animation: "legendShine 3s infinite",
                }}
              />
              {/* Current intensity marker */}
              <motion.div
                className="absolute top-[-3px] w-1 h-[26px] bg-white border-2 border-foreground/70 rounded-sm"
                style={{ left: `${currentMaxIntensity * 100}%` }}
                animate={{ left: `${currentMaxIntensity * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/50 animate-pulse" />
              </motion.div>
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
              <span>Baixa</span>
              <span>Média</span>
              <span>Alta</span>
              <span>Crítica</span>
            </div>
            {/* Live stats */}
            <div className="flex justify-between pt-2 border-t border-border/30">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Máxima</span>
                <span className="text-sm font-medium text-foreground">{maxCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Países</span>
                <span className="text-sm font-medium text-foreground">{activeCountries}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</span>
                <span className="text-sm font-medium text-foreground">{totalTrends}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoogleMapView;
