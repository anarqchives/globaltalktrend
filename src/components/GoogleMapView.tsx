/// <reference types="google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";
import GlobalRanking from "./GlobalRanking";
import { Map, Layers, Mountain, Flame, Globe } from "lucide-react";

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

function getMarkerColor(intensity: number): { fill: string; glow: string } {
  if (intensity > 0.66) return { fill: "#ef4444", glow: "rgba(239,68,68,0.35)" };
  if (intensity > 0.33) return { fill: "#f59e0b", glow: "rgba(245,158,11,0.3)" };
  return { fill: "#3b82f6", glow: "rgba(59,130,246,0.3)" };
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapViewType, setMapViewType] = useState<MapViewType>("roadmap");
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

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

  // Load Google Maps
  const retryMap = useCallback(() => {
    setMapError(null);
    setMapLoaded(false);
    setMapRetry((r) => r + 1);
  }, []);

  const [mapRetry, setMapRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-maps-key");
        if (cancelled) return; // StrictMode cleanup — exit silently

        if (fnError || !data?.key) {
          console.error("[GoogleMapView] get-maps-key failed", {
            fnError,
            hasKey: !!data?.key,
            hostname: window.location.hostname,
          });
          setMapError("Chave do mapa indisponível para este domínio");
          return;
        }

        setOptions({ key: data.key, v: "weekly", libraries: ["visualization", "marker"] });

        const [mapsLib, markerLib, vizLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("visualization"),
        ]);

        if (cancelled || !mapRef.current) return; // StrictMode cleanup — exit silently

        const { Map: GMap, InfoWindow } = mapsLib;
        const { Marker } = markerLib;

        googleRef.current = {
          maps: {
            Map: GMap,
            Marker,
            InfoWindow,
            SymbolPath: google.maps.SymbolPath,
            Animation: google.maps.Animation,
          },
          visualization: vizLib,
        };

        const map = new GMap(mapRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2.5,
          minZoom: 2,
          maxZoom: 8,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: 3 },
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
        if (!cancelled) {
          console.error("Google Maps load error:", err);
          setMapError("Falha ao carregar mapa");
        }
      }
    };

    loadMap();
    return () => { cancelled = true; };
  }, [mapRetry]);

  // Heatmap
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;
    if (!google?.maps?.visualization?.HeatmapLayer) return;

    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }

    const heatmapData = countryPoints
      .filter((cp) => (trendCounts[cp.id] || 0) > 0)
      .map((cp) => ({
        location: new google.maps.LatLng(cp.lat, cp.lng),
        weight: (trendCounts[cp.id] || 1) * 3,
      }));

    if (heatmapData.length > 0) {
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: heatmapEnabled ? map : null,
        radius: 90,
        opacity: 0.55,
        dissipating: true,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(59, 130, 246, 0.15)",
          "rgba(59, 130, 246, 0.35)",
          "rgba(96, 165, 250, 0.45)",
          "rgba(251, 191, 36, 0.5)",
          "rgba(245, 158, 11, 0.6)",
          "rgba(239, 68, 68, 0.65)",
          "rgba(220, 38, 38, 0.8)",
        ],
      });
      heatmapRef.current = heatmap;
    }
  }, [trendCounts, mapLoaded]);

  useEffect(() => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(heatmapEnabled ? googleMapRef.current : null);
    }
  }, [heatmapEnabled]);

  // Markers with ripple effect
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
      const { fill, glow } = getMarkerColor(intensity);
      const scale = 4 + intensity * 12; // 4px to 16px radius
      const isHighActivity = intensity > 0.5;
      const isMedActivity = intensity > 0.25;

      // Animated ripple ring behind main marker (for medium+ activity)
      if (count > 0 && (isHighActivity || isMedActivity)) {
        const rippleScale = scale * 2.5;
        const ripple = new g.maps.Marker({
          map,
          position: { lat: cp.lat, lng: cp.lng },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: fill,
            fillOpacity: 0,
            strokeColor: fill,
            strokeWeight: 1.5,
            strokeOpacity: 0.4,
            scale: rippleScale,
          },
          clickable: false,
          zIndex: 0,
          optimized: false,
        });
        rippleOverlaysRef.current.push(ripple);

        // Animate ripple with requestAnimationFrame
        let startTime = performance.now();
        const duration = isHighActivity ? 2000 : 3000;
        const animateRipple = (now: number) => {
          if (!ripple.getMap()) return;
          const elapsed = (now - startTime) % duration;
          const progress = elapsed / duration;
          const currentScale = scale + (rippleScale - scale) * progress;
          const opacity = 0.5 * (1 - progress);
          ripple.setIcon({
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: fill,
            fillOpacity: 0,
            strokeColor: fill,
            strokeWeight: 1.5 * (1 - progress * 0.5),
            strokeOpacity: opacity,
            scale: currentScale,
          });
          requestAnimationFrame(animateRipple);
        };
        requestAnimationFrame(animateRipple);

        // Second ripple ring for high activity (delayed)
        if (isHighActivity) {
          const ripple2 = new g.maps.Marker({
            map,
            position: { lat: cp.lat, lng: cp.lng },
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              fillColor: fill,
              fillOpacity: 0,
              strokeColor: fill,
              strokeWeight: 1,
              strokeOpacity: 0.3,
              scale: rippleScale,
            },
            clickable: false,
            zIndex: 0,
            optimized: false,
          });
          rippleOverlaysRef.current.push(ripple2);

          const startTime2 = performance.now() - 800; // offset
          const animateRipple2 = (now: number) => {
            if (!ripple2.getMap()) return;
            const elapsed = (now - startTime2) % duration;
            const progress = elapsed / duration;
            const currentScale = scale + (rippleScale * 1.15 - scale) * progress;
            const opacity = 0.35 * (1 - progress);
            ripple2.setIcon({
              path: g.maps.SymbolPath.CIRCLE,
              fillColor: fill,
              fillOpacity: 0,
              strokeColor: fill,
              strokeWeight: 1 * (1 - progress * 0.5),
              strokeOpacity: opacity,
              scale: currentScale,
            });
            requestAnimationFrame(animateRipple2);
          };
          requestAnimationFrame(animateRipple2);
        }
      }

      // Main marker
      const marker = new g.maps.Marker({
        map,
        position: { lat: cp.lat, lng: cp.lng },
        title: `${cp.name} · ${count} trends`,
        label: count > 0 ? {
          text: String(count),
          color: "#fff",
          fontSize: scale > 10 ? "10px" : "8px",
          fontWeight: "700",
          fontFamily: "Inter, system-ui, sans-serif",
        } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor: fill,
          fillOpacity: 0.9,
          strokeColor: isSelected ? "#fff" : glow,
          strokeWeight: isSelected ? 2.5 : count > 0 ? 6 : 0,
          scale,
          labelOrigin: { x: 0, y: 0 } as google.maps.Point,
        },
        zIndex: isSelected ? 20 : count > avgCount ? 10 : 1,
        optimized: false,
      });

      // Hover scale animation helper
      const animateMarkerScale = (from: number, to: number, duration = 200) => {
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          const current = from + (to - from) * eased;
          const icon = marker.getIcon();
          if (icon) {
            marker.setIcon({ ...icon, scale: current });
          }
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      const hoverScale = scale * 1.35;

      // Tooltip + hover scale
      marker.addListener("mouseover", () => {
        animateMarkerScale(scale, hoverScale);

        if (!hoverInfoRef.current) return;
        const countryTrends = trends.filter((tr) => tr.countryCode === cp.id).slice(0, 3);

        const platformIcons: Record<string, string> = {
          YouTube: "▶", Reddit: "◉", "Google Trends": "◎", NewsAPI: "▣", Bluesky: "🦋",
        };
        const platformColors: Record<string, string> = {
          YouTube: "#FF0000", Reddit: "#FF4500", "Google Trends": "#3b82f6", NewsAPI: "#22C55E", Bluesky: "#0085FF",
        };

        const bg = isDark ? "rgba(19,22,32,0.95)" : "rgba(255,255,255,0.95)";
        const text = isDark ? "#e2e8f0" : "#111827";
        const subtext = isDark ? "#6b7280" : "#9ca3af";
        const border = isDark ? "rgba(45,51,72,0.5)" : "rgba(0,0,0,0.06)";
        const badgeBg = isDark ? "rgba(30,41,59,0.8)" : "rgba(241,245,249,0.8)";
        const flag = cp.id.length === 2
          ? String.fromCodePoint(...[...cp.id.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
          : "";

        const trendsList = countryTrends.length > 0
          ? countryTrends.map((tr) => {
              const pIcon = platformIcons[tr.platform] || "●";
              const pColor = platformColors[tr.platform] || "#888";
              return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;">
                <span style="color:${pColor};font-size:11px;flex-shrink:0;opacity:0.8;">${pIcon}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:11px;color:${text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;font-weight:500;letter-spacing:-0.01em;">${tr.title.slice(0, 40)}${tr.title.length > 40 ? '…' : ''}</div>
                  <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
                    <span style="font-size:9px;background:${badgeBg};color:${subtext};padding:1px 6px;border-radius:6px;font-weight:600;">${tr.volume}</span>
                  </div>
                </div>
              </div>`;
            }).join('')
          : `<div style="font-size:11px;color:${subtext};padding:6px 0;text-align:center;">${t("noTrends")}</div>`;

        hoverInfoRef.current.setContent(`
          <div style="font-family:Inter,system-ui,-apple-system,sans-serif;padding:8px 4px;min-width:200px;max-width:240px;background:${bg};color:${text};border-radius:12px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${border};">
            <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid ${border};">
              <span style="font-size:20px;line-height:1;">${flag}</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:${text};letter-spacing:-0.02em;">${cp.name}</div>
                <div style="font-size:10px;color:${subtext};margin-top:1px;">
                  <span style="display:inline-block;background:${fill};color:#fff;padding:1px 8px;border-radius:8px;font-weight:700;font-size:10px;">${count}</span>
                  <span style="margin-left:4px;">${t("trendCount")}</span>
                </div>
              </div>
            </div>
            <div style="padding-top:4px;">
              ${trendsList}
            </div>
          </div>
        `);
        hoverInfoRef.current.open({ anchor: marker, map });
      });

      marker.addListener("mouseout", () => {
        animateMarkerScale(hoverScale, scale);
        hoverInfoRef.current?.close();
      });

      marker.addListener("click", () => {
        hoverInfoRef.current?.close();
        onSelectCountry(cp.id === selectedCountry ? "global" : cp.id);
        map.panTo({ lat: cp.lat, lng: cp.lng });
        map.setZoom(cp.id === selectedCountry ? 2.5 : 5);
      });

      markersRef.current.push(marker);
    });
  }, [trendCounts, maxCount, avgCount, selectedCountry, mapLoaded, onSelectCountry, t, trends, isDark]);

  // Pan to selected country
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded || selectedCountry === "global") return;
    const cp = countryPoints.find((c) => c.id === selectedCountry);
    if (cp) {
      map.panTo({ lat: cp.lat, lng: cp.lng });
      map.setZoom(5);
    }
  }, [selectedCountry, mapLoaded]);

  // Pan to highlighted country (from expanded card)
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded || !highlightCountry) return;
    const cp = countryPoints.find((c) => c.id === highlightCountry);
    if (cp) {
      map.panTo({ lat: cp.lat, lng: cp.lng });
      map.setZoom(5);
    }
  }, [highlightCountry, mapLoaded]);

  // Listen for trend-expand-country events from timeline
  useEffect(() => {
    const handler = (e: Event) => {
      const cc = (e as CustomEvent).detail;
      const map = googleMapRef.current;
      if (!map || !mapLoaded) return;
      const cp = countryPoints.find((c) => c.id === cc);
      if (cp) {
        map.panTo({ lat: cp.lat, lng: cp.lng });
        map.setZoom(5);
      }
    };
    window.addEventListener('trend-expand-country', handler);
    return () => window.removeEventListener('trend-expand-country', handler);
  }, [mapLoaded]);

  // Change map type
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapViewType);
      if (mapViewType === "roadmap") {
        googleMapRef.current.setOptions({ styles: isDark ? darkStyles : lightStyles });
      }
    }
  }, [mapViewType, mapLoaded, isDark]);

  const controlBtnClass = (active: boolean) =>
    `p-2 rounded-xl transition-all duration-200 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:ring-1 focus-visible:ring-primary/30 ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10"
    }`;

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Map controls + Top Trends — top left */}
      <div className="absolute top-3 left-3 z-[5] flex items-start gap-2">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] outline-none ring-0">
          <button
            onClick={() => setMapViewType("roadmap")}
            className={controlBtnClass(mapViewType === "roadmap")}
            title={t("map")}
          >
            <Map className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMapViewType("satellite")}
            className={controlBtnClass(mapViewType === "satellite")}
            title={t("satellite")}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMapViewType("terrain")}
            className={controlBtnClass(mapViewType === "terrain")}
            title={t("terrain")}
          >
            <Mountain className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-border/40 mx-0.5" />

          <button
            onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            className={controlBtnClass(heatmapEnabled)}
            title="Heatmap"
          >
            <Flame className="w-3.5 h-3.5" />
          </button>

          {selectedCountry !== "global" && (
            <>
              <div className="w-px h-5 bg-border/40 mx-0.5" />
              <button
                onClick={() => {
                  onSelectCountry("global");
                  googleMapRef.current?.panTo({ lat: 20, lng: 0 });
                  googleMapRef.current?.setZoom(2.5);
                }}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-200"
                title={t("global")}
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Global Ranking panel — next to map controls */}
        {mapLoaded && trends.length > 0 && (
          <GlobalRanking
            trends={trends}
            onSelectTrend={onSelectTrend}
            onFilterCountry={onSelectCountry}
            collapsed={true}
          />
        )}
      </div>

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

      {/* Error fallback with retry */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm">
          <div className="text-center p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg max-w-xs">
            <div className="text-3xl mb-3">🗺️</div>
            <p className="text-sm font-medium text-foreground mb-1">{mapError}</p>
            <p className="text-xs text-muted-foreground/60 mb-4">O mapa será exibido assim que a conexão for restabelecida.</p>
            <button
              onClick={retryMap}
              className="px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors shadow-sm"
            >
              🔄 Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Active trend info - subtle indicator instead of overlay card */}
      {activeTrend && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] px-4 py-2 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer z-10 outline-none ring-0"
          onClick={onDismissTrend}
        >
          <p className="text-[11px] font-medium text-foreground truncate">{activeTrend.title}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{activeTrend.platform} · {activeTrend.volume} · {t("clickToClose")}</p>
        </div>
      )}

      {/* Coffee donation floating button */}
      <CoffeeDonationButton />

      {/* Heatmap legend */}
      <AnimatePresence>
        {heatmapEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-4 right-5 z-20 bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] px-4 py-2.5 outline-none ring-0"
          >
            <p className="text-[10px] font-semibold text-foreground mb-1.5 tracking-wide">{t("heatmapDensity")}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground font-medium">{t("low")}</span>
              <div className="flex h-2 rounded-full overflow-hidden w-24 shadow-inner">
                <div className="flex-1" style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa)" }} />
                <div className="flex-1" style={{ background: "linear-gradient(90deg, #60a5fa, #fbbf24)" }} />
                <div className="flex-1" style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
                <div className="flex-1" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
                <div className="flex-1" style={{ background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{t("high")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Coffee Donation Button Component
const CoffeeDonationButton = () => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-coffee-popup]')) {
        setExpanded(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [expanded]);

  return (
    <div className="absolute bottom-16 left-4 z-20" data-coffee-popup>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mb-2 p-4 rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.1)] w-56"
          >
            <p className="text-[13px] font-medium text-foreground mb-3">
              Apoie a melhoria contínua da ferramenta
            </p>
            <a
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold transition-colors shadow-sm"
            >
              ☕ Apoie
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-10 h-10 rounded-[20px] bg-white/95 dark:bg-card/95 backdrop-blur-[12px] border border-white/50 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center justify-center text-lg hover:scale-105 transition-transform focus:outline-none"
        title="Apoie o projeto"
      >
        ☕
      </button>
    </div>
  );
};

export default GoogleMapView;
