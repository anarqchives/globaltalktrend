import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface AnalyticalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main metric value (big number) */
  metric?: string | number;
  /** Label above metric */
  label?: string;
  /** Contextual explanation below metric */
  context?: string;
  /** Tooltip info for the card */
  tooltip?: string;
  /** Icon element for the header */
  icon?: React.ReactNode;
  /** Optional accent color variant */
  accent?: "default" | "critical" | "positive" | "warning" | "info";
  /** Chart or visual slot */
  chart?: React.ReactNode;
  /** Footer slot */
  footer?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
}

const accentBorderMap: Record<string, string> = {
  default: "border-border/50",
  critical: "border-critical/20",
  positive: "border-positive/20",
  warning: "border-moderate/20",
  info: "border-primary/20",
};

const AnalyticalCard = React.forwardRef<HTMLDivElement, AnalyticalCardProps>(
  ({ className, metric, label, context, tooltip, icon, accent = "default", chart, footer, loading, children, ...props }, ref) => {
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn("analytical-card animate-pulse", className)}
          {...props}
        >
          <div className="analytical-card-header">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-7 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="analytical-card-body">
            <div className="h-16 bg-muted rounded" />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "analytical-card",
          accentBorderMap[accent],
          className
        )}
        {...props}
      >
        {(label || metric || icon || tooltip) && (
          <div className="analytical-card-header">
            <div className="flex-1 min-w-0">
              {label && (
                <div className="analytical-card-label flex items-center gap-1.5">
                  {icon && <span className="text-muted-foreground">{icon}</span>}
                  {label}
                  {tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-caption">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
              {metric !== undefined && (
                <div className="analytical-card-metric mt-1">
                  {metric}
                </div>
              )}
              {context && (
                <p className="analytical-card-context">{context}</p>
              )}
            </div>
          </div>
        )}

        {chart && (
          <div className="analytical-card-body">
            {chart}
          </div>
        )}

        {children && (
          <div className="analytical-card-body">
            {children}
          </div>
        )}

        {footer && (
          <div className="px-5 pb-4 pt-0 border-t border-border/30 mt-1">
            <div className="pt-3 text-caption text-muted-foreground">
              {footer}
            </div>
          </div>
        )}
      </div>
    );
  }
);
AnalyticalCard.displayName = "AnalyticalCard";

export { AnalyticalCard };
export type { AnalyticalCardProps };
