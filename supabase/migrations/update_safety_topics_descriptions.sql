-- Update safety topics with detailed descriptions

UPDATE safety_topics SET description = 'Fall protection is essential on construction sites where workers are exposed to fall hazards.

• Requirements
A. Fall protection must be provided at elevations of 6 feet or more.
B. Guardrail systems, safety net systems, or personal fall arrest systems are required.
C. Workers must be trained on proper use of fall protection equipment.

• Equipment Inspection
A. Inspect all fall protection equipment before each use.
B. Remove damaged equipment from service immediately.
C. Ensure anchors can support 5,000 lbs per worker attached.

• Action Items
1. Conduct daily inspections of guardrails and fall protection systems.
2. Ensure all workers at heights are properly tied off.
3. Report any damaged fall protection equipment to supervisor immediately.' 
WHERE name = 'Fall Protection';

UPDATE safety_topics SET description = 'Scaffolding must be erected, maintained, and dismantled properly to ensure worker safety.

• Construction
A. Scaffolds must be erected on solid, level surfaces with adequate support.
B. All platforms must be fully planked and secured.
C. Guardrails are required on all open sides above 10 feet.

• Inspection and Use
A. Competent person must inspect scaffolds before each work shift.
B. Maximum intended load must not be exceeded.
C. Do not use scaffolds during storms or high winds.

• Access
A. Use proper access methods - never climb cross braces.
B. Ladders or stair towers must be provided for safe access.

• Action Items
1. Inspect scaffold tags daily before use.
2. Report any damaged or missing components immediately.
3. Never modify scaffolds without authorization from competent person.' 
WHERE name = 'Scaffolding Safety';

UPDATE safety_topics SET description = 'Proper ladder use prevents falls, one of the leading causes of construction injuries.

• Selection and Setup
A. Select the right ladder for the job (height, weight capacity, type).
B. Inspect ladder before each use for damage or defects.
C. Set up on firm, level surface; extend 3 feet above landing.
D. Maintain 3-point contact when climbing.

• Safe Use
A. Face the ladder when ascending or descending.
B. Do not carry materials while climbing - use a hoist.
C. Never stand on top two steps of a stepladder.
D. Secure ladders to prevent movement.

• Action Items
1. Inspect all ladders before use for cracks, splits, or damaged rungs.
2. Ensure ladders are secured at top and bottom.
3. Report damaged ladders and remove from service immediately.' 
WHERE name = 'Ladder Safety';

UPDATE safety_topics SET description = 'Electrical hazards can cause severe injuries or death. Proper precautions must be taken.

• Hazard Recognition
A. Identify overhead and underground power lines before work begins.
B. Maintain minimum clearance distances from energized lines.
C. Assume all wires are energized until confirmed otherwise.

• Safe Work Practices
A. Use Ground Fault Circuit Interrupters (GFCIs) on all temporary power.
B. Inspect electrical cords and equipment daily.
C. De-energize circuits before performing work when possible.
D. Use proper PPE including insulated gloves and tools.

• Equipment
A. Extension cords must be 3-wire type and properly grounded.
B. Never bypass or remove equipment grounding pins.
C. Keep electrical equipment away from water.

• Action Items
1. Test all GFCIs daily before use.
2. Report any damaged cords, equipment, or exposed wires immediately.
3. Maintain required clearances from overhead power lines.' 
WHERE name = 'Electrical Safety';

UPDATE safety_topics SET description = 'Lockout/Tagout procedures prevent unexpected equipment startup during maintenance.

• Preparation
A. Identify all energy sources (electrical, mechanical, hydraulic, pneumatic).
B. Notify affected employees before shutting down equipment.
C. Shut down equipment using normal stopping procedures.

• Lockout Procedure
A. Isolate equipment from all energy sources.
B. Apply lockout/tagout devices - one lock per authorized employee.
C. Release or block all stored energy (springs, elevated parts, compressed air).
D. Verify zero energy state before beginning work.

• Restoration
A. Remove tools and replace guards before re-energizing.
B. Notify all affected employees.
C. Remove lockout/tagout devices only by person who installed them.

• Action Items
1. Ensure you have your personal lock and key.
2. Never remove another person''s lock or tag.
3. Verify equipment is de-energized before beginning work.' 
WHERE name = 'Lockout/Tagout';

UPDATE safety_topics SET description = 'Personal Protective Equipment is the last line of defense against workplace hazards.

• Head Protection
A. Hard hats required in areas with overhead hazards.
B. Type I (top impact) or Type II (top and side impact) based on hazards.
C. Inspect daily for cracks, dents, or damage.

