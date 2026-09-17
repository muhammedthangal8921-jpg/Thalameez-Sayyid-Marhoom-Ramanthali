-- Fasthabiqul Khairath 2026 — Supabase database setup
-- Run this once in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  place text not null check (char_length(place) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null,
  programme_id text not null,
  points numeric(10,2) not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  unique (participant_id, programme_id)
);

create table if not exists public.team_scores (
  id uuid primary key default gen_random_uuid(),
  team_id text not null,
  programme_id text not null,
  points numeric(10,2) not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  unique (team_id, programme_id)
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Melaad Fest 2026',
  file_url text not null,
  file_path text not null,
  media_type text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admins enable row level security;
alter table public.visitors enable row level security;
alter table public.scores enable row level security;
alter table public.team_scores enable row level security;
alter table public.gallery enable row level security;

-- Admins can verify only their own approved email row.
drop policy if exists "approved admin can read own row" on public.admins;
create policy "approved admin can read own row"
on public.admins for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Visitors may submit name/place, but the public cannot read the visitor list.
drop policy if exists "public can register visit" on public.visitors;
create policy "public can register visit"
on public.visitors for insert
to anon, authenticated
with check (true);

drop policy if exists "admin can read visitors" on public.visitors;
create policy "admin can read visitors"
on public.visitors for select
to authenticated
using (public.is_admin());

-- Score data is public to read, admin-only to change.
drop policy if exists "public can read scores" on public.scores;
create policy "public can read scores"
on public.scores for select
to anon, authenticated
using (true);

drop policy if exists "admin can insert scores" on public.scores;
create policy "admin can insert scores"
on public.scores for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin can update scores" on public.scores;
create policy "admin can update scores"
on public.scores for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin can delete scores" on public.scores;
create policy "admin can delete scores"
on public.scores for delete
to authenticated
using (public.is_admin());

-- Direct team/group scores are public to read, admin-only to change.
drop policy if exists "public can read team scores" on public.team_scores;
create policy "public can read team scores"
on public.team_scores for select
to anon, authenticated
using (true);

drop policy if exists "admin can insert team scores" on public.team_scores;
create policy "admin can insert team scores"
on public.team_scores for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin can update team scores" on public.team_scores;
create policy "admin can update team scores"
on public.team_scores for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin can delete team scores" on public.team_scores;
create policy "admin can delete team scores"
on public.team_scores for delete
to authenticated
using (public.is_admin());

-- Gallery metadata is public to read, admin-only to change.
drop policy if exists "public can read gallery" on public.gallery;
create policy "public can read gallery"
on public.gallery for select
to anon, authenticated
using (true);

drop policy if exists "admin can insert gallery" on public.gallery;
create policy "admin can insert gallery"
on public.gallery for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin can update gallery" on public.gallery;
create policy "admin can update gallery"
on public.gallery for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin can delete gallery" on public.gallery;
create policy "admin can delete gallery"
on public.gallery for delete
to authenticated
using (public.is_admin());

-- API permissions (RLS policies above still control actual access).
grant select on public.admins to authenticated;
grant insert on public.visitors to anon, authenticated;
grant select on public.visitors to authenticated;
grant select on public.scores, public.team_scores, public.gallery to anon, authenticated;
grant insert, update, delete on public.scores, public.team_scores, public.gallery to authenticated;

-- Public gallery storage bucket.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

-- Storage policies.
drop policy if exists "public can view gallery media" on storage.objects;
create policy "public can view gallery media"
on storage.objects for select
to public
using (bucket_id = 'gallery');

drop policy if exists "admin can upload gallery media" on storage.objects;
create policy "admin can upload gallery media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "admin can update gallery media" on storage.objects;
create policy "admin can update gallery media"
on storage.objects for update
to authenticated
using (bucket_id = 'gallery' and public.is_admin())
with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "admin can delete gallery media" on storage.objects;
create policy "admin can delete gallery media"
on storage.objects for delete
to authenticated
using (bucket_id = 'gallery' and public.is_admin());

-- IMPORTANT: replace the email below with the admin email you want to authorize.
-- Add more rows later if you want more than one admin.
insert into public.admins (email)
values ('YOUR-ADMIN-EMAIL@example.com')
on conflict (email) do nothing;

-- For instant public score refresh, enable Realtime for public.scores and public.team_scores
-- in Supabase Dashboard -> Database -> Replication / Realtime.
