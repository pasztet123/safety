-- Add predefined safety checklists organized by category

-- I. Daily Jobsite Safety
INSERT INTO checklists (name, category, description) VALUES
('Daily Jobsite Safety Inspection', 'Daily Jobsite Safety', 'Comprehensive daily inspection of overall jobsite safety conditions'),
('Daily Supervisor Walkthrough', 'Daily Jobsite Safety', 'Supervisor daily safety walkthrough checklist'),
('Pre-Task Safety Check', 'Daily Jobsite Safety', 'Safety verification before starting any task'),
('Morning Safety Compliance Check', 'Daily Jobsite Safety', 'Morning review of safety compliance across the site'),
('End-of-Day Site Condition Check', 'Daily Jobsite Safety', 'End-of-shift site safety condition assessment'),
('High-Risk Activity Verification', 'Daily Jobsite Safety', 'Verification checklist for high-risk activities'),
('Housekeeping Inspection', 'Daily Jobsite Safety', 'Site cleanliness and organization inspection'),
('PPE Compliance Check', 'Daily Jobsite Safety', 'Personal protective equipment compliance verification'),
('Weather Condition Assessment', 'Daily Jobsite Safety', 'Assessment of weather impact on safety'),
('Site Access & Egress Check', 'Daily Jobsite Safety', 'Verification of safe site entry and exit points');

-- II. Fall Protection
INSERT INTO checklists (name, category, description) VALUES
('Roof Edge Protection Inspection', 'Fall Protection', 'Inspection of roof edge protection systems'),
('Fall Protection System Inspection', 'Fall Protection', 'Comprehensive fall protection system check'),
('Anchor Point Verification', 'Fall Protection', 'Verification of anchor point integrity and certification'),
('Guardrail System Inspection', 'Fall Protection', 'Guardrail system condition and installation check'),
('Personal Fall Arrest System Inspection', 'Fall Protection', 'PFAS equipment and setup inspection'),
('Warning Line System Inspection', 'Fall Protection', 'Warning line system installation and condition check'),
('Roof Hatch Safety Check', 'Fall Protection', 'Roof hatch safety features and protection verification'),
('Skylight Protection Inspection', 'Fall Protection', 'Skylight covers and protection system check');

-- III. Ladder & Access Equipment
INSERT INTO checklists (name, category, description) VALUES
('Ladder Pre-Use Inspection', 'Ladder & Access Equipment', 'Pre-use safety inspection of ladder equipment'),
('Ladder Weekly Inspection', 'Ladder & Access Equipment', 'Weekly comprehensive ladder condition check'),
('Fixed Ladder Inspection', 'Ladder & Access Equipment', 'Inspection of permanently installed ladders'),
('Stair Tower Inspection', 'Ladder & Access Equipment', 'Stair tower safety and stability check'),
('Temporary Access Inspection', 'Ladder & Access Equipment', 'Temporary access structure inspection'),
('Extension Ladder Setup Verification', 'Ladder & Access Equipment', 'Extension ladder proper setup and angle verification');

-- IV. Scaffold Safety
INSERT INTO checklists (name, category, description) VALUES
('Scaffold Daily Inspection', 'Scaffold Safety', 'Daily scaffold safety inspection'),
('Scaffold Weekly Inspection', 'Scaffold Safety', 'Comprehensive weekly scaffold inspection'),
('Scaffold After Weather Event Inspection', 'Scaffold Safety', 'Post-weather event scaffold condition check'),
('Mobile Scaffold Inspection', 'Scaffold Safety', 'Mobile scaffold stability and safety check'),
('Suspended Scaffold Inspection', 'Scaffold Safety', 'Suspended scaffold system inspection'),
('Scaffold Tag Verification', 'Scaffold Safety', 'Verification of scaffold tags and certifications');

-- V. Electrical Safety
INSERT INTO checklists (name, category, description) VALUES
('Temporary Power Inspection', 'Electrical Safety', 'Temporary power installation safety check'),
('Extension Cord Inspection', 'Electrical Safety', 'Extension cord condition and rating verification'),
('GFCI Verification', 'Electrical Safety', 'Ground fault circuit interrupter testing and verification'),
('Lockout/Tagout Verification', 'Electrical Safety', 'LOTO procedure compliance verification'),
('Electrical Panel Inspection', 'Electrical Safety', 'Electrical panel safety and labeling inspection'),
('Generator Safety Inspection', 'Electrical Safety', 'Generator operation and safety check');

