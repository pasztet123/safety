-- =============================================================================
-- Backfill empty checklists only.
--
-- Safe to re-run:
-- - Inserts checklist_items only for checklists that currently have zero items.
-- - Updates trade assignments only for empty checklists.
-- - Adds one new checklist for the missing Behavioral & Substance Abuse category.
--
-- UX note:
-- Existing completion UI renders every checklist item as a checkbox, so the new
-- content uses only binary questions and avoids section headers.
-- =============================================================================

-- ── 1. Add one short checklist for the missing Behavioral & Substance Abuse category
WITH seed_user AS (
  SELECT created_by
  FROM checklists
  ORDER BY name
  LIMIT 1
)
INSERT INTO checklists (name, category, description, created_by, trades)
SELECT
  'Fit for Duty & Impairment Check',
  'Behavioral & Substance Abuse',
  'Short pre-shift verification covering fatigue, impairment, distraction, and stop-work readiness before crews begin work.',
  (SELECT created_by FROM seed_user),
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1
  FROM checklists
  WHERE name = 'Fit for Duty & Impairment Check'
);


-- ── 2. Fix trade assignments for empty checklists that still use legacy placeholders
UPDATE checklists AS c
SET trades = v.trades
FROM (
  VALUES
    (
      'Daily Jobsite Safety — Start of Day',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'End-of-Day Site Walkthrough',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'High-Visibility Gear Inspection',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'PPE Compliance Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Delivery Area Safety Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Loading Zone Inspection',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Spotter Protocol Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Traffic Control Setup Inspection',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Chemical Storage Inspection',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Hazard Communication Board Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Labeling Compliance Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'SDS Availability Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Emergency Exit Inspection',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Emergency Preparedness & First Aid Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Emergency Response Equipment Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Evacuation Route Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Annual Fire Equipment Certification Review',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Annual Safety Program Review',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Corrective Action Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Post-Incident Review & Corrective Actions',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Quarterly Equipment Audit',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Re-Inspection After Repair',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Safety Stand-Down Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Subcontractor Safety Compliance Check',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    ),
    (
      'Training Record Verification',
      ARRAY[
        'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
        'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
        'HVAC','Electrical','General Labor'
      ]::text[]
    )
) AS v(name, trades)
WHERE c.name = v.name
  AND NOT EXISTS (
    SELECT 1
    FROM checklist_items ci
    WHERE ci.checklist_id = c.id
  );


-- ── 3. Populate only empty checklists with short-form or targeted audit items
DO $$
DECLARE
  spec jsonb;
  item_text text;
  checklist_uuid uuid;
  idx integer;
