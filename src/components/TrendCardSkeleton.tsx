const TrendCardSkeleton = () => (
  <div className="timeline-card animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted/60" />
        </div>
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-3.5 w-3/5 rounded bg-muted/70" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 w-14 rounded-full bg-muted" />
          <div className="h-3 w-10 rounded-full bg-muted/60" />
          <div className="h-3 w-12 rounded-full bg-muted/60" />
        </div>
      </div>
    </div>
  </div>
);

export default TrendCardSkeleton;
