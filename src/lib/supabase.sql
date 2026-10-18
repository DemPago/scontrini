-- Esegui questo nella SQL Editor di Supabase

create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  date         date not null,
  amount       numeric(10,2) not null,
  category     text not null check (category in ('pranzo','cena','trasporto','hotel','altro')),
  notes        text not null default '',
  receipt_url  text,
  receipt_path text
);

-- Storage bucket (oppure crealo dalla dashboard Supabase)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict do nothing;
