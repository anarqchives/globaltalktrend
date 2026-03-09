import { useState, useCallback, useMemo, useEffect } from "react";
import { FileText, Download, Link2, ChevronDown, Sparkles, TrendingUp, AlertTriangle, Globe, BarChart3, Brain, Eye, Layers, ClipboardList, History, Trash2, ArrowLeftRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { countries } from "@/components/FilterBar";
import { format } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportsTabProps {
  userId: string;
}

interface ReportData {
  executiveSummary: string;
  highlights: { label: string; value: string; detail: string }[];
  criticalAnalysis: { title: string; trigger: string; sentiment: string; evolution: string }[];
  patterns: { type: string; description: string }[];
  predictions: { topic: string; prediction: string; confidence: string; timeframe: string }[];
  sentimentByCategory: Record<string, { positive: number; neutral: number; negative: number }>;
  stats: {
    totalTrends: number;
    catCounts: Record<string, number>;
    countryCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    criticalCount: number;
    crossPlatformCount: number;
  };
}

interface SnapshotRow {
  title: string;
  platform: string;
  category: string | null;
  country_code: string | null;
  volume_raw: number | null;
  change_percent: number | null;
  snapshot_at: string;
  source_count: number | null;
  metadata: any;
}

interface SavedReport {
  id: string;
  title: string;
  filters: any;
  report_data: ReportData;
  stats: any;
  snapshot_count: number;
  created_at: string;
}

const PIE_COLORS = [
  "hsl(210, 100%, 50%)", "hsl(142, 60%, 45%)", "hsl(40, 90%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)", "hsl(200, 60%, 45%)",
  "hsl(16, 100%, 50%)", "hsl(330, 70%, 50%)",
];

const sentimentEmoji: Record<string, string> = { positive: "🟢", negative: "🔴", neutral: "🟡" };
const confidenceLabel: Record<string, (t: (k: any) => string) => string> = {
  high: (t) => `🟢 ${t("impactHigh")}`,
  medium: (t) => `🟡 ${t("impactMedium")}`,
  low: (t) => `🔴 ${t("impactLow")}`,
};
const patternEmoji: Record<string, string> = { propagation: "🔄", sentiment: "💬", influencer: "📡" };

export default function ReportsTab({ userId }: ReportsTabProps) {
  const { t } = useLanguage();

  const periodOptions = [
    { value: "1h", label: t("lastHour") },
    { value: "today", label: t("today") },
    { value: "7d", label: t("thisWeek") },
    { value: "30d", label: t("thisMonth") },
    { value: "90d", label: "Trimestral" },
    { value: "365d", label: "Anual" },
  ];

  const categoryOptions = [
    t("all"), t("politics"), t("entertainment"), t("technology"),
    t("sports"), t("culture"), t("business"), t("science"),
  ];
  // keep internal values mapped to Portuguese for DB filtering
  const categoryValues = [
    "Todas", "Política", "Entretenimento", "Tecnologia",
    "Esportes", "Cultura", "Negócios/Finanças", "Ciência",
  ];

  const typeOptions = [
    { value: "Todas mídias", label: t("allMedia") },
    { value: "Redes sociais", label: t("socialMedia") },
    { value: "Imprensa", label: t("press") },
    { value: "Buscas (Google)", label: t("searches") },
    { value: "Multiplataforma", label: "🔄 Multiplataforma" },
  ];

  const [period, setPeriod] = useState("today");
  const [country, setCountry] = useState("global");
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [mediaType, setMediaType] = useState("Todas mídias");
  const [generating, setGenerating] = useState<string | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [rawData, setRawData] = useState<SnapshotRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  // Comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriod, setComparePeriod] = useState("7d");
  const [compareReport, setCompareReport] = useState<ReportData | null>(null);
  const [compareRawData, setCompareRawData] = useState<SnapshotRow[]>([]);

  // History state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const category = categoryValues[categoryIdx] ?? "Todas";

  const countryLabel = (code: string) => {
    for (const g of countries) {
      const c = g.items.find(i => i.value === code);
      if (c) return c.label.replace(/^[^\s]+\s/, "");
    }
    return code === "global" ? t("global") : code;
  };

  const getTimeRangeForPeriod = useCallback((p: string) => {
    const now = new Date();
    let since: Date;
    switch (p) {
      case "1h": since = new Date(now.getTime() - 3600000); break;
      case "7d": since = new Date(now.getTime() - 7 * 86400000); break;
      case "30d": since = new Date(now.getTime() - 30 * 86400000); break;
      case "90d": since = new Date(now.getTime() - 90 * 86400000); break;
      case "365d": since = new Date(now.getTime() - 365 * 86400000); break;
      default: since = new Date(now); since.setHours(0, 0, 0, 0); break;
    }
    return { since, now: new Date() };
  }, []);

  const getTimeRange = useCallback(() => getTimeRangeForPeriod(period), [period, getTimeRangeForPeriod]);

  const fetchDataForPeriod = useCallback(async (p: string) => {
    const { since } = getTimeRangeForPeriod(p);
    let query = supabase
      .from("trend_snapshots")
      .select("*")
      .gte("snapshot_at", since.toISOString())
      .order("volume_raw", { ascending: false })
      .limit(500);

    if (country !== "global") query = query.eq("country_code", country);
    if (category !== "Todas") query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    
    // Deduplicate by title (keep highest volume version)
    const seen = new Map<string, SnapshotRow>();
    for (const row of (data || []) as SnapshotRow[]) {
      const key = row.title.toLowerCase().trim().slice(0, 60);
      const existing = seen.get(key);
      if (!existing || (row.volume_raw || 0) > (existing.volume_raw || 0)) {
        seen.set(key, row);
      }
    }
    return Array.from(seen.values()).sort((a, b) => (b.volume_raw || 0) - (a.volume_raw || 0));
  }, [country, category, getTimeRangeForPeriod]);

  const fetchReportData = useCallback(() => fetchDataForPeriod(period), [period, fetchDataForPeriod]);

  const loadSavedReports = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("report_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSavedReports((data || []) as unknown as SavedReport[]);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

  const saveReport = async (reportData: ReportData, data: SnapshotRow[]) => {
    try {
      const periodLabel = periodOptions.find(p => p.value === period)?.label || period;
      const title = `${t("reportTitle")} ${periodLabel} — ${countryLabel(country)} — ${format(new Date(), "dd/MM/yyyy HH:mm")}`;

      await supabase.from("report_history").insert({
        user_id: userId,
        title,
        filters: { period, country, category, mediaType },
        report_data: reportData as any,
        stats: reportData.stats as any,
        snapshot_count: data.length,
      });
      loadSavedReports();
    } catch (err) {
      console.error("Error saving report:", err);
    }
  };

  const deleteSavedReport = async (id: string) => {
    await supabase.from("report_history").delete().eq("id", id);
    setSavedReports(prev => prev.filter(r => r.id !== id));
    toast({ title: t("reportDeleted") });
  };

  const loadSavedReport = (saved: SavedReport) => {
    setReport(saved.report_data);
    setGeneratedAt(new Date(saved.created_at));
    if (saved.filters) {
      setPeriod(saved.filters.period || "today");
      setCountry(saved.filters.country || "global");
      const idx = categoryValues.indexOf(saved.filters.category || "Todas");
      setCategoryIdx(idx >= 0 ? idx : 0);
      setMediaType(saved.filters.mediaType || "Todas mídias");
    }
    setShowHistory(false);
    toast({ title: t("reportLoaded"), description: saved.title });
  };

  const callAI = async (data: SnapshotRow[]) => {
    const trends = data.map(d => ({
      title: d.title,
      platform: d.platform,
      volume: d.volume_raw ? `${d.volume_raw >= 1000 ? `${(d.volume_raw / 1000).toFixed(1)}K` : d.volume_raw}` : "N/A",
      change: d.change_percent ? `${d.change_percent > 0 ? "+" : ""}${d.change_percent}%` : "N/A",
      category: d.category || "Geral",
      countryCode: d.country_code,
    }));

    const criticalMoments = data
      .filter(d => (d.change_percent || 0) > 200)
      .slice(0, 5)
      .map(d => ({ title: d.title, platform: d.platform, change: `+${d.change_percent}%`, volume: d.volume_raw }));

    const titleMap = new Map<string, Set<string>>();
    for (const d of data) {
      const key = d.title.toLowerCase().slice(0, 40);
      if (!titleMap.has(key)) titleMap.set(key, new Set());
      titleMap.get(key)!.add(d.platform);
    }
    const crossPlatformClusters = Array.from(titleMap.entries())
      .filter(([_, platforms]) => platforms.size >= 2)
      .slice(0, 5)
      .map(([topic, platforms]) => ({
        topic,
        platforms: Array.from(platforms),
        platformCount: platforms.size,
        totalVolume: data.filter(d => d.title.toLowerCase().slice(0, 40) === topic).reduce((s, d) => s + (d.volume_raw || 0), 0),
      }));

    const { data: aiResult, error: aiError } = await supabase.functions.invoke("generate-report", {
      body: { trends, filters: { country, category, period, mediaType }, criticalMoments, crossPlatformClusters },
    });

    if (aiError) throw aiError;
    return aiResult as ReportData;
  };

  const generateFullReport = async () => {
    setGenerating("report");
    try {
      const data = await fetchReportData();
      if (!data.length) {
        toast({ title: t("error"), description: t("reportNoData") });
        setGenerating(null);
        return;
      }

      setRawData(data);
      const result = await callAI(data);
      setReport(result);
      setGeneratedAt(new Date());

      await saveReport(result, data);

      if (compareMode) {
        const compareData = await fetchDataForPeriod(comparePeriod);
        setCompareRawData(compareData);
        if (compareData.length > 0) {
          const compareResult = await callAI(compareData);
          setCompareReport(compareResult);
        }
      }

      toast({ title: t("reportSaved"), description: `${t("reportTrendsAnalyzed")}: ${data.length}${compareMode ? `. ${t("reportComparison")}.` : ""}` });
    } catch (err: any) {
      console.error("Report error:", err);
      toast({ title: t("error"), description: err.message || t("error"), variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateCSV = async () => {
    setGenerating("csv");
    try {
      const data = rawData.length ? rawData : await fetchReportData();
      if (!data.length) { toast({ title: t("error"), description: t("reportNoData") }); setGenerating(null); return; }

      const headers = ["#", t("trendTableTitle"), t("trendTablePlatform"), t("category"), t("country"), t("trendTableVolume"), `${t("trendTableChange")} %`, t("reportSources"), t("reportGeneratedAt")];
      const rows = data.map((d, i) => [
        i + 1, `"${(d.title || "").replace(/"/g, '""')}"`, d.platform, d.category || "", d.country_code || "",
        d.volume_raw || 0, d.change_percent || 0, d.source_count || 1, format(new Date(d.snapshot_at), "dd/MM/yyyy HH:mm"),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `relatorio-trends-${format(new Date(), "yyyyMMdd-HHmm")}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: `✅ ${t("reportExportCsv")}` });
    } catch (err: any) {
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generatePDF = async () => {
    setGenerating("pdf");
    try {
      const data = rawData.length ? rawData : await fetchReportData();
      if (!data.length) { toast({ title: t("error"), description: t("reportNoData") }); setGenerating(null); return; }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const periodLbl = periodOptions.find(p => p.value === period)?.label || period;

      doc.setFontSize(20); doc.setTextColor(40, 40, 40);
      doc.text(t("reportTitle").replace("📊 ", ""), 14, 22);
      doc.setFontSize(10); doc.setTextColor(120, 120, 120);
      doc.text(`${t("reportPeriod").replace("📅 ", "")}: ${periodLbl} | ${t("reportCountry").replace("🌎 ", "")}: ${countryLabel(country)} | ${t("category")}: ${categoryOptions[categoryIdx]} | ${t("reportSource").replace("📡 ", "")}: ${typeOptions.find(o => o.value === mediaType)?.label || mediaType}`, 14, 30);
      doc.text(`${t("reportGeneratedAt").replace("🕐 ", "")}: ${format(new Date(), "dd/MM/yyyy HH:mm")} | ${t("reportTrendsAnalyzed").replace("📈 ", "")}: ${data.length}`, 14, 36);
      doc.line(14, 40, 196, 40);

      if (report?.executiveSummary) {
        doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text(t("reportExecutiveSummary"), 14, 48);
        doc.setFontSize(9); doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(report.executiveSummary, 180);
        doc.text(lines, 14, 55);
      }

      const startY = report?.executiveSummary ? 55 + (doc.splitTextToSize(report.executiveSummary, 180).length * 4) + 8 : 48;
      doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text(t("reportTop10"), 14, startY);

      autoTable(doc, {
        startY: startY + 4,
        head: [["#", t("trendTableTitle"), t("trendTablePlatform"), t("trendTableVolume"), t("trendTableChange"), t("category"), t("country")]],
        body: data.slice(0, 10).map((d, i) => [
          i + 1, (d.title || "").slice(0, 45), d.platform,
          d.volume_raw?.toLocaleString("pt-BR") || "0",
          `${(d.change_percent || 0) > 0 ? "+" : ""}${d.change_percent || 0}%`,
          d.category || t("general"), d.country_code || "N/A",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Patterns section
      if (report?.patterns && report.patterns.length > 0) {
        doc.addPage();
        doc.setFontSize(13); doc.setTextColor(40, 40, 40);
        doc.text(t("reportPatterns"), 14, 22);
        let pY = 32;
        for (const p of report.patterns) {
          doc.setFontSize(9); doc.setTextColor(80, 80, 80);
          const pLines = doc.splitTextToSize(`• [${p.type}] ${p.description}`, 175);
          doc.text(pLines, 16, pY);
          pY += pLines.length * 4 + 4;
          if (pY > 270) { doc.addPage(); pY = 20; }
        }
      }

      // Predictions section
      if (report?.predictions && report.predictions.length > 0) {
        doc.addPage();
        doc.setFontSize(13); doc.setTextColor(40, 40, 40);
        doc.text(t("reportPredictions"), 14, 22);
        let fY = 32;
        for (const p of report.predictions) {
          doc.setFontSize(10); doc.setTextColor(40, 40, 40);
          doc.text(`🔮 ${p.topic}`, 14, fY);
          doc.setFontSize(9); doc.setTextColor(80, 80, 80);
          const predLines = doc.splitTextToSize(p.prediction, 175);
          doc.text(predLines, 16, fY + 5);
          doc.text(`Confiança: ${p.confidence} | Janela: ${p.timeframe}`, 16, fY + 5 + predLines.length * 4 + 2);
          fY += 5 + predLines.length * 4 + 10;
          if (fY > 270) { doc.addPage(); fY = 20; }
        }
      }

      // Critical moments section in PDF
      if (report?.criticalAnalysis && report.criticalAnalysis.length > 0) {
        doc.addPage();
        doc.setFontSize(13); doc.setTextColor(40, 40, 40);
        doc.text(t("reportCritical"), 14, 22);
        let cY = 32;
        for (const c of report.criticalAnalysis) {
          doc.setFontSize(10); doc.setTextColor(40, 40, 40);
          doc.text(`🔥 ${c.title.slice(0, 60)}`, 14, cY);
          doc.setFontSize(9); doc.setTextColor(80, 80, 80);
          doc.text(`Trigger: ${c.trigger} | Sentiment: ${c.sentiment} | ${c.evolution}`, 16, cY + 5);
          cY += 14;
          if (cY > 270) { doc.addPage(); cY = 20; }
        }
      }

      if (compareMode && compareReport) {
        doc.addPage();
        doc.setFontSize(16); doc.setTextColor(40, 40, 40);
        doc.text(t("reportComparison"), 14, 22);

        const compLbl = periodOptions.find(p => p.value === comparePeriod)?.label || comparePeriod;
        doc.setFontSize(10); doc.setTextColor(80, 80, 80);
        doc.text(`${t("reportCurrentPeriod")}: ${periodLbl} (${report?.stats.totalTrends || 0}) vs ${t("reportPreviousPeriod")}: ${compLbl} (${compareReport.stats.totalTrends})`, 14, 30);

        const diffTrends = (report?.stats.totalTrends || 0) - compareReport.stats.totalTrends;
        const diffPct = compareReport.stats.totalTrends > 0 ? ((diffTrends / compareReport.stats.totalTrends) * 100).toFixed(1) : "N/A";
        doc.text(`${t("trendTableChange")}: ${diffTrends > 0 ? "+" : ""}${diffTrends} (${diffPct}%)`, 14, 36);

        // Comparative insights in PDF
        if (report && compareReport) {
          const insights: string[] = [];
          const growth = compareReport.stats.totalTrends > 0
            ? (((report.stats.totalTrends - compareReport.stats.totalTrends) / compareReport.stats.totalTrends) * 100).toFixed(1)
            : "N/A";
          insights.push(`Volume ${Number(growth) > 0 ? "aumentou" : "diminuiu"} ${Math.abs(Number(growth))}%`);

          const catA = report.stats.catCounts || {};
          const catB = compareReport.stats.catCounts || {};
          for (const cat of Object.keys(catA)) {
            const change = (catA[cat] || 0) - (catB[cat] || 0);
            if (change > 5) insights.push(`${cat}: +${change} trends vs período anterior`);
          }

          let iY = 44;
          doc.setFontSize(10); doc.setTextColor(40, 40, 40);
          doc.text("Insights comparativos:", 14, iY);
          iY += 6;
          for (const ins of insights.slice(0, 5)) {
            doc.setFontSize(9); doc.setTextColor(80, 80, 80);
            doc.text(`• ${ins}`, 16, iY);
            iY += 5;
          }
        }
      }

      doc.addPage();
      doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text(t("reportMethodology"), 14, 22);
      doc.setFontSize(9); doc.setTextColor(80, 80, 80);
      const methodText = [
        `${t("reportSources")}: ${Object.keys(report?.stats?.platformCounts || {}).join(", ") || "—"}`,
        `${t("reportTotalRecords")}: ${data.length}`,
        `${t("reportAiAnalysis")}: Lovable AI Gateway (Gemini)`,
        `⚠️ ${t("reportLimitations")}`,
      ];
      methodText.forEach((line, i) => doc.text(line, 14, 30 + i * 6));

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Global Talk Trends — ${t("reportTitle").replace("📊 ", "")} — ${i}/${pageCount}`, 14, 290);
      }

      doc.save(`relatorio-analitico-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
      toast({ title: `✅ ${t("reportExportPdf")}` });
    } catch (err: any) {
      console.error("PDF error:", err);
      toast({ title: t("error"), description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateLink = () => {
    const params = new URLSearchParams();
    if (country !== "global") params.set("country", country);
    params.set("period", period === "today" ? "Hoje" : period === "7d" ? "Esta semana" : period === "30d" ? "Este mês" : "Última hora");
    if (category !== "Todas") params.set("category", category);
    if (mediaType !== "Todas mídias") params.set("type", mediaType);
    const url = `${window.location.origin}/?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("linkCopied") });
  };

  const categoryChartData = useMemo(() => {
    if (!report?.stats?.catCounts) return [];
    return Object.entries(report.stats.catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [report]);

  const platformChartData = useMemo(() => {
    if (!report?.stats?.platformCounts) return [];
    return Object.entries(report.stats.platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, value }));
  }, [report]);

  const countryChartData = useMemo(() => {
    if (!report?.stats?.countryCounts) return [];
    return Object.entries(report.stats.countryCounts).filter(([k]) => k !== "N/A").sort((a, b) => b[1] - a[1]).slice(0, 10).map(([code, value]) => ({ name: countryLabel(code), value }));
  }, [report]);

  const sentimentChartData = useMemo(() => {
    if (!report?.sentimentByCategory) return [];
    return Object.entries(report.sentimentByCategory).map(([cat, s]) => ({
      name: cat.length > 12 ? cat.slice(0, 12) + "…" : cat,
      [t("positive")]: s.positive || 0,
      [t("neutral")]: s.neutral || 0,
      [t("negative")]: s.negative || 0,
    }));
  }, [report, t]);

  const comparisonData = useMemo(() => {
    if (!report || !compareReport) return null;
    const a = report.stats;
    const b = compareReport.stats;
    const diffTrends = a.totalTrends - b.totalTrends;
    const diffPct = b.totalTrends > 0 ? ((diffTrends / b.totalTrends) * 100).toFixed(1) : "0";

    const allCats = new Set([...Object.keys(a.catCounts || {}), ...Object.keys(b.catCounts || {})]);
    const currentKey = t("reportCurrentPeriod");
    const previousKey = t("reportPreviousPeriod");
    
    const catComparison = Array.from(allCats).map(cat => ({
      name: cat.length > 14 ? cat.slice(0, 14) + "…" : cat,
      [currentKey]: (a.catCounts || {})[cat] || 0,
      [previousKey]: (b.catCounts || {})[cat] || 0,
    })).sort((x, y) => (y[currentKey] as number) - (x[currentKey] as number)).slice(0, 8);

    const allPlats = new Set([...Object.keys(a.platformCounts || {}), ...Object.keys(b.platformCounts || {})]);
    const platComparison = Array.from(allPlats).map(p => ({
      name: p.length > 12 ? p.slice(0, 12) + "…" : p,
      [currentKey]: (a.platformCounts || {})[p] || 0,
      [previousKey]: (b.platformCounts || {})[p] || 0,
    })).sort((x, y) => (y[currentKey] as number) - (x[currentKey] as number)).slice(0, 8);

    const sentA = report.sentimentByCategory || {};
    const sentB = compareReport.sentimentByCategory || {};
    const sumSent = (s: Record<string, { positive: number; neutral: number; negative: number }>) => {
      let pos = 0, neu = 0, neg = 0;
      Object.values(s).forEach(v => { pos += v.positive || 0; neu += v.neutral || 0; neg += v.negative || 0; });
      return { pos, neu, neg };
    };
    const sentSumA = sumSent(sentA);
    const sentSumB = sumSent(sentB);

    return {
      diffTrends, diffPct,
      a: { total: a.totalTrends, critical: a.criticalCount, cross: a.crossPlatformCount },
      b: { total: b.totalTrends, critical: b.criticalCount, cross: b.crossPlatformCount },
      catComparison,
      platComparison,
      sentimentComparison: [
        { name: t("reportCurrentPeriod"), [t("positive")]: sentSumA.pos, [t("neutral")]: sentSumA.neu, [t("negative")]: sentSumA.neg },
        { name: t("reportPreviousPeriod"), [t("positive")]: sentSumB.pos, [t("neutral")]: sentSumB.neu, [t("negative")]: sentSumB.neg },
      ],
    };
  }, [report, compareReport, t]);

  const selectClass = "w-full appearance-none bg-secondary text-foreground text-xs font-medium px-3 py-2 rounded-lg cursor-pointer border border-border focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> {t("reportGenerate")}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{t("period")}</label>
            <div className="relative">
              <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periodOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{t("country")}</label>
            <div className="relative">
              <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                {countries.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{t("category")}</label>
            <div className="relative">
              <select className={selectClass} value={categoryIdx} onChange={(e) => setCategoryIdx(Number(e.target.value))}>
                {categoryOptions.map((label, i) => <option key={i} value={i}>{label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{t("filterSource")}</label>
            <div className="relative">
              <select className={selectClass} value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Compare toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareReport(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border ${compareMode ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-secondary/80"}`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            {t("reportComparePeriods")}
          </button>
          {compareMode && (
            <div className="relative flex-1">
              <select className={selectClass} value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value)}>
                {periodOptions.filter(p => p.value !== period).map((p) => <option key={p.value} value={p.value}>vs {p.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* Main action */}
        <button
          onClick={generateFullReport}
          disabled={generating !== null}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {generating === "report" ? (
            <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> {t("reportGenerating")}</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {t("reportGenerate")}{compareMode ? t("reportWithComparison") : ""}</>
          )}
        </button>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button onClick={generatePDF} disabled={generating !== null} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50" title="Exportar como PDF">
            {generating === "pdf" ? <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Download className="w-3 h-3" />} {t("reportExportPdf")}
          </button>
          <button onClick={generateCSV} disabled={generating !== null} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50" title="Exportar como CSV">
            {generating === "csv" ? <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Download className="w-3 h-3" />} {t("reportExportCsv")}
          </button>
          <button onClick={generateLink} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors" title={t("copyLinkFilters")}>
            <Link2 className="w-3 h-3" /> {t("reportShareLink")}
          </button>
        </div>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/50 text-foreground text-xs font-semibold hover:bg-muted transition-colors border border-border/50"
        >
          <History className="w-3.5 h-3.5" />
          {t("reportHistory")} ({savedReports.length})
        </button>
      </div>

      {/* Report History */}
      {showHistory && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2 animate-fade-in">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5" /> {t("reportSavedReports")}
          </h3>
          {loadingHistory ? (
            <div className="text-[11px] text-muted-foreground py-4 text-center">{t("reportLoading")}</div>
          ) : savedReports.length === 0 ? (
            <div className="text-[11px] text-muted-foreground py-4 text-center">{t("reportNoSaved")}</div>
          ) : (
            savedReports.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <button onClick={() => loadSavedReport(r)} className="flex-1 text-left">
                  <p className="text-[11px] font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")} • {r.snapshot_count} trends
                  </p>
                </button>
                <button onClick={() => deleteSavedReport(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={t("reportDeleted")}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Comparison Section */}
      {compareMode && report && compareReport && comparisonData && (
        <div className="space-y-4 animate-fade-in">
          <ReportSection icon={<ArrowLeftRight className="w-3.5 h-3.5" />} title={t("reportComparison")} color="blue">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <CompareCard
                label="Trends"
                valA={comparisonData.a.total}
                valB={comparisonData.b.total}
                diff={comparisonData.diffTrends}
                diffPct={comparisonData.diffPct}
              />
              <CompareCard
                label={t("critical")}
                valA={comparisonData.a.critical}
                valB={comparisonData.b.critical}
                diff={comparisonData.a.critical - comparisonData.b.critical}
                diffPct={comparisonData.b.critical > 0 ? (((comparisonData.a.critical - comparisonData.b.critical) / comparisonData.b.critical) * 100).toFixed(0) : "N/A"}
              />
              <CompareCard
                label={t("reportCrossplatform").replace("🌐 ", "")}
                valA={comparisonData.a.cross}
                valB={comparisonData.b.cross}
                diff={comparisonData.a.cross - comparisonData.b.cross}
                diffPct={comparisonData.b.cross > 0 ? (((comparisonData.a.cross - comparisonData.b.cross) / comparisonData.b.cross) * 100).toFixed(0) : "N/A"}
              />
            </div>

            {comparisonData.catComparison.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportCatsByPeriod")}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.catComparison} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey={t("reportCurrentPeriod")} fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey={t("reportPreviousPeriod")} fill="hsl(210, 50%, 70%)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {comparisonData.platComparison.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportPlatformsByPeriod")}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.platComparison} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey={t("reportCurrentPeriod")} fill="hsl(142, 60%, 45%)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                      <Bar dataKey={t("reportPreviousPeriod")} fill="hsl(142, 30%, 70%)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {comparisonData.sentimentComparison.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportSentimentCurrentVsPrev")}</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.sentimentComparison} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey={t("positive")} fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={t("neutral")} fill="hsl(40, 90%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={t("negative")} fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ReportSection>
        </div>
      )}

      {/* Report Output */}
      {report && (
        <div className="space-y-4 animate-fade-in">
          {/* Header */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">{t("reportTitle")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>{t("reportPeriod")}: {periodOptions.find(p => p.value === period)?.label}</span>
              <span>{t("reportCountry")}: {countryLabel(country)}</span>
              <span>{t("reportCategory")}: {categoryOptions[categoryIdx]}</span>
              <span>{t("reportSource")}: {typeOptions.find(o => o.value === mediaType)?.label || mediaType}</span>
              <span>{t("reportTrendsAnalyzed")}: {report.stats.totalTrends}</span>
              <span>{t("reportGeneratedAt")}: {generatedAt ? format(generatedAt, "dd/MM/yyyy HH:mm") : ""}</span>
              {report.stats.criticalCount > 0 && <span>{t("reportCriticalMoments")}: {report.stats.criticalCount}</span>}
              {report.stats.crossPlatformCount > 0 && <span>{t("reportCrossplatform")}: {report.stats.crossPlatformCount}</span>}
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <ReportSection icon={<Brain className="w-3.5 h-3.5" />} title={t("reportExecutiveSummary")} color="primary">
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
            {report.highlights && report.highlights.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("reportHighlights")}</p>
                {report.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-[10px] font-bold text-primary mt-0.5">•</span>
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">{h.label}: </span>
                      <span className="text-[11px] text-foreground">{h.value}</span>
                      {h.detail && <span className="text-[10px] text-muted-foreground ml-1">({h.detail})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>

          {/* Section 2: Top 10 */}
          <ReportSection icon={<TrendingUp className="w-3.5 h-3.5" />} title={t("reportTop10")} color="blue">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">#</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">{t("trendTableTitle")}</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">{t("trendTablePlatform")}</th>
                    <th className="py-1.5 text-right font-semibold text-muted-foreground">{t("trendTableVolume")}</th>
                    <th className="py-1.5 text-right font-semibold text-muted-foreground">{t("trendTableChange")}</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">{t("category")}</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">{t("trendTableCountry")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 10).map((d, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-1.5 font-bold text-primary">{i + 1}</td>
                      <td className="py-1.5 text-foreground font-medium max-w-[180px] truncate">{d.title}</td>
                      <td className="py-1.5 text-muted-foreground">{d.platform}</td>
                      <td className="py-1.5 text-right text-foreground">{(d.volume_raw || 0).toLocaleString("pt-BR")}</td>
                      <td className={`py-1.5 text-right font-medium ${(d.change_percent || 0) > 0 ? "text-green-600" : "text-red-500"}`}>
                        {(d.change_percent || 0) > 0 ? "+" : ""}{d.change_percent || 0}%
                      </td>
                      <td className="py-1.5 text-muted-foreground">{d.category || t("general")}</td>
                      <td className="py-1.5 text-muted-foreground">{d.country_code || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* Section 3: Critical Moments */}
          {report.criticalAnalysis && report.criticalAnalysis.length > 0 && (
            <ReportSection icon={<AlertTriangle className="w-3.5 h-3.5" />} title={t("reportCritical")} color="red">
              <div className="space-y-3">
                {report.criticalAnalysis.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-[11px] font-semibold text-foreground">🔥 "{c.title}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{t("reportSentTrigger")}: {c.trigger}</p>
                    <div className="flex gap-3 mt-1 text-[10px]">
                      <span>{sentimentEmoji[c.sentiment] || "🟡"} {c.sentiment === "positive" ? t("positive") : c.sentiment === "negative" ? t("negative") : t("neutral")}</span>
                      <span className="text-muted-foreground">📊 {c.evolution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* Section 4: Charts */}
          <ReportSection icon={<BarChart3 className="w-3.5 h-3.5" />} title={t("reportCharts")} color="green">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportCatDistribution")}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoryChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {platformChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportVolByPlatform")}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformChartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                        <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                        <Bar dataKey="value" fill="hsl(210, 100%, 50%)" radius={[0, 4, 4, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {countryChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportTopCountries")}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryChartData} margin={{ left: 0, right: 8 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                        <Bar dataKey="value" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {sentimentChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("reportSentimentByCat")}</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sentimentChartData} margin={{ left: 0, right: 8 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey={t("positive")} stackId="a" fill="hsl(142, 60%, 45%)" />
                        <Bar dataKey={t("neutral")} stackId="a" fill="hsl(40, 90%, 50%)" />
                        <Bar dataKey={t("negative")} stackId="a" fill="hsl(0, 72%, 51%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </ReportSection>

          {/* Section 5: Patterns */}
          {report.patterns && report.patterns.length > 0 && (
            <ReportSection icon={<Eye className="w-3.5 h-3.5" />} title={t("reportPatterns")} color="purple">
              <div className="space-y-2">
                {report.patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm mt-0.5">{patternEmoji[p.type] || "🧠"}</span>
                    <p className="text-[11px] text-foreground leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* Section 6: Predictions */}
          {report.predictions && report.predictions.length > 0 && (
            <ReportSection icon={<Sparkles className="w-3.5 h-3.5" />} title={t("reportPredictions")} color="amber">
              <div className="space-y-2">
                {report.predictions.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-foreground">🔮 "{p.topic}"</span>
                      <span className="text-[10px] text-muted-foreground">{confidenceLabel[p.confidence]?.(t) || p.confidence}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.prediction}</p>
                    <span className="text-[10px] text-muted-foreground/70">{t("reportWindow")}: {p.timeframe}</span>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* Section 7: Methodology */}
          <ReportSection icon={<ClipboardList className="w-3.5 h-3.5" />} title={t("reportMethodology")} color="muted">
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <p><strong className="text-foreground">{t("reportSources")}:</strong> {Object.keys(report.stats.platformCounts).join(", ")}</p>
              <p><strong className="text-foreground">{t("reportTotalRecords")}:</strong> {report.stats.totalTrends}</p>
              <p><strong className="text-foreground">{t("reportGeoDistribution")}:</strong> {Object.keys(report.stats.countryCounts).filter(k => k !== "N/A").length} {t("countries")}</p>
              <p><strong className="text-foreground">{t("reportAiAnalysis")}:</strong> {t("reportGenerating").replace("…", "")} — Lovable AI (Gemini)</p>
              <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-[10px]">⚠️ <strong>{t("reportLimitations")}</strong></p>
              </div>
            </div>
          </ReportSection>
        </div>
      )}

      {/* Info when no report */}
      {!report && !showHistory && (
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("reportInfoText")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Section wrapper ─── */
function ReportSection({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ─── Compare card ─── */
function CompareCard({ label, valA, valB, diff, diffPct }: { label: string; valA: number; valB: number; diff: number; diffPct: string }) {
  const isUp = diff > 0;
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-center">
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-sm font-bold text-foreground">{valA}</span>
        <span className="text-[10px] text-muted-foreground">vs</span>
        <span className="text-xs text-muted-foreground">{valB}</span>
      </div>
      <p className={`text-[10px] font-semibold mt-0.5 ${isUp ? "text-green-600" : diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
        {isUp ? "▲" : diff < 0 ? "▼" : "="} {diffPct !== "N/A" ? `${diffPct}%` : "—"}
      </p>
    </div>
  );
}