• Eye and Face Protection
A. Safety glasses required at all times on site.
B. Face shields or goggles for grinding, cutting, or chemical exposure.
C. Ensure proper fit and no scratches that impair vision.

• Hand and Foot Protection
A. Work gloves appropriate for task (cut-resistant, chemical, general).
B. Safety boots with toe protection required.
C. Inspect gloves for tears or punctures before each use.

• Action Items
1. Inspect all PPE before use and replace if damaged.
2. Wear appropriate PPE for each task.
3. Report missing or inadequate PPE to supervisor.' 
WHERE name = 'Personal Protective Equipment (PPE)';

UPDATE safety_topics SET description = 'Excavations and trenches pose serious cave-in hazards requiring protective systems.

• Planning
A. Call 811 to locate underground utilities before digging.
B. Have competent person classify soil type.
C. Excavations 5 feet or deeper require protective systems.

• Protective Systems
A. Sloping, shoring, or trench boxes must be used in trenches 5+ feet deep.
B. Competent person must inspect excavations daily and after rain.
C. Keep excavated soil at least 2 feet from edge.

• Access and Egress
A. Provide ladders, steps, or ramps within 25 feet of workers.
B. Ladders must extend 3 feet above excavation edge.

• Action Items
1. Ensure competent person inspects excavation daily.
2. Never enter unprotected trenches 5 feet or deeper.
3. Exit trench immediately if ground movement or water accumulation occurs.' 
WHERE name = 'Excavation and Trenching';

UPDATE safety_topics SET description = 'Confined spaces may contain atmospheric hazards requiring special entry procedures.

• Identification
A. Confined space has limited entry/exit and not designed for continuous occupancy.
B. Permit-required spaces have known hazards (toxic atmosphere, engulfment risk).
C. All confined spaces must be identified and labeled.

• Entry Procedures
A. Test atmosphere before entry: oxygen (19.5-23.5%), flammable gases (<10% LEL), toxics.
B. Continuous monitoring required during entry.
C. Authorized entrants, attendants, and entry supervisor must be designated.
D. Rescue equipment and trained rescue team must be available.

• Hazard Control
A. Ventilate space before and during entry.
B. Lockout/tagout all energy sources.
C. Use appropriate PPE and respiratory protection.

• Action Items
1. Never enter permit-required confined space without authorization.
2. Maintain communication with attendant at all times.
3. Exit immediately if conditions change or alarms sound.' 
WHERE name = 'Confined Space Entry';

UPDATE safety_topics SET description = 'Hazard Communication ensures workers know about chemical hazards in the workplace.

• Safety Data Sheets (SDS)
A. SDS must be available for all hazardous chemicals on site.
B. Review SDS before using unfamiliar chemicals.
C. SDS contain information on hazards, handling, and emergency measures.

• Labels and Warnings
A. All chemical containers must be labeled with contents and hazards.
B. Never use chemicals from unlabeled containers.
C. Pictograms indicate hazard types (flammable, corrosive, toxic, etc.).

• Training
A. Workers must be trained on chemicals they may be exposed to.
B. Know location of SDS and emergency equipment.
C. Understand PPE requirements for each chemical.

• Action Items
1. Read labels and SDS before using any chemical.
2. Use required PPE when handling hazardous materials.
3. Report unlabeled containers or missing SDS to supervisor.' 
WHERE name = 'Hazard Communication';

UPDATE safety_topics SET description = 'Fire prevention and preparedness can save lives and prevent property damage.

• Fire Prevention
A. Keep work areas clean and free of combustible debris.
B. Store flammable liquids in approved containers away from ignition sources.
C. Maintain minimum 35-foot clearance from welding/cutting to combustibles.
D. Hot work permits required for cutting, welding, or other spark-producing work.

• Fire Protection Equipment
A. Know location of fire extinguishers, alarms, and exits.
B. Fire extinguishers must be within 100 feet of work area.
C. Inspect fire extinguishers monthly for charge and accessibility.

• Emergency Response
A. Know evacuation routes and assembly points.
B. Sound alarm immediately when fire discovered.
C. Only fight small fires if trained and safe to do so.

• Action Items
1. Ensure fire extinguisher is accessible before beginning hot work.
2. Have fire watch posted during and 30 minutes after hot work.
3. Know evacuation routes from your work area.' 
WHERE name = 'Fire Prevention';

UPDATE safety_topics SET description = 'Crane operations require trained operators and rigorous safety procedures.

• Pre-Operation
A. Inspect crane daily before use - document on inspection form.
B. Check load charts to ensure crane capacity not exceeded.
C. Verify ground conditions can support crane and load.

