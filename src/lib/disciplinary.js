export const SAFETY_VIOLATION_OPTIONS = [
  'PPE Violation',
  'Fall Protection Violation',
  'Ladder Safety Violation',
  'Scaffold Safety Violation',
  'Unsafe Use of Tools or Equipment',
  'Electrical Safety Violation',
  'Hazardous Material Handling Violation',
  'Failure to Follow Safety Procedures',
  'Improper Material Handling / Lifting',
  'Housekeeping Violation',
  'Vehical or Equipment Safety Violation',
  'Bypassing Safety Devices',
  'Unauthorized Work of Access',
  'Failure to Report Hazard or Incident',
  'Repeated Safety Violations',
]

export const DISCIPLINARY_ACTION_TYPES = [
  'Verbal warning',
  'Retraining',
  'Written warning',
  'Suspension',
  'Termination',
]

export const createEmptyDisciplinaryAction = () => ({
  recipient_person_id: '',
  responsible_leader_id: '',
  action_type: '',
  action_date: new Date().toISOString().split('T')[0],
  action_time: new Date().toTimeString().slice(0, 5),
  action_notes: '',
})