import { useState, useCallback } from "react";
import { FileText, Download, Link2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { countries } from "@/components/FilterBar";
import { format } from "date-fns";

interface ReportsTabProps {
  userId: string;
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
  "Todas mídias", "Redes sociais", "Imprensa", "Buscas (Google)",
];

export default function ReportsTab({ userId }: ReportsTabProps) {
  const [period, setPeriod] = useState("today");
  const [country, setCountry] = useState("global");
  const [category, setCategory] = useState("Todas");
  const [mediaType, setMediaType] = useState("Todas mídias");
  const [generating, setGenerating] = useState<string | null>(null);

  const countryLabel = (code: string) => {
    for (const g of countries) {
      const c = g.items.find(i => i.value === code);
      if (c) return c.label.replace(/^[^\s]+\s/, ""); // Remove flag emoji
    }
    return code === "global" ? "Global" : code;
  };

  const fetchReportData = useCallback(async () => {
    // Calculate time range based on period
    const now = new Date();
    let since: Date;
    switch (period) {
      case "1h": since = new Date(now.getTime() - 3600000); break;
      case "7d": since = new Date(now.getTime() - 7 * 86400000); break;
      case "30d": since = new Date(now.getTime() - 30 * 86400000); break;
      default: since = new Date(now.setHours(0, 0, 0, 0)); break;
    }

    let query = supabase
      .from("trend_snapshots")
      .select("*")
      .gte("snapshot_at", since.toISOString())
      .order("volume_raw", { ascending: false })
      .limit(100);

    if (country !== "global") query = query.eq("country_code", country);
    if (category !== "Todas") query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [period, country, category]);

  const generateCSV = async () => {
    setGenerating("csv");
    try {
      const data = await fetchReportData();
      if (!data.length) {
        toast({ title: "Sem dados", description: "Nenhum dado encontrado para os filtros selecionados." });
        return;
      }

      const headers = ["Título", "Plataforma", "Categoria", "País", "Volume", "Variação %", "Data"];
      const rows = data.map((d: any) => [
        `"${(d.title || "").replace(/"/g, '""')}"`,
        d.platform,
        d.category || "",
        d.country_code || "",
        d.volume_raw,
        d.change_percent,
        format(new Date(d.snapshot_at), "dd/MM/yyyy HH:mm"),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-trends-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✅ CSV exportado!", description: `${data.length} registros exportados.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const generatePDF = async () => {
    setGenerating("pdf");
    try {
      const data = await fetchReportData();
      if (!data.length) {
        toast({ title: "Sem dados", description: "Nenhum dado encontrado para os filtros selecionados." });
        setGenerating(null);
        return;
      }

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const periodLabel = periodOptions.find(p => p.value === period)?.label || period;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("Global Talk - Relatório de Trends", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Período: ${periodLabel} | País: ${countryLabel(country)} | Categoria: ${category}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 36);

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 40, 196, 40);

      // Top 10 summary
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Top 10 Trends", 14, 48);

      const top10 = data.slice(0, 10);

      // Category distribution
      const catCounts: Record<string, number> = {};
      data.forEach((d: any) => {
        const cat = d.category || "Outros";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      // Country distribution
      const countryCounts: Record<string, number> = {};
      data.forEach((d: any) => {
        const cc = d.country_code || "N/A";
        countryCounts[cc] = (countryCounts[cc] || 0) + 1;
      });

      // Top 10 table
      autoTable(doc, {
        startY: 52,
        head: [["#", "Título", "Plataforma", "Volume", "Variação"]],
        body: top10.map((d: any, i: number) => [
          i + 1,
          (d.title || "").slice(0, 50),
          d.platform,
          d.volume_raw?.toLocaleString("pt-BR") || "0",
          `${d.change_percent > 0 ? "+" : ""}${d.change_percent}%`,
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Category distribution
      const afterTable = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(12);
      doc.text("Distribuição por Categoria", 14, afterTable + 10);

      autoTable(doc, {
        startY: afterTable + 14,
        head: [["Categoria", "Quantidade", "%"]],
        body: Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => [
            cat,
            count,
            `${((count / data.length) * 100).toFixed(1)}%`,
          ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94] },
      });

      // Country distribution
      const afterCat = (doc as any).lastAutoTable?.finalY || 180;
      if (afterCat < 240) {
        doc.setFontSize(12);
        doc.text("Distribuição por País", 14, afterCat + 10);

        autoTable(doc, {
          startY: afterCat + 14,
          head: [["País", "Trends", "%"]],
          body: Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([cc, count]) => [
              countryLabel(cc),
              count,
              `${((count / data.length) * 100).toFixed(1)}%`,
            ]),
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [168, 85, 247] },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Global Talk Trends — Página ${i}/${pageCount}`, 14, 290);
      }

      doc.save(`relatorio-trends-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
      toast({ title: "✅ PDF gerado!", description: `Relatório com ${data.length} trends exportado.` });
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
    toast({ title: "🔗 Link copiado!", description: "Link com filtros copiado para a área de transferência." });
  };

  const selectClass = "w-full appearance-none bg-secondary text-foreground text-xs font-medium px-3 py-2 rounded-lg cursor-pointer border border-border focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Gerar novo relatório
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Período</label>
            <div className="relative">
              <select className={selectClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
                {periodOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
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
                    {group.items.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
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
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Fonte</label>
            <div className="relative">
              <select className={selectClass} value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={generatePDF}
            disabled={generating !== null}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating === "pdf" ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Gerar PDF
          </button>

          <button
            onClick={generateCSV}
            disabled={generating !== null}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {generating === "csv" ? (
              <div className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Gerar CSV
          </button>

          <button
            onClick={generateLink}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Link
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Os relatórios PDF incluem: Top 10 trends do período, distribuição por categoria e por país, com data de geração.
          O CSV contém todos os dados brutos para análise personalizada.
          O link compartilhável aplica os filtros selecionados no dashboard.
        </p>
      </div>
    </div>
  );
}
