/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrendCardProps } from "./TrendCard";
import { Flame, GitBranch, Heart, ShieldCheck, TrendingUp, Plus, Minus, Globe, Share2, Bookmark, ThumbsUp, Bug, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  computeFlowArcs,
  computeSentimentBubbles,
  type FlowArc,
  type SentimentBubble,
} from "@/lib/map-visualizations";

type MapTab = "panorama" | "sentiment" | "verification" | "trending";

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
  { id: "AU", name: "Austrália", lat: -25.27, lng: 133.78 },
  { id: "NZ", name: "Nova Zelândia", lat: -40.9, lng: 174.89 },
];

const BASE_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#D6D2CA" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#D0CCC4" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E8E4E0" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#BFBAB2" }, { weight: 0.6 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9E9890" }] },
  { featureType: "administrative.country", elementType: "labels.text.stroke", stylers: [{ color: "#E8E4E0" }, { weight: 2 }] },
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

/* ── Premium tooltip builder ── */
function buildTooltipHtml(content: string, isDark: boolean): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = `
    font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
    padding:14px 18px;min-width:200px;max-width:300px;
    background:${isDark ? "rgba(15,20,30,0.96)" : "rgba(255,255,255,0.97)"};
    color:${isDark ? "#e2e8f0" : "#1a1a1a"};
    border-radius:12px;
    backdrop-filter:blur(20px) saturate(1.8);
    -webkit-backdrop-filter:blur(20px) saturate(1.8);
    border:1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"};
    box-shadow:0 8px 32px rgba(0,0,0,${isDark ? "0.4" : "0.10"}), 0 1px 3px rgba(0,0,0,0.06);
    font-size:12px;line-height:1.5;
  `;
  div.innerHTML = content;
  return div;
}

function flagEmoji(code: string): string {
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  } catch { return "🌐"; }
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

