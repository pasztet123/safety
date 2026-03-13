export const getTodayDateString = () => new Date().toISOString().split('T')[0]

export const isValidDateInput = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export const getDeclaredCompletionDate = (action) => action?.declared_completion_date || action?.completion_date || null

export const buildCompletionStatusFields = ({
  currentStatus,
  nextStatus,
  currentCompletionDate,
  currentDeclaredCompletionDate,
  declaredCompletionDate,
}) => {
  if (nextStatus !== 'completed') {
    return {
      completion_date: null,
      declared_completion_date: null,
    }
  }

  return {
    completion_date: currentStatus === 'completed' && currentCompletionDate
      ? currentCompletionDate
      : getTodayDateString(),
    declared_completion_date: declaredCompletionDate || currentDeclaredCompletionDate || getTodayDateString(),
  }
}

export const promptForDeclaredCompletionDate = (initialValue = getTodayDateString()) => {
  const response = window.prompt(
    'Enter the declared completion date (YYYY-MM-DD). Use the actual work date, not the logging date.',
    initialValue,
  )

  if (response === null) return null

  const trimmedValue = response.trim()
  if (!isValidDateInput(trimmedValue)) {
    window.alert('Enter a valid date in YYYY-MM-DD format.')
    return null
  }

  return trimmedValue
}