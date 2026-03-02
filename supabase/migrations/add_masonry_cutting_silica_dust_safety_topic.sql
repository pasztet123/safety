-- Add Masonry Cutting & Silica Dust Exposure safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Masonry Cutting & Silica Dust Exposure (Respirable Crystalline Silica Hazard)',
  'Health & Industrial Hygiene',
  'OSHA 29 CFR 1926.1153',
  'Respirable crystalline silica is generated whenever masonry, concrete, brick, or stone is cut, ground, or drilled. Silica particles are invisible to the naked eye and cannot be smelled — workers are unaware of exposure in real time. Even brief, repeated exposures can cause silicosis, a progressive and incurable lung disease. OSHA''s silica standard for construction imposes strict engineering controls, exposure monitoring, and medical surveillance requirements that must be understood and applied on every job.

• Exposure Assessment and Planning
Every task involving masonry cutting must be evaluated for silica exposure risk before work begins. The exposure control plan required under the OSHA silica standard must be reviewed with the crew. The cutting method must be selected to minimize dust generation — wet cutting and local exhaust ventilation (LEV) are preferred engineering controls that reduce exposure at the source. When a Table 1-listed control method is used correctly, additional air monitoring is not required; however, if controls deviate from Table 1 specifications, monitoring may be required by policy or regulation.

• Wet Cutting and Ventilation Controls
Wet cutting must be used wherever feasible. The water supply must be connected, flowing, and verified to be functioning before any cut is made — a dry blade is an uncontrolled dust source. Local exhaust ventilation must be used when wet cutting is not practicable. Dry cutting must be avoided unless fully controlled engineering measures are in place and documented as part of the exposure control plan.

• Respiratory Protection
The appropriate respirator must be selected based on the anticipated exposure level relative to the permissible exposure limit (PEL) of 50 µg/m³ and the action level of 25 µg/m³. Medical clearance must be verified before any worker uses a tight-fitting respirator — respirators increase breathing resistance and are medically contraindicated for some conditions. Fit testing must be current and documented. A positive or negative pressure seal check must be performed before each use. The correct cartridge or filter must be installed for silica dust — P100 filters are the minimum for particulate protection. The respirator must be worn for the entire duration of the exposure period, not removed during active dust generation.

• Additional PPE
Workers must be clean-shaven where a tight-fitting respirator is required — facial hair breaks the seal and renders the respirator ineffective. Eye protection must be worn during all cutting operations. Hearing protection must be used when noise levels require it, as masonry cutting equipment routinely exceeds 85 dB. Gloves must be worn to protect against vibration-induced injury from prolonged tool use and laceration hazards from cut materials.

• Equipment Inspection and Electrical Safety
Cutting equipment must be inspected before each use. The blade must be appropriate for the material being cut and the rated RPM of the tool must not be exceeded. The guard must be in place and functioning properly — guards prevent fragment ejection and direct the exhaust stream away from the operator. Extension cords must be rated for the load and protected from damage. GFCI protection must be verified for all temporary power connections, especially where wet cutting introduces water near electrical equipment.

• Area Isolation and Dust Migration Control
The cutting area must be isolated from other workers to prevent bystander exposure. If dust migration to adjacent areas is possible, barriers must be used to contain the work zone. Signage must alert non-involved workers that silica-generating work is in progress.

• Housekeeping
Housekeeping in contaminated areas must be performed using wet methods or a HEPA-filtered vacuum. Dry sweeping is strictly prohibited — it re-suspends settled silica dust and creates a second exposure event for everyone in the area. Compressed air must never be used to clean dust from surfaces, clothing, or equipment; this generates high concentrations of airborne silica instantly. Waste material and slurry from wet cutting must be handled to prevent secondary dust exposure during disposal.

• Training, Monitoring, and Stop-Work Authority
Workers exposed to silica above the action level must receive training on silica hazards and that training must be documented. Air monitoring must be conducted when required by the exposure control plan or when engineering controls cannot be confirmed as adequate. Stop-work authority must be exercised without hesitation if dust control measures fail — visible dust clouds during cutting are a sign of control failure and work must stop until the issue is corrected.

Remember: Silicosis has no cure. There is no treatment that reverses lung damage once it occurs. The only protection is preventing exposure in the first place. Engineering controls, proper respirator use, and disciplined housekeeping are not optional — they are the difference between a healthy worker and a worker on oxygen in their 40s.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Masonry Cutting & Silica Dust Exposure (Respirable Crystalline Silica Hazard)'
);
