import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface BoardCommentsProps {
  cardId: string;
  currentUserId: string | null;
}

export default function BoardComments({ cardId, currentUserId }: BoardCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("board_comments")
      .select("id, content, created_at, user_id")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      // Fetch profiles for comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      setComments(
        data.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || undefined,
        }))
      );
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUserId) return;
    if (newComment.trim().length > 500) {
      toast({ title: "Comentário muito longo", description: "Máximo de 500 caracteres.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("board_comments").insert({
      card_id: cardId,
      user_id: currentUserId,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar o comentário.", variant: "destructive" });
    } else {
      setNewComment("");
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("board_comments").delete().eq("id", commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {expanded ? "Ocultar comentários" : `Comentários${comments.length > 0 ? ` (${comments.length})` : ""}`}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {comments.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 text-center py-2">
                      Nenhum comentário ainda. Seja o primeiro!
                    </p>
                  )}

                  {comments.map((c) => {
                    const initial = (c.profile?.display_name || "U").charAt(0).toUpperCase();
                    const isOwn = c.user_id === currentUserId;

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 group"
                      >
                        <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                          {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} />}
                          <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground">
                              {c.profile?.display_name || c.profile?.username || "Anônimo"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed break-words">{c.content}</p>
                        </div>
                        {isOwn && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </>
              )}

              {/* Comment input */}
              {currentUserId ? (
                <div className="flex gap-2 items-end pt-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                    placeholder="Escreva um comentário..."
                    rows={1}
                    className="flex-1 text-xs bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || !newComment.trim()}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60 text-center py-1">
                  Faça login para comentar.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
