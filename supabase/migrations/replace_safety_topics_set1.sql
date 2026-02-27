-- Clear existing safety topics and add new ones
DELETE FROM safety_topics;

-- Insert new safety topics based on requirements
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level) VALUES
(
  'Accident Investigation',
  'Incident Management',
  NULL,
  'Accidents are unplanned and unexpected events that cause injury, property damage, and/or financial loss in the workplace. Incidents or "near misses" don''t result in loss, but have the potential to do so.

• Being Prepared
Ideally, safety programs focus on preventing accidents and incidents, but if one occurs, have an accident investigation procedure ready and train your employees how to use it. Investigate ALL accidents and injuries; the severity determines the extent of the investigation. Handled properly, accident investigation helps you look at problems, solve them, improve your safety programs, and prevent future accidents.

• Why?
Accident investigation should prevent recurrence. Adhering strictly to fact finding in a neutral, non-confrontational manner identifies the true attitudes, behaviors, and other factors that led to the problem. Analyzing facts and asking a neutral ''why?'' question helps find the root cause of the accident. For example, if employee error caused the accident, dig further to determine why the employee made the error.

• Get the Facts
Accident investigation should not be used to blame, punish or exonerate workers and managers; true facts will not emerge in this environment. If you investigate an accident just to complete paperwork and satisfy insurance requirements, you will erode confidence in the system and you won''t achieve your goal of prevention and loss reduction.

• Expert Opinion
A supervisor in the affected area is the best person to conduct an investigation because they are most familiar with the tools, equipment, and people involved. Experts in equipment, outside agencies, and other technical resources may also be needed.

• Investigation How-To
Start your investigation by securing the scene, placing equipment out of service if necessary, and taking photos. Interview victims and witnesses. Collect evidence and records and document your observations. Find the contributing factors to determine the accident''s root cause. Document the recommended corrective actions, the people assigned to complete them, and a due date for completion.',
  'high'
),
(
  'Accidents - Before and After',
  'Safety Culture',
  NULL,
  'Generally hazardous conditions come to our attention only after someone is hurt or seriously injured. If you see an unsafe act or unsafe condition, don''t ignore it and gamble on you or a friend not getting hurt. If you notice someone working in an unsafe manner, let that person know.

• Accident Investigation
A. Investigations can produce information we can use to prevent a similar mishap from occurring in the future.
B. Some persons, however, mistakenly believe that accident investigation is used to put the blame on someone and so they refuse to cooperate.

• Cooperate With Investigation
A. When the investigator asks questions about the accident, give the facts as you saw them.
B. If you omit or change information to protect someone, how can we accurately determine the causes and help prevent the same thing from happening again?

• If You See An Accident
A. Make a mental note of everything that occurred and the condition that existed before the accident.
B. Write down all the events of what you can remember.
C. Work with the project management team in the investigation.

• Action Items
1. Review incident review procedures.
2. Review past incidents on the project.
3. Review first aid and recordable for the company.',
  'medium'
),
(
  'Advice for New Hires',
  'Orientation & Training',
  NULL,
  'Look around. Do you see many familiar faces? If not, you must either be new to construction, new to the company, or new to this project. Don''t worry. Remember that at one point, every one of us was new. Regardless of how long you''ve worked here, today we''re going to talk about some critical things you need to do to stay safe, to avoid causing accidents, and to go home in one piece at the end of the day.

• What is the most important thing you can do today?
Take every step necessary to make sure you are working safely. Think about safety before and during every task.

• What is the most important thing you can acknowledge today?
That you don''t know everything. Ask questions. If you don''t know something, or understand a process, ask a co-worker, the foreman, or the safety officer. They''ll make time to explain. You might be a little embarrassed to ask the question, but you might be dead if you don''t.

• What is the most important thing you can wear?
Always wear the personal protective equipment (PPE) that''s required on the jobsite and required for job you need to do. PPE includes a hard hat, safety glasses, gloves, high-visibility clothing, and work boots. After additional training, you may be required to wear hearing protection, a respirator, fall protection, etc.

• What should you read?
Read and understand the signs and placards around the site. They are posted strategically throughout the project to inform you about PPE requirements and danger zones. Read the Safety Data Sheets (SDSs) and labels for the chemicals you use. Read the operator''s manual before using any tool or equipment.

• What should you never do?
Never take shortcuts. Don''t make do; use the right tool for the job every time. Never participate in horseplay. If you need to blow off steam, take a break and go for a walk.

• What should you always do?
Follow rules and regulations. They are there to protect you. Stay hydrated by drinking lots of fluids (not caffeine, or alcohol). Keep track if your tools and take good care of them. Think before you act.

• What should you be prepared for?
Be prepared for emergencies. Learn what to do in case of severe weather or a fire. Find out where fire extinguishers are located and how to use them just in case you need one. Know where to go to get first-aid treatment in case you get injured. Learn how to call emergency services.

• How will you learn more?
Get all the training that you can. Take safety training seriously and really pay attention. Ask questions. Take notes - writing will help you understand and remember. Knowledge is a powerful tool you can never get enough.

• SAFETY REMINDER
If you are under 18, you cannot drive a forklift, use power saws, work on roofs, work in excavations, drive vehicles, or work as a flagger.',
  'medium'
),
(
  'Aerial Equipment & Electrical Hazards',
  'Electrical Safety',
  NULL,
  'Job Steps Affected by Today''s Topic
• Using aerial lifts to do tree work near utility lines
• Using tree cranes to do tree work near utility lines

• Potential Hazards/Risks
• Electricity
• Non-insulated aerial lifts
• Electrically charged chippers
• Dirty insulated aerial lifts

• Action Steps
• Always know where the utility lines are in relation to you and your equipment.
• Never work with your back to the wires or move a bucket into position without looking where you are going.
• Maintain a safe working distance from the wires

• PPE advised for this job function
• Hard Hat
• Safety Goggles
• Gloves
• Closed Toe Work Boots
• Ear Protection',
  'critical'
),
(
  'Aerial Lift Safety',
  'Equipment Safety',
  NULL,
  'You may have several aerial lifts (JLG, Snorkel, scissor lifts, articulating boom platforms, etc.) around your facility. Today we''re going to review some safety tips for those working in and around this equipment.

• Safety Tips
• As with other powered vehicles, inspect the lift prior to utilizing it. Walk around and ensure there are no leaks, check to ensure all the controls are functioning correctly.
• Never walk under the boom to gain access to the platform.
• Only utilize the lift on level ground.
• Only stand on the platform floor. Never stand or sit on the railing.
• Always look in the direction the machine is moving.
• Do not rest the boom or basket on a steel structure of any kind.
• Wear safety harnesses and tie-off to the manufacture provided anchorage point within the platform at all times when you''re in the basket. This includes when you are lowered and moving the equipment to another location.
• Keep your hands in the external portion of the basket when raising or lowering the basket.
• Ensure that a fire extinguisher is mounted in the basket when performing activities that present a fire hazard such as welding or grinding. Ensure you have a fire watch person below.
• Except in a case of an emergency, ground controls shall not be operated on an occupied lift (lift occupant shall be in full control of the lift at all times).',
  'high'
);
