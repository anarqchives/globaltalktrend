import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SavedCard } from "@/hooks/use-saved-cards";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookmarkMinus, ExternalLink, Calendar, MapPin, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SavedCollectionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: SavedCard[];
  removeCard: (id: string) => void;
}

export function SavedCollectionsSheet({ open, onOpenChange, cards, removeCard }: SavedCollectionsSheetProps) {
  const { lang } = useLanguage();

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/40 font-inter">
        <SheetHeader className="p-6 border-b border-border/40 text-left">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <BookmarkMinus className="w-5 h-5 text-primary" />
            {lang === "en" ? "Saved Collections" : "Coleções Salvas"}
          </SheetTitle>
          <SheetDescription>
            {lang === "en" ? "Your bookmarked trends and insights." : "Suas tendências e insights salvos."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 p-6">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <BookmarkMinus className="w-12 h-12 mb-4 opacity-20" />
              <p>{lang === "en" ? "No saved items yet." : "Nenhum item salvo ainda."}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => (
                <div key={card.id} className="relative group bg-card border border-border/50 p-4 rounded-xl hover:border-primary/50 transition-colors shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                     <h4 className="font-semibold text-sm pr-8 leading-tight">{card.title}</h4>
                     <button onClick={() => removeCard(card.id)} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors">
                       <BookmarkMinus className="w-4 h-4" />
                     </button>
                   </div>
                   {card.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{card.description}</p>}
                   <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-3">
                     <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {formatDate(card.created_at)}</span>
                     {card.country_code && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {card.country_code}</span>}
                     {card.platform && <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {card.platform}</span>}
                     {card.source_url && (
                       <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline ml-auto">
                         Link <ExternalLink className="w-3 h-3" />
                       </a>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
