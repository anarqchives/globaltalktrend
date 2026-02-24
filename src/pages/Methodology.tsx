import { ArrowLeft, ExternalLink, CheckCircle2, Shield, FlaskConical, Globe, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const sources = [
  {
    name: "YouTube Trending",
    icon: "▶",
    type: "Redes Sociais",
    badge: null,
    description: "Vídeos em tendência no YouTube Brasil via YouTube Data API v3.",
    limits: "Quota diária de 10.000 unidades. Atualização a cada 5 min.",
    url: "https://developers.google.com/youtube/v3",
  },
  {
    name: "Reddit",
    icon: "💬",
    type: "Redes Sociais",
    badge: null,
    description: "Posts mais populares do r/all via API pública do Reddit.",
    limits: "Rate limit de 60 req/min. Acesso client-side, pode falhar com CORS.",
    url: "https://www.reddit.com/dev/api",
  },
  {
    name: "Bluesky",
    icon: "🦋",
    type: "Redes Sociais",
    badge: null,
    description: "Feeds populares via API pública do Bluesky (AT Protocol).",
    limits: "API pública, sem chave. Dados limitados a feeds, não posts individuais.",
    url: "https://docs.bsky.app",
  },
  {
    name: "Mastodon",
    icon: "🐘",
    type: "Fediverso",
    badge: null,
    description: "Posts em alta na instância mastodon.social.",
    limits: "Apenas uma instância. Não representa todo o Fediverso.",
    url: "https://docs.joinmastodon.org/api",
  },
  {
    name: "Google Trends",
    icon: "🔍",
    type: "Buscas",
    badge: null,
    description: "Tendências de busca via RSS feed do Google Trends.",
    limits: "Dados limitados ao RSS público. Sem volume exato de buscas.",
    url: "https://trends.google.com",
  },
  {
    name: "NewsAPI",
    icon: "📰",
    type: "Imprensa",
    badge: "international",
    description: "Notícias de mais de 150.000 fontes jornalísticas globais.",
    limits: "100 req/dia no plano gratuito. Headlines apenas.",
    url: "https://newsapi.org",
  },
  {
    name: "NewsData.io",
    icon: "📰",
    type: "Imprensa",
    badge: "international",
    description: "Notícias em tempo real de fontes confiáveis em múltiplos idiomas.",
    limits: "200 créditos/dia no plano gratuito.",
    url: "https://newsdata.io",
  },
  {
    name: "GNews",
    icon: "🗞️",
    type: "Imprensa",
    badge: "international",
    description: "Headlines agregadas do Google News com acesso via API.",
    limits: "100 req/dia no plano gratuito.",
    url: "https://gnews.io",
  },
  {
    name: "The Guardian",
    icon: "🏛️",
    type: "Imprensa",
    badge: "international",
    description: "Artigos do The Guardian via Open Platform — jornalismo de qualidade.",
    limits: "12 req/seg, 5.000/dia no plano gratuito.",
    url: "https://open-platform.theguardian.com",
  },
  {
    name: "World Bank",
    icon: "🌐",
    type: "Dados Oficiais",
    badge: "official",
    description: "Indicadores econômicos globais (PIB, inflação, desemprego) do Banco Mundial.",
    limits: "API pública sem chave. Dados com atraso de 1-2 anos.",
    url: "https://data.worldbank.org",
  },
  {
    name: "IBGE",
    icon: "🇧🇷",
    type: "Dados Oficiais",
    badge: "official",
    description: "Notícias e indicadores oficiais do Instituto Brasileiro de Geografia e Estatística.",
    limits: "API pública sem chave. Dados focados no Brasil.",
    url: "https://servicodados.ibge.gov.br",
  },
  {
    name: "OpenAlex",
    icon: "🔬",
    type: "Ciência",
    badge: "scientific",
    description: "Base aberta com 250M+ trabalhos acadêmicos, citações e autores.",
    limits: "100.000 req/dia gratuitas. Dados acadêmicos, não notícias.",
    url: "https://openalex.org",
  },
];

const badgeMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  official: { label: "Fonte Oficial", icon: <Shield className="w-3 h-3" />, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  verified: { label: "Imprensa Verificada", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-500/10 text-green-500 border-green-500/20" },
  scientific: { label: "Dados Científicos", icon: <FlaskConical className="w-3 h-3" />, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  international: { label: "Fonte Internacional", icon: <Globe className="w-3 h-3" />, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

const Methodology = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 md:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Metodologia</h1>
            <p className="text-xs text-muted-foreground">Como o GlobalTalk coleta e apresenta dados</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* How it works */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como funciona</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: <Clock className="w-5 h-5 text-primary" />, title: "Coleta em Tempo Real", desc: "Dados são atualizados a cada 5 minutos via 12+ APIs simultâneas." },
              { icon: <Shield className="w-5 h-5 text-primary" />, title: "Fontes Diversificadas", desc: "Combinamos redes sociais, imprensa, dados oficiais e ciência." },
              { icon: <AlertTriangle className="w-5 h-5 text-primary" />, title: "Transparência Total", desc: "Cada trend mostra sua fonte original com link direto verificável." },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                {item.icon}
                <h3 className="font-semibold mt-2 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust badges explanation */}
        <section>
          <h2 className="text-lg font-bold mb-4">Selos de Confiabilidade</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(badgeMap).map(([key, badge]) => (
              <div key={key} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                  {badge.icon} {badge.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sources table */}
        <section>
          <h2 className="text-lg font-bold mb-4">Fontes de Dados ({sources.length})</h2>
          <div className="space-y-3">
            {sources.map((src) => {
              const badge = src.badge ? badgeMap[src.badge] : null;
              return (
                <div key={src.name} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{src.icon}</span>
                    <span className="font-semibold text-sm">{src.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{src.type}</span>
                    {badge && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                        {badge.icon} {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{src.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground/60 italic">{src.limits}</p>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                      Documentação <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Calculation methodology */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como as trends são calculadas</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Agregação:</strong> Dados de todas as fontes são coletados em paralelo a cada 5 minutos. Cache de servidor evita chamadas excessivas às APIs.</p>
            <p><strong className="text-foreground">Normalização:</strong> Cada plataforma tem métricas distintas (views, upvotes, citações, buscas). Não comparamos volumes entre plataformas diferentes.</p>
            <p><strong className="text-foreground">Ordenação:</strong> Trends são exibidas por ordem de chegada dentro de cada atualização, sem ranking de relevância.</p>
            <p><strong className="text-foreground">Geolocalização:</strong> Quando disponível, usamos o país de origem da fonte. Caso contrário, inferimos a partir do idioma ou API.</p>
            <p><strong className="text-foreground">Limitações:</strong> Planos gratuitos das APIs impõem limites diários. Em horários de pico, algumas fontes podem ficar indisponíveis temporariamente.</p>
          </div>
        </section>

        {/* Update frequency */}
        <section>
          <h2 className="text-lg font-bold mb-4">Taxa de atualização</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold">Fonte</th>
                  <th className="text-left py-2 px-3 font-semibold">Frequência</th>
                  <th className="text-left py-2 px-3 font-semibold">Método</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="py-2 px-3">YouTube, NewsAPI, Google Trends</td><td className="py-2 px-3">5 min</td><td className="py-2 px-3">Edge Function (backend)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">NewsData, GNews, Bing</td><td className="py-2 px-3">5 min</td><td className="py-2 px-3">Edge Function (backend)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">The Guardian, World Bank, IBGE, OpenAlex</td><td className="py-2 px-3">5 min</td><td className="py-2 px-3">Edge Function (backend)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Reddit, Bluesky, Mastodon</td><td className="py-2 px-3">5 min</td><td className="py-2 px-3">Client-side (navegador)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pb-8">
          <p>GlobalTalk é uma ferramenta gratuita e pública de monitoramento de tendências.</p>
          <p className="mt-1">Última atualização desta página: Fevereiro 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default Methodology;
