import { supabase } from './supabase'

/**
 * Fetch all known trade names from the canonical trades table.
 * Returns a sorted string array.
 */
export async function fetchTrades() {
  const { data, error } = await supabase
    .from('trades')
    .select('name')
    .order('name')

  if (error) {
    console.error('fetchTrades error:', error)
    return []
  }

  return (data || []).map(r => r.name)
}

/**
 * Ensure a trade name exists in the canonical trades table.
 * Safe to call with an already-existing name (ON CONFLICT DO NOTHING).
 * Returns the name on success, null on error.
 */
export async function ensureTrade(name) {
  const trimmed = name?.trim()
  if (!trimmed) return null

  const { error } = await supabase
    .from('trades')
    .upsert({ name: trimmed }, { onConflict: 'name', ignoreDuplicates: true })

  if (error) {
    console.error('ensureTrade error:', error)
    return null
  }

  return trimmed
}
