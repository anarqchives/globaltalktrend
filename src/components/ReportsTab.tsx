import { useState, useCallback, useMemo, useEffect } from "react";
import { FileText, Download, Link2, ChevronDown, Sparkles, TrendingUp, AlertTriangle, Globe, BarChart3, Brain, Eye, Layers, ClipboardList, History, Trash2, ArrowLeftRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { countries } from "@/components/FilterBar";
import { format } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";

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

const periodOptions = [
  { value: "1h", label: "Última hora" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Esta semana" },
  { value: "30d", label: "Este mês" },
];

const categoryOptions = [
  "Todas", "Política", "Entretenimento", "Tecnologia", "Esportes", "Cultura", "Negócios/Finanças", "Ciência",
];

const typeOptions = [
  "Todas mídias", "Redes sociais", "Imprensa", "Buscas (Google)", "Multiplataforma",
];

const PIE_COLORS = [
  "hsl(210, 100%, 50%)", "hsl(142, 60%, 45%)", "hsl(40, 90%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 60%, 55%)", "hsl(200, 60%, 45%)",
  "hsl(16, 100%, 50%)", "hsl(330, 70%, 50%)",
];

const sentimentEmoji: Record<string, string> = { positive: "🟢", negative: "🔴", neutral: "🟡" };
const sentimentLabel: Record<string, string> = { positive: "Positivo", negative: "Negativo", neutral: "Neutro" };
const confidenceLabel: Record<string, string> = { high: "🟢 Alta", medium: "🟡 Média", low: "🔴 Baixa" };
const patternEmoji: Record<string, string> = { propagation: "🔄", sentiment: "💬", influencer: "📡" };

export default function ReportsTab({ userId }: ReportsTabProps) {
  const [period, setPeriod] = useState("today");
  const [country, setCountry] = useState("global");
  const [category, setCategory] = useState("Todas");
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

  const countryLabel = (code: string) => {
    for (const g of countries) {
      const c = g.items.find(i => i.value === code);
      if (c) return c.label.replace(/^[^\s]+\s/, "");
    }
    return code === "global" ? "Global" : code;
  };

  const getTimeRangeForPeriod = useCallback((p: string) => {
    const now = new Date();
    let since: Date;
    switch (p) {
      case "1h": since = new Date(now.getTime() - 3600000); break;
      case "7d": since = new Date(now.getTime() - 7 * 86400000); break;
      case "30d": since = new Date(now.getTime() - 30 * 86400000); break;
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
    return (data || []) as SnapshotRow[];
  }, [country, category, getTimeRangeForPeriod]);

  const fetchReportData = useCallback(() => fetchDataForPeriod(period), [period, fetchDataForPeriod]);

  // Load saved reports
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

  // Save report to history
  const saveReport = async (reportData: ReportData, data: SnapshotRow[]) => {
    try {
      const periodLabel = periodOptions.find(p => p.value === period)?.label || period;
      const title = `Relatório ${periodLabel} — ${countryLabel(country)} — ${format(new Date(), "dd/MM/yyyy HH:mm")}`;

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
    toast({ title: "Relatório excluído" });
  };

  const loadSavedReport = (saved: SavedReport) => {
    setReport(saved.report_data);
    setGeneratedAt(new Date(saved.created_at));
    if (saved.filters) {
      setPeriod(saved.filters.period || "today");
      setCountry(saved.filters.country || "global");
      setCategory(saved.filters.category || "Todas");
      setMediaType(saved.filters.mediaType || "Todas mídias");
    }
    setShowHistory(false);
    toast({ title: "📂 Relatório carregado", description: saved.title });
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
        toast({ title: "Sem dados", description: "Nenhum dado encontrado para os filtros selecionados." });
        setGenerating(null);
        return;
      }

      setRawData(data);
      const result = await callAI(data);
      setReport(result);
      setGeneratedAt(new Date());

      // Save to history
      await saveReport(result, data);

      // If compare mode, also generate compare report
      if (compareMode) {
        const compareData = await fetchDataForPeriod(comparePeriod);
        setCompareRawData(compareData);
        if (compareData.length > 0) {
          const compareResult = await callAI(compareData);
          setCompareReport(compareResult);
        }
      }

      toast({ title: "✅ Relatório gerado!", description: `Análise de ${data.length} trends com IA concluída.${compareMode ? " Comparação incluída." : ""}` });
    } catch (err: any) {
      console.error("Report error:", err);
      toast({ title: "Erro", description: err.message || "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generateCSV = async () => {
    setGenerating("csv");
    try {
      const data = rawData.length ? rawData : await fetchReportData();
      if (!data.length) { toast({ title: "Sem dados" }); setGenerating(null); return; }

      const headers = ["#", "Título", "Plataforma", "Categoria", "País", "Volume", "Variação %", "Fontes", "Data"];
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
      toast({ title: "✅ CSV exportado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generatePDF = async () => {
    setGenerating("pdf");
    try {
      const data = rawData.length ? rawData : await fetchReportData();
      if (!data.length) { toast({ title: "Sem dados" }); setGenerating(null); return; }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const periodLbl = periodOptions.find(p => p.value === period)?.label || period;

      doc.setFontSize(20); doc.setTextColor(40, 40, 40);
      doc.text("RELATÓRIO DE TENDÊNCIAS", 14, 22);
      doc.setFontSize(10); doc.setTextColor(120, 120, 120);
      doc.text(`Período: ${periodLbl} | País: ${countryLabel(country)} | Categoria: ${category} | Fonte: ${mediaType}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")} | Total de trends: ${data.length}`, 14, 36);
      doc.line(14, 40, 196, 40);

      if (report?.executiveSummary) {
        doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text("RESUMO EXECUTIVO", 14, 48);
        doc.setFontSize(9); doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(report.executiveSummary, 180);
        doc.text(lines, 14, 55);
      }

      const startY = report?.executiveSummary ? 55 + (doc.splitTextToSize(report.executiveSummary, 180).length * 4) + 8 : 48;
      doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text("TOP 10 TRENDS", 14, startY);

      autoTable(doc, {
        startY: startY + 4,
        head: [["#", "Título", "Plataforma", "Volume", "Variação", "Categoria", "País"]],
        body: data.slice(0, 10).map((d, i) => [
          i + 1, (d.title || "").slice(0, 45), d.platform,
          d.volume_raw?.toLocaleString("pt-BR") || "0",
          `${(d.change_percent || 0) > 0 ? "+" : ""}${d.change_percent || 0}%`,
          d.category || "Geral", d.country_code || "N/A",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Comparison page
      if (compareMode && compareReport) {
        doc.addPage();
        doc.setFontSize(16); doc.setTextColor(40, 40, 40);
        doc.text("COMPARAÇÃO ENTRE PERÍODOS", 14, 22);

        const compLbl = periodOptions.find(p => p.value === comparePeriod)?.label || comparePeriod;
        doc.setFontSize(10); doc.setTextColor(80, 80, 80);
        doc.text(`Período A: ${periodLbl} (${report?.stats.totalTrends || 0} trends) vs Período B: ${compLbl} (${compareReport.stats.totalTrends} trends)`, 14, 30);

        const diffTrends = (report?.stats.totalTrends || 0) - compareReport.stats.totalTrends;
        const diffPct = compareReport.stats.totalTrends > 0 ? ((diffTrends / compareReport.stats.totalTrends) * 100).toFixed(1) : "N/A";
        doc.text(`Variação: ${diffTrends > 0 ? "+" : ""}${diffTrends} trends (${diffPct}%)`, 14, 36);
      }

      // Methodology
      doc.addPage();
      doc.setFontSize(13); doc.setTextColor(40, 40, 40); doc.text("METODOLOGIA E TRANSPARÊNCIA", 14, 22);
      doc.setFontSize(9); doc.setTextColor(80, 80, 80);
      const methodText = [
        `Fontes analisadas: ${Object.keys(report?.stats?.platformCounts || {}).join(", ") || "Diversas"}`,
        `Total de registros processados: ${data.length}`,
        `Análise gerada por IA (Lovable AI Gateway)`,
        `Dados coletados de APIs públicas, RSS feeds e fontes oficiais.`,
        `⚠️ Limitações: análise de sentimento é estimada por heurísticas e IA.`,
      ];
      methodText.forEach((line, i) => doc.text(line, 14, 30 + i * 6));

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`Global Talk Trends — Relatório Analítico — Página ${i}/${pageCount}`, 14, 290);
      }

      doc.save(`relatorio-analitico-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
      toast({ title: "✅ PDF gerado!" });
    } catch (err: any) {
      console.error("PDF error:", err);
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
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
    toast({ title: "🔗 Link copiado!" });
  };

  // Derived chart data
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
      Positivo: s.positive || 0, Neutro: s.neutral || 0, Negativo: s.negative || 0,
    }));
  }, [report]);

  // Comparison derived data
  const comparisonData = useMemo(() => {
    if (!report || !compareReport) return null;
    const a = report.stats;
    const b = compareReport.stats;
    const diffTrends = a.totalTrends - b.totalTrends;
    const diffPct = b.totalTrends > 0 ? ((diffTrends / b.totalTrends) * 100).toFixed(1) : "0";

    // Merge categories for comparison chart
    const allCats = new Set([...Object.keys(a.catCounts || {}), ...Object.keys(b.catCounts || {})]);
    const catComparison = Array.from(allCats).map(cat => ({
      name: cat.length > 14 ? cat.slice(0, 14) + "…" : cat,
      "Período atual": (a.catCounts || {})[cat] || 0,
      "Período anterior": (b.catCounts || {})[cat] || 0,
    })).sort((x, y) => y["Período atual"] - x["Período atual"]).slice(0, 8);

    // Merge platforms
    const allPlats = new Set([...Object.keys(a.platformCounts || {}), ...Object.keys(b.platformCounts || {})]);
    const platComparison = Array.from(allPlats).map(p => ({
      name: p.length > 12 ? p.slice(0, 12) + "…" : p,
      "Período atual": (a.platformCounts || {})[p] || 0,
      "Período anterior": (b.platformCounts || {})[p] || 0,
    })).sort((x, y) => y["Período atual"] - x["Período atual"]).slice(0, 8);

    // Sentiment comparison
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
        { name: "Período atual", Positivo: sentSumA.pos, Neutro: sentSumA.neu, Negativo: sentSumA.neg },
        { name: "Período anterior", Positivo: sentSumB.pos, Neutro: sentSumB.neu, Negativo: sentSumB.neg },
      ],
    };
  }, [report, compareReport]);

  const selectClass = "w-full appearance-none bg-secondary text-foreground text-xs font-medium px-3 py-2 rounded-lg cursor-pointer border border-border focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Gerar Relatório Analítico
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Período</label>
            <div className="relative">
              <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periodOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">País</label>
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
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Categoria</label>
            <div className="relative">
              <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Fonte</label>
            <div className="relative">
              <select className={selectClass} value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
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
            Comparar períodos
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
            <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Analisando com IA…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Gerar Relatório com IA{compareMode ? " (com comparação)" : ""}</>
          )}
        </button>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button onClick={generatePDF} disabled={generating !== null} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50">
            {generating === "pdf" ? <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Download className="w-3 h-3" />} PDF
          </button>
          <button onClick={generateCSV} disabled={generating !== null} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50">
            {generating === "csv" ? <div className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Download className="w-3 h-3" />} CSV
          </button>
          <button onClick={generateLink} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors">
            <Link2 className="w-3 h-3" /> Link
          </button>
        </div>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/50 text-foreground text-xs font-semibold hover:bg-muted transition-colors border border-border/50"
        >
          <History className="w-3.5 h-3.5" />
          Histórico de Relatórios ({savedReports.length})
        </button>
      </div>

      {/* Report History */}
      {showHistory && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2 animate-fade-in">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5" /> Relatórios Salvos
          </h3>
          {loadingHistory ? (
            <div className="text-[11px] text-muted-foreground py-4 text-center">Carregando…</div>
          ) : savedReports.length === 0 ? (
            <div className="text-[11px] text-muted-foreground py-4 text-center">Nenhum relatório salvo ainda. Gere seu primeiro relatório acima.</div>
          ) : (
            savedReports.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                <button onClick={() => loadSavedReport(r)} className="flex-1 text-left">
                  <p className="text-[11px] font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")} • {r.snapshot_count} trends
                  </p>
                </button>
                <button onClick={() => deleteSavedReport(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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
          <ReportSection icon={<ArrowLeftRight className="w-3.5 h-3.5" />} title="COMPARAÇÃO ENTRE PERÍODOS" color="blue">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <CompareCard
                label="Total Trends"
                valA={comparisonData.a.total}
                valB={comparisonData.b.total}
                diff={comparisonData.diffTrends}
                diffPct={comparisonData.diffPct}
              />
              <CompareCard
                label="Críticos"
                valA={comparisonData.a.critical}
                valB={comparisonData.b.critical}
                diff={comparisonData.a.critical - comparisonData.b.critical}
                diffPct={comparisonData.b.critical > 0 ? (((comparisonData.a.critical - comparisonData.b.critical) / comparisonData.b.critical) * 100).toFixed(0) : "N/A"}
              />
              <CompareCard
                label="Multiplataf."
                valA={comparisonData.a.cross}
                valB={comparisonData.b.cross}
                diff={comparisonData.a.cross - comparisonData.b.cross}
                diffPct={comparisonData.b.cross > 0 ? (((comparisonData.a.cross - comparisonData.b.cross) / comparisonData.b.cross) * 100).toFixed(0) : "N/A"}
              />
            </div>

            {/* Category comparison chart */}
            {comparisonData.catComparison.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categorias por Período</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.catComparison} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Período atual" fill="hsl(210, 100%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="Período anterior" fill="hsl(210, 50%, 70%)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Platform comparison chart */}
            {comparisonData.platComparison.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plataformas por Período</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.platComparison} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Período atual" fill="hsl(142, 60%, 45%)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                      <Bar dataKey="Período anterior" fill="hsl(142, 30%, 70%)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Sentiment comparison */}
            {comparisonData.sentimentComparison.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sentimento: Atual vs Anterior</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.sentimentComparison} margin={{ left: 0, right: 8 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Positivo" fill="hsl(142, 60%, 45%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Neutro" fill="hsl(40, 90%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Negativo" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
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
              <h2 className="text-sm font-bold text-foreground">📊 RELATÓRIO DE TENDÊNCIAS</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>📅 Período: {periodOptions.find(p => p.value === period)?.label}</span>
              <span>🌎 País: {countryLabel(country)}</span>
              <span>📁 Categoria: {category}</span>
              <span>📡 Fonte: {mediaType}</span>
              <span>📈 Trends analisadas: {report.stats.totalTrends}</span>
              <span>🕐 Gerado: {generatedAt ? format(generatedAt, "dd/MM/yyyy HH:mm") : ""}</span>
              {report.stats.criticalCount > 0 && <span>🔥 Momentos críticos: {report.stats.criticalCount}</span>}
              {report.stats.crossPlatformCount > 0 && <span>🌐 Multiplataforma: {report.stats.crossPlatformCount}</span>}
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <ReportSection icon={<Brain className="w-3.5 h-3.5" />} title="RESUMO EXECUTIVO" color="primary">
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
            {report.highlights && report.highlights.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">📌 Destaques</p>
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
          <ReportSection icon={<TrendingUp className="w-3.5 h-3.5" />} title="TOP 10 TRENDS" color="blue">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">#</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">Título</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">Plataforma</th>
                    <th className="py-1.5 text-right font-semibold text-muted-foreground">Volume</th>
                    <th className="py-1.5 text-right font-semibold text-muted-foreground">Variação</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">Categoria</th>
                    <th className="py-1.5 text-left font-semibold text-muted-foreground">País</th>
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
                      <td className="py-1.5 text-muted-foreground">{d.category || "Geral"}</td>
                      <td className="py-1.5 text-muted-foreground">{d.country_code || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* Section 3: Critical Moments */}
          {report.criticalAnalysis && report.criticalAnalysis.length > 0 && (
            <ReportSection icon={<AlertTriangle className="w-3.5 h-3.5" />} title="MOMENTOS CRÍTICOS" color="red">
              <div className="space-y-3">
                {report.criticalAnalysis.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-[11px] font-semibold text-foreground">🔥 "{c.title}"</p>
                    <p className="text-[10px] text-muted-foreground mt-1">⚡ Gatilho: {c.trigger}</p>
                    <div className="flex gap-3 mt-1 text-[10px]">
                      <span>{sentimentEmoji[c.sentiment] || "🟡"} {sentimentLabel[c.sentiment] || "Neutro"}</span>
                      <span className="text-muted-foreground">📊 {c.evolution}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* Section 4: Charts */}
          <ReportSection icon={<BarChart3 className="w-3.5 h-3.5" />} title="GRÁFICOS ANALÍTICOS" color="green">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryChartData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Distribuição por Categoria</p>
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Volume por Plataforma</p>
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Países</p>
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
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sentimento por Categoria</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sentimentChartData} margin={{ left: 0, right: 8 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="Positivo" stackId="a" fill="hsl(142, 60%, 45%)" />
                        <Bar dataKey="Neutro" stackId="a" fill="hsl(40, 90%, 50%)" />
                        <Bar dataKey="Negativo" stackId="a" fill="hsl(0, 72%, 51%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </ReportSection>

          {/* Section 5: Patterns */}
          {report.patterns && report.patterns.length > 0 && (
            <ReportSection icon={<Eye className="w-3.5 h-3.5" />} title="PADRÕES IDENTIFICADOS" color="purple">
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
            <ReportSection icon={<Sparkles className="w-3.5 h-3.5" />} title="PREVISÕES E INSIGHTS" color="amber">
              <div className="space-y-2">
                {report.predictions.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-foreground">🔮 "{p.topic}"</span>
                      <span className="text-[10px] text-muted-foreground">{confidenceLabel[p.confidence] || p.confidence}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.prediction}</p>
                    <span className="text-[10px] text-muted-foreground/70">⏱️ Janela: {p.timeframe}</span>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* Section 7: Methodology */}
          <ReportSection icon={<ClipboardList className="w-3.5 h-3.5" />} title="METODOLOGIA E TRANSPARÊNCIA" color="muted">
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <p><strong className="text-foreground">Fontes analisadas:</strong> {Object.keys(report.stats.platformCounts).join(", ")}</p>
              <p><strong className="text-foreground">Total de registros:</strong> {report.stats.totalTrends}</p>
              <p><strong className="text-foreground">Distribuição geográfica:</strong> {Object.keys(report.stats.countryCounts).filter(k => k !== "N/A").length} países</p>
              <p><strong className="text-foreground">Análise IA:</strong> Resumo executivo, padrões e previsões gerados por Lovable AI (Gemini)</p>
              <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-[10px]">⚠️ <strong>Limitações:</strong> A análise de sentimento é estimada por heurísticas. Previsões são baseadas em padrões recentes e não garantem resultados futuros. Dados podem ter atraso de até 15 minutos.</p>
              </div>
            </div>
          </ReportSection>
        </div>
      )}

      {/* Info when no report */}
      {!report && !showHistory && (
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            📊 O relatório analítico inclui: resumo executivo gerado por IA, top 10 trends com contexto, momentos críticos, análise multiplataforma, gráficos interativos, padrões de propagação, previsões emergentes, comparação entre períodos e metodologia transparente. Relatórios são salvos automaticamente no histórico. Exporte em PDF, CSV ou compartilhe via link.
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
