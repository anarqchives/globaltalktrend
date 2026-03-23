# GTT Monitor 🌍

> Plataforma de monitoramento de tendências globais em tempo real.  
> Agrega 7 categorias de fontes via 23 edge functions, com análise de IA e mapa interativo.

**URL:** [www.gttmonitor.com](https://www.gttmonitor.com)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| UI | TailwindCSS + shadcn/ui + Framer Motion |
| Estado | TanStack Query + React Router 6 |
| Backend | Supabase Edge Functions (Deno) |
| Banco | PostgreSQL + Row Level Security |
| IA | Lovable AI + Vertex AI (GCP) |
| Deploy | Vercel (Node 24.x) + domínio customizado |
| CI/CD | GitHub Actions |

---

## Fontes de dados

| Categoria | Fontes |
|-----------|--------|
| Imprensa | NewsData, GNews, Currents, TheNewsAPI |
| Social | Reddit, Bluesky, Mastodon |
| Dados oficiais | IMF, FRED, WHO, World Bank |
| Ciência | arXiv, PubMed, Crossref, Semantic Scholar |
| Busca | Google Trends (25 países) |
| Conflitos | GDELT, ACLED |
| Tech | Hacker News, GitHub, Lobsters |

---

## Arquitetura
```
Browser (React SPA)
    ↓
Vercel CDN + Edge Functions
    ↓
Supabase Edge Functions (23 funções Deno)
    ├── fetch-trends          — YouTube, NewsAPI, Google Trends
    ├── fetch-news-extra      — NewsData, GNews, Currents
    ├── fetch-social-trends   — Reddit, Bluesky, Mastodon
    ├── fetch-open-data       — World Bank, IMF, FRED, WHO
    ├── analyze-trend-context — IA: contexto por trend
    ├── translate-trends      — Tradução automática (12 idiomas)
    ├── generate-report       — Relatório executivo/acadêmico PDF
    └── + 16 outras funções
    ↓
Supabase PostgreSQL (RLS habilitado)
    ├── profiles, watchlist, collections
    ├── alerts, history, saved_filters
    └── trend_context_cache, trend_snapshots
```

---

## Funcionalidades

- **Timeline ao vivo** — feed virtualizado com priorização inteligente (Priority Engine v2)
- **Mapa interativo** — Google Maps com densidade de trends por país
- **Radar de tendências** — Emerging Signals, Critical Alerts, Top Trends
- **Watchlist** — monitoramento de trends com tracking de score
- **Coleções** — salvar e organizar trends por tema
- **Alertas** — notificações por keyword, país ou categoria
- **Relatórios PDF** — executivo ou acadêmico com bibliografia
- **Tradução automática** — 12 idiomas via IA
- **Gamificação** — achievements e pontos por engajamento
- **PWA** — instalável, offline-first, push notifications
- **Perfis públicos** — URL `/@username`

---

## Desenvolvimento local
```bash
# 1. Clone o repositório
git clone https://github.com/anarqchives/globaltalktrend.git
cd globaltalktrend

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha com suas chaves (veja .env.example)

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Para edge functions locais (opcional)
supabase start
```

---

## Testes
```bash
npm run test          # roda todos os testes
npm run test:watch    # modo watch
```

Cobertura atual: `priority-engine`, `categorize-trend`, `country-filter` — 56 testes.

---

## Segurança

- Row Level Security (RLS) habilitado em todas as tabelas
- Rate limiting nas edge functions críticas
- Headers de segurança HTTP via `vercel.json`
- Variáveis sensíveis em Vercel Environment Variables (nunca no código)
- CI/CD bloqueia builds com testes falhando

---

## Estrutura do projeto
```
src/
├── components/        — Componentes React (TimelineCard, TrendRadar, GoogleMapView...)
├── hooks/             — Custom hooks (useTrends, useIndexAuth, useIndexLayout...)
├── lib/               — Lógica pura (priority-engine, categorize-trend, trend-cache...)
├── pages/             — Páginas (Index, Discover, Profile, Reports...)
├── contexts/          — Contextos globais (LanguageContext, UserModeContext)
├── services/          — Serviços externos (aggregatorService, gdeltService)
└── integrations/      — Clientes externos (Supabase)

supabase/
├── functions/         — 23 Edge Functions Deno
└── migrations/        — Histórico completo do schema SQL
```

---

## Planos documentados

- [`PRODUCT_IMPROVEMENT_PLAN.md`](./PRODUCT_IMPROVEMENT_PLAN.md) — Epics e user stories de produto
- [`INTERFACE_STABILITY_PLAN.md`](./INTERFACE_STABILITY_PLAN.md) — Plano de estabilidade de UI/UX
