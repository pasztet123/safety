-- Topic → Checklist Suggestions
-- Allows admins to configure which checklists are auto-suggested
-- when a given safety topic is selected in a new meeting.

create table if not exists topic_checklist_suggestions (
  id            uuid default gen_random_uuid() primary key,
  topic_id      uuid not null references safety_topics(id) on delete cascade,
  checklist_id  uuid not null references checklists(id)    on delete cascade,
  created_at    timestamptz default now(),
  unique(topic_id, checklist_id)
);

create index if not exists idx_tcs_topic_id     on topic_checklist_suggestions(topic_id);
create index if not exists idx_tcs_checklist_id on topic_checklist_suggestions(checklist_id);
