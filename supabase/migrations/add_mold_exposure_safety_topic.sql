-- Add Mold Exposure on Job Sites Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Mold Exposure on Job Sites',
  'Chemical & Biological Hazards',
  'OSHA 29 CFR 1926.59; EPA Mold Remediation Guidelines',
  'Roofers and siding installers routinely encounter mold when removing old roofing, replacing damaged sheathing, or repairing areas of chronic moisture intrusion. Mold exposure during these operations is a significant but frequently underestimated health hazard. Mold spores become airborne during disturbance of infected materials and can cause respiratory disease, allergic reactions, and serious illness — especially for workers with asthma, compromised immune systems, or repeated high-level exposures on job after job. Knowing how to recognize, contain, and safely handle mold during exterior construction tasks protects your crew.

• Recognizing Mold During Roof and Siding Work
Mold commonly appears as black, green, gray, or white fuzzy growth on wood sheathing, OSB, rafters, and the underside of roofing materials where chronic moisture has been present. A musty or earthy odor when opening up a wall, ceiling, or roof assembly is a strong indicator of concealed mold. Dark staining on wood that bleaches in a diluted bleach test likely contains mold. Any time tear-off exposes heavily molded material, the scope of work must be reassessed.

• Scope Assessment and Customer Notification
A competent person should assess the extent of mold before continuing demolition. Discovering extensive mold may require halting demolition work, notifying the property owner, and engaging a licensed mold remediation contractor for large areas (greater than 10 square feet per the EPA guideline). Small isolated areas may be safely handled by trained construction workers using proper controls.

• Containment During Disturbance
When removing molded materials, do not dry-sweep or blow off debris with compressed air — this releases massive numbers of spores into the air. Wet materials slightly before removal to suppress spore release. Use polyethylene sheeting to prevent spore spread to other areas of the building or the ground around the structure. Double-bag molded debris in heavy-duty plastic bags before disposal. Seal bags immediately.

• Respiratory Protection
When working with visibly molded materials, wear a minimum N95 respirator properly fitted to the face. For large mold areas, extensive disturbance, or sensitive workers, a half-face respirator with P100 particulate filters provides substantially better protection. Disposable dust masks do not provide adequate protection for mold spore exposure.

• Skin and Eye Protection
Mold contact with skin and eyes can cause irritation and allergic reactions. Wear nitrile or rubber gloves. Cover exposed skin with long sleeves. Wear safety glasses with side shields when breaking apart or removing heavily molded material. Wash hands and exposed skin thoroughly with soap and water after work.

• Post-Removal Cleaning
After removing molded materials, clean all tools, equipment, and personal protective equipment before removing them from the containment area. HEPA vacuuming of surfaces is more effective than air blowing for cleanup. Inspect the work area and document what was found and removed for both your records and the property owner.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Mold Exposure on Job Sites'
);
