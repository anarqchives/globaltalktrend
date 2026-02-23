import { Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TrendCardProps } from "./TrendCard";

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "hsl(0, 72%, 51%)" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "hsl(210, 100%, 40%)" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
};

interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
}

const TimelineCard = ({
  platform,
  title,
  category,
  time,
  volume,
  change,
  changePositive,
  onClick,
}: TimelineCardProps) => {
  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const isPeak = change && parseInt(change.replace(/[^0-9]/g, "")) > 100;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})`);
    toast({ title: "Copiado!", description: title.slice(0, 60) });
  };

  return (
    <div
      className="timeline-card group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Platform avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
          style={{ background: `${pf.color}20`, color: pf.color }}
        >
          {pf.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Platform + time */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: pf.color }}>
              {platform}
            </span>
            <span className="text-xs text-muted-foreground">{time}</span>
            {isPeak && (
              <span className="peak-badge">🔥 PICO</span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1">
            {title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{category}</span>
            <span className="volume-badge text-xs py-0">{volume}</span>
            <span className={changePositive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
              {change}
            </span>
          </div>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TimelineCard;