-- VI. Tools & Machinery
INSERT INTO checklists (name, category, description) VALUES
('Power Tool Pre-Use Inspection', 'Tools & Machinery', 'Pre-use safety check for power tools'),
('Equipment Pre-Start Inspection', 'Tools & Machinery', 'Equipment safety verification before operation'),
('Heavy Equipment Daily Inspection', 'Tools & Machinery', 'Daily heavy equipment safety inspection'),
('Forklift Pre-Use Inspection', 'Tools & Machinery', 'Forklift daily safety inspection'),
('Crane Pre-Operation Inspection', 'Tools & Machinery', 'Crane pre-operation safety checklist'),
('Machine Guarding Verification', 'Tools & Machinery', 'Machine guard installation and condition check'),
('Compressed Air Tool Inspection', 'Tools & Machinery', 'Compressed air tool and connection inspection');

-- VII. PPE
INSERT INTO checklists (name, category, description) VALUES
('PPE Availability Check', 'PPE', 'Verification of PPE availability on site'),
('PPE Condition Inspection', 'PPE', 'Personal protective equipment condition check'),
('Fall Protection Harness Inspection', 'PPE', 'Fall protection harness condition and fit inspection'),
('Respiratory Protection Check', 'PPE', 'Respiratory protection equipment verification'),
('Hearing Protection Compliance Check', 'PPE', 'Hearing protection requirement compliance'),
('High-Visibility Gear Inspection', 'PPE', 'High-visibility clothing condition and compliance');

-- VIII. Fire & Emergency Preparedness
INSERT INTO checklists (name, category, description) VALUES
('Fire Extinguisher Monthly Inspection', 'Fire & Emergency Preparedness', 'Monthly fire extinguisher inspection and documentation'),
('Emergency Exit Inspection', 'Fire & Emergency Preparedness', 'Emergency exit accessibility and signage check'),
('First Aid Kit Inspection', 'Fire & Emergency Preparedness', 'First aid kit contents and expiration check'),
('Emergency Response Equipment Check', 'Fire & Emergency Preparedness', 'Emergency response equipment readiness verification'),
('Hot Work Area Inspection', 'Fire & Emergency Preparedness', 'Hot work area safety and fire prevention check'),
('Evacuation Route Verification', 'Fire & Emergency Preparedness', 'Evacuation route clarity and accessibility check');

-- IX. Excavation & Trenching
INSERT INTO checklists (name, category, description) VALUES
('Excavation Daily Inspection', 'Excavation & Trenching', 'Daily excavation site safety inspection'),
('Trench Protective System Inspection', 'Excavation & Trenching', 'Trench protection system integrity check'),
('Soil Classification Verification', 'Excavation & Trenching', 'Soil type classification and documentation'),
('Shoring System Inspection', 'Excavation & Trenching', 'Shoring system installation and condition check'),
('Spoil Pile Placement Check', 'Excavation & Trenching', 'Spoil pile distance and stability verification'),
('Underground Utility Verification', 'Excavation & Trenching', 'Underground utility location and clearance verification');

-- X. Roofing Specific
INSERT INTO checklists (name, category, description) VALUES
('Roofing Work Zone Inspection', 'Roofing Specific', 'Roofing work zone safety setup inspection'),
('Material Staging Safety Check', 'Roofing Specific', 'Roof material staging location and safety check'),
('Roof Loading Verification', 'Roofing Specific', 'Roof load capacity and distribution verification'),
('Tool Securing Verification', 'Roofing Specific', 'Verification that tools are properly secured'),
('Weather Impact Assessment for Roofing', 'Roofing Specific', 'Weather conditions assessment for roofing work'),
('Torch-Down Safety Inspection', 'Roofing Specific', 'Torch-down roofing safety setup and procedures');

-- XI. Sheet Metal / Sharp Material Handling
INSERT INTO checklists (name, category, description) VALUES
('Sharp Edge Handling Inspection', 'Sheet Metal / Sharp Material Handling', 'Sharp edge material handling safety check'),
('Sheet Metal Storage Inspection', 'Sheet Metal / Sharp Material Handling', 'Sheet metal storage safety and organization'),
('Cutting Station Safety Check', 'Sheet Metal / Sharp Material Handling', 'Cutting station setup and safety verification'),
('Bending Machine Inspection', 'Sheet Metal / Sharp Material Handling', 'Bending machine safety features and operation'),
('Coil Storage Safety Check', 'Sheet Metal / Sharp Material Handling', 'Metal coil storage stability and safety');

