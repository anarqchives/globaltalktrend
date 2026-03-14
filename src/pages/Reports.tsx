import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Clock, BarChart3, Globe, ChevronRight,
  Download, Trash2, Filter, Search, X
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ReportItem {
  id: string;
  title: string;
  created_at: string;
  snapshot_count: number;
  stats: any;
  filters: any;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const Reports = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchReports(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchReports = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("report_history")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const deleteReport = async (id: string) => {
    await supabase.from("report_history").delete().eq("id", id);
    setReports(prev => prev.filter(r => r.id !== id));
    toast({ title: lang === "en" ? "Report deleted" : "Relatório excluído" });
  };

  const filtered = searchQuery.trim()
    ? reports.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : reports;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <AppHeader />

      <main className="flex-1 px-4 md:px-8 lg:px-12 py-8 md:py-12 max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-[1.1] text-foreground">
              {lang === "en" ? "Reports" : "Relatórios"}
            </h1>
            <p className="text-muted-foreground text-[14px] leading-relaxed max-w-lg">
              {lang === "en"
                ? "Long-form analytical insights generated from your trend explorations."
                : "Análises detalhadas geradas a partir das suas explorações de tendências."}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "en" ? "Search reports…" : "Buscar relatórios…"}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-secondary/60 border border-border/50 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Not logged in */}
        {!userId && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {lang === "en" ? "Sign in to view reports" : "Faça login para ver relatórios"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {lang === "en"
                ? "Reports are saved to your account and persist across sessions."
                : "Relatórios são salvos na sua conta e persistem entre sessões."}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-secondary/30 animate-pulse h-[160px]" />
            ))}
          </div>
        )}

        {/* Empty */}
        {userId && !loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {lang === "en" ? "No reports yet" : "Nenhum relatório ainda"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {lang === "en"
                ? "Generate reports from the Dashboard to see them here."
                : "Gere relatórios a partir do Dashboard para vê-los aqui."}
            </p>
            <Link
              to="/dashboard"
              className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              {lang === "en" ? "Go to Dashboard" : "Ir ao Dashboard"}
            </Link>
          </div>
        )}

        {/* Reports grid */}
        {userId && !loading && filtered.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {filtered.map((report, i) => (
              <motion.article
                key={report.id}
                custom={i}
                variants={fadeUp}
                className="group rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/perfil?tab=reports`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">{formatDate(report.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                    className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {report.snapshot_count} {lang === "en" ? "snapshots" : "snapshots"}
                  </span>
                  {report.filters && (report.filters as any).country && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {(report.filters as any).country}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(report.created_at)}
                  </span>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border/40 px-4 md:px-8 lg:px-12 py-6 max-w-[1200px] mx-auto w-full">
        <p className="text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Global Talk Trend
        </p>
      </footer>
    </div>
  );
};

export default Reports;
