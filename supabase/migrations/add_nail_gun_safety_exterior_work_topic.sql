-- Add Nail Gun Safety for Exterior Work topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Nail Gun Safety for Exterior Work',
  'Tools & Equipment',
  'OSHA 29 CFR 1926.300',
  'Nail guns are among the most frequently used tools in exterior construction and among the most common causes of puncture injuries and unintended discharges on job sites. Most nail gun injuries are preventable and result from bypassed safety devices, improper trigger use, or loss of control during firing. Every operator must understand the tool they are using and treat it with the same respect as any other dangerous equipment.

• Pre-Use Inspection
The nail gun must be inspected before each shift. The trigger type must be verified — sequential (single-shot) triggers are preferred wherever required by site policy or task hazard assessment, as contact (bump-fire) triggers significantly increase the risk of unintended discharge. The safety contact tip must be inspected for proper spring tension and full function; a worn or stuck contact tip allows the tool to fire without the tip being pressed against the workpiece. The air hose must be free from cracks, abrasions, and leaks, and all fittings must be secure. The compressor must be stable and positioned on level ground. Air pressure must be set within manufacturer limits — over-pressurization causes fastener blow-through and increases recoil.

• Loading and Fasteners
Correct fasteners for the specific tool model must be used — mismatched fasteners jam tools, cause misfires, and can damage the magazine. The magazine must be loaded properly and fully seated. The nail gun must be disconnected from the air supply before any jam clearing attempt. Clearing a jam with the tool pressurized is a primary cause of accidental discharges directly into hands and fingers.

• Trigger and Handling Discipline
The finger must be kept off the trigger whenever the tool is not being actively fired. The gun must never be carried with a finger on the trigger — incidental contact with a surface while walking can cause an unintended discharge. The nail gun must never be pointed at the operator, another worker, or any person regardless of whether it is believed to be unloaded or depressurized. Hands must be kept clear of the nailing path at all times. The workpiece must be secured before fastening begins — a shifting workpiece can redirect the nail or cause the operator to lose control of the tool.

• Body Position and Footing
Workers must maintain stable footing before firing. The nail gun must not be fired while on an unstable ladder position — the recoil from firing can be enough to shift balance at height. Workers must not overreach from a ladder or scaffold platform to fire; the ladder or scaffold must be repositioned to maintain a safe working position.

• Personal Protective Equipment
Eye protection must be worn at all times during nail gun operation — fasteners, wood fragments, and nail heads can become projectiles. Hearing protection must be worn when noise levels from pneumatic tools require it. Gloves may be worn where appropriate but must not reduce trigger control or tactile feedback to the point where safe operation is compromised.

• Worksite and Bystander Safety
Power cords and air hoses must be managed and routed to prevent trip hazards, particularly near ladder bases and scaffold access points. Bystanders must be kept clear of the firing zone — nail blow-through is a real hazard when fastening into thin material, decking with gaps, or near edges. The ground area below overhead nailing work must be checked for blow-through hazard zones. A magnetic sweep must be performed at the end of each shift to collect loose fasteners from the work area and ground.

• Tool Misuse and Malfunction
The nail gun must never be used as a prying tool or hammer — it is not designed for lateral force and damage to the nose assembly is a primary cause of contact tip failure. Misfires must be handled per manufacturer procedure, which always begins with disconnecting the air supply. Any tool with a bypassed, damaged, or malfunctioning safety device must be taken out of service immediately and tagged. Stop-work authority must be exercised if any safety device is bypassed or found to be malfunctioning — operating a nail gun without a functioning contact tip or with a bypassed trigger safety is prohibited.

• Training
All workers operating nail guns must be trained on nail gun hazards, trigger types, and safe operation procedures before use. Training must be documented. New operators must be supervised until competency is verified.

Remember: A nail gun fires a steel fastener with enough force to penetrate bone. There is no margin for carelessness. Treat every trigger pull as a deliberate act, keep every safety device functional, and never point the tool at anything you are not ready to fasten.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Nail Gun Safety for Exterior Work'
);
