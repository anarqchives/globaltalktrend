const TrendCardSkeleton = () => (
  <div className="trend-card-base animate-pulse">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-lg bg-secondary" />
      <div className="h-4 w-16 rounded bg-secondary" />
    </div>
    <div className="h-5 w-3/4 rounded bg-secondary mb-2" />
    <div className="h-3 w-1/2 rounded bg-secondary mb-3" />
    <div className="flex gap-2 mb-3">
      <div className="h-6 w-20 rounded-full bg-secondary" />
      <div className="h-6 w-14 rounded-full bg-secondary" />
    </div>
    <div className="h-10 w-full rounded bg-secondary" />
  </div>
);

export default TrendCardSkeleton;
