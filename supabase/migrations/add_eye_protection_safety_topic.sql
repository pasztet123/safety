-- Add Eye Protection Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Eye Protection',
  'General / Jobsite Safety',
  'OSHA 29 CFR 1926.102',
  'Eye injuries are among the most common and preventable injuries in construction. Flying debris, nail ricochets, chemical splatter, dust, and UV exposure from welding cause thousands of permanent vision injuries every year. In roofing and siding work, cutting fiber cement, working with nail guns on hard surfaces, handling adhesives and solvents, and operating grinders all create specific eye hazards. The human eye cannot be repaired — loss of vision is permanent. Wearing the right eye protection for the task at hand takes seconds and costs nothing compared to what it prevents.

• Minimum Protection on Site
Safety glasses with side shields (ANSI Z87.1 rated) must be worn by all workers in the work area whenever any elevated eye hazard is present. "Regular" prescription glasses and fashion sunglasses do NOT meet ANSI Z87.1 and do NOT provide adequate protection. Workers with prescription lenses must use safety-rated prescription glasses or wear ANSI-rated safety glasses over their prescription glasses.

• Hazard-Specific Protection
Cutting fiber cement, concrete, masonry, or stone: full face shield over safety glasses is required — dust and fragment sizes from these materials can penetrate side openings of glasses alone. Grinding (angle grinder or bench grinder): face shield required in addition to safety glasses. Nail gun use near hard surfaces (concrete, brick, metal flashing): ricochets are common — safety glasses with side shields minimum. Chemical handling (adhesives, solvents, primers): safety glasses with indirect vent chemical goggles for splash risk. Spray applications: goggles rated for liquid splash.

• Flying Debris from Tear-Off Operations
During shingle tear-off, brittle debris, granules, and fasteners are ejected in unpredictable directions. Workers downslope and at the eave line are at high risk. All workers in the tear-off zone must wear safety glasses minimum; face shields are recommended.

• UV Hazards
Working outdoors in full sun exposes eyes to UV radiation, increasing long-term risk of cataracts and macular degeneration. UV-protective safety glasses or tinted safety glasses with UV400 rating are appropriate for outdoor work. Never substitute dark sunglasses without impact protection — UV protection and impact protection are separate requirements.

• Inspection and Care
Inspect safety glasses and face shields before each use. Deeply scratched lenses reduce visibility and structural integrity — replace them. Clean lenses with appropriate lens cleaner only; rough wiping causes scratches that impair vision over time. Store glasses in a case or clean pouch to prevent scratching.

• First Aid for Eye Injuries
If a foreign object enters the eye: do not rub. Flush the eye with clean water for at least 15 minutes. Cover loosely and seek medical attention immediately. If a chemical splashes in the eye: begin flushing immediately with water — do not stop to find the SDS first. Continue flushing for a minimum of 15 minutes and call 911 for chemical burns.',
  'medium'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Eye Protection'
);
