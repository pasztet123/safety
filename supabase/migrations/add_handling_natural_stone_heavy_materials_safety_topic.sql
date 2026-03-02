-- Add Handling Natural Stone & Heavy Materials safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Handling Natural Stone & Heavy Materials',
  'Material Handling',
  'OSHA 29 CFR 1926.250',
  'Natural stone is one of the heaviest materials handled in construction. A single slab can weigh hundreds of pounds, and irregular shapes make load centers unpredictable. Crushing injuries, back injuries, and dropped-load fatalities are all well-documented outcomes of improper stone handling. Every lift — manual or mechanical — requires planning before the material moves.

• Pre-Lift Assessment and Planning
The weight of every stone or heavy material must be assessed before any lift begins. For oversized, irregular, or exceptionally heavy pieces, a formal lift plan must be established before work starts. Mechanical lifting equipment must be used whenever the load exceeds safe manual handling limits or when the shape makes manual control impractical. The center of gravity of each piece must be identified before lifting — natural stone is rarely uniform in density, and an unexpected shift of the load center can cause the piece to rotate and fall.

• Equipment Inspection and Rating
Slings, straps, clamps, and all rigging hardware must be inspected before each use for cuts, abrasion, corrosion, and deformation. Every lifting device must be rated for the intended load with an appropriate safety factor — never use equipment at or near its rated capacity without accounting for dynamic loading. Fork extensions must be secured properly before use. Forklift and telehandler rated capacity must be verified for the specific load weight and lift radius before any pick.

• Manual Lifting Technique
Two-person lifts must be used whenever a piece is too large or too heavy for one person to safely control. Workers must be trained in proper lifting technique: back kept in a neutral position, load held close to the body, lift initiated from the legs, not the back. Twisting while carrying heavy material is prohibited — it is a leading cause of spinal injury. Communication between lift partners must be established and maintained throughout every manual carry.

• Path and Ground Conditions
The path of travel must be fully cleared before any movement begins. Ground surfaces must be stable and level — soft ground, slopes, or uneven surfaces dramatically increase the risk of loss of control. Any surface that could shift, sink, or cause a stumble must be corrected before the lift proceeds.

• Suspended Load Safety
The drop zone must be identified and barricaded before any mechanical lifting begins. No worker may stand or pass beneath a suspended load at any time. A spotter must be used whenever operator visibility is limited during mechanical lifts. Workers must never place hands beneath a suspended load when guiding it into position — hands must direct from the sides, and the load must be fully controlled by the lifting equipment before final positioning.

• Controlled Placement
Material must be lowered slowly and in a controlled manner — sudden drops of heavy stone generate impact forces that can shatter the material, damage the substrate, or injure workers. Hand and finger pinch points must be identified before placement begins; stone placed against another hard surface with a finger in between is an immediate amputation or crush injury hazard. No hands may be placed beneath the load as it is set down.

• Storage and Staging
Stone must be stored on a stable A-frame or purpose-built rack. All stored materials must be chocked to prevent rolling or shifting — a single slab tipping from a rack can be fatal. Heavy pieces must be staged away from roof edges, floor openings, and areas where a tip-over would send the material falling to a lower level. Scaffold load capacity must be verified before staging stone on any elevated platform.

• Personal Protective Equipment
Cut-resistant gloves must be worn when handling stone with sharp edges or freshly cut faces. Steel-toed boots are required to protect against crush injuries from dropped material — natural stone dropped from even a low height produces catastrophic foot injuries without proper footwear. Sharp edges on all pieces must be identified and communicated to all handlers before the lift begins.

• Weather and Stop-Work Authority
Weather conditions must be evaluated before any exterior lifting operation involving heavy stone. Wind can make large irregular pieces impossible to control safely during a lift, and wet surfaces reduce friction and increase slip risk during manual carries. Stop-work authority must be reinforced with the entire crew: if instability, unexpected weight, equipment limitations, or overload risk is identified at any point, work must stop until the hazard is resolved.

Remember: Stone does not compress, bend, or give. When it falls, it falls with full force. There are no second chances with a dropped slab. Plan every lift, inspect every piece of rigging, and never put a hand, foot, or body where a load could land.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Handling Natural Stone & Heavy Materials'
);
