/**
 * Canonical safety topic / checklist category list.
 * These are "hazard type" categories — orthogonal to trades.
 * Topics have both a category (hazard type) AND trades[] (industries).
 *
 * Update this list here and it will be reflected everywhere in the UI:
 * SafetyTopics, TopicPicker, ChecklistForm, AdminPanel.
 */
export const SAFETY_CATEGORIES = [
  'General / Jobsite Safety',
  'Fall & Height Hazards',
  'Weather & Environmental',
  'Fire & Hot Work',
  'Electrical Hazards',
  'Chemical & Biological Hazards',
  'Tools & Equipment Safety',
  'Material Handling & Struck-By',
  'Structural & Stability',
  'Medical & Emergency Response',
  'Behavioral & Substance Abuse',
  'Regulatory & Compliance',
]

export const CATEGORY_DESCRIPTIONS = {
  'General / Jobsite Safety':        'PPE, housekeeping, site orientation, general rules',
  'Fall & Height Hazards':           'Roofs, ladders, scaffolding, leading edges, steep slopes',
  'Weather & Environmental':         'Wind, heat, cold, ice, snow, lightning',
  'Fire & Hot Work':                 'Torches, welding, fire watch, hot surfaces',
  'Electrical Hazards':              'Power lines, LOTO, grounding, electric tools',
  'Chemical & Biological Hazards':   'Silica, adhesives, solvents, mold, insects',
  'Tools & Equipment Safety':        'Nail guns, saws, hand tools, heavy machinery',
  'Material Handling & Struck-By':   'Lifting, rigging, glass, stone, falling objects',
  'Structural & Stability':          'Load capacity, formwork, temporary supports, collapse risk',
  'Medical & Emergency Response':    'First aid, heat stroke, injuries, evacuation procedures',
  'Behavioral & Substance Abuse':    'Alcohol, drugs, fatigue, impairment',
  'Regulatory & Compliance':         'OSHA, recordkeeping, incident reporting, training requirements',
}
