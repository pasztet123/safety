import { useEffect, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500]
export const DEFAULT_PAGE_SIZE = 25
export const EXPORT_CHUNK_SIZE_OPTIONS = [25, 50, 100, 200, 300]
export const DEFAULT_EXPORT_CHUNK_SIZE = 100

export const normalizeListText = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

export const getPageRangeLabel = (page, pageSize, total) => {
  if (!total) return '0 results'
  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, total)
  return `${start}-${end} of ${total}`
}

export const getStoredPageSize = (storageKey, fallback = DEFAULT_PAGE_SIZE) => {
  if (typeof window === 'undefined') return fallback
  const storedValue = Number(window.localStorage.getItem(storageKey))
  return PAGE_SIZE_OPTIONS.includes(storedValue) ? storedValue : fallback
}

export const getStoredOption = (storageKey, allowedValues, fallback) => {
  if (typeof window === 'undefined') return fallback
  const storedValue = Number(window.localStorage.getItem(storageKey))
  return allowedValues.includes(storedValue) ? storedValue : fallback
}

export const summarizeList = (items, limit = 3) => {
  const normalizedItems = (items || []).filter(Boolean)
  if (normalizedItems.length <= limit) return normalizedItems.join(', ')
  return `${normalizedItems.slice(0, limit).join(', ')} +${normalizedItems.length - limit}`
}

export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

export const compareTextValues = (left, right, direction = 'asc') => {
  const result = String(left || '').localeCompare(String(right || ''), 'en', { sensitivity: 'base' })
  return direction === 'desc' ? -result : result
}

export const compareNumberValues = (left, right, direction = 'desc') => {
  const safeLeft = Number.isFinite(left) ? left : -Infinity
  const safeRight = Number.isFinite(right) ? right : -Infinity
  return direction === 'asc' ? safeLeft - safeRight : safeRight - safeLeft
}