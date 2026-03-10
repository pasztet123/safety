import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const DEFAULT_PAGE_SIZE = 1000
const DEFAULT_ID_BATCH_SIZE = 500

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',   // 'pkce' requires LockManager → concurrent getUser() calls timeout
    storageKey: 'sb-auth-token',
    storage: window.localStorage
  }
})

const uniqueValues = (items) => [...new Set((items || []).filter(Boolean))]

export const fetchAllPages = async (queryFactory, pageSize = DEFAULT_PAGE_SIZE) => {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)

    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

export const fetchByIdsInBatches = async ({
  table,
  select,
  ids,
  idColumn = 'id',
  batchSize = DEFAULT_ID_BATCH_SIZE,
  buildQuery,
}) => {
  const uniqueIds = uniqueValues(ids)
  if (uniqueIds.length === 0) return []

  const rows = []

  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    const batchIds = uniqueIds.slice(index, index + batchSize)
    let query = supabase
      .from(table)
      .select(select)
      .in(idColumn, batchIds)

    if (buildQuery) {
      query = buildQuery(query, batchIds)
    }

    const { data, error } = await query
    if (error) throw error
    if (data?.length) rows.push(...data)
  }

  return rows
}
