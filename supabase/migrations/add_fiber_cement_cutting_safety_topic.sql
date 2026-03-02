-- Add Fiber Cement Cutting Safety (Silica Dust Hazard) topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Fiber Cement Cutting Safety (Silica Dust Hazard)',
  'Health & Industrial Hygiene',
  'OSHA 29 CFR 1926.1153',
  'Fiber cement products — siding, trim, backer board, and panels — contain Portland cement and silica as primary components. Cutting, scoring, or breaking fiber cement generates respirable crystalline silica dust that is invisible, odorless, and capable of causing silicosis with repeated exposure. Unlike masonry cutting, fiber cement work often occurs in residential settings where the hazard is underestimated. The controls required are the same regardless of the setting.

• Exposure Assessment and Planning
Every fiber cement cutting task must be evaluated for respirable crystalline silica exposure before work begins. The exposure control plan must be reviewed with the crew before the first cut. Cutting must be performed outdoors whenever possible — outdoor work allows natural air movement to disperse any residual dust and reduces the risk of accumulation in an enclosed space. Indoor or enclosed cutting requires more stringent controls.

• Engineering Controls: Wet Cutting
Wet cutting must be used when feasible. Continuous water flow must be verified before the blade contacts the material — a single dry pass generates silica dust. When wet cutting is used, water must be directed at the blade-material contact point throughout the cut.

• Engineering Controls: Dust-Collecting Saw
When dry cutting is required, a dust-collecting saw equipped with a HEPA-filtered vacuum is the required engineering control. The dust shroud must be properly installed and fully sealed to the tool — gaps allow dust to escape directly into the worker''s breathing zone. The vacuum filter must be inspected before use and confirmed as rated for silica dust capture; standard shop vacuum filters allow respirable particles to pass through and recirculate into the air.

• Cutting Station Setup
The cutting station must be positioned downwind from the rest of the crew so that any residual dust is carried away from occupied areas. The cutting area must be isolated from workers not directly involved in the task. Dry sweeping is strictly prohibited in any area where fiber cement has been cut — swept dust becomes airborne silica. Compressed air must never be used to clean dust from surfaces, tools, clothing, or the saw — it creates an immediate high-concentration exposure event.

• Respiratory Protection
The respirator must be selected based on the anticipated exposure level for the specific cutting method and controls in use. Medical clearance must be verified before any worker uses a tight-fitting respirator. Fit testing must be current and documented. A seal check must be performed before each use. The respirator must be worn for the full duration of cutting operations and must not be removed while in the cutting area.

• Additional PPE
Eye protection must be worn during all cutting operations. Hearing protection must be worn when noise levels require it — circular saws and fiber cement generate significant noise. Cut-resistant gloves must be worn when handling fiber cement panels, which have sharp edges and abrasive surfaces. Long sleeves reduce skin exposure to dust and abrasion from the material surface.

• Saw and Electrical Safety
The blade must be appropriate for fiber cement — standard wood blades dull rapidly and generate more dust; blades specifically rated for fiber cement produce cleaner cuts with less particulate. The blade guard must be installed and functioning at all times. The saw must be inspected before use. Extension cords must be rated for the load and protected from damage. GFCI protection must be verified for all temporary power connections.

• Housekeeping and Waste Management
A HEPA vacuum must be used for all housekeeping in the cutting area. Scrap material must be handled carefully to minimize dust generation — avoid breaking pieces by hand when cutting is a cleaner option. Wet debris and slurry from wet cutting must be managed to prevent slip hazards and must not be left to dry on the work surface, as dried slurry becomes an airborne dust source when disturbed. All waste must be disposed of in accordance with applicable environmental requirements.

• Training and Stop-Work Authority
All workers performing or assisting with fiber cement cutting must be trained on silica hazards and the specific controls in use, and that training must be documented. Stop-work authority must be exercised without hesitation if dust control measures fail — visible dust during cutting, a detached shroud, loss of water flow, or a clogged vacuum filter are all control failures that require the work to stop until the issue is corrected.

Remember: Fiber cement looks like a benign building material. It is not. The silica it contains causes the same irreversible lung disease as cutting concrete or masonry. Apply the same discipline to every cut, every day.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Fiber Cement Cutting Safety (Silica Dust Hazard)'
);
