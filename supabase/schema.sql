-- Schema für die Prototypen (E: Prognosen, A: SCT-Panel, alle: Feedback).
-- Im Supabase SQL-Editor ausführen. Projekt in einer EU-Region anlegen.

create table participants (
  id uuid primary key,                 -- im Browser erzeugt, in localStorage gespeichert
  name text not null,
  league text not null default 'offen',
  created_at timestamptz not null default now()
);

create table questions (
  id text primary key,
  league text not null default 'offen',
  title text not null,
  details text,
  category text,                       -- ausweisung | netz | recht | markt | ausbau
  close_date date not null,
  resolution_source text,
  practice boolean not null default false,
  outcome boolean,                     -- null = noch offen
  resolved_at timestamptz,
  verify boolean not null default false
);

create table forecasts (
  id bigint generated always as identity primary key,
  question_id text not null references questions(id),
  participant_id uuid not null references participants(id),
  probability numeric not null check (probability between 0 and 1),
  reason text,
  created_at timestamptz not null default now()
);

create table sct_panel (
  id bigint generated always as identity primary key,
  item_id text not null,
  expert text not null,
  value int not null check (value between -2 and 2),
  created_at timestamptz not null default now()
);

create table feedback (
  id bigint generated always as identity primary key,
  prototype text not null check (prototype in ('a', 'b', 'c', 'd', 'e')),
  tester text,
  realism int check (realism between 1 and 5),
  aha text,
  would_return boolean,
  willingness_to_pay text,
  comment text,
  payload jsonb,                       -- z. B. AAR-Antworten aus D, Punktestand aus A
  created_at timestamptz not null default now()
);

alter table participants enable row level security;
alter table questions    enable row level security;
alter table forecasts    enable row level security;
alter table sct_panel    enable row level security;
alter table feedback     enable row level security;

create policy read_questions    on questions    for select to anon using (true);
create policy read_participants on participants for select to anon using (true);
create policy add_participant   on participants for insert to anon with check (true);
create policy read_forecasts    on forecasts    for select to anon using (true);
create policy add_forecast      on forecasts    for insert to anon with check (true);
create policy read_panel        on sct_panel    for select to anon using (true);
create policy add_panel         on sct_panel    for insert to anon with check (true);
create policy add_feedback      on feedback     for insert to anon with check (true);

-- Das reicht für einen Test mit eingeladenen Personen, nicht für die Öffentlichkeit.
-- Dass fremde Prognosen erst nach der eigenen sichtbar werden, regelt nur die Oberfläche.
-- Keine echten Projektdaten eintragen.
