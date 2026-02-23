import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface TrendCardProps {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  limited?: boolean;
  details?: string;
}

const TrendCard = ({
  icon,
  platform,
  title,
  category,
  time,
  volume,
  change,
  changePositive,
  sparkData,
  limited,
  details,
}: TrendCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const chartData = sparkData.map((v, i) => ({ x: i, y: v }));

  return (
    <div className="trend-card-base" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center bg-secondary text-base ${
            limited ? "opacity-50 grayscale-[50%]" : ""
          }`}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{platform}</span>
        {limited && <span className="warning-badge">⚠ acesso limitado</span>}
      </div>

      <h3 className="text-base font-semibold mb-1">{title}</h3>

      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
        <span>{category}</span>
        <span>{time}</span>
      </div>

      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="volume-badge">{volume}</span>
        <span className={changePositive ? "text-green-600" : "text-red-500"}>
          {change}
        </span>
      </div>

      <div className="h-10 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`grad-${title.slice(0, 5)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 100%, 40%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(210, 100%, 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke="hsl(210, 100%, 40%)"
              strokeWidth={1.5}
              fill={`url(#grad-${title.slice(0, 5)})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {expanded && details && (
        <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground animate-in fade-in duration-200">
          {details}
        </div>
      )}
    </div>
  );
};

export default TrendCard;
