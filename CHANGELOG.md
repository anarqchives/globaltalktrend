# Changelog

Todas as mudanças relevantes do projeto são documentadas aqui.  
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [0.9.0] — 2026-03-23

### Segurança
- Removido `.env` do histórico completo do Git (`git filter-repo`)
- Chaves legacy do Supabase desativadas e migradas para novo sistema
- Adicionados headers de segurança HTTP no `vercel.json` (X-Frame-Options, CSP, etc.)
- Rate limiting implementado nas 5 edge functions críticas de IA
- Variáveis de ambiente migradas para Vercel Environment Variables

### Performance
- `console.log` e `debugger` removidos automaticamente do bundle de produção via esbuild
- Vercel Analytics e Speed Insights integrados (`@vercel/analytics`, `@vercel/speed-insights`)

### Qualidade de código
- `Index.tsx` refatorado: extraídos hooks `useIndexAuth` e `useIndexLayout`
- Dados históricos de trends agora buscam dados reais do banco (`trend_snapshots`)
- Substituído `Math.random()` por edge function `fetch-trend-history`
- Nova edge function `fetch-trend-history` com agregação por hora

### Testes
- 56 testes unitários adicionados (`priority-engine`, `categorize-trend`, `country-filter`)
- GitHub Actions CI/CD configurado — testes e build rodam a cada push para `main`
- `package-lock.json` sincronizado com todas as dependências

### Documentação
- README expandido com arquitetura completa, stack, fontes de dados e guia de setup
- `.env.example` criado com todas as variáveis necessárias documentadas
- `CHANGELOG.md` iniciado

---

## [0.8.0] — 2026-03-22

### Adicionado
- Redesign do componente `TimelineCard` UI
- Watchlist com persistência cross-device via Supabase
- Sistema de alertas por keyword, país e threshold
- Perfis públicos com URL `/@username`
- Gamificação com achievements e sistema de pontos
- Relatórios PDF executivo e acadêmico com bibliografia
- Suporte a 12 idiomas com tradução automática via IA
- PWA com service worker, offline-first e push notifications
- Heatmap temporal de atividade por região
- Painel de transparência de fontes

### Infraestrutura
- 23 Edge Functions Deno no Supabase
- 14 migrations SQL com RLS em todas as tabelas
- Deploy automático via Vercel + domínio `gttmonitor.com`
- CI/CD via `lovable-dev[bot]`

---

## Roadmap

### [1.0.0] — planejado
- [ ] Redesign completo da interface (em planejamento)
- [ ] Push notifications funcionando end-to-end
- [ ] Heatmap integrado ao Radar
- [ ] Cobertura de testes ≥ 60%
- [ ] Tradução 100% completa (40+ strings pendentes)
- [ ] Update Queue Pattern (pausa de updates ao expandir card)
- [ ] Branch de staging com Preview Deployments