-- XII. Vehicle & Traffic Control
INSERT INTO checklists (name, category, description) VALUES
('Company Vehicle Inspection', 'Vehicle & Traffic Control', 'Company vehicle safety and condition check'),
('Traffic Control Setup Inspection', 'Vehicle & Traffic Control', 'Traffic control device placement and visibility'),
('Spotter Protocol Verification', 'Vehicle & Traffic Control', 'Vehicle spotter procedures compliance check'),
('Loading Zone Inspection', 'Vehicle & Traffic Control', 'Loading zone safety and clearance verification'),
('Delivery Area Safety Check', 'Vehicle & Traffic Control', 'Delivery area organization and safety');

-- XIII. Environmental & Weather
INSERT INTO checklists (name, category, description) VALUES
('Heat Stress Preparedness Check', 'Environmental & Weather', 'Heat illness prevention measures verification'),
('Cold Stress Preparedness Check', 'Environmental & Weather', 'Cold weather protection measures check'),
('Wind Hazard Assessment', 'Environmental & Weather', 'Wind speed and work restriction assessment'),
('Storm Preparation Checklist', 'Environmental & Weather', 'Pre-storm site securing checklist'),
('Dust Control Inspection', 'Environmental & Weather', 'Dust control measures verification'),
('Spill Prevention Inspection', 'Environmental & Weather', 'Spill prevention and containment check');

-- XIV. Confined Space
INSERT INTO checklists (name, category, description) VALUES
('Confined Space Entry Checklist', 'Confined Space', 'Confined space entry permit and safety checklist'),
('Air Monitoring Verification', 'Confined Space', 'Confined space air quality monitoring verification'),
('Permit Verification', 'Confined Space', 'Confined space entry permit completeness check'),
('Rescue Plan Verification', 'Confined Space', 'Confined space rescue plan and equipment verification');

-- XV. Hazard Communication
INSERT INTO checklists (name, category, description) VALUES
('SDS Availability Check', 'Hazard Communication', 'Safety Data Sheet availability and accessibility'),
('Chemical Storage Inspection', 'Hazard Communication', 'Chemical storage safety and labeling inspection'),
('Labeling Compliance Check', 'Hazard Communication', 'Hazardous material labeling compliance'),
('Hazard Communication Board Verification', 'Hazard Communication', 'HazCom board current information verification');

-- XVI. Administrative / Documentation
INSERT INTO checklists (name, category, description) VALUES
('OSHA Poster Verification', 'Administrative / Documentation', 'Required OSHA poster display verification'),
('Safety Documentation Audit', 'Administrative / Documentation', 'Safety documentation completeness audit'),
('Certification Expiry Check', 'Administrative / Documentation', 'Safety certifications expiration date check'),
('Training Record Verification', 'Administrative / Documentation', 'Worker training records verification'),
('Subcontractor Safety Compliance Check', 'Administrative / Documentation', 'Subcontractor safety program compliance review');

-- XVII. Incident Follow-Up
INSERT INTO checklists (name, category, description) VALUES
('Post-Incident Site Review', 'Incident Follow-Up', 'Site review following an incident'),
('Corrective Action Verification', 'Incident Follow-Up', 'Verification of corrective action implementation'),
('Re-Inspection After Repair', 'Incident Follow-Up', 'Post-repair safety re-inspection'),
('Safety Stand-Down Verification', 'Incident Follow-Up', 'Safety stand-down completion and documentation');

-- XVIII. Long-Term / Periodic
INSERT INTO checklists (name, category, description) VALUES
('Monthly Site Safety Audit', 'Long-Term / Periodic', 'Comprehensive monthly site safety audit'),
('Quarterly Equipment Audit', 'Long-Term / Periodic', 'Quarterly safety equipment inventory and condition'),
('Annual Safety Program Review', 'Long-Term / Periodic', 'Annual comprehensive safety program review'),
('Annual Fall Protection System Audit', 'Long-Term / Periodic', 'Annual fall protection system comprehensive audit'),
('Annual Fire Equipment Certification Review', 'Long-Term / Periodic', 'Annual fire safety equipment certification review');
