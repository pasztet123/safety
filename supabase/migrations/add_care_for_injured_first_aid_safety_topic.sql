-- Add Care for the Injured / First Aid Response Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Care for the Injured – First Aid Response',
  'Medical & Emergency Response',
  'OSHA 29 CFR 1926.50',
  'When an injury occurs on a job site, the actions taken in the first few minutes can determine whether a worker survives, keeps a limb, or suffers permanent disability. Many serious injuries — uncontrolled bleeding, spinal injuries, amputations, heat stroke, and cardiac arrest — have narrow windows where bystander intervention makes a life-or-death difference. OSHA requires that first aid supplies and personnel be immediately available on construction sites. Every crew must know who is trained, where supplies are, and what to do before EMS arrives.

• First Aid Requirements and Trained Personnel
At least one person with current first aid and CPR certification must be present on every job site, or the job site must be in near proximity to an infirmary, clinic, or hospital. Check the distance: OSHA requires that if a hospital is not within a reasonable travel time (generally 3–4 minutes), trained first aid personnel must be on site. Certifications must be current — expired training does not satisfy the requirement.

• First Aid Kit — Contents and Location
A properly stocked ANSI/ISEA Z308.1 first aid kit must be on site, readily accessible, and known to all crew members. Do not lock the first aid kit. Check the kit at the start of every project week — restock immediately when items are used. Minimum contents for construction: bandages (various sizes), sterile gauze pads, adhesive tape, antiseptic wipes, elastic bandage, disposable gloves, CPR face shield, eye wash solution, cold pack, scissors, tweezers, and a first aid guide.

• Bleeding Control
For significant cuts and lacerations: apply firm, direct pressure with a clean cloth or sterile gauze. Maintain pressure — do not lift the cloth to check the wound as this disrupts clot formation. If bleeding soaks through, add more material on top. For life-threatening limb bleeding that cannot be controlled with direct pressure, apply a tourniquet 2–3 inches above the wound and note the time applied. Call 911.

• Falls and Suspected Spinal Injuries
If a worker has fallen from height and is conscious but complaining of neck or back pain, tingling, or cannot move extremities: do not move them. Stabilize the head and call 911. Movement of a spinal injury can convert a survivable injury to permanent paralysis. Only move if there is immediate life threat (fire, collapse) and no other option.

• Heat Stroke vs. Heat Exhaustion
Heat exhaustion: heavy sweating, weakness, cool moist skin, nausea — move to shade, hydrate, cool with wet cloths, rest. Heat stroke: hot dry skin, confusion, loss of consciousness — this is a medical emergency. Call 911. Cool immediately with any available method: ice packs to neck, armpits, and groin; wet sheets; fan.

• Amputations
Control bleeding with direct pressure and tourniquet if needed. Preserve the amputated part: wrap in clean moist cloth, place in a sealed bag, keep cool (not directly on ice). Time matters for reattachment — get to a trauma center fast.

• Emergency Communication
Post the site address at the job site for crews who may need to direct EMS. Confirm cell service is available — if not, identify the nearest landline. Designate a crew member to meet and guide EMS to the injury location.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Care for the Injured – First Aid Response'
);
