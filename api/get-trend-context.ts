import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { trend_id } = req.query
  if (!trend_id || typeof trend_id !== 'string') {
    return res.status(400).json({ error: 'trend_id is required' })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(trend_id)) return res.status(400).json({ error: 'Invalid trend_id' })

  try {
    const [snapshotResult, contextResult] = await Promise.all([
      supabase
        .from('trend_snapshots')
        .select('id, title, llm_stage, velocity_score, unique_sources, llm_context_generated_at, captured_at')
        .eq('id', trend_id)
        .single(),
      supabase
        .from('trend_context_cache')
        .select('generated_context, stage, volume_at_cache, created_at, model_used')
        .eq('trend_title_hash', trend_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (snapshotResult.error) return res.status(404).json({ error: 'Trend not found' })

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=120')
    res.setHeader('X-Cache-Status', contextResult.data ? 'HIT' : 'MISS')

    return res.status(200).json({
      trend:   snapshotResult.data,
      context: contextResult.data ?? null,
    })
  } catch (err) {
    console.error('[get-trend-context]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
