/// <reference types="google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

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

const lightStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#555566" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#22223a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#22223a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f0f1e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a4a5a" }] },
];

interface GoogleMapViewProps {
  trendCounts: Record<string, number>;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
  activeTrend?: TrendCardProps | null;
  onDismissTrend?: () => void;
  trends?: TrendCardProps[];
}

const GoogleMapView = ({
  trendCounts,
  selectedCountry,
  onSelectCountry,
  activeTrend,
  onDismissTrend,
  trends = [],
}: GoogleMapViewProps) => {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const hoverInfoRef = useRef<any>(null);
  const googleRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapViewType, setMapViewType] = useState<MapViewType>("roadmap");
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Apply map styles when dark mode changes
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
  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      try {
        const { data } = await supabase.functions.invoke("get-maps-key");
        if (cancelled || !data?.key) {
          setMapError("API key not available");
          return;
        }

        setOptions({ key: data.key, v: "weekly", libraries: ["visualization"] });

        const [mapsLib, markerLib, vizLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("visualization"),
        ]);

        if (cancelled || !mapRef.current) {
          setMapError("Google Maps failed to initialize");
          return;
        }

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
        });

        googleMapRef.current = map;
        infoWindowRef.current = new InfoWindow();
        hoverInfoRef.current = new InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch (err) {
        console.error("Google Maps load error:", err);
        setMapError("Failed to load map");
      }
    };

    loadMap();
    return () => { cancelled = true; };
  }, []);

  // Create/update heatmap when trendCounts change
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;

    // Wait for visualization library
    if (!google?.maps?.visualization?.HeatmapLayer) {
      console.log("HeatmapLayer not available yet");
      return;
    }

    // Remove old heatmap
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
        radius: 80,
        opacity: 0.7,
        dissipating: true,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(66, 133, 244, 0.3)",
          "rgba(66, 133, 244, 0.6)",
          "rgba(102, 187, 255, 0.7)",
          "rgba(251, 188, 4, 0.7)",
          "rgba(255, 160, 0, 0.8)",
          "rgba(234, 67, 53, 0.8)",
          "rgba(234, 67, 53, 1)",
        ],
      });
      heatmapRef.current = heatmap;
      console.log(`Heatmap created with ${heatmapData.length} points, enabled: ${heatmapEnabled}`);
    }
  }, [trendCounts, mapLoaded]);

  // Toggle heatmap visibility
  useEffect(() => {
    if (heatmapRef.current) {
      heatmapRef.current.setMap(heatmapEnabled ? googleMapRef.current : null);
      console.log("Heatmap toggled:", heatmapEnabled);
    }
  }, [heatmapEnabled]);

  // Create/update markers when trendCounts change
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const g = googleRef.current;
    if (!g) return;

    countryPoints.forEach((cp) => {
      const count = trendCounts[cp.id] || 0;
      const intensity = maxCount > 0 ? count / maxCount : 0;
      const isPeak = count > avgCount;
      const isSelected = selectedCountry === cp.id;

      let fillColor = "#4285F4";
      if (intensity > 0.33) fillColor = "#FBBC04";
      if (intensity > 0.66) fillColor = "#EA4335";

      const scale = isPeak ? 1.2 + intensity * 1.5 : 0.8 + intensity * 0.6;

      const marker = new g.maps.Marker({
        map,
        position: { lat: cp.lat, lng: cp.lng },
        title: `${cp.name} · ${count} trends`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 0.85,
          strokeColor: isSelected ? "#1a73e8" : "rgba(255,255,255,0.9)",
          strokeWeight: isSelected ? 3 : 2,
          scale: scale * 8,
        },
        zIndex: isPeak ? 10 : 1,
      });

      if (isPeak) {
        marker.setAnimation(g.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 2000);
      }

      marker.addListener("mouseover", () => {
        if (hoverInfoRef.current) {
          const countryTrends = trends
            .filter((tr) => tr.countryCode === cp.id)
            .slice(0, 3);
          const trendsList = countryTrends.length > 0
            ? countryTrends.map((tr) =>
                `<div style="font-size:11px;color:#999;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">• ${tr.title.slice(0, 40)}${tr.title.length > 40 ? '…' : ''}</div>`
              ).join('')
            : `<div style="font-size:11px;color:#999;margin-top:3px;">${t("noTrends")}</div>`;

          hoverInfoRef.current.setContent(`
            <div style="font-family:Inter,sans-serif;padding:4px 0;min-width:140px;">
              <strong style="font-size:13px;">${cp.name}</strong>
              <div style="font-size:11px;color:#888;margin-top:1px;">${count} ${t("trendCount")}</div>
              <div style="margin-top:4px;border-top:1px solid #eee;padding-top:4px;">
                ${trendsList}
              </div>
            </div>
          `);
          hoverInfoRef.current.open({ anchor: marker, map });
        }
      });

      marker.addListener("mouseout", () => {
        hoverInfoRef.current?.close();
      });

      marker.addListener("click", () => {
        hoverInfoRef.current?.close();
        onSelectCountry(cp.id === selectedCountry ? "global" : cp.id);

        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="font-family: Inter, sans-serif; padding: 4px 0;">
              <strong style="font-size: 13px;">${cp.name}</strong>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">
                ${count} ${t("trendCount")}
              </div>
            </div>
          `);
          infoWindowRef.current.open({ anchor: marker, map });
        }
      });

      markersRef.current.push(marker);
    });
  }, [trendCounts, maxCount, avgCount, selectedCountry, mapLoaded, onSelectCountry, t, trends]);

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

  // Change map type
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      googleMapRef.current.setMapTypeId(mapViewType);
    }
  }, [mapViewType, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      {/* Map type toggle + heatmap toggle */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <div className="flex rounded-lg overflow-hidden border border-border shadow-sm">
          {([
            { type: "roadmap" as MapViewType, label: t("map") },
            { type: "satellite" as MapViewType, label: t("satellite") },
            { type: "terrain" as MapViewType, label: t("terrain") },
          ]).map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setMapViewType(type)}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                mapViewType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/90 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHeatmapEnabled(!heatmapEnabled)}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border border-border shadow-sm transition-colors ${
            heatmapEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-card/90 text-muted-foreground hover:bg-secondary"
          }`}
          title="Heatmap"
        >
          🔥 Heatmap
        </button>
      </div>

      {/* Heatmap legend */}
      {heatmapEnabled && (
        <div className="absolute bottom-4 right-3 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-sm px-3 py-2">
          <p className="text-[10px] font-semibold text-foreground mb-1.5">{t("heatmapDensity")}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground">{t("low")}</span>
            <div className="flex h-2.5 rounded-full overflow-hidden w-24">
              <div className="flex-1" style={{ background: "#4285F4" }} />
              <div className="flex-1" style={{ background: "#66BBFF" }} />
              <div className="flex-1" style={{ background: "#FBBC04" }} />
              <div className="flex-1" style={{ background: "#FFA000" }} />
              <div className="flex-1" style={{ background: "#EA4335" }} />
            </div>
            <span className="text-[9px] text-muted-foreground">{t("high")}</span>
          </div>
        </div>
      )}

      {/* Reset view button */}
      {selectedCountry !== "global" && (
        <button
          onClick={() => {
            onSelectCountry("global");
            googleMapRef.current?.panTo({ lat: 20, lng: 0 });
            googleMapRef.current?.setZoom(2.5);
          }}
          className="absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-medium bg-card/90 text-muted-foreground hover:bg-secondary rounded-lg border border-border shadow-sm transition-colors"
        >
          🌎 {t("global")}
        </button>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {t("loading")}
          </div>
        </div>
      )}

      {/* Error fallback */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
          <div className="text-center p-4">
            <p className="text-sm text-muted-foreground mb-2">{mapError}</p>
            <p className="text-xs text-muted-foreground">Using fallback map</p>
          </div>
        </div>
      )}

      {/* Active trend mini-card */}
      {activeTrend && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg max-w-xs w-[90%] animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-pointer z-10"
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

export default GoogleMapView;
