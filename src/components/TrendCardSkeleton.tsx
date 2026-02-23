const TrendCardSkeleton = () => (
  <div className="timeline-card animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded bg-secondary" />
        <div className="h-4 w-3/4 rounded bg-secondary" />
        <div className="flex gap-2">
          <div className="h-3 w-16 rounded-full bg-secondary" />
          <div className="h-3 w-10 rounded-full bg-secondary" />
        </div>
      </div>
    </div>
  </div>
);

export default TrendCardSkeleton;
