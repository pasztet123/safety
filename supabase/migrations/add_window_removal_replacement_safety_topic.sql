-- Add Window Removal & Replacement Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Window Removal & Replacement Safety (Removal, Glass, Sharp Edges)',
  'Material Handling',
  'OSHA 29 CFR 1926.502',
  'Window removal and replacement combines fall exposure, heavy lifting, sharp edge hazards, chemical handling, and potential structural surprises — often in tight quarters with limited maneuvering room. A methodical approach from access setup to final cleanup is essential to completing this work without injury.

• Fall Protection and Access Setup
The work area must be evaluated for fall exposure before removal begins — both interior and exterior sides of the opening may present hazards depending on floor height and grade. Fall protection must be installed wherever required. Ladders and scaffold must be inspected prior to access. Interior and exterior drop zones must be identified and controlled before any window component is disturbed. The ground area outside must be barricaded during removal to protect anyone who could be struck by falling glass or framing debris.

• Glass Identification and Pre-Lift Assessment
The glass type must be identified before removal begins. Tempered glass shatters into small fragments, laminated glass holds together but can still cause lacerations, and insulated units can be significantly heavier than they appear. Window weight must be assessed before any lift — large commercial or specialty units may require mechanical assistance. Two-person lifts are required for large or heavy units; one worker should never attempt to maneuver an oversized window alone.

• Personal Protective Equipment
Cut-resistant gloves must be worn throughout removal and installation. Long sleeves must be worn to protect forearms from contact with sharp edges and glass fragments. Safety glasses must be worn during all cutting, prying, and scoring operations. Standard work gloves are not a substitute for cut-resistant gloves.

• Removal Technique and Tool Safety
Utility knives must be inspected before use and blades must be retracted immediately when not actively cutting. Sealant must be cut carefully and in a controlled manner — rushing through sealant cuts can cause the knife to deflect suddenly into the hand or wrist. Window units must be secured before removing final fasteners; a window that is only partially fastened can shift or fall unexpectedly. Workers must never position themselves directly beneath an unsecured window unit during the removal process.

• Broken Glass Management
Any broken glass must be handled with tools — brooms, scrapers, and tongs — never with bare hands. Broken glass must be placed immediately into a rigid, labeled container. Standard plastic bags and cardboard boxes are not acceptable; they can be punctured and cause injuries during handling and disposal. The work area must be swept and inspected for glass shards at the end of each work session.

• Rough Opening Inspection
After the window is removed, the rough opening must be inspected for structural damage. Rot, soft framing, insect damage, or missing structural members must be reported before installation of the new unit proceeds. Installing into a compromised rough opening creates both a structural failure risk and a potential for the new window to fail in service.

• New Unit Staging and Installation
The new unit must be staged away from edges and high-traffic areas to prevent tip-over or accidental contact. Proper lifting technique must be used when setting the window — back injuries are common during window installation when workers lift and twist simultaneously. Shims must be placed to maintain stable positioning before fasteners are driven, preventing the unit from shifting during installation. Power tools must be inspected before use, and GFCI protection must be used for all exterior power connections.

• Chemical Handling
Spray foam and sealants must be used in adequately ventilated conditions. Gloves and eye protection must be worn when handling expanding foam, adhesive sealants, and primers — many contain isocyanates or solvents that cause skin and respiratory sensitization with repeated exposure. Excess foam must be trimmed using controlled blade technique, not cut hastily.

• Final Checks and Stop-Work Authority
Final fasteners must be checked for secure installation before the work area is cleared. The work area must be cleaned completely of glass shards, fasteners, and debris before the crew demobilizes. Stop-work authority must be reinforced with the entire crew: if structural instability, unexpected framing damage, or any unsafe lifting condition is observed, work must stop until the hazard is resolved.

Remember: Window work looks straightforward but concentrates multiple injury mechanisms into a small space. Control every sharp edge, verify every load before you lift it, and never let the pressure to finish the job lead to a shortcut on glass handling or fall protection.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Window Removal & Replacement Safety (Removal, Glass, Sharp Edges)'
);
