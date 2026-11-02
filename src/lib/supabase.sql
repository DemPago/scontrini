-- Esegui questo nella SQL Editor di Supabase

-- ── Tabelle ──────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id      uuid primary key references auth.users on delete cascade,
  nome    text not null,
  cognome text not null
);

create table if not exists trips (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  slug       text not null,
  location   text not null,
  year       int  not null,
  month      int  not null,
  event_name text,
  status     text not null default 'open' check (status in ('open', 'closed')),
  excel_url  text,
  owner      text not null  -- auth.uid()::text
);

create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  trip_id      uuid not null references trips(id) on delete cascade,
  date         date not null,
  amount       numeric(10,2) not null,
  category     text not null check (category in ('pranzo','cena','trasporto','hotel','altro')),
  notes        text not null default '',
  receipt_url  text,
  receipt_path text
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table trips    enable row level security;
alter table expenses enable row level security;

-- profiles
create policy "Vedi proprio profilo"     on profiles for select using (auth.uid() = id);
create policy "Crea proprio profilo"     on profiles for insert with check (auth.uid() = id);
create policy "Aggiorna proprio profilo" on profiles for update using (auth.uid() = id);

-- trips
create policy "Vedi proprie trasferte"     on trips for select using (owner = auth.uid()::text);
create policy "Crea proprie trasferte"     on trips for insert with check (owner = auth.uid()::text);
create policy "Aggiorna proprie trasferte" on trips for update using (owner = auth.uid()::text);
create policy "Elimina proprie trasferte"  on trips for delete using (owner = auth.uid()::text);

-- expenses (autorizzazione via trip ownership)
create policy "Vedi proprie spese"
  on expenses for select using (
    trip_id in (select id from trips where owner = auth.uid()::text)
  );
create policy "Crea proprie spese"
  on expenses for insert with check (
    trip_id in (select id from trips where owner = auth.uid()::text)
  );
create policy "Aggiorna proprie spese"
  on expenses for update using (
    trip_id in (select id from trips where owner = auth.uid()::text)
  );
create policy "Elimina proprie spese"
  on expenses for delete using (
    trip_id in (select id from trips where owner = auth.uid()::text)
  );

-- ── Storage buckets e policy ──────────────────────────────────────────────────

-- Bucket receipts (scontrini allegati)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict do nothing;

-- Bucket exports (Excel chiusura trasferta)
insert into storage.buckets (id, name, public)
values ('exports', 'exports', true)
on conflict do nothing;

-- Policy receipts: path = {user_id}/{slug}/{timestamp}.{ext}
create policy "Upload scontrini propri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Lettura scontrini propri"
  on storage.objects for select to authenticated
  using  (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Eliminazione scontrini propri"
  on storage.objects for delete to authenticated
  using  (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

-- Policy exports: path = {user_id}/{filename}.xlsx
create policy "Upload export proprio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Lettura export proprio"
  on storage.objects for select to authenticated
  using  (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
