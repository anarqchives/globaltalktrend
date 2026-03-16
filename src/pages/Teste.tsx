import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type TestTrend = {
  title: string;
  platform: string;
  category?: string;
  time?: string;
  volume?: string;
  sourceUrl?: string;
};

const Teste = () => {
  const [items, setItems] = useState<TestTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        if (import.meta.env.DEV) console.log("🔍 [ROTA TESTE] Buscando somente The Guardian...");

        const { data, error } = await supabase.functions.invoke("fetch-news-extra");
        if (error) throw error;

        const trends = (data?.trends || []) as TestTrend[];
        const guardianOnly = trends.filter((t) => t.platform === "The Guardian");

        if (import.meta.env.DEV) console.log("✅ [ROTA TESTE] The Guardian retornou:", guardianOnly.length, "itens");
        setItems(guardianOnly);
      } catch (e: any) {
        if (import.meta.env.DEV) console.error("❌ [ROTA TESTE] Erro no carregamento do The Guardian:", e);
        setError("Falha ao carregar dados do The Guardian.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Diagnóstico /teste — The Guardian</h1>
          <p className="text-sm text-muted-foreground">
            Esta rota ignora filtros e mostra somente dados do The Guardian para isolar o gargalo.
          </p>
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Voltar para timeline principal
          </Link>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Carregando dados…</p>}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Nenhum item do The Guardian foi retornado.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={`${item.title}-${idx}`} className="rounded-lg border border-border bg-card p-3">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.platform} • {item.category || "Sem categoria"} • {item.time || "Sem horário"} • {item.volume || "Sem volume"}
                </p>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    Abrir fonte
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default Teste;
