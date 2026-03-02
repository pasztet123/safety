INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Heat on Roof Surfaces (Surface Temperature Hazard)',
  'Weather & Environmental Hazards',
  'OSHA 29 CFR 1926.28; NIOSH Heat Stress Guidelines',
  'Roof surfaces in direct summer sun can reach 150–180°F on dark membranes and metal panels — temperatures that cause burns on contact within seconds, degrade adhesives and sealants, compromise membrane integrity, and create conditions that push workers into heat exhaustion or heat stroke within a single shift. Air temperature alone does not capture the true hazard. A 90°F day with high humidity and full sun on a black TPO roof is a life-safety condition, not a discomfort. Every crew working in these conditions must have defined monitoring, work practices, PPE, and shutdown thresholds in place before work begins.

• Pre-Shift Assessment and Work Planning
Air temperature and heat index must be recorded before the shift begins — not just ambient temperature, because humidity multiplies heat load on the body. Roof surface temperature must be measured with an infrared thermometer and compared against the company-defined safety threshold before workers are allowed onto the surface. Work schedules must be adjusted to avoid peak heat hours (typically 10 AM to 2 PM in summer), and high-exertion tasks — tear-off, heavy material staging, framing — must be prioritized for early morning. These scheduling adjustments are not optional when surface temperatures exceed threshold; they are a required control measure.

• Hydration and Rest
Water must be available and easily accessible on the roof — not just at the ground level. Workers must be actively encouraged to hydrate at regular intervals, typically every 15 to 20 minutes, without waiting until thirsty. Electrolyte replacement must be available when conditions are extreme or when workers are sweating heavily over extended periods. Rest breaks must be scheduled and enforced — not left to workers to self-regulate, because the early stages of heat illness impair judgment and self-awareness. A shaded break area must be available for the crew; shade breaks interrupt heat accumulation in the body and are one of the most effective preventive controls available.

• PPE and Physical Controls
Reflective or light-colored clothing and PPE must be used where appropriate to reduce radiant heat absorption. Gloves suitable for high surface temperatures must be worn whenever workers are in contact with roof materials — membrane, metal flashing, and fasteners can all cause contact burns. Knee pads must be used to reduce direct contact heat exposure when kneeling is required. Direct kneeling on hot membrane surfaces must be avoided where possible — surface temperatures that feel manageable through clothing can still cause burns over time. All metal surfaces must be tested before contact; metal flashing, drip edge, and exposed fasteners absorb and retain heat at levels that cause immediate burns to bare skin.

• Material and Equipment Management
Tools must be checked for overheating before use — handles and grips can become dangerously hot and affect safe control of equipment. Adhesives, sealants, and caulking compounds must be stored in a shaded area; many formulations degrade, off-gas, or lose performance properties when stored at elevated temperatures. Membrane softening must be evaluated before staging materials directly on the surface — hot membranes are more susceptible to puncture and deformation under load. Heat-sensitive materials, including underlayment rolls and self-adhered products, must be protected from direct sun exposure before installation.

• Worker Health Monitoring and Acclimatization
Workers must be monitored for signs of heat exhaustion and heat stroke throughout the shift: heavy sweating, weakness, dizziness, nausea, headache, confusion, and cessation of sweating are all warning signs requiring immediate response. A buddy system must be implemented during extreme heat conditions — workers in early-stage heat illness often cannot recognize their own impairment. New workers must be acclimatized gradually to heat exposure over 7 to 14 days, starting with shorter high-heat exposures and building tolerance; new employees and workers returning from extended absence are at significantly elevated risk.

• Stop-Work Thresholds and Emergency Response
A stop-work threshold must be defined for extreme surface and ambient temperatures and communicated to the crew before the shift begins. Work must be paused immediately if any worker shows symptoms of heat stress — this is not a judgment call left to the affected worker. The emergency response plan for heat illness must be reviewed with the crew, including the location of the nearest shade and water, emergency contact numbers, and first aid procedures for heat exhaustion and heat stroke. Supervisor authorization is required before work continues under high-heat conditions once a stop-work threshold has been reached or a heat illness event has occurred. No schedule pressure justifies returning workers to a hot roof surface before conditions or the affected worker''s condition have been fully evaluated.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Heat on Roof Surfaces (Surface Temperature Hazard)'
);
