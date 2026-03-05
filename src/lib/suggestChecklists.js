/**
 * Score a single checklist against a safety topic.
 *
 * Scoring formula (0–100):
 *   - Trade overlap:  (# shared trades / max(topic trades, checklist trades)) × 80
 *   - Category bonus: +20 if category matches (case-insensitive substring both ways)
 *
 * Returns 0 when there is no trade overlap regardless of category match.
 */
export function scoreChecklist(topic, checklist) {
  const topicTrades = (topic.trades || []).map(t => t.toLowerCase())
  const checklistTrades = (checklist.trades || []).map(t => t.toLowerCase())

  // No trades on either side → 0, no suggestion
  if (topicTrades.length === 0 || checklistTrades.length === 0) return 0

  const shared = topicTrades.filter(t => checklistTrades.includes(t)).length
  if (shared === 0) return 0

  const maxLen = Math.max(topicTrades.length, checklistTrades.length)
  const tradeScore = (shared / maxLen) * 80

  // Category bonus – partial or full case-insensitive match
  let categoryBonus = 0
  if (topic.category && checklist.category) {
    const a = topic.category.toLowerCase()
    const b = checklist.category.toLowerCase()
    if (a.includes(b) || b.includes(a)) {
      categoryBonus = 20
    }
  }

  return Math.round(tradeScore + categoryBonus)
}

/**
 * Return the top N checklists most relevant to a topic, sorted by score descending.
 * Only includes checklists with score > 0.
 *
 * @param {object} topic            - safety_topics row with .trades[] and .category
 * @param {object[]} allChecklists  - array of checklist rows with .trades[] and .category
 * @param {number} limit            - max results (default 5)
 * @returns {{ checklist: object, score: number }[]}
 */
export function getSuggestedChecklists(topic, allChecklists, limit = 5) {
  if (!topic) return []

  return allChecklists
    .map(c => ({ checklist: c, score: scoreChecklist(topic, c) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Badge label for a scored checklist row in the meeting form tier-2 section.
 * score >= 60 with category bonus → "Trade + category"
 * score > 0 → "Trade match"
 */
export function tradeBadgeLabel(score) {
  if (score >= 60) return 'Trade + category'
  return 'Trade match'
}