• Operation
A. Only trained and certified operators may operate cranes.
B. Barricade area beneath load path - no workers under suspended loads.
C. Use tag lines to control loads.
D. Maintain required clearances from power lines (10 feet minimum).

• Rigging
A. Inspect rigging equipment before each use.
B. Calculate load weight and rigging capacity.
C. Use proper hitch configuration and angle.

• Action Items
1. Ensure operator certification is current.
2. Conduct pre-shift crane inspection.
3. Never walk under suspended loads - barricade the area.' 
WHERE name = 'Crane and Rigging Safety';

UPDATE safety_topics SET description = 'Forklifts are powerful industrial vehicles requiring proper training and operation.

• Operator Requirements
A. Only trained and authorized operators may operate forklifts.
B. Certification required and must be renewed every 3 years.
C. Evaluation required for each type of forklift operated.

• Pre-Operation Inspection
A. Conduct daily pre-operation inspection checklist.
B. Check brakes, steering, controls, warning devices, lights.
C. Report any defects immediately and tag unit out of service.

• Safe Operation
A. Wear seatbelt at all times when operating.
B. Keep forks low when traveling - 4 to 6 inches above ground.
C. Never exceed rated load capacity.
D. No riders allowed unless equipped with passenger seat.

• Action Items
1. Complete pre-operation inspection before each shift.
2. Travel with load tilted back and forks low.
3. Sound horn at blind corners and intersections.' 
WHERE name = 'Forklift Safety';

UPDATE safety_topics SET description = 'Respiratory protection is required when engineering controls cannot eliminate airborne hazards.

• When Required
A. Respirators required when exposed to dusts, fumes, mists, or gases above permissible limits.
B. Medical evaluation required before respirator use.
C. Fit testing required annually for tight-fitting respirators.

• Types of Respirators
A. Filtering facepiece (N95, N99, P100) for particulates.
B. Half-mask or full-face with cartridges for gases/vapors.
C. Supplied air for oxygen-deficient or IDLH atmospheres.

• Use and Maintenance
A. Perform user seal check each time respirator is donned.
B. Facial hair prevents proper seal - clean shaven required.
C. Replace filters/cartridges per manufacturer recommendations.
D. Clean and store respirators properly after use.

• Action Items
1. Ensure medical clearance and fit test are current.
2. Inspect respirator before each use.
3. Report any breathing difficulty or damaged equipment immediately.' 
WHERE name = 'Respiratory Protection';

UPDATE safety_topics SET description = 'Heat stress can cause serious illness or death. Prevention is critical in hot weather.

• Recognition
A. Heat exhaustion: heavy sweating, weakness, nausea, headache.
B. Heat stroke: hot/dry skin, confusion, loss of consciousness - CALL 911.
C. Monitor yourself and coworkers for symptoms.

• Prevention
A. Drink water every 15-20 minutes even if not thirsty.
B. Take frequent breaks in shaded or air-conditioned areas.
C. Wear light-colored, breathable clothing.
D. Acclimate new workers gradually over 7-14 days.

• Scheduling
A. Schedule heavy work during cooler parts of day when possible.
B. Rotate workers on demanding jobs in hot conditions.
C. Provide cool drinking water at job site.

• Action Items
1. Drink water frequently throughout the day.
2. Report heat illness symptoms immediately.
3. Watch coworkers for signs of heat stress and provide assistance.' 
WHERE name = 'Heat Stress Prevention';

UPDATE safety_topics SET description = 'Cold stress can lead to serious health problems including hypothermia and frostbite.

• Recognition
A. Frostbite: numbness, white or grayish skin, firm or waxy texture.
B. Hypothermia: shivering, confusion, drowsiness, slurred speech.
C. Monitor yourself and coworkers for symptoms.

• Prevention
A. Dress in layers - inner layer to wick moisture, outer layer for wind/rain.
B. Keep clothing dry - change if wet from sweat or precipitation.
C. Protect extremities with insulated gloves, hat, and waterproof boots.
D. Take frequent warm-up breaks in heated areas.

• Work Practices
A. Avoid exhaustion - fatigue reduces body''s ability to generate heat.
B. Stay hydrated and eat high-calorie foods.
C. Work during warmer parts of day when possible.

• Action Items
1. Dress appropriately for cold weather in layers.
2. Take regular warm-up breaks indoors.
3. Report cold stress symptoms immediately and seek warm shelter.' 
WHERE name = 'Cold Stress Prevention';

UPDATE safety_topics SET description = 'Improper use of hand and power tools causes many preventable injuries.

