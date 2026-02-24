import { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Clock, ExternalLink, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHistory } from "@/hooks/use-history";

const HistoryPage = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const { history, loading, clearHistory, deleteItem } = useHistory(user?.id ?? null);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Faça login para ver seu histórico</h2>
          <Link to="/" className="text-primary hover:underline text-sm">← Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = "Título,Plataforma,Data/Hora\n";
    const rows = history.map(h =>
      `"${h.trend_title.replace(/"/g, '""')}","${h.platform}","${new Date(h.viewed_at).toLocaleString("pt-BR")}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-trends-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center gap-3">
        <Link to="/" className="p-1.5 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Meu Histórico</h1>
          <p className="text-xs text-muted-foreground">{history.length} trends visualizadas</p>
        </div>
        <div className="flex gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhuma trend visualizada ainda.</p>
            <p className="text-xs text-muted-foreground/60">Expanda cards no dashboard para registrar aqui.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                {item.platform.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.trend_title}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{item.platform}</span>
                  <span>·</span>
                  <span>{new Date(item.viewed_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