/* module-level flag to avoid double-loading */
let optionsSet = false;

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

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MapTab>("panorama");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [mapRetry, setMapRetry] = useState(0);

  const maxCount = useMemo(() => Math.max(...Object.values(trendCounts), 1), [trendCounts]);
  const activeCountries = useMemo(() => Object.values(trendCounts).filter(v => v > 0).length, [trendCounts]);
  const totalTrends = useMemo(() => Object.values(trendCounts).reduce((a, b) => a + b, 0), [trendCounts]);
  const sentimentBubbles = useMemo(() => computeSentimentBubbles(trends, countryPoints), [trends]);
  const flowArcs = useMemo(() => computeFlowArcs(trends, countryPoints, 0.55), [trends]);

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const clearLayers = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    animFramesRef.current.forEach(id => cancelAnimationFrame(id));
    animFramesRef.current = [];
    if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    infoRef.current?.close();
  }, []);

  /* ── Load Google Maps with proper Loader instance ── */
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

        /* Use functional API — setOptions + importLibrary */
        if (!optionsSet) {
          setOptions({ key: apiKey!, v: "weekly", libraries: ["visualization"] });
          optionsSet = true;
        }

        await importLibrary("maps");
        await importLibrary("visualization");

        if (!mapRef.current || cancelled) return;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 0 }, zoom: 2.5, minZoom: 2, maxZoom: 8,
          disableDefaultUI: true, zoomControl: false, mapTypeControl: false,
          streetViewControl: false, fullscreenControl: false, mapTypeId: "roadmap",
          styles: isDark ? DARK_MAP_STYLE : BASE_MAP_STYLE,
          gestureHandling: "greedy",
          backgroundColor: isDark ? "#0f1419" : "#E8E4E0",
        });
        googleMapRef.current = map;
        infoRef.current = new google.maps.InfoWindow({ disableAutoPan: true });
        setMapLoaded(true);
      } catch (err) {
        console.error("Map load error:", err);
        if (!cancelled) setMapError("Falha ao carregar mapa");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mapRetry, isDark]);

  const showTooltip = useCallback((html: HTMLElement, pos: { lat: number; lng: number }) => {
    if (!infoRef.current || !googleMapRef.current) return;
    infoRef.current.setContent(html);
    infoRef.current.setPosition(pos);
    infoRef.current.open(googleMapRef.current);
  }, []);

  /* Helper: get top trends for a country */
  const getCountryTopTrends = useCallback((cc: string, limit = 3) => {
    return trends
      .filter(t => t.countryCode?.toUpperCase() === cc)
      .sort((a, b) => {
        const va = parseFloat((a.volume || "0").replace(/[^0-9.]/g, "")) || 0;
        const vb = parseFloat((b.volume || "0").replace(/[^0-9.]/g, "")) || 0;
        return vb - va;
      })
      .slice(0, limit);
  }, [trends]);

  /* ═══ TOOLTIP BUILDERS — premium editorial cards ═══ */
  const buildCountryTooltip = useCallback((name: string, cc: string, count: number, extra?: string) => {
    const topTrends = getCountryTopTrends(cc, 3);
    const trendsList = topTrends.map(t => {
      const ch = t.change || "";
      const isUp = t.changePositive;
      const arrow = isUp ? "↗" : ch ? "↘" : "";
      const chColor = isUp ? "#22c55e" : ch ? "#ef4444" : "#94a3b8";
      return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}">
        <span style="font-size:10px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title.slice(0, 45)}${t.title.length > 45 ? "…" : ""}</span>
        ${ch ? `<span style="font-size:9px;font-weight:700;color:${chColor};white-space:nowrap">${arrow}${ch}</span>` : ""}
      </div>`;
    }).join("");

    return buildTooltipHtml(`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:22px;line-height:1">${flagEmoji(cc)}</span>
        <div>
          <div style="font-weight:700;font-size:13px;letter-spacing:-0.02em">${name}</div>
          <div style="font-size:10px;opacity:0.5;font-weight:500">${count} ${lang === "pt" ? "tendências ativas" : "active trends"}</div>
        </div>
      </div>
      ${extra ? `<div style="margin-bottom:8px">${extra}</div>` : ""}
      ${topTrends.length > 0 ? `
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4;font-weight:600;margin-bottom:4px">
          ${lang === "pt" ? "Destaques" : "Highlights"}
        </div>
        ${trendsList}
      ` : ""}
    `, isDark);
  }, [getCountryTopTrends, isDark, lang]);

  /* ═══ TAB 1: PANORAMA — heatmap + flow ═══ */
  const renderPanorama = useCallback(async () => {
    if (!googleMapRef.current) return;
    clearLayers();
    try {
      const heatmapData = countryPoints
        .filter(c => trendCounts[c.id] > 0)
        .flatMap(c => {
          const count = trendCounts[c.id];
          const intensity = Math.min(count / maxCount, 1);
          return Array(Math.max(4, Math.ceil(intensity * 25))).fill(null).map(() => ({
            location: new google.maps.LatLng(
              c.lat + (Math.random() - 0.5) * 6,
              c.lng + (Math.random() - 0.5) * 6
            ),
            weight: intensity * (0.4 + Math.random() * 0.6),
          }));
        });

      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData, map: googleMapRef.current,
        radius: isMobile ? 80 : 100, opacity: 0.55, maxIntensity: 0.85,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(0, 200, 220, 0.06)",
          "rgba(0, 210, 180, 0.12)",
          "rgba(80, 220, 140, 0.20)",
          "rgba(180, 220, 80, 0.30)",
          "rgba(240, 200, 60, 0.38)",
          "rgba(250, 150, 50, 0.46)",
          "rgba(240, 80, 60, 0.55)",
        ],
      });

      /* Flow arcs */
      flowArcs.slice(0, 15).forEach(arc => {
        const origin = countryPoints.find(p => p.id === arc.originId);
        const dest = countryPoints.find(p => p.id === arc.destId);
        if (!origin || !dest) return;
        const warmth = arc.volume / maxCount;
        const lineColor = warmth > 0.6 ? "#F59E50" : "#B496E6";

        const line = new google.maps.Polyline({
          path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
          geodesic: true, strokeColor: lineColor, strokeOpacity: 0.20, strokeWeight: 2 + warmth * 3,
          map: googleMapRef.current, zIndex: 1,
        });
        const arrowLine = new google.maps.Polyline({
          path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
          geodesic: true, strokeOpacity: 0, strokeWeight: 0,
          icons: [{
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 3, fillColor: lineColor, fillOpacity: 0.7, strokeWeight: 0 },
            offset: "0%",
          }],
          map: googleMapRef.current, zIndex: 3,
        });
        let offset = 0;
        const animate = () => {
          offset = (offset + 0.2) % 100;
          const icons = arrowLine.get("icons");
          if (icons?.[0]) { icons[0].offset = offset + "%"; arrowLine.set("icons", icons); }
          animFramesRef.current.push(requestAnimationFrame(animate));
        };
        animate();

        line.addListener("mouseover", () => {
          showTooltip(buildTooltipHtml(`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="font-size:16px">${flagEmoji(arc.originId)}</span>
              <span style="font-weight:600;font-size:11px">${arc.originName}</span>
              <span style="opacity:0.3;font-size:14px">→</span>
              <span style="font-size:16px">${flagEmoji(arc.destId)}</span>
              <span style="font-weight:600;font-size:11px">${arc.destName}</span>
            </div>
            <div style="font-weight:700;font-size:12px;margin-bottom:4px">${arc.trendTitle.slice(0, 60)}${arc.trendTitle.length > 60 ? "…" : ""}</div>
            <div style="display:flex;gap:8px;opacity:0.5;font-size:10px;margin-top:4px">
              <span>📊 ${lang === "pt" ? "Volume" : "Volume"}: ${arc.volume}</span>
              <span>⏱️ ${lang === "pt" ? "Diferença" : "Delta"}: ${arc.timeDelta.toFixed(1)}h</span>
            </div>
          `, isDark), { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 });
        });
        line.addListener("mouseout", () => infoRef.current?.close());
        polylinesRef.current.push(line, arrowLine);
      });

      /* Country markers — velocity-coded colors */
      const sorted = countryPoints
        .map(c => {
          const count = trendCounts[c.id] || 0;
          const countryTrends = trends.filter(t => t.countryCode?.toUpperCase() === c.id);
          const avgChange = countryTrends.reduce((sum, t) => {
            return sum + (parseFloat(t.change?.replace(/[^0-9.\-]/g, "") || "0") || 0);
          }, 0) / (countryTrends.length || 1);
          return { ...c, count, avgChange };
        })
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 14);

      sorted.forEach((c) => {
        const intensity = Math.min(c.count / maxCount, 1);
        /* Color by velocity: green=fast growth, amber=moderate, blue=stable/decline */
        let blobColor: string;
        if (c.avgChange > 200) blobColor = "#22c55e";
        else if (c.avgChange > 50) blobColor = "#F5A060";
        else if (c.avgChange > 0) blobColor = "#60B8D0";
        else blobColor = "#94a3b8";

        /* Triple-layer organic blob */
        const outerGlow = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 18 + intensity * 28, fillColor: blobColor, fillOpacity: 0.07, strokeWeight: 0 },
          zIndex: 1, clickable: false,
        });
        const midGlow = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12 + intensity * 18, fillColor: blobColor, fillOpacity: 0.15, strokeWeight: 0 },
          zIndex: 2, clickable: false,
        });
        const core = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6 + intensity * 8, fillColor: blobColor, fillOpacity: 0.35, strokeWeight: 0 },
          zIndex: 3,
        });
        const label = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0.01, fillOpacity: 0, strokeWeight: 0 },
          label: { text: String(c.count), color: isDark ? "#e2e8f0" : "#1a1a1a", fontSize: "10px", fontWeight: "700", fontFamily: "'Helvetica Neue', sans-serif" },
          zIndex: 10,
        });

        core.addListener("click", () => onSelectCountry(c.id));
        core.addListener("mouseover", () => {
          const velocityLabel = c.avgChange > 200
            ? `<span style="color:#22c55e;font-weight:700">⚡ ${lang === "pt" ? "Crescimento rápido" : "Fast growth"}</span>`
            : c.avgChange > 50
            ? `<span style="color:#F5A060;font-weight:700">📈 ${lang === "pt" ? "Em alta" : "Rising"}</span>`
            : c.avgChange > 0
            ? `<span style="color:#60B8D0;font-weight:700">→ ${lang === "pt" ? "Estável" : "Stable"}</span>`
            : `<span style="color:#94a3b8;font-weight:700">↘ ${lang === "pt" ? "Desacelerando" : "Slowing"}</span>`;

          showTooltip(
            buildCountryTooltip(c.name, c.id, c.count, `<div style="font-size:11px;margin-bottom:2px">${velocityLabel}</div>`),
            { lat: c.lat, lng: c.lng }
          );
        });
        core.addListener("mouseout", () => infoRef.current?.close());
        markersRef.current.push(outerGlow, midGlow, core, label);
      });
    } catch (err) { console.error("Panorama render error:", err); }
  }, [trendCounts, maxCount, flowArcs, trends, onSelectCountry, showTooltip, buildCountryTooltip, isDark, clearLayers, lang, isMobile]);

  /* ═══ TAB 2: SENTIMENT — richer data per country ═══ */
  const renderSentiment = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();

    const sentBlobColors: Record<string, string[]> = {
      positive: ["#34D399", "#22c55e", "#16a34a"],
      neutral: ["#D0CCC4", "#BEB8AE", "#A8A29E"],
      negative: ["#F87171", "#ef4444", "#dc2626"],
      mixed: ["#FBBF24", "#f59e0b", "#d97706"],
    };

    sentimentBubbles.forEach(b => {
      const cp = countryPoints.find(c => c.id === b.countryId);
      if (!cp) return;
      const palette = sentBlobColors[b.dominantSentiment] || sentBlobColors.neutral;
      const intensity = Math.min(b.trendCount / maxCount, 1);

      [0, 1, 2].forEach((layer) => {
        const scales = [22 + intensity * 30, 14 + intensity * 20, 7 + intensity * 10];
        const opacities = [0.07, 0.15, 0.30];
        const jitter = layer === 0 ? 0.8 : layer === 1 ? 0.3 : 0;
        const m = new google.maps.Marker({
          position: { lat: cp.lat + (Math.random() - 0.5) * jitter, lng: cp.lng + (Math.random() - 0.5) * jitter },
          map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: scales[layer], fillColor: palette[layer], fillOpacity: opacities[layer], strokeWeight: 0 },
          zIndex: layer + 1, clickable: layer === 2,
        });

        if (layer === 2) {
          const posP = Math.round(b.sentiment.positive * 100);
          const neuP = Math.round(b.sentiment.neutral * 100);
          const negP = Math.round(b.sentiment.negative * 100);
          const topCategories = [...new Set(trends.filter(t => t.countryCode?.toUpperCase() === b.countryId).map(t => t.category))].filter(Boolean).slice(0, 4);
          const topTrends = getCountryTopTrends(b.countryId, 3);

          const sentimentBar = `
            <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:8px">
              <div style="width:${posP}%;background:#22c55e"></div>
              <div style="width:${neuP}%;background:#94a3b8"></div>
              <div style="width:${negP}%;background:#ef4444"></div>
            </div>
          `;

          const categoriesTags = topCategories.map(c =>
            `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:500;background:${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};margin-right:3px;margin-bottom:2px">${c}</span>`
          ).join("");

          const trendsList = topTrends.map(t =>
            `<div style="font-size:10px;padding:3px 0;border-bottom:1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title.slice(0, 50)}${t.title.length > 50 ? "…" : ""}</div>`
          ).join("");

          m.addListener("mouseover", () => {
            showTooltip(buildTooltipHtml(`
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:22px;line-height:1">${flagEmoji(b.countryId)}</span>
                <div>
                  <div style="font-weight:700;font-size:13px">${b.countryName}</div>
                  <div style="font-size:10px;opacity:0.5">${b.trendCount} ${lang === "pt" ? "tendências" : "trends"}</div>
                </div>
              </div>

              <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
                <span style="font-size:10px;font-weight:700;color:#22c55e">😊 ${posP}%</span>
                <span style="font-size:10px;font-weight:700;color:#94a3b8">😐 ${neuP}%</span>
                <span style="font-size:10px;font-weight:700;color:#ef4444">😟 ${negP}%</span>
              </div>
              ${sentimentBar}

              ${categoriesTags ? `<div style="margin-bottom:8px">${categoriesTags}</div>` : ""}

              ${trendsList ? `
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4;font-weight:600;margin-bottom:4px">
                  ${lang === "pt" ? "Principais temas" : "Top topics"}
                </div>
                ${trendsList}
              ` : ""}
            `, isDark), { lat: cp.lat, lng: cp.lng });
          });
          m.addListener("mouseout", () => infoRef.current?.close());
          m.addListener("click", () => onSelectCountry(b.countryId));
        }
        markersRef.current.push(m);
      });
    });
  }, [sentimentBubbles, maxCount, trends, getCountryTopTrends, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══ TAB 3: VERIFICATION — richer source breakdown ═══ */
  const renderVerification = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();

    const countrySourceTypes = new Map<string, { press: number; official: number; academic: number; social: number; total: number; platforms: Set<string> }>();
    trends.forEach(t => {
      const cc = t.countryCode?.toUpperCase();
      if (!cc || cc.length !== 2) return;
      const entry = countrySourceTypes.get(cc) || { press: 0, official: 0, academic: 0, social: 0, total: 0, platforms: new Set<string>() };
      const plat = t.platform.toLowerCase();
      entry.platforms.add(t.platform);
      if (plat.includes("guardian") || plat.includes("news") || plat.includes("bbc") || plat.includes("reuters") || plat.includes("gdelt")) entry.press++;
      else if (plat.includes("world bank") || plat.includes("fred") || plat.includes("who") || plat.includes("ibge") || plat.includes("imf")) entry.official++;
      else if (plat.includes("pubmed") || plat.includes("arxiv") || plat.includes("openal") || plat.includes("crossref") || plat.includes("semantic")) entry.academic++;
      else entry.social++;
      entry.total++;
      countrySourceTypes.set(cc, entry);
    });

    /* Color by reliability level */
    const coveragePalettes: string[][] = [
      ["#FCA5A5", "#ef4444", "#dc2626"], // 1 type — red (weak)
      ["#FDE68A", "#f59e0b", "#d97706"], // 2 types — amber
      ["#86EFAC", "#22c55e", "#16a34a"], // 3 types — green
      ["#93C5FD", "#3b82f6", "#2563eb"], // 4 types — blue (strongest)
    ];

    countrySourceTypes.forEach((data, cc) => {
      const cp = countryPoints.find(c => c.id === cc);
      if (!cp) return;
      const sourceTypesCount = [data.press > 0, data.official > 0, data.academic > 0, data.social > 0].filter(Boolean).length;
      const palette = coveragePalettes[Math.min(sourceTypesCount - 1, 3)];
      const intensity = Math.min(data.total / maxCount, 1);

      [0, 1, 2].forEach((layer) => {
        const scales = [20 + intensity * 26, 12 + intensity * 16, 6 + intensity * 9];
        const opacities = [0.06, 0.14, 0.32];
        const m = new google.maps.Marker({
          position: { lat: cp.lat, lng: cp.lng },
          map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: scales[layer], fillColor: palette[layer], fillOpacity: opacities[layer], strokeWeight: 0 },
          zIndex: layer + 1, clickable: layer === 2,
        });

        if (layer === 2) {
          const strengthLabel = sourceTypesCount >= 4
            ? (lang === "pt" ? "Excelente" : "Excellent")
            : sourceTypesCount >= 3
            ? (lang === "pt" ? "Forte" : "Strong")
            : sourceTypesCount >= 2
            ? (lang === "pt" ? "Moderada" : "Moderate")
            : (lang === "pt" ? "Fraca" : "Weak");
          const strengthColor = sourceTypesCount >= 4 ? "#3b82f6" : sourceTypesCount >= 3 ? "#22c55e" : sourceTypesCount >= 2 ? "#f59e0b" : "#ef4444";

          const platformsList = [...data.platforms].slice(0, 6).map(p =>
            `<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:500;background:${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"};margin-right:3px;margin-bottom:2px">${p}</span>`
          ).join("");

          /* Source breakdown bar */
          const barTotal = data.total || 1;
          const sourceBar = `
            <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;margin:8px 0">
              ${data.press > 0 ? `<div style="width:${(data.press / barTotal) * 100}%;background:#3b82f6" title="Press"></div>` : ""}
              ${data.official > 0 ? `<div style="width:${(data.official / barTotal) * 100}%;background:#8b5cf6" title="Official"></div>` : ""}
              ${data.academic > 0 ? `<div style="width:${(data.academic / barTotal) * 100}%;background:#22c55e" title="Academic"></div>` : ""}
              ${data.social > 0 ? `<div style="width:${(data.social / barTotal) * 100}%;background:#f59e0b" title="Social"></div>` : ""}
            </div>
          `;

          m.addListener("mouseover", () => {
            showTooltip(buildTooltipHtml(`
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <span style="font-size:22px;line-height:1">${flagEmoji(cc)}</span>
                <div>
                  <div style="font-weight:700;font-size:13px">${cp.name}</div>
                  <div style="font-size:10px;opacity:0.5">${data.total} ${lang === "pt" ? "tendências verificadas" : "verified trends"}</div>
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span style="font-size:11px;font-weight:700">🛡️ ${lang === "pt" ? "Confirmação" : "Verification"}:</span>
                <span style="font-size:11px;font-weight:800;color:${strengthColor}">${strengthLabel}</span>
              </div>

              <div style="display:flex;gap:8px;font-size:10px;margin-bottom:4px">
                ${data.press > 0 ? `<span style="color:#3b82f6;font-weight:600">📰 ${data.press}</span>` : ""}
                ${data.official > 0 ? `<span style="color:#8b5cf6;font-weight:600">🏛️ ${data.official}</span>` : ""}
                ${data.academic > 0 ? `<span style="color:#22c55e;font-weight:600">🔬 ${data.academic}</span>` : ""}
                ${data.social > 0 ? `<span style="color:#f59e0b;font-weight:600">💬 ${data.social}</span>` : ""}
              </div>
              ${sourceBar}

              ${platformsList ? `
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4;font-weight:600;margin-bottom:4px">
                  ${lang === "pt" ? "Fontes" : "Sources"}
                </div>
                <div style="line-height:1.8">${platformsList}</div>
              ` : ""}
            `, isDark), { lat: cp.lat, lng: cp.lng });
          });
          m.addListener("mouseout", () => infoRef.current?.close());
          m.addListener("click", () => onSelectCountry(cc));
        }
        markersRef.current.push(m);
      });
    });
  }, [trends, maxCount, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══ TAB 4: TRENDING NOW ═══ */
  const trendingNow = useMemo(() => {
    const now = Date.now();
    return [...trends]
      .map(t => {
        const volStr = (t.volume || "0").toLowerCase();
        let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
        if (volStr.includes("m")) vol *= 1_000_000;
        else if (volStr.includes("k")) vol *= 1_000;
        const ch = Math.abs(parseFloat(t.change?.replace(/[^0-9.\-]/g, "") || "0"));
        const age = t.publishedAt ? (now - new Date(t.publishedAt).getTime()) / 3600000 : 12;
        return { ...t, score: vol * 0.3 + ch * 0.5 - age * 5 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [trends]);

  /* Mode switch */
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    if (activeTab === "panorama") renderPanorama();
    else if (activeTab === "sentiment") renderSentiment();
    else if (activeTab === "verification") renderVerification();
    else if (activeTab === "trending") { clearLayers(); }
  }, [activeTab, mapLoaded, renderPanorama, renderSentiment, renderVerification, clearLayers]);

  const tabs: { key: MapTab; icon: typeof Flame; label: Record<string, string> }[] = [
    { key: "panorama", icon: Flame, label: { pt: "Panorama", en: "Panorama" } },
    { key: "sentiment", icon: Heart, label: { pt: "Sentimento", en: "Sentiment" } },
    { key: "verification", icon: ShieldCheck, label: { pt: "Verificação", en: "Verification" } },
    { key: "trending", icon: TrendingUp, label: { pt: "Mais vistos", en: "Trending" } },
  ];

  return (
    <div className="w-full h-full relative" style={{ isolation: "isolate" }}>
      {/* Tab selector */}
      <div className="absolute top-3 left-3 z-20 flex gap-1 rounded-2xl p-1 border shadow-lg"
        style={{
          background: isDark ? "rgba(15,20,30,0.55)" : "rgba(255,255,255,0.45)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {tabs.map(({ key, icon: Icon, label }) => {
          const tabGradients: Record<MapTab, string> = {
            panorama: "linear-gradient(135deg, #7BB3FF 0%, #A8C8FF 100%)",
            sentiment: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
            verification: "linear-gradient(135deg, #84DCC6 0%, #A8EDEA 100%)",
            trending: "linear-gradient(135deg, #FFD89B 0%, #FFE8B8 100%)",
          };
          const tabTextColors: Record<MapTab, string> = {
            panorama: "#1A4B8C", sentiment: "#8C1A2A", verification: "#1A6B50", trending: "#7A4A00",
          };
          const isActive = activeTab === key;
          return (
            <motion.button key={key} onClick={() => setActiveTab(key)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors"
              style={{
                background: isActive ? tabGradients[key] : "transparent",
                color: isActive ? tabTextColors[key] : undefined,
                boxShadow: isActive ? `0 2px 10px rgba(0,0,0,0.08)` : "none",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="map-tab-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: tabGradients[key], zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`flex items-center gap-1 relative z-10 ${!isActive ? "text-muted-foreground hover:text-foreground" : ""}`}>
                <Icon className="w-3 h-3" />
                {!isMobile && (label[lang as "pt" | "en"] || label.en)}
              </span>
            </motion.button>
          );
        })}
        {selectedCountry !== "global" && (
          <motion.button onClick={() => onSelectCountry("global")}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="px-2.5 py-1.5 rounded-xl text-[9px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors uppercase tracking-wider">
            <Globe className="w-3 h-3" /> {!isMobile && "Global"}
          </motion.button>
        )}
      </div>

      {/* Map container */}
      <div ref={mapRef} className={`absolute inset-0 z-0 ${activeTab === "trending" ? "opacity-20" : ""}`} />

      {/* TRENDING NOW overlay */}
      <AnimatePresence>
        {activeTab === "trending" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute inset-0 z-10 overflow-y-auto pt-14 px-4 pb-4"
            style={{ background: isDark ? "rgba(15,20,25,0.92)" : "rgba(237,232,223,0.92)", backdropFilter: "blur(12px)" }}
          >
            <h3 className="text-[13px] font-bold text-foreground mb-3">
              🔥 {lang === "pt" ? "Mais vistos agora" : "Trending now"}
            </h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              {trendingNow.map((t, i) => {
                const cc = t.countryCode?.toUpperCase();
                const flag = cc && cc.length === 2 ? flagEmoji(cc) : "";
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-xl p-3.5 select-text"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[18px] font-extrabold text-muted-foreground/20 tabular-nums leading-none">{i + 1}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">{t.platform}</span>
                        {flag && <span className="text-[11px]">{flag}</span>}
                        {t.category && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[8px] font-medium">{t.category}</span>}
                      </div>
                    </div>
                    <h4 className="text-[12px] font-bold text-foreground leading-snug mb-1.5">{t.title}</h4>
                    {t.description && t.description.toLowerCase().trim() !== t.title.toLowerCase().trim() && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">{t.description}</p>
                    )}
                    {t.thumbnail && (
                      <img src={t.thumbnail} alt="" className="w-full h-24 object-cover rounded-lg mb-2 bg-muted" loading="lazy" />
                    )}
                    <div className="flex items-center gap-2 text-[9px] mb-2">
                      {t.volume && <span className="font-semibold text-foreground">{t.volume}</span>}
                      {t.change && (
                        <span className={`font-bold ${t.changePositive ? "text-emerald-500" : "text-destructive"}`}>
                          {t.changePositive ? "↗" : "↘"}{t.change}
                        </span>
                      )}
                    </div>
                    {t.sourceUrl && (
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[8px] text-primary hover:underline mb-2">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {lang === "pt" ? "Fonte original" : "Original source"}
                      </a>
                    )}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/20">
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${t.title} — ${t.sourceUrl || window.location.href}`); toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!" }); }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={lang === "pt" ? "Compartilhar" : "Share"}>
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toast({ title: lang === "pt" ? "Salvo!" : "Saved!" }); }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={lang === "pt" ? "Salvar" : "Save"}>
                        <Bookmark className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toast({ title: "👍" }); }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={lang === "pt" ? "Curtir" : "Like"}>
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend + Zoom controls — aligned bottom-left ── */}
      {activeTab !== "trending" && (
        <div className={`absolute z-20 flex items-start gap-2 ${isMobile ? "bottom-24 left-3 right-3" : "bottom-4 left-3"}`}>
          {/* Legend block — enlarged */}
          <div className="bg-card/90 backdrop-blur-xl border border-border/30 rounded-xl p-3.5 shadow-[var(--shadow-md)] flex-1 max-w-xs">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              {activeTab === "panorama" && (lang === "pt" ? "Panorama · Densidade + Fluxo" : "Panorama · Density + Flow")}
              {activeTab === "sentiment" && (lang === "pt" ? "Sentimento por País" : "Sentiment by Country")}
              {activeTab === "verification" && (lang === "pt" ? "Cobertura de Fontes" : "Source Coverage")}
            </div>

            {activeTab === "panorama" && (
              <div className="space-y-2">
                <div>
                  <div className="text-[8px] text-muted-foreground mb-1 font-medium">{lang === "pt" ? "Densidade de tendências" : "Trend density"}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-full h-2 rounded-full bg-gradient-to-r from-[#00C8DC] via-[#B4DC50] via-[#F0C83C] to-[#F05032]" />
                    <span className="text-[8px] text-muted-foreground whitespace-nowrap">{lang === "pt" ? "Baixo → Alto" : "Low → High"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-muted-foreground mb-1 font-medium">{lang === "pt" ? "Velocidade" : "Velocity"}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /><span className="text-[8px] text-muted-foreground">⚡ {lang === "pt" ? "Rápido" : "Fast"}</span></span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F5A060]" /><span className="text-[8px] text-muted-foreground">📈 {lang === "pt" ? "Alta" : "Rising"}</span></span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#60B8D0]" /><span className="text-[8px] text-muted-foreground">→ {lang === "pt" ? "Estável" : "Stable"}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><div className="w-5 h-0.5 rounded bg-[#F5A060]/40" /><span className="text-[8px] text-muted-foreground">{lang === "pt" ? "Fluxo forte" : "Strong flow"}</span></div>
                  <div className="flex items-center gap-1"><div className="w-5 h-0.5 rounded bg-[#B496E6]/40" /><span className="text-[8px] text-muted-foreground">{lang === "pt" ? "Fluxo leve" : "Light flow"}</span></div>
                </div>
              </div>
            )}

            {activeTab === "sentiment" && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#22c55e]" /><span className="text-[9px] text-muted-foreground font-medium">😊 {lang === "pt" ? "Positivo" : "Positive"}</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#A8A29E]" /><span className="text-[9px] text-muted-foreground font-medium">😐 {lang === "pt" ? "Neutro" : "Neutral"}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-[9px] text-muted-foreground font-medium">😟 {lang === "pt" ? "Negativo" : "Negative"}</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#f59e0b]" /><span className="text-[9px] text-muted-foreground font-medium">🔀 {lang === "pt" ? "Misto" : "Mixed"}</span></span>
                </div>
                <div className="text-[8px] text-muted-foreground/60 leading-relaxed">
                  {lang === "pt" ? "Clique em um país para filtrar. Hover para detalhes." : "Click a country to filter. Hover for details."}
                </div>
              </div>
            )}

            {activeTab === "verification" && (
              <div className="space-y-2">
                <div>
                  <div className="text-[8px] text-muted-foreground mb-1 font-medium">{lang === "pt" ? "Nível de confirmação" : "Verification level"}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-[9px] text-muted-foreground font-medium">{lang === "pt" ? "Fraca" : "Weak"}</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#f59e0b]" /><span className="text-[9px] text-muted-foreground font-medium">{lang === "pt" ? "Moderada" : "Moderate"}</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#22c55e]" /><span className="text-[9px] text-muted-foreground font-medium">{lang === "pt" ? "Forte" : "Strong"}</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span className="text-[9px] text-muted-foreground font-medium">{lang === "pt" ? "Excelente" : "Excellent"}</span></span>
                  </div>
                </div>
                <div>
                  <div className="text-[8px] text-muted-foreground mb-1 font-medium">{lang === "pt" ? "Tipos de fonte" : "Source types"}</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#3b82f6]" />📰 {lang === "pt" ? "Imprensa" : "Press"}</span>
                    <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#8b5cf6]" />🏛️ {lang === "pt" ? "Oficial" : "Official"}</span>
                    <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#22c55e]" />🔬 {lang === "pt" ? "Acadêmico" : "Academic"}</span>
                    <span className="flex items-center gap-1 text-[8px] text-muted-foreground"><span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />💬 Social</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 text-[8px] text-muted-foreground/40 mt-2 pt-2 border-t border-border/20">
              <span>{activeCountries} {lang === "pt" ? "países" : "countries"}</span>
              <span>· {totalTrends} trends</span>
            </div>
          </div>

          {/* Zoom controls — aligned to legend */}
          {mapLoaded && (
            <div className="flex flex-col gap-1">
              <button onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) + 1)}
                className="w-8 h-8 rounded-xl bg-card/90 backdrop-blur-xl border border-border/30 shadow-[var(--shadow-sm)] flex items-center justify-center text-foreground hover:bg-card transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => googleMapRef.current?.setZoom((googleMapRef.current?.getZoom() || 3) - 1)}
                className="w-8 h-8 rounded-xl bg-card/90 backdrop-blur-xl border border-border/30 shadow-[var(--shadow-sm)] flex items-center justify-center text-foreground hover:bg-card transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">{lang === "pt" ? "Carregando mapa…" : "Loading map…"}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10">
          <div className="text-center p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-[var(--shadow-lg)] max-w-xs">
            <div className="text-2xl mb-2">🗺️</div>
            <p className="text-[10px] font-medium text-foreground mb-1">{mapError}</p>
            <button onClick={() => { setMapError(null); setMapRetry(r => r + 1); }}
              className="mt-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold hover:opacity-90 transition-opacity">
              🔄 {lang === "pt" ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
