create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  name text not null default '',
  department text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;

update public.profiles p
set username = lower(coalesce(nullif(u.raw_user_meta_data ->> 'username', ''), split_part(p.email, '@', 1)))
from auth.users u
where p.id = u.id and nullif(p.username, '') is null;

update public.profiles
set username = lower(split_part(email, '@', 1))
where nullif(username, '') is null;

create unique index if not exists profiles_username_key on public.profiles (lower(username));
alter table public.profiles alter column username set not null;

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, name, department, role, status, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(coalesce(new.email, ''), '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'department', ''),
    case when lower(coalesce(new.raw_user_meta_data ->> 'username', '')) = 'csuhongbo' then 'admin' else 'member' end,
    case when lower(coalesce(new.raw_user_meta_data ->> 'username', '')) = 'csuhongbo' then 'approved' else 'pending' end,
    case when lower(coalesce(new.raw_user_meta_data ->> 'username', '')) = 'csuhongbo' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

update public.profiles
set role = 'member', updated_at = now()
where role = 'admin' and lower(username) <> 'csuhongbo';

update public.profiles
set role = 'admin', status = 'approved', approved_at = now(), updated_at = now()
where lower(username) = 'csuhongbo';
