import { ArrowLeft, ExternalLink, CheckCircle2, Shield, FlaskConical, Globe, Clock, AlertTriangle, Layers, BarChart3, Zap, Brain, Map, FileText, Users, Bell, Eye, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const sources = [
  // Imprensa
  { name: "The Guardian", icon: "🏛️", type: "Imprensa", badge: "verified", description: "Artigos do The Guardian via Open Platform — jornalismo de qualidade com cobertura global.", limits: "12 req/seg, 5.000/dia no plano gratuito.", url: "https://open-platform.theguardian.com" },
  { name: "NewsAPI", icon: "📰", type: "Imprensa", badge: "international", description: "Notícias de mais de 150.000 fontes jornalísticas globais (BBC, CNN, Reuters, Al Jazeera, etc.).", limits: "100 req/dia no plano gratuito. Headlines apenas.", url: "https://newsapi.org" },
  { name: "NewsData.io", icon: "📰", type: "Imprensa", badge: "international", description: "Notícias em tempo real de fontes confiáveis em múltiplos idiomas e regiões.", limits: "200 créditos/dia no plano gratuito.", url: "https://newsdata.io" },
  { name: "GNews", icon: "🗞️", type: "Imprensa", badge: "international", description: "Headlines agregadas do Google News com acesso via API estruturada.", limits: "100 req/dia no plano gratuito.", url: "https://gnews.io" },
  { name: "RSS Internacional", icon: "📡", type: "Imprensa", badge: "international", description: "130+ feeds RSS de imprensa internacional (BBC, Reuters, AP, El País, Le Monde, Folha, O Globo, DW, NHK, Al Jazeera, etc.). O sistema seleciona aleatoriamente 30 feeds por requisição para otimizar performance e evitar bloqueios.", limits: "30 feeds selecionados aleatoriamente por requisição.", url: "#" },
  // Redes Sociais
  { name: "YouTube Trending", icon: "▶", type: "Redes Sociais", badge: null, description: "Vídeos em tendência no YouTube via YouTube Data API v3, com dados de visualização e engajamento.", limits: "Quota diária de 10.000 unidades.", url: "https://developers.google.com/youtube/v3" },
  { name: "Reddit", icon: "💬", type: "Redes Sociais", badge: null, description: "Posts mais populares do r/all e subreddits temáticos via API pública. Cobre discussões orgânicas e virais.", limits: "Rate limit de 60 req/min.", url: "https://www.reddit.com/dev/api" },
  { name: "Hacker News", icon: "🔶", type: "Redes Sociais", badge: "verified", description: "Top stories e discussões da comunidade tech do Y Combinator. Forte sinal de tendências tecnológicas.", limits: "API pública sem limites estritos.", url: "https://news.ycombinator.com" },
  { name: "Bluesky", icon: "🦋", type: "Fediverso", badge: null, description: "Feeds populares via API pública do Bluesky (AT Protocol). Rede descentralizada em crescimento.", limits: "API pública, sem chave.", url: "https://docs.bsky.app" },
  { name: "Mastodon", icon: "🐘", type: "Fediverso", badge: null, description: "Posts em alta na instância mastodon.social. Parte do ecossistema descentralizado do Fediverso.", limits: "Apenas uma instância.", url: "https://docs.joinmastodon.org/api" },
  // Buscas
  { name: "Google Trends", icon: "🔍", type: "Buscas", badge: null, description: "Tendências de busca em tempo real via RSS feed do Google Trends. Indica o que o público está procurando ativamente.", limits: "Dados limitados ao RSS público.", url: "https://trends.google.com" },
  // Dados Oficiais
  { name: "World Bank", icon: "🌐", type: "Dados Oficiais", badge: "official", description: "Indicadores econômicos globais (PIB, inflação, desemprego, comércio) do Banco Mundial.", limits: "API pública sem chave. Dados com atraso de 1-2 anos.", url: "https://data.worldbank.org" },
  { name: "IBGE", icon: "🇧🇷", type: "Dados Oficiais", badge: "official", description: "Notícias e indicadores oficiais do Instituto Brasileiro de Geografia e Estatística.", limits: "API pública sem chave.", url: "https://servicodados.ibge.gov.br" },
  { name: "IMF", icon: "🏦", type: "Dados Oficiais", badge: "official", description: "Dados econômicos e financeiros do Fundo Monetário Internacional.", limits: "API pública.", url: "https://www.imf.org/en/Data" },
  { name: "NOAA", icon: "🌡️", type: "Dados Oficiais", badge: "official", description: "Dados climáticos e meteorológicos da agência americana NOAA.", limits: "API pública.", url: "https://www.noaa.gov" },
  // Ciência
  { name: "arXiv", icon: "📄", type: "Ciência", badge: "scientific", description: "Preprints de física, matemática, ciência da computação e áreas correlatas.", limits: "API pública.", url: "https://arxiv.org" },
  { name: "PubMed", icon: "🔬", type: "Ciência", badge: "scientific", description: "Base de dados biomédica com 36M+ artigos revisados por pares da National Library of Medicine.", limits: "10 req/seg.", url: "https://pubmed.ncbi.nlm.nih.gov" },
  { name: "OpenAlex", icon: "🔬", type: "Ciência", badge: "scientific", description: "Base aberta com 250M+ trabalhos acadêmicos, citações e autores de todo o mundo.", limits: "100.000 req/dia gratuitas.", url: "https://openalex.org" },
  { name: "Crossref", icon: "📚", type: "Ciência", badge: "scientific", description: "Metadados de publicações científicas e DOIs — a espinha dorsal da citação acadêmica global.", limits: "API pública.", url: "https://www.crossref.org" },
  // Outros
  { name: "Wikipedia", icon: "📖", type: "Enciclopédia", badge: null, description: "Artigos mais acessados e trending na Wikipedia — termômetro de curiosidade pública.", limits: "API pública.", url: "https://www.wikipedia.org" },
  { name: "GDELT", icon: "⚡", type: "Conflitos", badge: "official", description: "Monitoramento global de eventos, conflitos, crises e cooperação internacional em tempo real.", limits: "API pública.", url: "https://www.gdeltproject.org" },
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
            <h1 className="text-xl font-bold">Metodologia & Sobre</h1>
            <p className="text-xs text-muted-foreground">Tudo sobre como o Global Talk Trend funciona</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-10">

        {/* ═══ VISÃO GERAL ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Visão geral</h2>
          <div className="p-5 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p>O <strong className="text-foreground">Global Talk Trend</strong> é uma plataforma gratuita e pública de inteligência narrativa global. Funciona como um <em>"Terminal Bloomberg para narrativas"</em> — fusionando sinais de imprensa, redes sociais, buscas, dados governamentais e publicações científicas para detectar temas emergentes antes que se tornem mainstream.</p>
            <p>O projeto opera sob o princípio de <strong className="text-foreground">transparência radical</strong>: todas as fontes são documentadas, todos os métodos são explicáveis e nenhum dado opinativo ou não-verificável é utilizado. A inteligência gerada é baseada exclusivamente em dados públicos rastreáveis.</p>
            <p>Destinado a <strong className="text-foreground">jornalistas, pesquisadores, analistas de geopolítica, investidores e cidadãos</strong> que necessitam de uma visão panorâmica e imparcial do que o mundo está discutindo — sem bolhas algorítmicas.</p>
          </div>
        </section>

        {/* ═══ EM NÚMEROS ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">A plataforma em números</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "21+", label: "Fontes de dados ativas", icon: "📡" },
              { value: "130+", label: "Feeds RSS internacionais", icon: "📰" },
              { value: "50+", label: "Países monitorados", icon: "🌍" },
              { value: "12", label: "Categorias temáticas", icon: "🏷️" },
              { value: "15 min", label: "Ciclo de atualização", icon: "⏱️" },
              { value: "24h", label: "Cache de fallback", icon: "💾" },
              { value: "5", label: "Camadas de resiliência", icon: "🛡️" },
              { value: "4", label: "Modos de usuário", icon: "👤" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-card border border-border text-center">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ COMO FUNCIONA ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como funciona</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: <Clock className="w-5 h-5 text-primary" />, title: "Coleta em Tempo Real", desc: "Dados são atualizados a cada 15 minutos via 21+ APIs e 130+ feeds RSS simultâneos, com Edge Functions processando em paralelo." },
              { icon: <Shield className="w-5 h-5 text-primary" />, title: "Fontes Diversificadas", desc: "Combinamos imprensa, redes sociais, buscadores, dados oficiais, ciência e eventos — sem bolhas ou viés algorítmico." },
              { icon: <Layers className="w-5 h-5 text-primary" />, title: "Fallback em 5 Camadas", desc: "Cache local 24h → cache preditivo → relaxamento de país → relaxamento de categoria → dados contextuais. A timeline nunca fica vazia." },
              { icon: <Globe className="w-5 h-5 text-primary" />, title: "Cobertura Global", desc: "50+ países monitorados com classificação automática via palavras-chave, metadados e geolocalização de eventos." },
              { icon: <Zap className="w-5 h-5 text-primary" />, title: "Momentos Críticos", desc: "Detecção automática de anomalias com crescimento acima de 200% em 1 hora. Alertas clicáveis que levam ao card correspondente." },
              { icon: <BarChart3 className="w-5 h-5 text-primary" />, title: "Análise Multiplataforma", desc: "Identifica quando um assunto cruza diferentes tipos de mídia e países simultaneamente (badge 🔥 Multiplataforma)." },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                {item.icon}
                <h3 className="font-semibold mt-2 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ RECURSOS E FUNCIONALIDADES ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Recursos e funcionalidades</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: <BarChart3 className="w-5 h-5 text-primary" />, title: "Radar de Tendências", desc: "Painel com 3 abas (Top, Crítico, Semana) para visão rápida das tendências mais relevantes. Dashboard semanal com KPIs de atividade, sinais de atenção e destaques geográficos." },
              { icon: <Clock className="w-5 h-5 text-primary" />, title: "Timeline Inteligente", desc: "Feed agrupado por recência (Agora / Últimas 2h / 24h) com cards expandíveis contendo contexto por IA, sparklines de volume e badges de confiabilidade." },
              { icon: <Map className="w-5 h-5 text-primary" />, title: "Mapa Interativo", desc: "Visualização geográfica das tendências com marcadores por país, heatmap de densidade e seleção interativa de regiões." },
              { icon: <Brain className="w-5 h-5 text-primary" />, title: "Contexto por IA", desc: "Análise contextual por inteligência artificial que explica por que cada tendência é relevante, com informações de fundo e implicações." },
              { icon: <Users className="w-5 h-5 text-primary" />, title: "4 Modos de Usuário", desc: "Cidadão (geral), Jornalista (breaking news), Investidor (economia/mercado) e Marketing (engajamento/viral). Cada modo prioriza categorias e métricas diferentes." },
              { icon: <FileText className="w-5 h-5 text-primary" />, title: "Relatórios PDF", desc: "Geração de relatórios exportáveis com snapshots históricos, estatísticas de tendências e filtros aplicados." },
              { icon: <Bell className="w-5 h-5 text-primary" />, title: "Alertas e Salvamento", desc: "Sistema de alertas personalizáveis por palavra-chave, categoria ou país. Cards podem ser salvos em coleções e comentados." },
              { icon: <Globe className="w-5 h-5 text-primary" />, title: "Multilíngue", desc: "Interface disponível em Português e Inglês com tradução automática de tendências e detecção inteligente de idioma." },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  {item.icon}
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SELOS DE CONFIABILIDADE ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">Selos de Confiabilidade</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(badgeMap).map(([key, badge]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badge.className}`}>
                  {badge.icon} {badge.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {key === "official" && "Dados governamentais ou de organizações internacionais (World Bank, IBGE, IMF, NOAA)."}
                  {key === "verified" && "Veículos com tradição editorial e credibilidade reconhecida (The Guardian, Hacker News)."}
                  {key === "scientific" && "Publicações revisadas por pares ou bases acadêmicas (arXiv, PubMed, OpenAlex, Crossref)."}
                  {key === "international" && "Cobertura multi-país via agregadores e feeds internacionais (NewsAPI, GNews, RSS, GDELT)."}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CLASSIFICAÇÃO ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">Sistema de Classificação</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Por país (50+):</strong> Algoritmo híbrido que combina metadados da fonte, palavras-chave no título/descrição e geolocalização de eventos. Cada país possui listas de palavras-chave dedicadas em múltiplos idiomas. Para regiões com acesso restrito (China, Rússia, Palestina), o sistema depende de cobertura internacional e exibe avisos educativos ao usuário.</p>
              <p><strong className="text-foreground">Por categoria (12):</strong> Política, Economia, Tecnologia, Ciência, Esportes, Entretenimento, Cultura, Saúde, Clima, Conflitos, Conhecimento e Geral. O classificador usa mapeamento de aliases em 5 idiomas (PT/EN/ES/FR/DE) + análise de palavras-chave contextuais.</p>
              <p><strong className="text-foreground">Por tipo de mídia (8):</strong> Imprensa, Redes Sociais, Buscas, Dados Oficiais, Ciência, Tech, Enciclopédia e Conflitos. Cada tipo possui métricas distintas que não são comparadas entre si.</p>
              <p><strong className="text-foreground">Desduplicação:</strong> Títulos similares (80 primeiros caracteres) são agrupados automaticamente para evitar repetição no feed.</p>
            </div>
          </div>
        </section>

        {/* ═══ FONTES DE DADOS ═══ */}
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

        {/* ═══ MOMENTOS CRÍTICOS ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-primary" /> Momentos Críticos e Anomalias</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p>O sistema identifica automaticamente anomalias quando uma tendência apresenta:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Aumento de volume superior a <strong className="text-foreground">200%</strong> em 1 hora</li>
              <li>Crescimento acelerado consistente por 3 ciclos consecutivos</li>
              <li>Aparecimento em múltiplas fontes simultaneamente (badge 🔥 Multiplataforma)</li>
            </ul>
            <p>As notificações de anomalia são <strong className="text-foreground">clicáveis</strong> — ao clicar, a timeline rola até o card correspondente e o destaca visualmente com uma animação. O radar exibe uma aba "Crítico" dedicada a esses momentos.</p>
          </div>
        </section>

        {/* ═══ CÁLCULO DE TRENDS ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">Como as trends são calculadas</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Agregação:</strong> Dados de todas as 21+ fontes são coletados em paralelo a cada 15 minutos por Edge Functions no backend. Cache de servidor de 5 min evita chamadas excessivas às APIs.</p>
            <p><strong className="text-foreground">Normalização:</strong> Cada plataforma tem métricas distintas (views, upvotes, citações, buscas). O sistema não compara volumes entre plataformas diferentes — cada uma é contextualizada individualmente.</p>
            <p><strong className="text-foreground">Relevância:</strong> Algoritmo com pesos de <strong className="text-foreground">40% volume</strong>, <strong className="text-foreground">40% recência</strong> e <strong className="text-foreground">20% proximidade do pico</strong>. Os modos de usuário alteram esses pesos para priorizar diferentes métricas.</p>
            <p><strong className="text-foreground">Resiliência (5 camadas):</strong> Quando filtros retornam menos de 8 resultados, o sistema ativa camadas progressivas: cache local 24h → cache preditivo → relaxamento de país → relaxamento de categoria → dados contextuais.</p>
            <p><strong className="text-foreground">Ingestão RSS:</strong> O sistema utiliza um parser XML baseado em regex para extrair metadados e mídias, com lógica de "shuffling" que seleciona aleatoriamente 30 feeds por requisição para otimizar performance e evitar bloqueios.</p>
          </div>
        </section>

        {/* ═══ MODOS DE USUÁRIO ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Modos de Usuário</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { emoji: "👤", mode: "Cidadão", desc: "Visão geral balanceada. Prioriza temas de interesse público, política, saúde e economia. Métrica principal: volume de menções.", emphasis: "Volume" },
              { emoji: "📰", mode: "Jornalista", desc: "Foco em breaking news e crescimento acelerado. Prioriza política, conflitos e tendências emergentes. Métrica principal: taxa de crescimento.", emphasis: "Crescimento" },
              { emoji: "📈", mode: "Investidor", desc: "Orientado a economia, tecnologia e indicadores de mercado. Destaca sinais de dados oficiais e mudanças regulatórias. Métrica principal: engajamento.", emphasis: "Engajamento" },
              { emoji: "🎯", mode: "Marketing", desc: "Voltado a entretenimento, cultura e tendências virais. Identifica oportunidades de conteúdo e engajamento social. Métrica principal: diversidade de fontes.", emphasis: "Fontes" },
            ].map((m) => (
              <div key={m.mode} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{m.emoji}</span>
                  <h3 className="font-semibold text-sm">{m.mode}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{m.emphasis}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ PRIVACIDADE ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Privacidade e Dados</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> <strong className="text-foreground">Zero coleta de dados pessoais:</strong> nenhum cookie de terceiros, nenhum rastreamento, nenhum fingerprinting.</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> <strong className="text-foreground">Navegação anônima:</strong> o uso da plataforma não requer login. Login é opcional e usado apenas para salvar cards, alertas e preferências.</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> <strong className="text-foreground">Dados do usuário autenticado:</strong> quando logado, apenas dados explicitamente salvos pelo usuário são armazenados (cards, alertas, preferências de perfil).</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> <strong className="text-foreground">Feedback anônimo:</strong> os botões de feedback (👍 👎 🚩) podem ser usados anonimamente para calibrar o algoritmo. Apenas o tipo de feedback e o título da trend são armazenados.</li>
              <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span> <strong className="text-foreground">Código transparente:</strong> todo o sistema é documentado e utiliza apenas dados públicos e verificáveis.</li>
            </ul>
          </div>
        </section>

        {/* ═══ TAXA DE ATUALIZAÇÃO ═══ */}
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
                <tr className="border-b border-border/50"><td className="py-2 px-3">RSS Internacional (130+ feeds)</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">arXiv, PubMed, World Bank, IBGE, IMF, NOAA</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">OpenAlex, Crossref, GDELT, Wikipedia</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Backend (Edge Function)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Reddit, Bluesky, Mastodon, Hacker News</td><td className="py-2 px-3">15 min</td><td className="py-2 px-3">Client-side (navegador)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Snapshots históricos (Supabase)</td><td className="py-2 px-3">Por ciclo</td><td className="py-2 px-3">Backend (persistência)</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 px-3">Cache histórico local</td><td className="py-2 px-3">24h</td><td className="py-2 px-3">localStorage (navegador)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══ LIMITAÇÕES ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4">Limitações conhecidas</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Planos gratuitos das APIs impõem limites diários — em horários de pico, algumas fontes podem ficar temporariamente indisponíveis.</li>
              <li>Países com pouca cobertura em fontes anglófonas podem aparecer com menos frequência.</li>
              <li>Regiões com restrições de acesso à informação (China, Rússia, Irã) dependem de cobertura internacional indireta.</li>
              <li>A classificação por país pode ter imprecisões em notícias genéricas, multilaterais ou que mencionam múltiplos países.</li>
              <li>Dados oficiais (World Bank, IMF) podem ter atraso de 1-2 anos em relação ao período corrente.</li>
              <li>A plataforma não inclui conteúdo opinativo, dados não-verificáveis ou algoritmos de recomendação personalizada.</li>
            </ul>
          </div>
        </section>

        {/* ═══ TECNOLOGIA ═══ */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Stack tecnológico</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-3 text-sm text-muted-foreground">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Frontend", value: "React + TypeScript + Tailwind CSS" },
                { label: "Build", value: "Vite (SPA otimizado)" },
                { label: "Backend", value: "Edge Functions (Deno)" },
                { label: "Banco de dados", value: "PostgreSQL (Cloud)" },
                { label: "Autenticação", value: "OAuth 2.0 (Google/Apple)" },
                { label: "IA", value: "Modelos de linguagem para contexto" },
                { label: "Mapas", value: "Google Maps JavaScript API" },
                { label: "Gráficos", value: "Recharts + Sparklines" },
              ].map((tech) => (
                <div key={tech.label}>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{tech.label}</p>
                  <p className="text-xs font-medium text-foreground">{tech.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pb-8 space-y-1">
          <p className="font-medium text-foreground">Global Talk Trend</p>
          <p>Ferramenta gratuita e pública de inteligência narrativa global.</p>
          <p>100% mantida por doações voluntárias. Sem algoritmos de recomendação, sem bolhas.</p>
          <p className="pt-2">
            <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
          </p>
          <p className="text-muted-foreground/50 pt-1">Última atualização desta página: Março 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default Methodology;
