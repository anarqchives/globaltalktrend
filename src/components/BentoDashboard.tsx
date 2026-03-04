import { Trash2, ExternalLink, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SavedCard } from "@/hooks/use-saved-cards";
import { toast } from "@/hooks/use-toast";

const countryCodeToFlag = (code?: string | null) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface BentoDashboardProps {
  cards: SavedCard[];
  loading: boolean;
  onRemove: (id: string) => void;
}

export default function BentoDashboard({ cards, loading, onRemove }: BentoDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-xl border border-border/50 p-4 animate-pulse h-32">
            <div className="h-3 bg-secondary rounded w-2/3 mb-3" />
            <div className="h-2 bg-secondary rounded w-full mb-2" />
            <div className="h-2 bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
        <span className="text-3xl block mb-2">📌</span>
        <p className="text-xs text-muted-foreground">
          Nenhum card salvo. Use o botão 📌 nos cards da timeline para salvar aqui.
        </p>
      </div>
    );
  }

  const handleShare = (card: SavedCard) => {
    navigator.clipboard.writeText(`${card.title} — ${card.platform}`);
    toast({ title: "🔗 Link copiado!", description: card.title.slice(0, 50) });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AnimatePresence>
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="group bg-card rounded-xl border border-border/50 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-primary">{card.platform}</span>
                {card.country_code && (
                  <span className="text-xs">{countryCodeToFlag(card.country_code)}</span>
                )}
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleShare(card)} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Compartilhar">
                  <Share2 className="w-3 h-3" />
                </button>
                {card.source_url && (
                  <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-muted-foreground hover:text-primary" title="Abrir fonte">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button onClick={() => onRemove(card.id)} className="p-1 rounded text-muted-foreground hover:text-destructive" title="Remover">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Thumbnail */}
            {card.thumbnail && (
              <img src={card.thumbnail} alt="" className="w-full h-20 rounded-lg object-cover mb-2 bg-secondary" loading="lazy" />
            )}

            {/* Title */}
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug mb-1">{card.title}</p>

            {/* Description */}
            {card.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{card.description}</p>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              {card.category && (
                <span className="px-1.5 py-0.5 rounded-md bg-secondary font-medium">{card.category}</span>
              )}
              <span>{new Date(card.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
