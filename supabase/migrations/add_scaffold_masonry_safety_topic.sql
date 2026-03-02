-- Add Scaffold for Masonry Work safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Scaffold for Masonry Work (Heavy Load & Stability Control)',
  'Scaffolding & Elevated Work',
  'OSHA 29 CFR 1926.452',
  'Masonry scaffold carries some of the heaviest distributed loads on any construction project. Brick, block, mortar, and grout are dense and unforgiving — an overloaded or improperly erected scaffold can collapse without warning, killing everyone on and below it. Scaffold safety for masonry begins before the first tube goes up and requires continuous oversight throughout the project.

• Erection and Qualification
Scaffold must be erected by qualified personnel trained in scaffold assembly for the specific system being used. No improvised or mixed-system scaffold is acceptable without engineering review. The scaffold tag must be verified before any worker accesses the platform — a Green tag indicates the scaffold is safe for use, Yellow indicates restricted use or required PPE, and Red means the scaffold is out of service and must not be accessed under any circumstances.

• Foundation and Structural Stability
The foundation must be stable and capable of supporting the full intended load, including the scaffold structure, all materials staged on it, workers, and dynamic loads from material handling. Base plates must be installed on every leg, and mud sills must be used on any surface that is not solid concrete or bedrock. The scaffold must be verified to be level and plumb during and after erection. Ties to the structure must be installed at the required intervals specified by the scaffold manufacturer and OSHA — ties prevent the scaffold from overturning or drifting under load.

• Guardrails and Access
Guardrails must be installed at all required heights. Mid-rails and toe boards must be installed on all open sides and ends of scaffold platforms. The access ladder or stair tower must be properly secured and must not be improvised from cross braces — climbing on cross braces is strictly prohibited as it places asymmetric loads on the frame and creates fall hazards.

• Planking
Planks must fully deck the platform with no large gaps that could cause a worker or material to fall through. Planks must be secured to prevent movement or displacement from vibration, wind, or material handling. Planks must be inspected and free from cracks, splits, rot, or damage. Damaged planks must be removed and replaced before the scaffold is used.

• Load Management
The scaffold must be rated for the intended load capacity and that rating must never be exceeded. Masonry materials must be staged evenly across the platform to distribute load — point loading from a pallet placed at the center or edge of a platform concentrates stress on individual planks and frames and must be avoided. Pallets must not be placed directly on plank edges. Debris must not be allowed to accumulate on the platform — it adds uncontrolled load and creates trip hazards. Material hoisting operations must be coordinated to prevent shock loading or simultaneous loading that exceeds capacity. Workers must not crowd the platform; maximum occupancy must be defined and enforced.

• Falling Object Protection
Overhead protection must be provided wherever workers below are exposed to falling objects from the scaffold platform. Falling object protection — barricades, canopies, or toe boards — must be in place below the work level when masonry operations are active overhead.

• Weather and Condition Inspections
The scaffold must be inspected after any severe weather event — high winds, heavy rain, or seismic activity can shift the foundation, loosen ties, or displace planking. Ice and snow must be completely removed before any worker accesses the platform. On mobile scaffold, all wheels must be locked before any worker steps onto the platform and must remain locked for the duration of use.

• Fall Protection and Stop-Work Authority
Fall protection must be used where required — on platforms at heights where guardrails alone do not provide adequate protection or where work near open edges is required. Stop-work authority must be reinforced with all crew members: if any sign of structural instability is observed — unusual movement, sounds from the frame, displaced ties, or sinking base plates — work must stop immediately and the scaffold must be re-inspected by a qualified person before use resumes.

Remember: Masonry scaffold failures are rarely survivable. The load is too great and the drop is too sudden. Follow every erection requirement, never exceed rated capacity, and treat every platform inspection as if lives depend on it — because they do.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Scaffold for Masonry Work (Heavy Load & Stability Control)'
);
