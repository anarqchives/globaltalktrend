import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, CheckCircle2, AlertTriangle, Clock, Database, RefreshCw } from "lucide-react";

interface SourceStatus {
  ok: boolean;
  count: number;
  lastUpdate: Date;
}

interface TransparencyPanelProps {
  open: boolean;
  onClose: () => void;
  sourcesStatus: Record<string, SourceStatus>;
  lastUpdated: Date | null;
  totalTrends: number;
}

const sourceDescriptions: Record<string, string> = {
  "YouTube": "Vídeos em alta via YouTube Data API v3",
  "Google Trends": "Tendências de busca via RSS Feed do Google Trends",
  "Reddit": "Posts populares via API pública do Reddit (client-side)",
  "Bluesky": "Feeds populares via API pública do Bluesky",
  "Mastodon": "Posts em alta via API pública do Mastodon.social",
  "The Guardian": "Notícias internacionais via The Guardian Open Platform",
  "Hacker News": "Top stories via API pública do Hacker News",
  "Wikipedia": "Artigos mais lidos via Wikimedia REST API",
  "Stack Overflow": "Perguntas populares via Stack Exchange API",
  "GitHub": "Repositórios trending via scraping público",
  "NewsAPI": "Agregador de notícias globais (700+ fontes)",
  "World Bank": "Dados econômicos oficiais do Banco Mundial",
  "IBGE": "Dados oficiais do Instituto Brasileiro de Geografia e Estatística",
  "OpenAlex": "Artigos científicos via OpenAlex (base aberta de pesquisa acadêmica)",
};

export default function TransparencyPanel({ open, onClose, sourcesStatus, lastUpdated, totalTrends }: TransparencyPanelProps) {
  const sortedSources = Object.entries(sourcesStatus).sort(([, a], [, b]) => b.count - a.count);
  const activeSources = sortedSources.filter(([, s]) => s.ok).length;
  const failedSources = sortedSources.filter(([, s]) => !s.ok).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Painel de Transparência
          </DialogTitle>
          <DialogDescription>
            Como esta ferramenta funciona e o status de cada fonte de dados.
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <Database className="w-4 h-4 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold text-foreground">{totalTrends}</div>
            <div className="text-[10px] text-muted-foreground">Trends ativas</div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-bold text-foreground">{activeSources}</div>
            <div className="text-[10px] text-muted-foreground">Fontes ativas</div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <RefreshCw className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold text-foreground">15 min</div>
            <div className="text-[10px] text-muted-foreground">Frequência</div>
          </div>
        </div>

        {/* Last Update */}
        {lastUpdated && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
            <Clock className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">
              Última atualização: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )}

        {/* Sources Status */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Status das Fontes de Dados
          </h3>
          {sortedSources.map(([name, status]) => (
            <div
              key={name}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors"
            >
              <div className="flex-shrink-0">
                {status.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{name}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {sourceDescriptions[name] || "Fonte de dados"}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xs font-semibold text-foreground">{status.count}</div>
                <div className="text-[9px] text-muted-foreground">trends</div>
              </div>
            </div>
          ))}
        </div>

        {failedSources > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {failedSources} fonte(s) sem dados na última coleta. Isso pode ocorrer por limites de cota (rate limiting) ou instabilidade temporária da API.
            </p>
          </div>
        )}

        {/* Methodology */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Metodologia
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Coleta:</strong> Dados são agregados de {Object.keys(sourceDescriptions).length} fontes a cada 15 minutos via APIs oficiais e públicas.
            </p>
            <p>
              <strong className="text-foreground">Categorização:</strong> Algoritmo de classificação automática baseado em palavras-chave, subreddit e metadados da fonte.
            </p>
            <p>
              <strong className="text-foreground">Selos de Confiabilidade:</strong>
            </p>
            <ul className="ml-4 space-y-1">
              <li>🔵 <strong>Fonte Oficial</strong> — Dados governamentais ou científicos (World Bank, IBGE)</li>
              <li>🟢 <strong>Imprensa Verificada</strong> — Veículos tradicionais com histórico comprovado</li>
              <li>🟣 <strong>Dados Científicos</strong> — Artigos acadêmicos revisados por pares</li>
              <li>🟡 <strong>Fonte Internacional</strong> — Cobertura global de veículos respeitados</li>
              <li>🔴 <strong>Pauta Quente</strong> — Tendência viral em redes sociais</li>
            </ul>
            <p>
              <strong className="text-foreground">Limitações:</strong> Dados de redes com acesso restrito (Instagram, TikTok) não são incluídos. Contagens de volume são estimativas baseadas em amostras públicas.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}