import { useQuery } from '@tanstack/react-query'

export interface TrendSnapshot {
  id:                       string
  title:                    string
  llm_stage:                'new' | 'growing' | 'peak' | 'declining' | 'dead'
  velocity_score:           number
  unique_sources:           number
  llm_context_generated_at: string | null
  captured_at:              string
}

export interface TrendContext {
  generated_context: string
  stage:             string
  volume_at_cache:   number
  created_at:        string
  model_used:        string | null
}

export interface TrendContextResponse {
  trend:   TrendSnapshot
  context: TrendContext | null
}

async function fetchTrendContext(trendId: string): Promise<TrendContextResponse> {
  const res = await fetch(`/api/get-trend-context?trend_id=${trendId}`)
  if (res.status === 404) throw new Error('TREND_NOT_FOUND')
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  return res.json()
}

export function useTrendContext(trendId: string | undefined) {
  return useQuery<TrendContextResponse, Error>({
    queryKey:   ['trend-context', trendId],
    queryFn:    () => fetchTrendContext(trendId!),
    enabled:    !!trendId,
    staleTime:  5 * 60 * 1000,
    gcTime:     15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message === 'TREND_NOT_FOUND') return false
      return failureCount < 2
    },
  })
}