• Hand Tools
A. Select the right tool for the job.
B. Inspect tools before use for damage or defects.
C. Keep cutting tools sharp - dull tools require more force and slip easier.
D. Never use damaged tools - remove from service and tag.

• Power Tools
A. Ground all electric tools or use double-insulated tools.
B. Use appropriate guards and safety devices - never disable.
C. Disconnect power before changing blades, bits, or making adjustments.
D. Secure work piece with clamps or vise - never hold in hand.

• PPE Requirements
A. Safety glasses required when using any tools.
B. Face shields for grinding operations.
C. Hearing protection for loud power tools.

• Action Items
1. Inspect tools before each use.
2. Use proper tool for the task - do not improvise.
3. Report and tag out damaged tools immediately.' 
WHERE name = 'Hand and Power Tools';

UPDATE safety_topics SET description = 'Building stairways during construction can be very hazardous. All stairs must meet code requirements.

• Construction
A. All railings should be in place before the stairway is opened for use.
B. Landings with open sides need standard guardrails for proper fall protection.
C. Treads and risers should meet code requirements for uniformity.

• Lighting
A. Adequate lighting can be a problem since permanent lighting is usually installed after stairway construction is completed.
B. OSHA construction standards require 5 foot-candles of light in stairways.
C. If lighting is inadequate, temporary light bulb strings could be installed in the stairway.

• Access
A. Carrying small materials and tools is fine as long as materials do not block your vision.
B. Do not store any tools or construction materials on the stairway.
C. Keep the stairway clean to reduce the likelihood of slips, trips, or falls.

• Action Items
1. Inspect all stairways on the project.
2. Inspect lighting in all stairways and replace missing or damaged items.
3. Report all issues with stairways and lighting to your supervisor.' 
WHERE name = 'Stairways';

UPDATE safety_topics SET description = 'Exposure to high noise levels can cause permanent hearing loss over time.

• Noise Hazard Identification
A. Hearing protection required when noise exceeds 85 decibels (8-hour average).
B. If you must raise your voice to be heard 3 feet away, noise is likely above 85 dB.
C. Common loud tools: jackhammers, chainsaws, grinders, nail guns.

• Hearing Protection
A. Earplugs or earmuffs must be worn in designated high-noise areas.
B. Earplugs must be inserted properly to provide protection.
C. Combine earplugs and earmuffs for very loud environments (100+ dB).

• Protection Maintenance
A. Inspect hearing protection for damage before use.
B. Replace disposable earplugs daily.
C. Clean reusable earplugs after each use per manufacturer instructions.

• Action Items
1. Wear hearing protection in posted high-noise areas.
2. Ensure proper fit of earplugs or earmuffs.
3. Report areas where noise seems excessive but no protection is required.' 
WHERE name = 'Hearing Conservation';

UPDATE safety_topics SET description = 'Bloodborne pathogens can be transmitted through contact with infected blood or body fluids.

• Exposure Situations
A. Rendering first aid or CPR.
B. Cleaning up blood or body fluid spills.
C. Contact with contaminated sharps (needles, broken glass).

• Protection Methods
A. Treat all blood and body fluids as if infectious.
B. Use personal protective equipment: gloves, eye protection, face mask.
C. Wash hands thoroughly with soap and water after removing gloves.
D. Use biohazard containers for contaminated materials.

• Exposure Response
A. Immediately wash exposed area with soap and water.
B. For eye exposure, flush with water for 15 minutes.
C. Report all exposure incidents immediately.
D. Seek medical evaluation within hours of exposure.

• Action Items
1. Know location of first aid kits and bloodborne pathogen cleanup kits.
2. Use PPE before rendering first aid.
3. Report all exposure incidents immediately to supervisor.' 
WHERE name = 'Bloodborne Pathogens';

UPDATE safety_topics SET description = 'Emergency action plans ensure organized response to workplace emergencies.

• Emergency Procedures
A. Know alarm systems and how to report emergencies.
B. Understand evacuation procedures and routes from your work area.
C. Know designated assembly areas for headcount.
D. Do not re-enter facility until all-clear is given.

• Evacuation Routes
A. Primary and secondary evacuation routes posted throughout facility.
B. Keep evacuation routes clear of obstructions.
C. Exit stairs must be used - never use elevators during evacuation.

• Emergency Equipment
A. Know locations of fire extinguishers, first aid kits, and AEDs.
B. Emergency eye wash and shower locations in areas with chemical hazards.
C. Ensure emergency equipment is accessible and not blocked.

• Action Items
1. Identify evacuation routes and assembly points for your work area.
2. Participate in all emergency drills.
3. Report blocked exits or emergency equipment to supervisor immediately.' 
WHERE name = 'Emergency Action Plan';
