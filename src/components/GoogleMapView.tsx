/// <reference types="google.maps" />
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setOptions } from "@googlemaps/js-api-loader";
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

function buildTooltipHtml(content: string, isDark: boolean): HTMLElement {
  const div = document.createElement("div");
  div.style.cssText = `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;padding:10px 14px;min-width:180px;max-width:280px;background:${isDark ? "rgba(19,24,39,0.97)" : "rgba(255,255,255,0.97)"};color:${isDark ? "#e2e8f0" : "#111827"};border-radius:8px;backdrop-filter:blur(16px);border:1px solid ${isDark ? "rgba(71,84,103,0.5)" : "rgba(0,0,0,0.06)"};box-shadow:0 4px 16px rgba(0,0,0,0.08);font-size:11px;`;
  div.innerHTML = content;
  return div;
}

function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
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

  // Load Google Maps
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
        if (!mapRef.current || cancelled) return;
        const map = new Map(mapRef.current, {
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
      } catch { if (!cancelled) setMapError("Falha ao carregar mapa"); }
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

  /* ═══ TAB 1: PANORAMA — heatmap + flow combined ═══ */
  const renderPanorama = useCallback(async () => {
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
        radius: 65, opacity: 0.6, maxIntensity: 1,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "rgba(120, 200, 255, 0.15)",
          "rgba(100, 180, 255, 0.25)",
          "rgba(160, 120, 255, 0.35)",
          "rgba(255, 160, 200, 0.45)",
          "rgba(255, 120, 100, 0.55)",
          "rgba(255, 80, 60, 0.7)",
        ],
      });

      // Flow arcs overlaid on heatmap
      flowArcs.slice(0, 15).forEach(arc => {
        const origin = countryPoints.find(p => p.id === arc.originId);
        const dest = countryPoints.find(p => p.id === arc.destId);
        if (!origin || !dest) return;
        const isCritical = arc.volume > maxCount * 0.7;
        const color = isCritical ? "#FF2D55" : "#007AFF";
        const weight = 1.2 + (arc.volume / maxCount) * 2;

        const line = new google.maps.Polyline({
          path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
          geodesic: true, strokeColor: color, strokeOpacity: 0.25, strokeWeight: weight,
          map: googleMapRef.current, zIndex: 1,
        });
        const arrowLine = new google.maps.Polyline({
          path: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
          geodesic: true, strokeOpacity: 0, strokeWeight: 0,
          icons: [{
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: "#fff", strokeWeight: 1, fillColor: color, fillOpacity: 0.9 },
            offset: "0%",
          }],
          map: googleMapRef.current, zIndex: 3,
        });
        let offset = 0;
        const animate = () => {
          offset = (offset + 0.3) % 100;
          const icons = arrowLine.get("icons");
          if (icons?.[0]) { icons[0].offset = offset + "%"; arrowLine.set("icons", icons); }
          animFramesRef.current.push(requestAnimationFrame(animate));
        };
        animate();

        line.addListener("mouseover", () => {
          showTooltip(buildTooltipHtml(`
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
              <span>${flagEmoji(arc.originId)}</span>
              <span style="font-weight:600;font-size:10px">${arc.originName}</span>
              <span style="opacity:0.3">→</span>
              <span>${flagEmoji(arc.destId)}</span>
              <span style="font-weight:600;font-size:10px">${arc.destName}</span>
            </div>
            <div style="font-weight:600;margin-bottom:2px;font-size:10px">${arc.trendTitle.slice(0, 50)}…</div>
            <div style="display:flex;gap:6px;opacity:0.5;font-size:9px">
              <span>📊 ${arc.volume}</span><span>⏱️ ${arc.timeDelta.toFixed(1)}h</span>
            </div>
          `, isDark), { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 });
        });
        line.addListener("mouseout", () => infoRef.current?.close());
        polylinesRef.current.push(line, arrowLine);
      });

      // Top country markers
      const sorted = countryPoints.map(c => ({ ...c, count: trendCounts[c.id] || 0 })).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
      sorted.forEach(c => {
        const intensity = Math.min(c.count / maxCount, 1);
        const marker = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: googleMapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6 + intensity * 12, fillColor: "#007AFF", fillOpacity: 0.95, strokeColor: "#fff", strokeWeight: 2.5 },
          label: { text: String(c.count), color: "#fff", fontSize: "10px", fontWeight: "800" },
          zIndex: Math.floor(intensity * 1000),
        });
        marker.addListener("click", () => onSelectCountry(c.id));
        marker.addListener("mouseover", () => {
          showTooltip(buildTooltipHtml(`
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:18px">${flagEmoji(c.id)}</span>
              <div><div style="font-weight:600">${c.name}</div>
              <div style="opacity:0.5">${c.count} ${lang === "pt" ? "tendências" : "trends"}</div></div>
            </div>
          `, isDark), { lat: c.lat, lng: c.lng });
        });
        marker.addListener("mouseout", () => infoRef.current?.close());
        markersRef.current.push(marker);
      });
    } catch (err) { console.error("Panorama render error:", err); }
  }, [trendCounts, maxCount, flowArcs, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══ TAB 2: SENTIMENT — country colored by sentiment with explanations ═══ */
  const renderSentiment = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();

    const sentimentByCountry = new Map<string, SentimentBubble>();
    sentimentBubbles.forEach(b => sentimentByCountry.set(b.countryId, b));

    sentimentBubbles.forEach(b => {
      const cp = countryPoints.find(c => c.id === b.countryId);
      if (!cp) return;
      const sentColors: Record<string, string> = {
        positive: "#34C759", neutral: "#8E8E93", negative: "#FF3B30", mixed: "#FF9500",
      };
      const color = sentColors[b.dominantSentiment] || sentColors.neutral;
      const intensity = Math.min(b.trendCount / maxCount, 1);
      const scale = 8 + intensity * 14;

      // Glow ring
      const glow = new google.maps.Marker({
        position: { lat: cp.lat, lng: cp.lng }, map: googleMapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: scale + 4, fillColor: color, fillOpacity: 0.12, strokeColor: color, strokeWeight: 0, strokeOpacity: 0 },
        zIndex: 1,
      });
      // Main circle
      const marker = new google.maps.Marker({
        position: { lat: cp.lat, lng: cp.lng }, map: googleMapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 0.6, strokeColor: "#fff", strokeWeight: 1.5 },
        zIndex: 5,
      });

      const posP = Math.round(b.sentiment.positive * 100);
      const neuP = Math.round(b.sentiment.neutral * 100);
      const negP = Math.round(b.sentiment.negative * 100);
      const emoji = b.dominantSentiment === "positive" ? "😊" : b.dominantSentiment === "negative" ? "😟" : "😐";

      // Build contextual explanation
      const topCategories = [...new Set(trends.filter(t => t.countryCode?.toUpperCase() === b.countryId).map(t => t.category))].slice(0, 3);
      const explanation = lang === "pt"
        ? `Sentimento predominantemente ${b.dominantSentiment === "positive" ? "positivo" : b.dominantSentiment === "negative" ? "negativo" : "neutro"} com base em ${b.trendCount} tendências. Temas principais: ${topCategories.join(", ") || "variados"}.`
        : `Predominantly ${b.dominantSentiment} sentiment based on ${b.trendCount} trends. Main topics: ${topCategories.join(", ") || "various"}.`;

      marker.addListener("mouseover", () => {
        showTooltip(buildTooltipHtml(`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:16px">${flagEmoji(b.countryId)}</span>
            <div><div style="font-weight:700">${b.countryName}</div></div>
          </div>
          <div style="margin-bottom:6px">${emoji} <strong>${b.dominantSentiment === "positive" ? "Positivo" : b.dominantSentiment === "negative" ? "Negativo" : "Neutro"}</strong></div>
          <div style="display:flex;gap:3px;margin-bottom:6px">
            <span style="background:rgba(34,197,94,0.15);color:#22c55e;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600">😊 ${posP}%</span>
            <span style="background:rgba(100,116,139,0.15);color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600">😐 ${neuP}%</span>
            <span style="background:rgba(224,60,49,0.15);color:#E03C31;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600">😟 ${negP}%</span>
          </div>
          <div style="font-size:9px;opacity:0.7;line-height:1.4">${explanation}</div>
        `, isDark), { lat: cp.lat, lng: cp.lng });
      });
      marker.addListener("mouseout", () => infoRef.current?.close());
      marker.addListener("click", () => onSelectCountry(b.countryId));
      markersRef.current.push(glow, marker);
    });
  }, [sentimentBubbles, maxCount, trends, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══ TAB 3: VERIFICATION — source coverage strength ═══ */
  const renderVerification = useCallback(() => {
    if (!googleMapRef.current) return;
    clearLayers();

    const countrySourceTypes = new Map<string, { press: number; official: number; academic: number; social: number; total: number }>();
    trends.forEach(t => {
      const cc = t.countryCode?.toUpperCase();
      if (!cc || cc.length !== 2) return;
      const entry = countrySourceTypes.get(cc) || { press: 0, official: 0, academic: 0, social: 0, total: 0 };
      const plat = t.platform.toLowerCase();
      if (plat.includes("guardian") || plat.includes("news") || plat.includes("bbc") || plat.includes("reuters")) entry.press++;
      else if (plat.includes("world bank") || plat.includes("fred") || plat.includes("who") || plat.includes("ibge") || plat.includes("imf")) entry.official++;
      else if (plat.includes("pubmed") || plat.includes("arxiv") || plat.includes("openal") || plat.includes("crossref") || plat.includes("semantic")) entry.academic++;
      else entry.social++;
      entry.total++;
      countrySourceTypes.set(cc, entry);
    });

    countrySourceTypes.forEach((data, cc) => {
      const cp = countryPoints.find(c => c.id === cc);
      if (!cp) return;
      const sourceTypesCount = [data.press > 0, data.official > 0, data.academic > 0, data.social > 0].filter(Boolean).length;
      const coverageColors = ["#8E8E93", "#FF9500", "#34C759", "#007AFF"];
      const color = coverageColors[Math.min(sourceTypesCount - 1, 3)];
      const intensity = Math.min(data.total / maxCount, 1);

      const marker = new google.maps.Marker({
        position: { lat: cp.lat, lng: cp.lng }, map: googleMapRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6 + intensity * 12, fillColor: color, fillOpacity: 0.65, strokeColor: "#fff", strokeWeight: 1.5 },
        zIndex: 5,
      });

      const strengthLabel = sourceTypesCount >= 3 ? (lang === "pt" ? "Forte" : "Strong") : sourceTypesCount >= 2 ? (lang === "pt" ? "Moderada" : "Moderate") : (lang === "pt" ? "Fraca" : "Weak");

      marker.addListener("mouseover", () => {
        showTooltip(buildTooltipHtml(`
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:16px">${flagEmoji(cc)}</span>
            <div><div style="font-weight:700">${cp.name}</div>
            <div style="opacity:0.5;font-size:9px">${data.total} ${lang === "pt" ? "tendências" : "trends"}</div></div>
          </div>
          <div style="font-weight:600;margin-bottom:6px">🛡️ ${lang === "pt" ? "Confirmação" : "Verification"}: <span style="color:${color}">${strengthLabel}</span></div>
          <div style="display:flex;flex-direction:column;gap:3px;font-size:9px">
            ${data.press > 0 ? `<div>📰 ${lang === "pt" ? "Imprensa" : "Press"}: ${data.press}</div>` : ""}
            ${data.official > 0 ? `<div>🏛️ ${lang === "pt" ? "Oficial" : "Official"}: ${data.official}</div>` : ""}
            ${data.academic > 0 ? `<div>🔬 ${lang === "pt" ? "Acadêmico" : "Academic"}: ${data.academic}</div>` : ""}
            ${data.social > 0 ? `<div>💬 Social: ${data.social}</div>` : ""}
          </div>
          <div style="margin-top:6px;font-size:8px;opacity:0.5">${sourceTypesCount} ${lang === "pt" ? "tipos de fonte" : "source types"}</div>
        `, isDark), { lat: cp.lat, lng: cp.lng });
      });
      marker.addListener("mouseout", () => infoRef.current?.close());
      marker.addListener("click", () => onSelectCountry(cc));
      markersRef.current.push(marker);
    });
  }, [trends, maxCount, onSelectCountry, showTooltip, isDark, clearLayers, lang]);

  /* ═══ TAB 4: TRENDING NOW — no map rendering, pure data panel ═══ */
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
    else if (activeTab === "trending") { clearLayers(); /* trending is a data panel, not map mode */ }
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
      <div className="absolute top-3 left-3 z-20 flex gap-1 bg-card/90 backdrop-blur-xl rounded-2xl p-1 border border-border/30 shadow-[var(--shadow-md)]">
        {tabs.map(({ key, icon: Icon, label }) => {
          const vivid: Record<MapTab, string> = {
            panorama: "bg-[#007AFF] text-white",
            sentiment: "bg-[#FF3B30] text-white",
            verification: "bg-[#34C759] text-white",
            trending: "bg-[#FF9500] text-white",
          };
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`relative px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                activeTab === key ? `${vivid[key]} shadow-md` : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              <span className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {!isMobile && (label[lang as "pt" | "en"] || label.en)}
              </span>
            </button>
          );
        })}
        {selectedCountry !== "global" && (
          <button onClick={() => onSelectCountry("global")}
            className="px-2.5 py-1.5 rounded-xl text-[9px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 transition-colors uppercase tracking-wider">
            <Globe className="w-3 h-3" /> {!isMobile && "Global"}
          </button>
        )}
      </div>

      {/* Map container — hidden when trending tab is active */}
      <div ref={mapRef} className={`absolute inset-0 z-0 ${activeTab === "trending" ? "opacity-20" : ""}`} />

      {/* TRENDING NOW overlay panel */}
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
                    {/* Header: rank + platform + flag + category */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[18px] font-extrabold text-muted-foreground/20 tabular-nums leading-none">{i + 1}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">{t.platform}</span>
                        {flag && <span className="text-[11px]">{flag}</span>}
                        {t.category && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[8px] font-medium">{t.category}</span>}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-[12px] font-bold text-foreground leading-snug mb-1.5">{t.title}</h4>

                    {/* Context / Description — no duplicate text */}
                    {t.description && t.description.toLowerCase().trim() !== t.title.toLowerCase().trim() && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">{t.description}</p>
                    )}
                    {t.details && t.details !== t.description && t.details.toLowerCase().trim() !== t.title.toLowerCase().trim() && (
                      <p className="text-[9px] text-muted-foreground/70 leading-relaxed mb-2 line-clamp-2 italic">{t.details.slice(0, 200)}</p>
                    )}

                    {/* Thumbnail if available */}
                    {t.thumbnail && (
                      <img src={t.thumbnail} alt="" className="w-full h-24 object-cover rounded-lg mb-2 bg-muted" loading="lazy" />
                    )}

                    {/* Metrics row */}
                    <div className="flex items-center gap-2 text-[9px] mb-2">
                      {t.volume && <span className="font-semibold text-foreground">{t.volume}</span>}
                      {t.change && (
                        <span className={`font-bold ${t.changePositive ? "text-emerald-500" : "text-destructive"}`}>
                          {t.changePositive ? "↗" : "↘"}{t.change}
                        </span>
                      )}
                      {t.sources && t.sources.length > 1 && (
                        <span className="text-muted-foreground">{t.sources.length} {lang === "pt" ? "fontes" : "sources"}</span>
                      )}
                    </div>

                    {/* Source */}
                    {t.sourceUrl && (
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[8px] text-primary hover:underline mb-2">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {lang === "pt" ? "Fonte original" : "Original source"}
                      </a>
                    )}

                    {/* Action icons */}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = t.sourceUrl || window.location.href;
                          navigator.clipboard.writeText(`${t.title} — ${url}`);
                          toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!" });
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={lang === "pt" ? "Compartilhar" : "Share"}
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({ title: lang === "pt" ? "Salvo!" : "Saved!" });
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={lang === "pt" ? "Salvar" : "Save"}
                      >
                        <Bookmark className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({ title: "👍" });
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={lang === "pt" ? "Curtir" : "Like"}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({ title: lang === "pt" ? "Bug reportado" : "Bug reported", description: t.title });
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        title={lang === "pt" ? "Reportar bug" : "Report bug"}
                      >
                        <Bug className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mapLoaded && (
        <div className={`absolute z-20 flex flex-col gap-1 ${isMobile ? "bottom-24 right-3" : "bottom-[100px] right-3"}`}>
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

      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">{lang === "pt" ? "Carregando mapa…" : "Loading map…"}</span>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10">
          <div className="text-center p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-[var(--shadow-lg)] max-w-xs">
            <div className="text-2xl mb-2">🗺️</div>
            <p className="text-[10px] font-medium text-foreground mb-1">{mapError}</p>
            <button onClick={() => setMapRetry(r => r + 1)} className="mt-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold hover:opacity-90 transition-opacity">
              🔄 {lang === "pt" ? "Tentar novamente" : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {activeTab !== "trending" && (
        <div className="absolute bottom-3 left-3 z-20 bg-card/90 backdrop-blur-xl border border-border/30 rounded-xl p-2.5 shadow-[var(--shadow-md)]">
          <div className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            {activeTab === "panorama" && (lang === "pt" ? "Panorama · Densidade + Fluxo" : "Panorama · Density + Flow")}
            {activeTab === "sentiment" && (lang === "pt" ? "Sentimento por País" : "Sentiment by Country")}
            {activeTab === "verification" && (lang === "pt" ? "Cobertura de Fontes" : "Source Coverage")}
          </div>

          {activeTab === "panorama" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1.5 rounded-full bg-gradient-to-r from-[#00C8FF] via-[#FFB800] to-[#FF2828]" />
                <span className="text-[7px] text-muted-foreground">{lang === "pt" ? "Baixo → Alto" : "Low → High"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-[#007AFF]" /><span className="text-[7px] text-muted-foreground">{lang === "pt" ? "Fluxo" : "Flow"}</span></div>
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-[#FF2D55]" /><span className="text-[7px] text-muted-foreground">{lang === "pt" ? "Crítico" : "Critical"}</span></div>
              </div>
            </div>
          )}
          {activeTab === "sentiment" && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#34C759]" />+</span>
              <span className="flex items-center gap-0.5 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#8E8E93]" />~</span>
              <span className="flex items-center gap-0.5 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#FF3B30]" />-</span>
            </div>
          )}
          {activeTab === "verification" && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#8E8E93]" />{lang === "pt" ? "1 tipo" : "1 type"}</span>
              <span className="flex items-center gap-1 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#FF9500]" />2</span>
              <span className="flex items-center gap-1 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#34C759]" />3</span>
              <span className="flex items-center gap-1 text-[7px]"><span className="w-2 h-2 rounded-full bg-[#007AFF]" />4+</span>
            </div>
          )}

          <div className="flex gap-2 text-[7px] text-muted-foreground/40 mt-1">
            <span>{activeCountries} {lang === "pt" ? "países" : "countries"}</span>
            <span>· {totalTrends} trends</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
