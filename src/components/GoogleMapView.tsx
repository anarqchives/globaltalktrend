/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Flame, Globe, GitBranch, Heart, Plus, Minus, Map as MapIcon } from "lucide-react";
import {
  computeFlowArcs,
  computeSentimentBubbles,
  deriveSentiment,
  sentimentColors,
  type FlowArc,
  type SentimentBubble,
} from "@/lib/map-visualizations";

type MapMode = "heatmap" | "choropleth" | "flow" | "sentiment";

interface CountryPoint { id: string; name: string; lat: number; lng: number; }

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

/* ─── Base map style: warm beige continents, blue-gray oceans, no clutter ─── */
const BASE_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#EDE8DF" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#E4DFD5" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#C9D5DC" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#A89F94" }, { weight: 0.8 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#7A736B" }] },
  { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#EDE8DF" }, { weight: 2 }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
];

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#1a1f2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1419" }, { weight: 2 }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }, { weight: 0.5 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1e35" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
];

/* ─── Tooltip HTML builder ─── */
function buildTooltipHtml(content: string, isDark: boolean): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:12px 16px;min-width:200px;max-width:280px;background:${isDark ? "rgba(19,24,39,0.97)" : "rgba(255,255,255,0.97)"};color:${isDark ? "#e2e8f0" : "#111827"};border-radius:16px;backdrop-filter:blur(16px);border:1px solid ${isDark ? "rgba(71,84,103,0.5)" : "rgba(0,0,0,0.08)"};box-shadow:0 8px 32px rgba(0,0,0,0.12);`;
  div.innerHTML = content;
  return div;
}

function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* ─── Props ─── */
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

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                */
/* ═══════════════════════════════════════════════════════════════ */
const GoogleMapView = ({
  trendCounts, selectedCountry, onSelectCountry, trends = [], onSelectTrend, highlightCountry, onClose,
}: GoogleMapViewProps) => {
  const { lang } = useLanguage();
  const isMobile = useIsMobile();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapRef = useRef<any>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const animFramesRef = useRef<number[]>([]);
  const geoJsonLoadedRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("heatmap");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [mapRetry, setMapRetry] = useState(0);

  // Derived data
  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const activeCountries = useMemo(() => Object.values(trendCounts).filter(v => v > 0).length, [trendCounts]);
  const totalTrends = useMemo(() => Object.values(trendCounts).reduce((a, b) => a + b, 0), [trendCounts]);
  const sentimentBubbles = useMemo(() => computeSentimentBubbles(trends, countryPoints), [trends]);
  const flowArcs = useMemo(() => computeFlowArcs(trends, countryPoints, 0.55), [trends]);

  // Dark mode observer
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ─── Cleanup helpers ───
  const clearLayers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    animFramesRef.current.forEach(id => cancelAnimationFrame(id));
    animFramesRef.current = [];
    if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    if (googleMapRef.current && geoJsonLoadedRef.current) {
      googleMapRef.current.data.setStyle({ visible: false });
    }
    infoRef.current?.close();
  }, []);

  // ─── Load Google Maps ───
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const CACHE_KEY = "gtt_maps_api_key";
        let apiKey = sessionStorage.getItem(CACHE_KEY);
        if (!apiKey) {
          const { data, error } = await supabase.functions.invoke("get-maps-key");
          if (cancelled) return;
          if (error || !data?.key) { setMapError("Chave do mapa indisponível"); return; }
          apiKey = data.key;
          sessionStorage.setItem(CACHE_KEY, apiKey!);
        }
        setOptions({ key: apiKey!, v: "weekly" });
        const { Map } = (await google.maps.importLibrary("maps")) as any;
        const { InfoWindow } = (await google.maps.importLibrary("maps")) as any;
        if (!mapRef.current || cancelled) return;
        const map = new Map(mapRef.current, {
          center: { lat: 20, lng: 0 }, zoom: 2.5, minZoom: 2, maxZoom: 8,
          disableDefaultUI: true, zoomControl: false, mapTypeControl: false,
          streetViewControl: false, fullscreenControl: false, mapTypeId: "roadmap",
          styles: isDark ? DARK_MAP_STYLE : BASE_MAP_STYLE,
          gestureHandling: "greedy",
          backgroundColor: isDark ? "#0f1419" : "#EDE8DF",
        });
        googleMapRef.current = map;
        infoRef.current = new InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch { if (!cancelled) setMapError("Falha ao carregar mapa"); }
    };
    load();
    return () => { cancelled = true; };
  }, [mapRetry, isDark]);

  // ─── Show tooltip ───
  const showTooltip = useCallback((html: HTMLElement, pos: { lat: number; lng: number }) => {
    if (!infoRef.current || !googleMapRef.current) return;
    infoRef.current.setContent(html);
    infoRef.current.setPosition(pos);
    infoRef.current.open(googleMapRef.current);
  }, []);

  /* ═══════════════════════════════════════════════════════════ */
  /*  MODE 1: HEATMAP                                           */
  /* ═══════════════════════════════════════════════════════════ */
  const renderHeatmap = useCallback(async () => {
    if (!googleMapRef.current) return;
    clearLayers();
    try {
      const { HeatmapLayer } = (await google.maps.importLibrary("visualization")) as any;
      const heatmapData = countryPoints
        .filter(c => trendCounts[c.id] > 0)
        .flatMap(c => {
          const count = trendCounts[c.id];
          const intensity = Math.min(count / maxCount, 1);
          return Array(Math.max(2, Math.ceil(intensity * 15))).fill(null).map(() => ({
            location: new google.maps.LatLng(c.lat + (Math.random() - 0.5) * 3, c.lng + (Math.random() - 0.5) * 3),
            weight: intensity,
          }));
        });

      heatmapRef.current = new HeatmapLayer({
        data: heatmapData, map: googleMapRef.current,
        radius: 55, opacity: 0.75, maxIntensity: 1,
        gradient: [
          "rgba(201, 213, 220, 0)",
          "rgba(37, 87, 214, 0.25)",
          "rgba(37, 87, 214, 0.55)",
          "rgba(37, 87, 214, 0.85)",
          "rgba(139, 92, 246, 0.90)",
          "rgba(224, 60, 49, 0.95)",
        ],
      });

      // Top 10 markers
      const sorted = countryPoints
        .map(c => ({ ...c, count: trendCounts[c.id] || 0 }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      sorted.forEach(c => {
        const intensity = Math.min(c.count / maxCount, 1);
        const scale = 6 + intensity * 15; // 12px to 36px diameter
        const marker = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale,
            fillColor: "#FFFFFF", fillOpacity: 0.95,
            strokeColor: "#2557D6", strokeWeight: 2.5,
          },
          label: { text: String(c.count), color: "#2557D6", fontSize: "10px", fontWeight: "800" },
          zIndex: Math.floor(intensity * 1000),
        });
        const origIcon = marker.getIcon() as google.maps.Symbol;
        marker.addListener("click", () => onSelectCountry(c.id));
        marker.addListener("mouseover", () => {
          marker.setIcon({ ...origIcon, scale: scale * 1.2, fillOpacity: 1 } as google.maps.Symbol);
          showTooltip(buildTooltipHtml(`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:22px">${flagEmoji(c.id)}</span>
              <div>
                <div style="font-weight:600;font-size:14px">${c.name}</div>
                <div style="font-size:11px;opacity:0.6">${c.count} ${lang === "pt" ? "tendências ativas" : "active trends"}</div>
              </div>
            </div>
            <div style="font-size:11px;opacity:0.5;margin-top:4px">${lang === "pt" ? "Clique para filtrar" : "Click to filter"}</div>
          `, isDark), { lat: c.lat, lng: c.lng });
        });
        marker.addListener("mouseout", () => {
          marker.setIcon({ ...origIcon, scale, fillOpacity: 0.85 } as google.maps.Symbol);
          infoRef.current?.close();
        });
        markersRef.current.push(marker);
      });
    } catch (err) { console.error("Heatmap render error:", err); }
  }, [trendCounts, maxCount, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══════════════════════════════════════════════════════════ */
  /*  MODE 2: CHOROPLETH                                        */
  /* ═══════════════════════════════════════════════════════════ */
  const renderChoropleth = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();
    const map = googleMapRef.current;

    if (!geoJsonLoadedRef.current) {
      map.data.loadGeoJson("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
      geoJsonLoadedRef.current = true;

      map.data.addListener("mouseover", (event: any) => {
        map.data.revertStyle();
        map.data.overrideStyle(event.feature, { strokeWeight: 2, strokeColor: "#2557D6", zIndex: 10 });
        const isoA2 = event.feature.getProperty("ISO_A2");
        const count = trendCounts[isoA2] || 0;
        const name = event.feature.getProperty("ADMIN") || isoA2;
        if (count > 0 && isoA2 !== "-99") {
          showTooltip(buildTooltipHtml(`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:20px">${flagEmoji(isoA2)}</span>
              <div>
                <div style="font-weight:600;font-size:14px">${name}</div>
                <div style="font-size:11px;opacity:0.6">${count} trends</div>
              </div>
            </div>
          `, isDark), event.latLng);
        }
      });
      map.data.addListener("mouseout", () => { map.data.revertStyle(); infoRef.current?.close(); });
      map.data.addListener("click", (event: any) => {
        const isoA2 = event.feature.getProperty("ISO_A2");
        if (trendCounts[isoA2] > 0 && isoA2 !== "-99") onSelectCountry(isoA2);
      });
    }

    map.data.setStyle((feature) => {
      const isoA2 = feature.getProperty("ISO_A2");
      if (isoA2 === "-99" || !isoA2) return { visible: false };
      const count = trendCounts[isoA2 as string] || 0;
      const intensity = Math.sqrt(Math.min(count / maxCount, 1)); // sqrt for better distribution

      if (count > 0) {
        const r = Math.round(201 - (201 - 37) * intensity);
        const g = Math.round(213 - (213 - 87) * intensity);
        const b = Math.round(220 - (220 - 214) * intensity);
        return {
          fillColor: `rgb(${r},${g},${b})`, fillOpacity: 0.4 + intensity * 0.5,
          strokeColor: "#FFFFFF", strokeWeight: 0.8, strokeOpacity: 0.6,
          visible: true, zIndex: 1, cursor: "pointer",
        };
      }
      return {
        fillColor: isDark ? "#1e293b" : "#E8E4DC", fillOpacity: 0.3,
        strokeColor: isDark ? "#0f1419" : "#FFFFFF", strokeWeight: 0.5,
        visible: true, zIndex: 0,
      };
    });
  }, [trendCounts, maxCount, onSelectCountry, showTooltip, isDark, clearLayers]);

  /* ═══════════════════════════════════════════════════════════ */
  /*  MODE 3: FLOW — animated polylines between countries       */
  /* ═══════════════════════════════════════════════════════════ */
  const renderFlow = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();

    // Origin dots with pulse
    countryPoints.forEach(c => {
      const count = trendCounts[c.id] || 0;
      if (count === 0) return;
      const intensity = Math.min(count / maxCount, 1);
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 4 + intensity * 8,
          fillColor: "#2557D6", fillOpacity: 0.8,
          strokeColor: "#ffffff", strokeWeight: 2,
        },
        zIndex: 5,
      });
      marker.addListener("click", () => onSelectCountry(c.id));
      markersRef.current.push(marker);
    });

    // Animated flow lines
    flowArcs.forEach(arc => {
      const origin = countryPoints.find(p => p.id === arc.originId);
      const dest = countryPoints.find(p => p.id === arc.destId);
      if (!origin || !dest) return;

      const isCritical = arc.volume > maxCount * 0.7;
      const color = isCritical ? "#E03C31" : "#2557D6";
      const weight = 1.5 + (arc.volume / maxCount) * 2.5;

      // Dashed path
      const dashLine = new google.maps.Polyline({
        path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
        geodesic: true, strokeColor: color, strokeOpacity: 0.2, strokeWeight: weight * 0.6,
        map: googleMapRef.current, zIndex: 1,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.4, strokeColor: color, scale: 2.5 },
          offset: "0", repeat: "14px",
        }],
      });

      // Animated arrow
      const arrowLine = new google.maps.Polyline({
        path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
        geodesic: true, strokeOpacity: 0, strokeWeight: 0,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3.5, strokeColor: "#FFFFFF", strokeWeight: 1,
            fillColor: color, fillOpacity: 1,
          },
          offset: "0%",
        }],
        map: googleMapRef.current, zIndex: 3,
      });

      let offset = 0;
      const animate = () => {
        offset = (offset + 0.5) % 100;
        const icons = arrowLine.get("icons");
        if (icons?.[0]) { icons[0].offset = offset + "%"; arrowLine.set("icons", icons); }
        animFramesRef.current.push(requestAnimationFrame(animate));
      };
      animate();

      // Hover tooltip
      dashLine.addListener("mouseover", (e: any) => {
        dashLine.setOptions({ strokeOpacity: 0.5 });
        showTooltip(buildTooltipHtml(`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:18px">${flagEmoji(arc.originId)}</span>
            <span style="font-weight:600;font-size:11px">${arc.originName}</span>
            <span style="opacity:0.4">→</span>
            <span style="font-size:18px">${flagEmoji(arc.destId)}</span>
            <span style="font-weight:600;font-size:11px">${arc.destName}</span>
          </div>
          <div style="font-size:11px;font-weight:600;margin-bottom:4px">${arc.trendTitle.slice(0, 50)}…</div>
          <div style="font-size:10px;display:flex;gap:8px;opacity:0.6">
            <span>📊 ${arc.volume}</span>
            <span>⏱️ ${arc.timeDelta.toFixed(1)}h</span>
          </div>
        `, isDark), { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 });
      });
      dashLine.addListener("mouseout", () => { dashLine.setOptions({ strokeOpacity: 0.2 }); infoRef.current?.close(); });

      polylinesRef.current.push(dashLine, arrowLine);
    });
  }, [flowArcs, trendCounts, maxCount, onSelectCountry, showTooltip, isDark, clearLayers]);

  /* ═══════════════════════════════════════════════════════════ */
  /*  MODE 4: SENTIMENT — per-country coloring via Data Layer   */
  /* ═══════════════════════════════════════════════════════════ */
  const renderSentiment = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();
    const map = googleMapRef.current;

    // Build sentiment lookup
    const sentimentByCountry = new Map<string, SentimentBubble>();
    sentimentBubbles.forEach(b => sentimentByCountry.set(b.countryId, b));

    // Use GeoJSON for country polygons
    if (!geoJsonLoadedRef.current) {
      map.data.loadGeoJson("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
      geoJsonLoadedRef.current = true;
    }

    // Hover
    map.data.addListener("mouseover", (event: any) => {
      const isoA2 = event.feature.getProperty("ISO_A2");
      const bubble = sentimentByCountry.get(isoA2);
      if (!bubble || isoA2 === "-99") return;
      map.data.revertStyle();
      map.data.overrideStyle(event.feature, { strokeWeight: 1.5, strokeColor: "#fff", zIndex: 10 });
      const total = bubble.trendCount || 1;
      const posP = Math.round((bubble.sentiment.positive) * 100);
      const neuP = Math.round((bubble.sentiment.neutral) * 100);
      const negP = Math.round((bubble.sentiment.negative) * 100);
      const emoji = bubble.dominantSentiment === "positive" ? "😊" : bubble.dominantSentiment === "negative" ? "😟" : "😐";
      const label = bubble.dominantSentiment === "positive" ? (lang === "pt" ? "POSITIVO" : "POSITIVE") : bubble.dominantSentiment === "negative" ? (lang === "pt" ? "NEGATIVO" : "NEGATIVE") : (lang === "pt" ? "NEUTRO" : "NEUTRAL");
      showTooltip(buildTooltipHtml(`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:20px">${flagEmoji(isoA2)}</span>
          <div>
            <div style="font-weight:600;font-size:14px">${bubble.countryName}</div>
          </div>
        </div>
        <div style="font-size:12px;margin-bottom:6px">${emoji} ${lang === "pt" ? "Sentimento" : "Sentiment"}: <strong>${label}</strong></div>
        <div style="display:flex;gap:4px;margin-bottom:6px">
          <span style="font-size:10px;background:rgba(34,197,94,0.15);color:#22c55e;padding:2px 6px;border-radius:4px">😊 ${posP}%</span>
          <span style="font-size:10px;background:rgba(100,116,139,0.15);color:#64748b;padding:2px 6px;border-radius:4px">😐 ${neuP}%</span>
          <span style="font-size:10px;background:rgba(224,60,49,0.15);color:#E03C31;padding:2px 6px;border-radius:4px">😟 ${negP}%</span>
        </div>
        <div style="font-size:10px;opacity:0.5">${total} ${lang === "pt" ? "tendências analisadas" : "trends analyzed"}</div>
      `, isDark), event.latLng);
    });
    map.data.addListener("mouseout", () => { map.data.revertStyle(); infoRef.current?.close(); });
    map.data.addListener("click", (event: any) => {
      const isoA2 = event.feature.getProperty("ISO_A2");
      if (sentimentByCountry.has(isoA2)) onSelectCountry(isoA2);
    });

    map.data.setStyle((feature) => {
      const isoA2 = feature.getProperty("ISO_A2");
      if (isoA2 === "-99" || !isoA2) return { visible: false };
      const bubble = sentimentByCountry.get(isoA2 as string);
      if (!bubble) {
        return {
          fillColor: isDark ? "#1e293b" : "#E8E4DC", fillOpacity: 0.3,
          strokeColor: "#FFFFFF", strokeWeight: 0.5, visible: true,
        };
      }
      const score = Math.min(bubble.trendCount / (maxCount || 1), 1);
      const colors: Record<string, string> = {
        positive: `rgba(34, 197, 94, ${0.25 + score * 0.55})`,
        neutral: `rgba(100, 116, 139, ${0.20 + score * 0.40})`,
        negative: `rgba(224, 60, 49, ${0.25 + score * 0.55})`,
        mixed: `rgba(245, 158, 11, ${0.25 + score * 0.45})`,
      };
      return {
        fillColor: colors[bubble.dominantSentiment] || colors.neutral,
        fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 0.7, strokeOpacity: 0.7,
        visible: true,
      };
    });

    // Sentiment intensity markers for strong signals
    sentimentBubbles.filter(b => {
      const score = Math.min(b.trendCount / (maxCount || 1), 1);
      return score > 0.3;
    }).forEach(b => {
      const c = countryPoints.find(p => p.id === b.countryId);
      if (!c) return;
      const color = b.dominantSentiment === "positive" ? "#22c55e" : b.dominantSentiment === "negative" ? "#E03C31" : "#64748b";
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE, scale: 4,
          fillColor: color, fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 1.5,
        },
        zIndex: 5,
      });
      markersRef.current.push(marker);
    });
  }, [sentimentBubbles, maxCount, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ─── Mode switch ─── */
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    if (mapMode === "heatmap") renderHeatmap();
    else if (mapMode === "choropleth") renderChoropleth();
    else if (mapMode === "flow") renderFlow();
    else if (mapMode === "sentiment") renderSentiment();
  }, [mapMode, mapLoaded, renderHeatmap, renderChoropleth, renderFlow, renderSentiment]);

  /* ─── Mode selector config ─── */
  const mapModes: { key: MapMode; icon: typeof Flame; label: string }[] = [
    { key: "heatmap", icon: Flame, label: "Heatmap" },
    { key: "choropleth", icon: MapIcon, label: lang === "pt" ? "Coroplético" : "Choropleth" },
    { key: "flow", icon: GitBranch, label: lang === "pt" ? "Fluxo" : "Flow" },
    { key: "sentiment", icon: Heart, label: lang === "pt" ? "Sentimento" : "Sentiment" },
  ];

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Mode selector */}
      <div className="absolute top-3 left-3 z-20 flex gap-1 bg-card/90 backdrop-blur-xl rounded-2xl p-1.5 border border-border/30 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        {mapModes.map(({ key, icon: Icon, label, activeColor }) => (
          <button
            key={key}
            onClick={() => setMapMode(key)}
            className={`relative px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
              mapMode === key
                ? `${activeColor} text-white`
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {!isMobile && label}
            </span>
          </button>
        ))}
        {selectedCountry !== "global" && (
          <button
            onClick={() => onSelectCountry("global")}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            <Globe className="w-3.5 h-3.5" />
            {!isMobile && "Global"}
          </button>
        )}
      </div>

      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Zoom controls */}
      {mapLoaded && (
        <div className={`absolute z-20 flex flex-col gap-1 ${isMobile ? "bottom-24 right-3" : "bottom-[100px] right-3"}`}>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
            className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-xl border border-border/30 shadow-md flex items-center justify-center text-foreground hover:bg-card transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
            className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-xl border border-border/30 shadow-md flex items-center justify-center text-foreground hover:bg-card transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">{lang === "pt" ? "Carregando mapa…" : "Loading map…"}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10">
          <div className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs">
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <button onClick={() => setMapRetry(r => r + 1)} className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
              🔄 {lang === "pt" ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-card/90 backdrop-blur-xl border border-border/30 rounded-xl p-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
          {mapMode === "heatmap" && (lang === "pt" ? "Densidade de Tendências" : "Trend Density")}
          {mapMode === "choropleth" && (lang === "pt" ? "Cobertura por País" : "Coverage by Country")}
          {mapMode === "flow" && (lang === "pt" ? "Propagação entre Países" : "Cross-Country Propagation")}
          {mapMode === "sentiment" && (lang === "pt" ? "Sentimento por País" : "Sentiment by Country")}
        </div>

        {mapMode === "heatmap" && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-gradient-to-r from-[#C9D5DC] via-[#2557D6] to-[#E03C31]" />
            <span className="text-[9px] text-muted-foreground">{lang === "pt" ? "Baixo → Alto" : "Low → High"}</span>
          </div>
        )}
        {mapMode === "choropleth" && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-gradient-to-r from-[#E8E4DC] via-[#C5D3EE] to-[#2557D6]" />
            <span className="text-[9px] text-muted-foreground">{lang === "pt" ? "Sem dados → Alto" : "No data → High"}</span>
          </div>
        )}
        {mapMode === "flow" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-[#2557D6]" />
              <span className="text-[9px] text-muted-foreground">Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-[#E03C31]" />
              <span className="text-[9px] text-muted-foreground">{lang === "pt" ? "Crítico" : "Critical"}</span>
            </div>
          </div>
        )}
        {mapMode === "sentiment" && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px]"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{lang === "pt" ? "Positivo" : "Positive"}</span>
            <span className="flex items-center gap-1 text-[9px]"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />{lang === "pt" ? "Neutro" : "Neutral"}</span>
            <span className="flex items-center gap-1 text-[9px]"><span className="w-2.5 h-2.5 rounded-full bg-[#E03C31]" />{lang === "pt" ? "Negativo" : "Negative"}</span>
          </div>
        )}

        <div className="flex gap-3 text-[9px] text-muted-foreground/50 mt-1.5">
          <span>Máx: {maxCount}</span>
          <span>· {activeCountries} {lang === "pt" ? "países" : "countries"}</span>
          <span>· {totalTrends} trends</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapView;
