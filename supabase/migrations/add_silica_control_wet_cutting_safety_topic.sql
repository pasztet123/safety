-- Add Silica Control & Wet Cutting Procedures safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Silica Control & Wet Cutting Procedures',
  'Health & Industrial Hygiene',
  'OSHA 29 CFR 1926.1153',
  'Wet cutting is the primary engineering control for silica dust generation during masonry, concrete, and stone work. When performed correctly, it suppresses respirable dust at the source before it becomes airborne. When performed incorrectly — wrong water pressure, interrupted flow, or improper setup — it provides a false sense of control while exposing workers to dangerous silica levels. This topic covers the complete wet cutting procedure from setup through cleanup.

• Pre-Task Evaluation
Every task that involves cutting, grinding, or drilling masonry, concrete, or stone must be evaluated for silica exposure before work begins. The exposure control plan must be reviewed with the crew — not just the supervisor. The cutting method must be selected specifically to minimize dust generation. Wet cutting must be confirmed as appropriate for the material type before setup begins; some specialty materials or coatings may not be compatible with wet cutting and require alternative controls.

• Water Delivery System Setup
The water delivery system must be fully connected and tested before any cut is made. Continuous water flow must be verified before the blade makes contact with the material — a single dry pass generates a burst of silica dust. Water must be directed precisely at the point of contact between the blade and the material; water aimed at the blade body rather than the cut zone does not adequately suppress dust. Adequate water pressure must be maintained throughout the entire operation — intermittent flow is not sufficient. A backup water supply must be available on site in case the primary supply fails.

• When Wet Cutting Is Not Feasible
Dry cutting is prohibited unless specifically authorized with documented engineering controls in place. When wet cutting is not feasible for a specific task, a HEPA-filtered vacuum system must be used with a dust shroud fitted directly to the tool. The dust shroud must be installed and properly fitted to the tool before cutting begins — gaps in the shroud allow dust to escape directly into the breathing zone. The vacuum filter must be inspected and confirmed as rated for silica dust capture; standard shop vacuum filters do not capture respirable silica particles.

• Respiratory Protection
The respirator must be selected based on the specific exposure level expected for the task and the engineering controls in use. Medical clearance must be verified before any worker uses a tight-fitting respirator. Fit testing must be current and documented. A seal check must be performed before each use. Respiratory protection must be worn for the full duration of any exposure period — removing the respirator during active cutting, even briefly, negates its protection.

• Additional PPE
Eye protection must be worn during all cutting operations. Hearing protection must be worn when noise levels from equipment require it. Gloves must be worn to reduce both vibration-induced hand-arm injury from prolonged tool use and laceration risk from cut material edges.

• Area and Exposure Control
The cutting area must be isolated from non-essential personnel. Downwind exposure must be minimized where possible — position the work so that wind carries any residual dust away from occupied areas, not toward them. Where dust migration cannot be controlled by positioning, barriers must be used.

• Slurry and Housekeeping Management
Wet cutting generates slurry — a mixture of water and silica-laden fine particles that is just as hazardous as dry dust once it dries. Slurry must be managed continuously to prevent slip hazards on the work surface. Dried slurry produces airborne silica when disturbed. Slurry must be disposed of in accordance with applicable environmental requirements — it must not be washed into storm drains or waterways. All housekeeping in the work area must be performed using wet methods or a HEPA vacuum. Dry sweeping is strictly prohibited. Compressed air must never be used to clean dust or slurry from surfaces, tools, or clothing — it instantly creates a high-concentration airborne silica event.

• Equipment Cleaning
Cutting equipment must be cleaned after use in a manner that does not create secondary dust release. Wet wipe-down or HEPA vacuum cleaning is required; shaking, blowing, or banging equipment to dislodge dust is prohibited.

• Training, Monitoring, and Stop-Work Authority
All workers performing or assisting with silica-generating tasks must be trained on silica hazards and the specific controls in use, and that training must be documented. Air monitoring must be conducted when required by the exposure control plan. Stop-work authority must be exercised immediately if dust control measures fail — visible dust during cutting, loss of water pressure, or a detached shroud are all control failures that require the work to stop until the issue is corrected.

Remember: Wet cutting done correctly is highly effective. But it only protects workers if the water is flowing, directed correctly, and maintained throughout the cut. Never assume the system is working — verify it before every cut.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Silica Control & Wet Cutting Procedures'
);
