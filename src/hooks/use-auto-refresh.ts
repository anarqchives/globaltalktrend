/**
 * Auto-refresh / polling logic — extracted from Index.tsx
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useUserActivity } from "@/hooks/use-user-activity";

export function useAutoRefresh(
  fetchTrends: () => Promise<void>,
  expandedCardIndex: number | null
) {
  const [refreshing, setRefreshing] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const isActive = useUserActivity(30000);
  const timeSinceLastFetchRef = useRef(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrends();
    setRefreshing(false);
    timeSinceLastFetchRef.current = 0;
    setUpdatePending(false);
  }, [fetchTrends]);

  useEffect(() => {
    const interval = setInterval(() => {
      timeSinceLastFetchRef.current += 10;
      if (timeSinceLastFetchRef.current >= 90) {
        if (!isActive && expandedCardIndex === null) {
          fetchTrends().then(() => { timeSinceLastFetchRef.current = 0; setUpdatePending(false); });
        } else if (!updatePending) setUpdatePending(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isActive, expandedCardIndex, fetchTrends, updatePending]);

  return { refreshing, updatePending, handleRefresh };
}
