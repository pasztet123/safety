-- Add Vinyl Siding Installation Hazards safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Vinyl Siding Installation Hazards (Sharp Edges & Slide Risk)',
  'Exterior Work & Siding',
  'OSHA 29 CFR 1926.502',
  'Vinyl siding installation combines fall exposure at height, sharp edge hazards from freshly cut panels, and the physical demands of working with long, flexible material in variable wind conditions. Although often perceived as low-risk finish work, injuries from falls, lacerations, and nail gun misuse are consistently reported in this trade.

• Fall Protection and Access Setup
The work area must be evaluated for fall exposure before installation begins. Fall protection must be installed wherever required. Ladders must be inspected and secured before climbing — both feet must be on stable ground and the ladder must be tied off or held when working at height. Scaffold must be level and fully decked before any worker steps onto it. Pump jacks must be inspected and properly braced if used; pump jack scaffold is among the most commonly misused access systems in residential siding work. Guardrails must be installed where required. Workers must maintain three points of contact when climbing ladders at all times.

• Material Staging and Wind Control
Vinyl panels must be staged away from roof edges and open edges of scaffold platforms. Panels must be secured to prevent sliding in wind — vinyl is lightweight and large panels act as sails in moderate winds. Wind conditions must be evaluated before lifting long panels, particularly at height where gusts are stronger and more unpredictable. Two-person handling must be used for long or flexible panel sections that cannot be safely controlled by one worker.

• Sharp Edge and Cutting Hazards
Freshly cut vinyl edges are sharp and can cause lacerations without warning. All cut edges must be identified and handled carefully throughout installation. Cut-resistant gloves must be worn when handling cut panels. Safety glasses must be worn during all cutting operations. Utility knives must be inspected before use — dull blades require excessive force and are more likely to slip. Blades must be retracted immediately when not actively cutting. Hands must be kept clear of the cutting path at all times. Scrap pieces must be removed promptly from ladders, scaffold, and roof surfaces — loose vinyl on an elevated surface is a slip and trip hazard.

• Fastening and Installation
The nail gun must be inspected before use. Proper fasteners must be used per manufacturer specifications — incorrect fasteners cause panels to fail in wind. Nails must not be over-driven; vinyl siding requires a loose fastening that allows thermal expansion. Panels must be installed with the required expansion clearance at all laps and trim points — panels installed without expansion clearance buckle, separate, and can become projectiles in extreme heat or cold.

• Overreaching and Electrical Safety
Workers must avoid overreaching from ladders or scaffold platforms — repositioning the ladder or scaffold takes less time than recovering from a fall. Extension cords must be managed and routed to prevent trip hazards on scaffold platforms and around ladder bases. GFCI protection must be verified for all exterior temporary power connections.

• Ground Control and Housekeeping
The ground area must be barricaded below any elevated work to protect workers and bystanders from falling panels, fasteners, and tools. Debris — scrap vinyl, cut-offs, packaging, and fasteners — must be collected daily to prevent slip hazards at ladder bases, around scaffold feet, and on the ground work area.

• Stop-Work Authority
Stop-work authority must be reinforced with the entire crew. If ladder stability is compromised — unlevel ground, soft soil, ice, or a damaged ladder — work must stop until the access is corrected. If scaffold stability is in question, the scaffold must be re-inspected before use resumes. No schedule pressure justifies working from an unsafe access platform.

Remember: Siding work is repetitive and physically demanding, which leads to fatigue and complacency. Most injuries in this trade happen when workers stop thinking about what they are doing. Stay deliberate, control every cut, and never compromise your footing for the sake of one more panel.',
  'medium'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Vinyl Siding Installation Hazards (Sharp Edges & Slide Risk)'
);
