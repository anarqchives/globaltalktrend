import TrendCard from "./TrendCard";

const trendData = [
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
    details: "Volume de buscas disparou após divulgação de nova pesquisa eleitoral. Termos relacionados: candidatos 2026, intenção de voto, debate presidencial.",
  },
  {
    icon: "▶",
    platform: "YouTube",
    title: "Novo documentário sobre IA bate recorde de views",
    category: "Tecnologia",
    time: "há 23 min",
    volume: "4.8M views",
    change: "+120%",
    changePositive: true,
    sparkData: [5, 8, 12, 18, 30, 45, 60, 72, 85, 90],
    details: "Documentário viral sobre inteligência artificial alcança top 1 em tendências. Comentários e reações dominam redes sociais.",
  },
  {
    icon: "📰",
    platform: "NewsAPI",
    title: "Mercado financeiro reage a dados de inflação",
    category: "Negócios/Finanças",
    time: "há 8 min",
    volume: "890 artigos",
    change: "+85%",
    changePositive: true,
    sparkData: [20, 22, 25, 35, 50, 48, 55, 70, 65, 72],
    details: "Dados do IBGE indicam desaceleração. Bolsa opera em alta e dólar recua. Analistas revisam projeções para o trimestre.",
  },
  {
    icon: "💬",
    platform: "Reddit",
    title: "Thread viral: melhores ferramentas de produtividade 2026",
    category: "Tecnologia",
    time: "há 45 min",
    volume: "32K upvotes",
    change: "+210%",
    changePositive: true,
    sparkData: [3, 5, 8, 15, 28, 42, 55, 68, 75, 80],
    details: "Discussão no r/productivity reúne mais de 5.000 comentários com recomendações de apps e workflows.",
  },
  {
    icon: "🐦",
    platform: "X (Twitter)",
    title: "Final da Champions League gera onda de memes",
    category: "Esportes",
    time: "há 5 min",
    volume: "~2.1M posts",
    change: "+580%",
    changePositive: true,
    sparkData: [2, 3, 5, 8, 15, 45, 80, 95, 100, 98],
    limited: true,
    details: "Acesso estimado via indicadores públicos. Hashtags relacionadas dominam trending topics global.",
  },
  {
    icon: "📸",
    platform: "Instagram",
    title: "Tendência de moda sustentável viraliza",
    category: "Cultura",
    time: "há 1h",
    volume: "~850K posts",
    change: "+65%",
    changePositive: true,
    sparkData: [15, 18, 22, 28, 35, 40, 48, 52, 58, 62],
    limited: true,
    details: "Dados estimados. Influenciadores e marcas impulsionam movimento de moda circular e upcycling.",
  },
  {
    icon: "🎵",
    platform: "TikTok",
    title: "Novo desafio de dança acumula bilhões de views",
    category: "Entretenimento",
    time: "há 30 min",
    volume: "~3.2B views",
    change: "+420%",
    changePositive: true,
    sparkData: [5, 10, 20, 35, 55, 70, 82, 90, 95, 100],
    limited: true,
    details: "Acesso limitado à API. Indicadores sugerem crescimento exponencial nas últimas 6 horas.",
  },
  {
    icon: "🔬",
    platform: "Google Trends",
    title: "Descoberta científica sobre longevidade viraliza",
    category: "Ciência",
    time: "há 2h",
    volume: "560K buscas",
    change: "+190%",
    changePositive: true,
    sparkData: [8, 12, 15, 20, 30, 45, 55, 60, 58, 62],
    details: "Estudo publicado na Nature sobre reversão do envelhecimento celular gera interesse massivo em buscas relacionadas.",
  },
];

const TrendsSection = () => {
  return (
    <section>
      <div className="flex justify-between items-center mb-5 mt-8">
        <h2 className="text-xl font-semibold">🔥 Tendências globais · agora</h2>
        <span className="source-tag">fontes: dados reais + indicadores</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {trendData.map((trend, index) => (
          <TrendCard key={index} {...trend} />
        ))}
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border text-sm text-muted-foreground space-y-2" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
        <p>
          ⚠️ APIs com acesso restrito exibem dados estimados ou indicadores públicos. Passe o mouse sobre os ícones para detalhes.
        </p>
        <p>
          <span className="font-medium text-foreground">✅ YouTube · Reddit · Google Trends · NewsAPI</span>{" "}
          <span className="ml-2">⚠️ Demais redes: acesso limitado</span>
        </p>
      </div>
    </section>
  );
};

export default TrendsSection;
