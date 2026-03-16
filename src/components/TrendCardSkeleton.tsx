import { motion } from "framer-motion";

const shimmerClass =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent";

const TrendCardSkeleton = ({ index = 0 }: { index?: number }) => (
  <motion.div
    className="timeline-card"
    style={{ minHeight: 140 }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.08 }}
  >
    <div className="flex items-start gap-3 w-full">
      <div className={`w-8 h-8 rounded-full bg-muted ${shimmerClass} flex-shrink-0`} />
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-16 rounded bg-muted ${shimmerClass}`} />
          <div className={`h-3 w-12 rounded bg-muted/60 ${shimmerClass}`} />
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className={`h-4 w-4/5 rounded bg-muted ${shimmerClass}`} />
            <div className={`h-3.5 w-3/5 rounded bg-muted/70 ${shimmerClass}`} />
          </div>
          <div className={`w-16 h-12 rounded-lg bg-muted ${shimmerClass} flex-shrink-0`} />
        </div>
        <div className="flex gap-2 pt-1 w-full">
          <div className={`h-3 w-14 rounded-full bg-muted ${shimmerClass}`} />
          <div className={`h-3 w-10 rounded-full bg-muted/60 ${shimmerClass}`} />
          <div className={`h-3 w-12 rounded-full bg-muted/60 ${shimmerClass}`} />
        </div>
      </div>
    </div>
  </motion.div>
);

export default TrendCardSkeleton;
