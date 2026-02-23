import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TrendCard from "./TrendCard";

interface TrendItem {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  limited?: boolean;
  details?: string;
}

const fallbackData: TrendItem[] = [
  {
    icon: "🔍",
    platform: "Google Trends",
    title: "Eleições 2026: pesquisas apontam novo cenário",
    category: "Política",
    time: "há 12 min",
    volume: "1.2M buscas",
    change: "+340%",
    changePositive: true,
    sparkData: [10, 15, 12, 25, 40, 65, 80, 95, 88, 92],
    details: "Volume de buscas disparou após divulgação de nova pesquisa eleitoral.",
  },
];

const TrendsSection = () => {
  const [trends, setTrends] = useState<TrendItem[]>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const { data, error: fnError } = await supabase.functions.invoke("fetch-trends");

        if (fnError) {
          console.error("Edge function error:", fnError);
          setError("Erro ao carregar tendências ao vivo");
          return;
        }

        if (data?.trends && data.trends.length > 0) {
          setTrends(data.trends);
          setError(null);
        }
      } catch (e) {
        console.error("Fetch error:", e);
        setError("Erro de conexão");
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
    const interval = setInterval(fetchTrends, 15 * 60 * 1000); // refresh every 15 min
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <div className="flex justify-between items-center mb-5 mt-8">
        <h2 className="text-xl font-semibold">🔥 Tendências globais · agora</h2>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              atualizando...
            </span>
          )}
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
          <span className="source-tag">fontes: YouTube · NewsAPI · Reddit</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {trends.map((trend, index) => (
          <TrendCard key={index} {...trend} />
        ))}
      </div>

      <div
        className="bg-card rounded-2xl p-4 border border-border text-sm text-muted-foreground space-y-2"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <p>
          ⚠️ APIs com acesso restrito exibem dados estimados ou indicadores públicos.
        </p>
        <p>
          <span className="font-medium text-foreground">
            ✅ YouTube · Reddit · NewsAPI
          </span>{" "}
          <span className="ml-2">⚠️ Demais redes: acesso limitado</span>
        </p>
      </div>
    </section>
  );
};

export default TrendsSection;
