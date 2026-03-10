import React, { useState, useEffect } from "react";
import { Trash2, ExternalLink, Share2, GripVertical, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SavedCard } from "@/hooks/use-saved-cards";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const countryCodeToFlag = (code?: string | null) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface BentoDashboardProps {
  cards: SavedCard[];
  loading: boolean;
  onRemove: (id: string) => void;
  onReorder?: (cards: SavedCard[]) => void;
}

/* ─── Sortable Card ─── */
function SortableCard({ card, onRemove, onShare }: { card: SavedCard; onRemove: (id: string) => void; onShare: (card: SavedCard) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; sentiment: string; impact: string } | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  const metadata = card.metadata || {};
  const historicalData = metadata.historicalData as { hour: string; value: number }[] | undefined;
  const platformColor = metadata.platformColor || "hsl(210, 100%, 50%)";

  const handleSummarize = async () => {
    if (aiSummary || summarizing) return;
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-trend", {
        body: { title: card.title, details: card.description, platform: card.platform, volume: metadata.volume },
      });
      if (error) throw error;
      setAiSummary(data);
    } catch {
      toast({ title: "Erro", description: "Não foi possível resumir.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`group bg-card rounded-xl border border-border/50 hover:shadow-md transition-all duration-200 ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground hover:text-foreground touch-none">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold text-primary">{card.platform}</span>
            {card.country_code && (
              <span className="text-xs">{countryCodeToFlag(card.country_code)}</span>
            )}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onShare(card)} className="p-1 rounded text-muted-foreground hover:text-foreground" title="Compartilhar">
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
        {card.thumbnail && !expanded && (
          <img src={card.thumbnail} alt="" className="w-full h-20 rounded-lg object-cover mb-2 bg-secondary" loading="lazy" />
        )}

        {/* Title */}
        <p className={`text-sm font-medium text-foreground leading-snug mb-1 ${expanded ? "" : "line-clamp-2"}`}>{card.title}</p>

        {/* Description */}
        {card.description && !expanded && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{card.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {card.category && (
              <span className="px-1.5 py-0.5 rounded-md bg-secondary font-medium">{card.category}</span>
            )}
            <span>{new Date(card.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              {/* Full thumbnail */}
              {card.thumbnail && (
                <img src={card.thumbnail} alt="" className="w-full aspect-video rounded-lg object-cover bg-secondary" loading="lazy" />
              )}

              {/* Full description */}
              {card.description && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-xs text-foreground/90 leading-relaxed">{card.description}</p>
                </div>
              )}

              {/* AI Summary */}
              {!aiSummary && (
                <button
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 ${summarizing ? "animate-spin" : ""}`} />
                  {summarizing ? "Analisando…" : "✨ Resumir com IA"}
                </button>
              )}

              {aiSummary && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Resumo IA</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{aiSummary.summary}</p>
                  {aiSummary.impact && (
                    <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      aiSummary.impact === "high" ? "bg-red-500/10 text-red-500" :
                      aiSummary.impact === "medium" ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-green-500/10 text-green-600"
                    }`}>
                      {aiSummary.impact === "high" ? "⚡ Alto impacto" : aiSummary.impact === "medium" ? "📊 Médio impacto" : "✅ Baixo impacto"}
                    </span>
                  )}
                </div>
              )}

              {/* Historical chart */}
              {historicalData && historicalData.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evolução 24h</p>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={platformColor} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={platformColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={5} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                        <Area type="monotone" dataKey="value" stroke={platformColor} strokeWidth={1.5} fill={`url(#grad-${card.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Metadata details */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                {metadata.volume && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">📊 {metadata.volume}</span>
                )}
                {metadata.change && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${metadata.changePositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                    {metadata.change}
                  </span>
                )}
                {metadata.sources && (metadata.sources as string[]).length > 0 && (
                  (metadata.sources as string[]).slice(0, 3).map((s: string) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">📰 {s}</span>
                  ))
                )}
              </div>

              {/* Source link */}
              {card.source_url && (
                <a
                  href={card.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver fonte original
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function BentoDashboard({ cards, loading, onRemove, onReorder }: BentoDashboardProps) {
  const [orderedCards, setOrderedCards] = useState<SavedCard[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync cards from parent — moved to useEffect to avoid setState during render
  useEffect(() => {
    if (cards.length > 0) {
      setOrderedCards(cards);
      setInitialized(true);
    }
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedCards((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      onReorder?.(newOrder);
      return newOrder;
    });
  };

  const handleShare = (card: SavedCard) => {
    navigator.clipboard.writeText(`${card.title} — ${card.platform}`);
    toast({ title: "🔗 Link copiado!", description: card.title.slice(0, 50) });
  };

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

  const displayCards = orderedCards.length > 0 ? orderedCards : cards;

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        ↕️ Arraste os cards para reorganizar • {displayCards.length} salvos
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayCards.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayCards.map((card) => (
              <SortableCard key={card.id} card={card} onRemove={onRemove} onShare={handleShare} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
