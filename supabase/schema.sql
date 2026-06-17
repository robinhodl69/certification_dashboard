create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null unique,
  is_admin boolean not null default false,
  can_view_ranking boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subscores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sub_id text not null,
  value int not null check (value in (0, 25, 50, 75, 100)),
  updated_at timestamptz not null default now(),
  unique(user_id, sub_id)
);

alter table public.profiles enable row level security;
alter table public.subscores enable row level security;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and is_admin = true
  );
$$;

create or replace function public.can_view_global(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and (is_admin = true or can_view_ranking = true)
  );
$$;

drop policy if exists "profiles_select_private_or_global" on public.profiles;
create policy "profiles_select_private_or_global"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.can_view_global(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and is_admin = false and can_view_ranking = false);

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "subscores_select_private_or_global" on public.subscores;
create policy "subscores_select_private_or_global"
on public.subscores
for select
to authenticated
using (auth.uid() = user_id or public.can_view_global(auth.uid()));

drop policy if exists "subscores_insert_own" on public.subscores;
create policy "subscores_insert_own"
on public.subscores
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "subscores_update_own" on public.subscores;
create policy "subscores_update_own"
on public.subscores
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "subscores_delete_own" on public.subscores;
create policy "subscores_delete_own"
on public.subscores
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists subscores_user_id_idx on public.subscores(user_id);

-- Run this after your first login to make your account admin:
-- update public.profiles set is_admin = true, can_view_ranking = true where email = 'tu-correo@dominio.com';