BEGIN
  FOR spec IN
    SELECT *
    FROM jsonb_array_elements($json$
      [
        {
          "name": "Daily Jobsite Safety — Start of Day",
          "items": [
            "Is the work area reviewed before the crew starts?",
            "Are access and egress routes clear?",
            "Are overnight hazards identified and addressed?",
            "Are walkways free of debris and trip hazards?",
            "Are required warning signs and barricades in place?",
            "Are workers wearing the PPE required for the first task?",
            "Is fall protection ready for any planned work at height?",
            "Are ladders and access points safe for immediate use?",
            "Are tools and cords inspected before energizing or use?",
            "Are first aid supplies and emergency contacts available?",
            "Is the weather acceptable for the planned work?",
            "Have new hazards and stop-work triggers been communicated to the crew?"
          ]
        },
        {
          "name": "End-of-Day Site Walkthrough",
          "items": [
            "Are tools shut down, stored, and secured?",
            "Are cords, hoses, and leads removed from walk paths?",
            "Is loose material secured against wind or overnight movement?",
            "Are roof edges, openings, and access points left protected?",
            "Are ladders removed or secured against unauthorized use?",
            "Is trash and scrap removed from active work areas?",
            "Are flammables and compressed gas cylinders stored correctly?",
            "Is temporary power left in a safe condition?",
            "Are fire extinguishers, exits, and emergency paths unobstructed?",
            "Is the site perimeter secure for the evening?",
            "Have unresolved hazards been documented for the next shift?",
            "Has the supervisor confirmed the site is safe to leave unattended?"
          ]
        },
        {
          "name": "High-Visibility Gear Inspection",
          "items": [
            "Is each worker wearing required high-visibility clothing?",
            "Is the vest or garment appropriate for the work zone exposure?",
            "Is the garment free from tears or heavy wear?",
            "Are reflective strips clean and visible?",
            "Is high-visibility gear not covered by tools or outerwear?",
            "Is the garment visible from all sides during normal work?",
            "Is replacement gear available for damaged items?",
            "Are visitors and drivers entering the zone wearing high-visibility gear?",
            "Is nighttime or low-light visibility adequate for the garment in use?",
            "Have damaged or faded garments been removed from service?"
          ]
        },
        {
          "name": "PPE Compliance Verification",
          "items": [
            "Are hard hats worn where overhead or head hazards exist?",
            "Is eye protection matched to the active task?",
            "Are gloves appropriate for the material or tool being used?",
            "Are workers wearing required protective footwear?",
            "Is hearing protection used where noise exposure requires it?",
            "Is respiratory protection available where dust or fumes are present?",
            "Is fall protection worn where exposure requires it?",
            "Is high-visibility gear worn where vehicle or equipment traffic exists?",
            "Is PPE in serviceable condition with no visible damage?",
            "Are workers trained on the PPE required for the task?",
            "Have missing or defective PPE items been replaced before work starts?",
            "Is PPE compliance being enforced consistently across the crew?"
          ]
        },
        {
          "name": "Fall Protection Setup — Pre-Work Verification",
          "items": [
            "Is fall protection required for the planned work area today?",
            "Is the selected fall protection method appropriate for the task?",
            "Have work edges, openings, and drop distances been reviewed?",
            "Are anchor points installed and ready before workers access the hazard?",
            "Are harnesses, lanyards, and lifelines inspected before use?",
            "Are workers tied off where required before exposure begins?",
            "Is free-fall distance limited to the planned safe range?",
            "Is swing-fall exposure minimized by anchor placement?",
            "Are warning lines or guardrails positioned correctly where used?",
            "Are skylights and roof openings protected?",
            "Is a rescue plan available for a suspended worker?",
            "Are weather and surface conditions safe for elevated work?"
          ]
        },
        {
          "name": "Scaffold Setup & Daily Inspection",
          "items": [
            "Has the scaffold been inspected before worker use today?",
            "Are base plates and mud sills installed on stable support?",
            "Is the scaffold plumb, level, and properly braced?",
            "Are platforms fully planked and secured?",
            "Are guardrails and midrails installed where required?",
            "Are access ladders or stair systems safe and unobstructed?",
            "Are ties, anchors, and outriggers installed as required?",
            "Is the scaffold free from visible damage or unauthorized changes?",
            "Is the load on the scaffold within the intended capacity?",
            "Are wheels locked on any mobile scaffold before work begins?",
            "Are tags or inspection indicators current and readable?",
            "Are overhead, fall, and falling-object hazards controlled around the scaffold?"
          ]
        },
        {
          "name": "Torch-Down & Hot Work Safety Check",
          "items": [
            "Is hot work authorized for this location and task?",
            "Are cylinders, hoses, and torch connections in good condition?",
            "Are flashback arrestors installed where required?",
            "Are combustible materials cleared or protected in the hot work zone?",
            "Is a charged fire extinguisher immediately available?",
            "Is a trained fire watch assigned where required?",
            "Are roof openings, voids, and concealed spaces evaluated for fire spread risk?",
            "Is the torch lighting and shutdown sequence understood by the operator?",
            "Are cylinders secured upright and positioned away from ignition hazards?",
            "Are workers wearing heat, eye, and hand protection appropriate for torch work?",
            "Is ventilation adequate for fumes generated by the work?",
            "Is post-work smolder monitoring planned before the crew leaves?"
          ]
        },
        {
          "name": "Electrical Safety & LOTO Verification",
          "items": [
            "Has the electrical hazard zone been identified before work begins?",
            "Has the energy source to be controlled been clearly identified?",
            "Are lockout and tagout devices applied where required?",
            "Has zero energy been verified before work starts?",
            "Are exposed conductors or damaged cords removed from service?",
            "Is GFCI protection in place for temporary power and portable tools?",
            "Are electrical panels accessible and properly labeled?",
            "Are extension cords rated and undamaged for the planned use?",
            "Are overhead power line clearances identified and maintained?",
            "Are only authorized workers performing energized electrical tasks?",
            "Are non-electrical workers protected from unexpected re-energization?",
            "Has the crew reviewed stop-work triggers for electrical exposure?"
          ]
        },
        {
          "name": "Weather & Wind Hazard Assessment",
          "items": [
            "Are current wind speed and gusts checked before work starts?",
            "Is the forecast reviewed for the full shift?",
            "Are company or project stop-work thresholds known to the crew?",
            "Are roof edges, ladders, and scaffold access safe for current conditions?",
            "Are lightweight materials secured against displacement?",
            "Are tarps and temporary coverings fastened or removed as conditions require?",
            "Are workers protected from heat, cold, rain, or lightning exposure?",
            "Are slippery or wet surfaces controlled before access?",
            "Is crane, hoist, or lift activity acceptable for current wind conditions?",
            "Is the drop zone controlled for potential wind-driven debris?",
            "Can workers communicate clearly despite wind and ambient noise?",
            "Has stop-work authority been reinforced for changing weather conditions?"
          ]
        },
        {
          "name": "Storm Preparation Checklist",
          "items": [
            "Has the incoming storm window been reviewed with the crew?",
            "Are loose materials secured or removed from roofs and elevated areas?",
            "Are tarps and temporary weather protection fastened adequately?",
            "Are tools, cords, and hoses removed from drainage paths and access points?",
            "Are roof drains, gutters, and scuppers clear before rainfall?",
            "Are ladders, scaffold planks, and mobile equipment secured for the storm?",
            "Are temporary electrical connections protected from water exposure?",
            "Is the site perimeter protected against blown debris?",
            "Are critical openings and unfinished penetrations protected?",
            "Is a shutdown and evacuation decision point defined?",
            "Are emergency contacts and restart responsibilities assigned?",
            "Has the crew been briefed on post-storm inspection requirements?"
          ]
        },
        {
          "name": "Material Delivery & Staging Safety",
          "items": [
            "Is the delivery path clear of workers and obstructions?",
            "Is the staging location selected before the load arrives?",
            "Is the receiving surface capable of supporting the staged load?",
            "Are roof loads distributed to avoid overloading one area?",
            "Are workers kept out of pinch and crush zones during unloading?",
            "Are tag lines or spotters used where load control is needed?",
            "Are forklifts, boom trucks, or lifts positioned on stable ground?",
            "Are stacked materials blocked, banded, or otherwise secured?",
            "Are pathways and access points kept open after staging?",
            "Are sharp, heavy, or fragile materials segregated appropriately?",
            "Are weather and wind effects considered before staging on roofs or scaffolds?",
            "Has the crew reviewed how falling-object hazards will be controlled below?"
          ]
        },
        {
          "name": "Delivery Area Safety Check",
          "items": [
            "Is the delivery zone clearly identified before the truck arrives?",
            "Is the area free of pedestrians and non-essential workers?",
            "Is the ground stable enough for the delivery vehicle and unloading equipment?",
            "Are overhead power lines or overhead obstructions identified?",
            "Is traffic around the delivery area controlled?",
            "Are spotters assigned if visibility is limited?",
            "Is there enough space to unload without blocking emergency access?",
            "Are materials protected from immediate shift, roll, or collapse after unloading?",
            "Are workers using the PPE required for the delivery task?",
            "Has the supervisor confirmed the area is safe before unloading starts?"
          ]
        },
        {
          "name": "Loading Zone Inspection",
          "items": [
            "Is the loading zone marked and kept clear of unauthorized entry?",
            "Is vehicle traffic separated from foot traffic where possible?",
            "Is the zone level and stable for loading activity?",
            "Are loading surfaces free of debris, mud, or ice?",
            "Are barriers or cones in place where the zone borders active work?",
            "Is a spotter used where driver visibility is restricted?",
            "Are suspended loads prohibited from passing over workers?",
            "Are stacked materials stable while waiting for loading or transfer?",
            "Is lighting adequate if loading occurs in low visibility?",
            "Are emergency routes kept open while the zone is active?"
          ]
        },
        {
          "name": "Spotter Protocol Verification",
          "items": [
            "Is a spotter assigned for blind backing or restricted visibility movement?",
            "Does the operator know who the designated spotter is?",
            "Are standard hand signals or communication methods agreed before movement?",
            "Is the spotter positioned where the operator can see them continuously?",
            "Is the spotter outside the path of travel and pinch zones?",
            "Is the work area cleared of pedestrians before movement begins?",
            "Does movement stop immediately if visual contact is lost?",
            "Is only one primary spotter directing the operator at a time?",
            "Are radios working if radio communication is being used?",
            "Has stop-work authority been reinforced for the spotter and operator?"
          ]
        },
        {
          "name": "Traffic Control Setup Inspection",
          "items": [
            "Are cones, signs, and barriers in place before work begins?",
            "Is the setup visible from the required approach distance?",
            "Are lanes, drive aisles, or access points clearly defined?",
            "Are pedestrians routed away from active vehicle paths?",
            "Is entry to the work zone restricted to authorized vehicles?",
            "Are flaggers or spotters used where the traffic pattern requires them?",
            "Are devices stable and not likely to be displaced by wind or passing vehicles?",
            "Is nighttime or low-light visibility adequate for the setup?",
            "Are emergency vehicles able to access the site if needed?",
            "Is the traffic control plan consistent with the current phase of work?",
            "Has the setup been rechecked after deliveries or work zone changes?"
          ]
        },
        {
          "name": "Chemical Storage Inspection",
          "items": [
            "Are chemical containers labeled and legible?",
            "Are incompatible chemicals separated in storage?",
            "Are lids and caps closed and intact?",
            "Are chemicals stored away from ignition sources where required?",
            "Are flammables kept in approved storage where applicable?",
            "Are secondary containment measures in place where needed?",
            "Are containers protected from puncture, weather, and vehicle impact?",
            "Are expired, leaking, or damaged containers removed from service?",
            "Are SDS documents available for the chemicals stored on site?",
            "Is access to chemical storage limited to authorized workers?",
            "Are spill response materials available near the storage area?",
            "Is the storage area orderly and free of trip hazards?"
          ]
        },
        {
          "name": "SDS Availability Check",
          "items": [
            "Are SDS documents available for all active chemicals on site?",
            "Can workers access SDS documents without delay during the shift?",
            "Are SDS documents current for the products in use?",
            "Do product names on containers match the SDS listing?",
            "Are subcontractor chemical SDS documents also available?",
            "Are electronic SDS systems accessible if that method is used?",
            "Do workers know where SDS documents are located?",
            "Are emergency phone numbers or contacts listed with the SDS binder or system?",
            "Are removed products also removed from the active SDS file?",
            "Has the supervisor verified SDS availability before chemical use starts?"
          ]
        },
        {
          "name": "Labeling Compliance Check",
          "items": [
            "Are all primary chemical containers properly labeled?",
            "Are secondary containers labeled after transfer from the original package?",
            "Are label warnings legible and not worn off?",
            "Are product identifiers on labels consistent with the SDS?",
            "Are hazard pictograms present where required?",
            "Are workers prevented from using unlabeled containers?",
            "Are temporary containers controlled so they are not mistaken for water or food items?",
            "Are waste or disposal containers labeled correctly?",
            "Are subcontractor materials labeled to the same standard?",
            "Have unlabeled or illegible containers been removed from use?"
          ]
        },
        {
          "name": "Hazard Communication Board Verification",
          "items": [
            "Is the hazard communication board posted in a visible location?",
            "Are current site chemical hazards listed on the board?",
            "Are emergency contacts and response information posted?",
            "Is the board updated for the products currently in use?",
            "Are SDS access instructions posted on the board?",
            "Are required warnings readable from a normal viewing distance?",
            "Is the board protected from weather damage?",
            "Can new workers identify the board location during orientation?",
            "Are outdated notices removed from the board?",
            "Has the supervisor checked the board for accuracy this shift?"
          ]
        },
        {
          "name": "Dust Control Inspection",
          "items": [
            "Is the dust-generating task identified before work begins?",
            "Are wet methods or local extraction set up where feasible?",
            "Are workers positioned out of the direct dust plume?",
            "Is respiratory protection available where required?",
            "Are cutting or grinding tools fitted with the intended dust controls?",
            "Are housekeeping methods avoiding dry sweeping or compressed air where prohibited?",
            "Are nearby workers and occupied areas protected from dust migration?",
            "Are material drop points and debris handling methods minimizing airborne dust?",
            "Are dust controls maintained as work conditions change?",
            "Are filters, hoses, and water supplies functioning properly?",
            "Are visibility and slip hazards from dust accumulation controlled?",
            "Has stop-work authority been reinforced if controls fail?"
          ]
        },
        {
          "name": "Silica & Respiratory Hazard Control",
          "items": [
            "Has the task been reviewed for silica exposure risk?",
            "Is the selected control method appropriate for the task?",
            "Are wet cutting or local exhaust controls in place before work begins?",
            "Is the tool compatible with the installed dust control method?",
            "Are water feeds, hoses, or vacuums functioning properly?",
            "Are workers wearing required respiratory protection?",
            "Have respirator users been fit tested and trained where required?",
            "Are nearby workers protected from exposure to drifting dust?",
            "Is dry sweeping avoided where prohibited?",
            "Are debris and slurry removed without creating new exposure?",
            "Is the work area monitored for visible control failure?",
            "Is stop-work required if dust controls are not functioning?"
          ]
        },
        {
          "name": "Spill Prevention Inspection",
          "items": [
            "Are fuels, oils, and chemicals stored away from drains and waterways?",
            "Are containers closed and free from leaks?",
            "Is secondary containment in place where needed?",
            "Are drip pans or absorbents used under high-risk equipment?",
            "Are transfer and fueling areas controlled against spills?",
            "Are spill kits available and stocked near likely release points?",
            "Do workers know how to respond to a spill?",
            "Are damaged hoses, pumps, or fittings removed from service?",
            "Are waste liquids stored in labeled containers?",
            "Is runoff from rain or washdown prevented from carrying contaminants?",
            "Has the site been checked for signs of small leaks before they become larger spills?"
          ]
        },
        {
          "name": "Emergency Preparedness & First Aid Check",
          "items": [
            "Is a stocked first aid kit available on site?",
            "Are emergency phone numbers posted where the crew can find them?",
            "Does the crew know the site address or location for emergency response?",
            "Is the nearest hospital or urgent care route known?",
            "Is a designated person identified to call for help if needed?",
            "Are eye wash or burn response supplies available where required?",
            "Are emergency access routes clear for responders?",
            "Are workers briefed on the site evacuation or assembly plan?",
            "Is communication working in all active work areas?",
            "Are severe weather or medical stop-work triggers understood?",
            "Are trauma or bleeding-control supplies available where the hazard warrants them?",
            "Has the crew reviewed what to do if a worker is injured today?"
          ]
        },
        {
          "name": "Emergency Exit Inspection",
          "items": [
            "Are emergency exits clearly marked where required?",
            "Are exits free of stored materials and debris?",
            "Can exit doors or gates open without obstruction?",
            "Are travel paths to exits clear and stable?",
            "Is lighting adequate along the exit route?",
            "Are alternate exits available if the primary path is blocked?",
            "Are workers aware of the nearest exit from their work area?",
            "Are ladders or stairs used for emergency egress safe and accessible?",
            "Are temporary changes to the route communicated to the crew?",
            "Has the supervisor verified the route after site layout changes?"
          ]
        },
        {
          "name": "Emergency Response Equipment Check",
          "items": [
            "Are fire extinguishers present where required?",
            "Are extinguishers charged and inspection tags current?",
            "Are first aid supplies stocked and accessible?",
            "Is emergency communication equipment working?",
            "Are spill response materials available where chemicals are in use?",
            "Is rescue equipment available for tasks that require it?",
            "Are eyewash or drench supplies present where exposure requires them?",
            "Is equipment easy to access without moving stored materials?",
            "Have damaged or missing emergency items been replaced?",
            "Has readiness of emergency equipment been checked this shift?"
          ]
        },
        {
          "name": "Evacuation Route Verification",
          "items": [
            "Is the primary evacuation route identified for the current work area?",
            "Is the route clear of trip hazards and stored material?",
            "Can workers move the full route without passing through a new hazard?",
            "Is the assembly point known to the crew?",
            "Are alternate routes identified if the main route is blocked?",
            "Are ladders, stairs, or gates on the route safe to use?",
            "Are subcontractors and visitors aware of the route?",
            "Has the route been updated for todays site conditions or layout changes?",
            "Can emergency vehicles access the site while the route remains open?",
            "Has the supervisor confirmed route readiness before high-risk work starts?"
          ]
        },
        {
          "name": "Air Monitoring Verification",
          "items": [
            "Is air monitoring required for the planned work area?",
            "Has the monitor been bump tested or calibrated as required?",
            "Is the correct sensor setup selected for the expected hazard?",
            "Is monitoring performed before worker entry or hot work starts?",
            "Is the sampling point appropriate for the breathing zone or space conditions?",
            "Are alarm set points known to the crew?",
            "Are workers prepared to stop and exit if the monitor alarms?",
            "Is continuous monitoring used where conditions can change rapidly?",
            "Are readings documented when the task or permit requires it?",
            "Has the supervisor confirmed acceptable readings before work proceeds?"
          ]
        },
        {
          "name": "Rescue Plan Verification",
          "items": [
            "Is a rescue plan defined for the specific task and location?",
            "Does the plan match the actual hazards present today?",
            "Are rescue roles assigned before work begins?",
            "Is rescue equipment available and ready for use?",
            "Can responders access the worker location without delay?",
            "Are communication methods defined for an emergency?",
            "Are outside emergency responders informed when required?",
            "Have workers reviewed suspension, atmospheric, or entrapment hazards relevant to rescue?",
            "Is the plan realistic for the current crew size and site layout?",
            "Has the supervisor verified the rescue plan before exposure begins?"
          ]
        },
        {
          "name": "Training Record Verification",
          "items": [
            "Are required training records available for current workers on site?",
            "Are fall protection training records current where applicable?",
            "Are equipment operator qualifications current where required?",
            "Are electrical or LOTO training records current where applicable?",
            "Are respiratory or hazard communication records current where applicable?",
            "Are subcontractor training records available when required by the project?",
            "Are expired or missing records identified for follow-up?",
            "Are new workers documented as oriented before task assignment?",
            "Is record storage organized enough for prompt retrieval?",
            "Has the responsible supervisor reviewed training gaps this period?"
          ]
        },
        {
          "name": "Corrective Action Verification",
          "items": [
            "Has each assigned corrective action been clearly documented?",
            "Has an owner been assigned for each action?",
            "Has the required completion date been defined?",
            "Has the root hazard actually been addressed, not just hidden?",
            "Have interim controls been maintained until the permanent fix is complete?",
            "Has the repaired or corrected condition been rechecked in the field?",
            "Have affected workers been informed of the correction?",
            "Have related areas been checked for the same issue?",
            "Has any required training or retraining been completed?",
            "Has documentation been updated to reflect completion?",
            "Are any overdue corrective actions escalated to management?",
            "Has the verifier confirmed the hazard is no longer present?"
          ]
        },
        {
          "name": "Re-Inspection After Repair",
          "items": [
            "Was the repaired item or area identified clearly before re-inspection?",
            "Was the original defect or hazard actually corrected?",
            "Is the repair complete and not temporary unless approved?",
            "Are guards, covers, or protective systems reinstalled correctly?",
            "Does the repaired item operate normally under expected use?",
            "Have adjacent components been checked for related damage?",
            "Are labels, signs, and warnings restored where needed?",
            "Has the area been cleaned and made safe for return to service?",
            "Have affected workers been told the area or equipment is ready for use?",
            "Is follow-up monitoring needed after the repair?",
            "Has the inspection been documented with date and responsible person?",
            "Has return to service been authorized by the appropriate person?"
          ]
        },
        {
          "name": "Safety Stand-Down Verification",
          "items": [
            "Was the stand-down held before affected work resumed?",
            "Did the stand-down address the actual hazard or event involved?",
            "Were all affected workers present or otherwise briefed?",
            "Were the causes and required controls explained clearly?",
            "Were worker questions answered during the stand-down?",
            "Were stop-work expectations reinforced?",
            "Were corrected procedures reviewed before restart?",
            "Were supervisors aligned on enforcement expectations after the stand-down?",
            "Was attendance or participation documented?",
            "Was work allowed to resume only after controls were verified?"
          ]
        },
        {
          "name": "Subcontractor Safety Compliance Check",
          "items": [
            "Has the subcontractor been briefed on site-specific safety requirements?",
            "Are subcontractor workers using required PPE?",
            "Are subcontractor work methods consistent with project safety rules?",
            "Are subcontractor tools and equipment in safe condition?",
            "Are subcontractor access, fall, and electrical controls acceptable for the task?",
            "Are permits, training, or qualifications current where required?",
            "Are subcontractor supervisors actively monitoring their crew?",
            "Are chemical and hazard communication requirements being followed?",
            "Are housekeeping and material storage standards being maintained?",
            "Have prior subcontractor safety deficiencies been corrected?",
            "Is subcontractor work coordinated to avoid creating hazards for others?",
            "Has non-compliance been documented and escalated where needed?"
          ]
        },
        {
          "name": "Post-Incident Review & Corrective Actions",
          "items": [
            "Has the incident scene been made safe before review begins?",
            "Has the type of incident or near miss been documented clearly?",
            "Were witnesses identified and interviewed promptly?",
            "Were photos, sketches, or physical evidence collected?",
            "Has the sequence of events been reconstructed?",
            "Were immediate contributing hazards identified?",
            "Were underlying process or planning failures identified?",
            "Have interim controls been put in place before work resumes?",
            "Has each corrective action been assigned to an owner?",
            "Are corrective action deadlines realistic and documented?",
            "Have similar work areas been checked for the same hazard?",
            "Have affected workers been briefed on lessons learned?",
            "Were reporting and notification requirements completed?",
            "Has follow-up verification been scheduled?",
            "Has management reviewed the action plan?",
            "Has restart of affected work been authorized only after controls were verified?"
          ]
        },
        {
          "name": "Annual Fall Protection System Audit",
          "items": [
            "Is the current fall protection inventory list complete?",
            "Are all harnesses uniquely identified and traceable?",
            "Are lanyards, lifelines, and connectors inspected for damage?",
            "Are self-retracting devices inspected and within service requirements?",
            "Are damaged or expired components removed from service?",
            "Are permanent and temporary anchor systems documented?",
            "Are anchor installation methods consistent with manufacturer requirements?",
            "Are inspection records current for all fall protection components?",
            "Are rescue plans current for the main work types performed?",
            "Are workers current on fall protection training?",
            "Are competent person inspections documented where required?",
            "Are warning line, guardrail, and cover practices still effective on current projects?",
            "Are replacement criteria defined for aging or heavily used equipment?",
            "Are subcontractor fall protection practices reviewed as part of the audit?",
            "Have prior audit findings been closed out?",
            "Are storage conditions protecting gear from UV, moisture, and damage?",
            "Is equipment availability adequate for current staffing and work volume?",
            "Has the annual audit been signed off by responsible management?"
          ]
        },
        {
          "name": "Annual Fire Equipment Certification Review",
          "items": [
            "Is the fire equipment inventory list current?",
            "Are extinguisher inspection tags present and legible?",
            "Are annual inspection or certification dates current?",
            "Are extinguisher types matched to the hazards present?",
            "Are damaged or discharged units removed from service promptly?",
            "Are mounting locations identified and maintained consistently?",
            "Are workers able to access equipment without obstruction?",
            "Are spare or replacement units available where needed?",
            "Are hose reels, cabinets, or related fire equipment inspected where installed?",
            "Are hot work areas equipped according to project requirements?",
            "Are inspection records retained and organized?",
            "Have prior fire equipment deficiencies been corrected?",
            "Are service vendors or internal responsible persons identified for follow-up?",
            "Are employees trained on equipment locations and basic use?",
            "Has the annual review been documented fully?",
            "Has management signed off on any required replacements or service?"
          ]
        },
        {
          "name": "Annual Safety Program Review",
          "items": [
            "Is the written safety program current for the companys work activities?",
            "Are hazard-specific procedures updated for current operations?",
            "Are required roles and responsibilities clearly assigned?",
            "Are training requirements current and practical to implement?",
            "Are incident reporting and investigation procedures working effectively?",
            "Are corrective action tracking methods effective and current?",
            "Are inspection programs defined for equipment, tools, and work areas?",
            "Are emergency response procedures current for the work performed?",
            "Are subcontractor safety expectations documented clearly?",
            "Are PPE rules still aligned with actual field hazards?",
            "Are fall protection, electrical, and hot work controls addressed adequately?",
            "Are documentation and record retention practices adequate?",
            "Are workers receiving the program information in a usable way?",
            "Are supervisors accountable for field enforcement?",
            "Have audit findings and incident lessons been incorporated into the program?",
            "Are stop-work and fit-for-duty expectations stated clearly?",
            "Has leadership reviewed resource needs to support the program?",
            "Has the updated program been approved and dated?"
          ]
        },
        {
          "name": "Quarterly Equipment Audit",
          "items": [
            "Is the equipment inventory complete and current?",
            "Are high-risk tools and equipment physically present and traceable?",
            "Are inspection records current for each audited asset?",
            "Are damaged or out-of-service items clearly tagged?",
            "Are guards, shields, and safety devices present on audited equipment?",
            "Are cords, hoses, batteries, and connectors in acceptable condition?",
            "Are maintenance intervals being followed?",
            "Are service records organized and available for review?",
            "Are operators assigned only to equipment they are qualified to use?",
            "Are manufacturer manuals or operating instructions accessible where needed?",
            "Are missing parts or field modifications identified and reviewed?",
            "Is storage protecting equipment from weather and damage?",
            "Are fire, electrical, and fuel-related hazards controlled around stored equipment?",
            "Have repeat deficiencies been identified across multiple assets?",
            "Are replacement candidates identified before failure occurs?",
            "Have prior quarterly audit findings been closed out?",
            "Is the audit documented with equipment condition status?",
            "Has follow-up responsibility been assigned for any deficiencies?"
          ]
        },
        {
          "name": "Shoring System Inspection",
          "items": [
            "Has the shoring design or intended system been identified before use?",
            "Are all shoring components present and in good condition?",
            "Is the system installed according to the intended sequence and layout?",
            "Are hydraulic or mechanical members free from leaks, bends, or damage?",
            "Are shores seated firmly against the trench or structure?",
            "Are pins, connections, and locking devices fully engaged?",
            "Is the system stable against displacement during the planned work?",
            "Are soil and water conditions still within the systems safe assumptions?",
            "Is spoil, surcharge, or equipment kept clear of the supported edge?",
            "Has a competent person inspected the system before worker entry?",
            "Are unauthorized field changes prohibited unless approved?",
            "Has stop-work been triggered if the system shows movement or distress?"
          ]
        },
        {
          "name": "Soil Classification Verification",
          "items": [
            "Has a competent person reviewed the excavation before classification?",
            "Has the soil been visually examined for layering or cracks?",
            "Has moisture or water intrusion been evaluated?",
            "Are nearby vibration sources considered in the classification?",
            "Has previously disturbed soil been identified where present?",
            "Were field tests performed where required for the task?",
            "Is the selected soil classification documented?",
            "Does the protective system match the current soil classification?",
            "Has classification been rechecked after weather or condition changes?",
            "Are workers kept out until classification and protection are confirmed?"
          ]
        },
        {
          "name": "Spoil Pile Placement Check",
          "items": [
            "Is spoil kept back from the excavation edge by the required distance?",
            "Is the spoil pile stable and not likely to roll back into the excavation?",
            "Is material stacked low enough to avoid edge overload?",
            "Is spoil placement clear of access ladders and emergency egress?",
            "Are haul routes arranged so spoil does not create traffic conflicts?",
            "Is water runoff prevented from carrying spoil back into the cut?",
            "Are materials and equipment separated from spoil where needed?",
            "Is the edge kept visible and not hidden by spoil piles?",
            "Has spoil location been adjusted for changing excavation conditions?",
            "Has the competent person accepted the spoil placement before entry?"
          ]
        },
        {
          "name": "Underground Utility Verification",
          "items": [
            "Have utility locates been requested and confirmed before digging?",
            "Are marked utilities visible and understood by the crew?",
            "Has the tolerance zone around marked utilities been defined?",
            "Are potholing or hand-dig methods used where required?",
            "Are overhead and underground utility conflicts reviewed together where relevant?",
            "Has the equipment operator been briefed on utility locations?",
            "Is the dig path revised if marks and field conditions do not match?",
            "Are utility owners contacted if marks are missing or unclear?",
            "Are exposed utilities protected from damage during work?",
            "Is stop-work required if an unknown line or conduit is encountered?",
            "Has the supervisor verified utility controls before excavation proceeds?"
          ]
        },
        {
          "name": "Trench Protective System Inspection",
          "items": [
            "Has the required protective system been selected before entry?",
            "Is the trench box, shield, or sloping method suitable for the current depth and soil?",
            "Are protective system components free from visible damage?",
            "Is the system installed fully for the area workers will occupy?",
            "Are workers staying inside the protected zone?",
            "Is the top of the shield or protection positioned correctly relative to grade?",
            "Are ingress and egress points located within the protected area?",
            "Is water accumulation absent or controlled?",
            "Are nearby loads, equipment, and spoil kept from compromising the trench wall?",
            "Has a competent person inspected the system today and after changes?",
            "Are cracks, sloughing, or wall movement absent?",
            "Has stop-work been enforced if trench stability is uncertain?"
          ]
        },
        {
          "name": "Compressed Air Tool Inspection",
          "items": [
            "Is the tool body free from visible damage or cracks?",
            "Is the trigger or control functioning correctly?",
            "Are hose connections tight and fitted with safety retainers where required?",
            "Is the hose free from cuts, blisters, or excessive wear?",
            "Is the operating pressure set within the tool rating?",
            "Are guards or deflectors installed where required?",
            "Is the air supply shut off before service, clearing, or adjustment?",
            "Are workers using eye and hearing protection for the task?",
            "Is the tool not pointed at any person during handling?",
            "Is the work area arranged to control hose trip hazards?",
            "Has a defective air tool been removed from service before use?"
          ]
        },
        {
          "name": "Crane Pre-Operation Inspection",
          "items": [
            "Has the operator completed the required pre-operation inspection?",
            "Is the crane set on stable ground or support conditions?",
            "Are outriggers or pads installed where required?",
            "Are wire rope, hooks, and rigging components free of obvious damage?",
            "Are load charts available for the crane configuration in use?",
            "Is swing radius protected or controlled?",
            "Are overhead power line clearances identified and maintained?",
            "Are signaling and communication methods defined before the lift?",
            "Is the planned load within capacity for the radius and configuration?",
            "Is the lift path clear of workers and obstructions?",
            "Are weather and wind conditions acceptable for lifting?",
            "Has the supervisor approved the lift plan for the current conditions?"
          ]
        },
        {
          "name": "Equipment Pre-Start Inspection",
          "items": [
            "Has the operator reviewed the equipment before starting it?",
            "Is the machine free from visible structural damage?",
            "Are fluid leaks absent or identified before start-up?",
            "Are tires, tracks, or wheels in acceptable condition?",
            "Are guards, panels, and covers in place?",
            "Do mirrors, alarms, and lights function as required?",
            "Is the seat belt present and usable if the equipment requires one?",
            "Are fire extinguisher and emergency shutdown features available where required?",
            "Is the work area clear before start-up?",
            "Are attachments or implements secured properly?",
            "Is the operator authorized for this equipment type?",
            "Has defective equipment been removed from service before operation?"
          ]
        },
        {
          "name": "Heavy Equipment Daily Inspection",
          "items": [
            "Has the daily inspection been completed before operation?",
            "Are tires, tracks, and undercarriage components in safe condition?",
            "Are fluid levels adequate and leaks controlled?",
            "Are brakes, steering, and controls functioning properly?",
            "Are backup alarms, horns, and lights operational?",
            "Is the cab area clean and free of loose objects that affect operation?",
            "Are seat belt and operator restraint systems usable?",
            "Are guards and shields installed where required?",
            "Are attachments secure and suitable for the planned work?",
            "Is the equipment free from cracked welds or structural damage?",
            "Has the operator reviewed hazards in the travel and work path?",
            "Has unsafe equipment been tagged out before use?"
          ]
        },
        {
          "name": "Machine Guarding Verification",
          "items": [
            "Are machine guards installed where exposure to moving parts exists?",
            "Are guards secured firmly and not bypassed?",
            "Do guards prevent contact with pinch points, blades, or rotating parts?",
            "Are guard openings and clearances appropriate for the hazard?",
            "Do guards remain effective throughout the full motion of the machine?",
            "Are interlocks or switches functioning where installed?",
            "Are operators prevented from reaching through or around the guard?",
            "Are removed guards reinstalled before the machine returns to service?",
            "Are maintenance workers applying lockout before guard removal?",
            "Has the supervisor confirmed guarding is intact before operation?"
          ]
        },
        {
          "name": "Nail Gun Pre-Use Safety Inspection",
          "items": [
            "Is the nail gun body free from cracks or visible damage?",
            "Is the trigger type approved for the task and crew experience?",
            "Is the contact tip operating correctly?",
            "Are hose or battery connections secure and undamaged?",
            "Is air pressure or power setting within the tool recommendation?",
            "Is the magazine loading correctly with the intended fastener?",
            "Are safety glasses and hearing protection in use for the task?",
            "Is the worker keeping hands clear of the fastening path?",
            "Is the tool disconnected before clearing jams or service?",
            "Is the workpiece stable and backed as needed for fastening?",
            "Has the defective nail gun been removed from service before use?"
          ]
        },
        {
          "name": "Fit for Duty & Impairment Check",
          "items": [
            "Are workers reporting fit for duty before assignment?",
            "Are signs of fatigue, illness, or impairment absent at start of shift?",
            "Has any worker raised a concern about their own readiness to work?",
            "Are workers alert enough for driving, lifting, or working at height?",
            "Have overnight incidents or medication changes been disclosed where required?",
            "Are high-risk tasks reassigned if a worker is not fit for duty?",
            "Are supervisors watching for distraction, slowed response, or poor coordination?",
            "Are workers reminded to speak up if a coworker appears impaired?",
            "Are break, hydration, and pacing plans adequate for the shift demands?",
            "Is stop-work authority clear if impairment is suspected?",
            "Are transportation and removal-from-duty steps understood if needed?",
            "Has the crew been reminded that working impaired is not acceptable?"
          ]
        }
      ]
    $json$::jsonb)
  LOOP
    SELECT c.id
    INTO checklist_uuid
    FROM checklists c
    WHERE c.name = spec->>'name'
      AND NOT EXISTS (
        SELECT 1
        FROM checklist_items ci
        WHERE ci.checklist_id = c.id
      )
    ORDER BY c.id
    LIMIT 1;

    IF checklist_uuid IS NULL THEN
      CONTINUE;
    END IF;

    idx := 1;
    FOR item_text IN
      SELECT jsonb_array_elements_text(spec->'items')
    LOOP
      INSERT INTO checklist_items (checklist_id, title, display_order, is_section_header)
      VALUES (checklist_uuid, item_text, idx, false);

      idx := idx + 1;
    END LOOP;
  END LOOP;
END
$$;