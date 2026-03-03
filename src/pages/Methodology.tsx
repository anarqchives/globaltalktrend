import { ArrowLeft, ExternalLink, CheckCircle2, Shield, FlaskConical, Globe, Clock, AlertTriangle, Layers, BarChart3, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const sources = [
  // Imprensa
  { name: "The Guardian", icon: "🏛️", type: "Imprensa", badge: "verified", description: "Artigos do The Guardian via Open Platform — jornalismo de qualidade.", limits: "12 req/seg, 5.000/dia no plano gratuito.", url: "https://open-platform.theguardian.com" },
  { name: "NewsAPI", icon: "📰", type: "Imprensa", badge: "international", description: "Notícias de mais de 150.000 fontes jornalísticas globais (BBC, CNN, Reuters, etc.).", limits: "100 req/dia no plano gratuito. Headlines apenas.", url: "https://newsapi.org" },
  { name: "NewsData.io", icon: "📰", type: "Imprensa", badge: "international", description: "Notícias em tempo real de fontes confiáveis em múltiplos idiomas.", limits: "200 créditos/dia no plano gratuito.", url: "https://newsdata.io" },
  { name: "GNews", icon: "🗞️", type: "Imprensa", badge: "international", description: "Headlines agregadas do Google News com acesso via API.", limits: "100 req/dia no plano gratuito.", url: "https://gnews.io" },
  { name: "RSS Internacional", icon: "📡", type: "Imprensa", badge: "international", description: "60+ feeds RSS de imprensa internacional (BBC, Reuters, AP, El País, Le Monde, Folha, O Globo, etc.).", limits: "30 feeds selecionados aleatoriamente por requisição.", url: "#" },
  // Redes Sociais
  { name: "YouTube Trending", icon: "▶", type: "Redes Sociais", badge: null, description: "Vídeos em tendência no YouTube Brasil via YouTube Data API v3.", limits: "Quota diária de 10.000 unidades.", url: "https://developers.google.com/youtube/v3" },
  { name: "Reddit", icon: "💬", type: "Redes Sociais", badge: null, description: "Posts mais populares do r/all e subreddits temáticos via API pública.", limits: "Rate limit de 60 req/min.", url: "https://www.reddit.com/dev/api" },
  { name: "Hacker News", icon: "🔶", type: "Redes Sociais", badge: "verified", description: "Top stories e discussões da comunidade tech do Y Combinator.", limits: "API pública sem limites estritos.", url: "https://news.ycombinator.com" },
  { name: "Bluesky", icon: "🦋", type: "Redes Sociais", badge: null, description: "Feeds populares via API pública do Bluesky (AT Protocol).", limits: "API pública, sem chave.", url: "https://docs.bsky.app" },
  { name: "Mastodon", icon: "🐘", type: "Fediverso", badge: null, description: "Posts em alta na instância mastodon.social.", limits: "Apenas uma instância.", url: "https://docs.joinmastodon.org/api" },
  // Buscas
  { name: "Google Trends", icon: "🔍", type: "Buscas", badge: null, description: "Tendências de busca em tempo real via RSS feed do Google Trends.", limits: "Dados limitados ao RSS público.", url: "https://trends.google.com" },
  // Dados Oficiais
  { name: "World Bank", icon: "🌐", type: "Dados Oficiais", badge: "official", description: "Indicadores econômicos globais (PIB, inflação, desemprego) do Banco Mundial.", limits: "API pública sem chave. Dados com atraso de 1-2 anos.", url: "https://data.worldbank.org" },
  { name: "IBGE", icon: "🇧🇷", type: "Dados Oficiais", badge: "official", description: "Notícias e indicadores oficiais do Instituto Brasileiro de Geografia e Estatística.", limits: "API pública sem chave.", url: "https://servicodados.ibge.gov.br" },
  { name: "IMF", icon: "🏦", type: "Dados Oficiais", badge: "official", description: "Dados econômicos e financeiros do Fundo Monetário Internacional.", limits: "API pública.", url: "https://www.imf.org/en/Data" },
  { name: "NOAA", icon: "🌡️", type: "Dados Oficiais", badge: "official", description: "Dados climáticos e meteorológicos da agência americana.", limits: "API pública.", url: "https://www.noaa.gov" },
  // Ciência
  { name: "arXiv", icon: "📄", type: "Ciência", badge: "scientific", description: "Preprints de física, matemática, ciência da computação e mais.", limits: "API pública.", url: "https://arxiv.org" },
  { name: "PubMed", icon: "🔬", type: "Ciência", badge: "scientific", description: "Base de dados biomédica com 36M+ artigos revisados por pares.", limits: "10 req/seg.", url: "https://pubmed.ncbi.nlm.nih.gov" },
  { name: "OpenAlex", icon: "🔬", type: "Ciência", badge: "scientific", description: "Base aberta com 250M+ trabalhos acadêmicos, citações e autores.", limits: "100.000 req/dia gratuitas.", url: "https://openalex.org" },
  { name: "Crossref", icon: "📚", type: "Ciência", badge: "scientific", description: "Metadados de publicações científicas e DOIs.", limits: "API pública.", url: "https://www.crossref.org" },
  // Outros
  { name: "Wikipedia", icon: "📖", type: "Enciclopédia", badge: null, description: "Artigos mais acessados e trending na Wikipedia.", limits: "API pública.", url: "https://www.wikipedia.org" },
  { name: "GDELT", icon: "⚡", type: "Conflitos", badge: "official", description: "Monitoramento global de eventos, conflitos e crises em tempo real.", limits: "API pública.", url: "https://www.gdeltproject.org" },
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
            <p className="text-xs text-muted-foreground">Como o Global Talk Trend coleta, classifica e apresenta dados</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* How it works */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como funciona</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: <Clock className="w-5 h-5 text-primary" />, title: "Coleta em Tempo Real", desc: "Dados são atualizados a cada 15 minutos via 18+ APIs e 60+ feeds RSS simultâneos." },
              { icon: <Shield className="w-5 h-5 text-primary" />, title: "Fontes Diversificadas", desc: "Combinamos imprensa, redes sociais, buscadores, dados oficiais e ciência — sem bolhas." },
              { icon: <Layers className="w-5 h-5 text-primary" />, title: "Fallback Inteligente", desc: "Sistema de cache 24h garante que a timeline nunca fique vazia, mesmo com APIs indisponíveis." },
              { icon: <Globe className="w-5 h-5 text-primary" />, title: "Cobertura Global", desc: "50+ países monitorados com classificação automática por país via palavras-chave e metadados." },
              { icon: <Zap className="w-5 h-5 text-primary" />, title: "Momentos Críticos", desc: "Detecção automática de anomalias com crescimento acima de 200% em 1 hora." },
              { icon: <BarChart3 className="w-5 h-5 text-primary" />, title: "Análise Multiplataforma", desc: "Identifica quando um assunto cruza diferentes tipos de mídia e países simultaneamente." },
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
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(badgeMap).map(([key, badge]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                  {badge.icon} {badge.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {key === "official" && "Dados governamentais ou de organizações internacionais (World Bank, IBGE, IMF)."}
                  {key === "verified" && "Veículos com tradição editorial (The Guardian, BBC, Hacker News)."}
                  {key === "scientific" && "Publicações revisadas por pares (arXiv, PubMed, Nature)."}
                  {key === "international" && "Cobertura multi-país via agregadores (NewsAPI, GNews, RSS)."}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Classification */}
        <section>
          <h2 className="text-lg font-bold mb-4">Classificação</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Por país:</strong> Algoritmo híbrido que combina metadados da fonte, palavras-chave no título/descrição e geolocalização de eventos. Mais de 50 países com listas de palavras-chave dedicadas.</p>
              <p><strong className="text-foreground">Por categoria:</strong> 12 categorias padronizadas (Política, Economia, Tecnologia, Ciência, Esportes, Entretenimento, Cultura, Saúde, Clima, Conflitos, Conhecimento, Geral) usando mapeamento de aliases em inglês/português/espanhol/francês/alemão + análise de palavras-chave.</p>
              <p><strong className="text-foreground">Por tipo de mídia:</strong> Imprensa, Redes Sociais, Buscas, Dados Oficiais, Ciência, Tech, Enciclopédia, Conflitos.</p>
            </div>
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
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                    {src.url !== "#" && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                        Documentação <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Moments & Anomalies */}
        <section>
          <h2 className="text-lg font-bold mb-4">Momentos Críticos e Anomalias</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p>Identificamos anomalias quando uma trend apresenta:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Aumento de volume superior a <strong className="text-foreground">200%</strong> em 1 hora</li>
              <li>Crescimento acelerado consistente por 3 ciclos consecutivos</li>
              <li>Aparecimento em múltiplas fontes simultaneamente (badge 🔥 Multiplataforma)</li>
            </ul>
            <p>As notificações de anomalia são clicáveis — ao clicar, a timeline rola até o card correspondente e o destaca visualmente.</p>
          </div>
        </section>

        {/* Calculation methodology */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como as trends são calculadas</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Agregação:</strong> Dados de todas as fontes são coletados em paralelo a cada 15 minutos. Cache de servidor de 5 min evita chamadas excessivas.</p>
            <p><strong className="text-foreground">Normalização:</strong> Cada plataforma tem métricas distintas (views, upvotes, citações, buscas). Não comparamos volumes entre plataformas diferentes.</p>
            <p><strong className="text-foreground">Relevância:</strong> Algoritmo com pesos de 40% para volume, 40% para recência e 20% para proximidade do pico.</p>
            <p><strong className="text-foreground">Desduplicação:</strong> Títulos similares (80 primeiros caracteres) são agrupados para evitar repetição.</p>
            <p><strong className="text-foreground">Fallback:</strong> Quando filtros retornam menos de 8 resultados, o sistema ativa 5 camadas: cache local 24h → cache preditivo → relaxamento de país → relaxamento de categoria → dados contextuais.</p>
          </div>
        </section>

        {/* Limitations */}
        <section>
          <h2 className="text-lg font-bold mb-4">Limitações conhecidas</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Planos gratuitos das APIs impõem limites diários — em horários de pico, algumas fontes podem ficar indisponíveis.</li>
              <li>Países com pouca cobertura em fontes anglófonas podem aparecer com menos frequência.</li>
              <li>A classificação por país pode ter imprecisões em notícias genéricas ou multilaterais.</li>
              <li>Dados oficiais (World Bank, IMF) podem ter atraso de 1-2 anos.</li>
            </ul>
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
                <tr className="border-b border-border/50"><td className="py-2 px-3">YouTube, NewsAPI, Google Trends</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">NewsData, GNews, The Guardian</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">RSS Internacional (60+ feeds)</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">arXiv, PubMed, World Bank, IBGE</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Reddit, Bluesky, Mastodon, Hacker News</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Client-side (navegador)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Cache histórico local</td><td className="py-2 px-3">24h</td><td className="py-2 px-3">localStorage (navegador)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pb-8">
          <p>Global Talk Trend é uma ferramenta gratuita e pública de monitoramento de tendências globais.</p>
          <p className="mt-1">100% mantida por doações voluntárias. Sem algoritmos de recomendação, sem bolhas.</p>
          <p className="mt-1">Última atualização desta página: Março 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default Methodology;