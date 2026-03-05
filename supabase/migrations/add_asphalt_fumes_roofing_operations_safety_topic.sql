-- Add Asphalt Fumes – Roofing Operations Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Asphalt Fumes – Roofing Operations',
  'Chemical & Biological Hazards',
  'OSHA 29 CFR 1926.59; NIOSH 2003-112',
  'Hot asphalt used in built-up roofing, modified bitumen application, and kettle operations releases complex mixtures of fumes containing polycyclic aromatic hydrocarbons (PAHs), hydrogen sulfide, and other hazardous compounds. Short-term exposure causes eye, nose, and throat irritation, headaches, and nausea. Repeated long-term exposure is associated with increased cancer risk. NIOSH classifies asphalt fumes as potentially carcinogenic. Proper controls and PPE are not optional — they are legally required and protect long-term health.

• Where Asphalt Fumes Are Generated
Fumes are produced at every point where asphalt is heated: at the kettle, during mop application, at seams during torch-down work, and when walking on freshly applied hot material. The highest exposures occur at the kettle and immediately downwind of it. Wind direction determines who is in the fume path — position yourself and your crew accordingly.

• Engineering and Work Practice Controls
Use the lowest application temperature that meets product specifications — higher temperatures exponentially increase fume generation. Keep kettle lids closed when not actively drawing asphalt. Position the kettle crosswind or upwind of the crew. If working in an enclosed or poorly ventilated area, mechanical exhaust ventilation is required. Minimize crew time in the fume zone during peak-emission activities.

• Respiratory Protection
When engineering controls cannot reduce exposures to acceptable levels — especially during kettle loading, hot mop application, and torch work in enclosed spaces — respiratory protection is required. Use a half-face respirator with organic vapor cartridges plus P100 particulate filters. Cartridges must be changed at the end of every shift or when any breakthrough odor is detected, whichever comes first. Respirators must be fit-tested annually and stored properly to preserve cartridge integrity.

• Skin and Eye Protection
Asphalt fumes and splatter cause skin and eye irritation. Wear safety glasses with side shields as a minimum. When working at the kettle or mopping, wear a face shield over safety glasses. Cover exposed skin — long sleeves and gloves rated for hot work. Wash hands and exposed skin with soap and water before eating, drinking, or using tobacco. Barrier creams can help reduce skin contact.

• Monitoring Symptoms
Symptoms of acute overexposure: headache, dizziness, eye burning, nausea, and skin irritation. If any worker reports these symptoms, move them to fresh air immediately and evaluate whether controls are adequate. Persistent headaches or respiratory symptoms after an exposure event must be evaluated by a physician.

• Ventilation in Enclosed Spaces
Never use a kettle in an enclosed space without mechanical ventilation. In partially enclosed spaces (covered porches, atriums), monitor air quality and increase ventilation before and during work. Carbon monoxide and hydrogen sulfide from hot asphalt can reach dangerous concentrations rapidly in enclosed areas.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Asphalt Fumes – Roofing Operations'
);
