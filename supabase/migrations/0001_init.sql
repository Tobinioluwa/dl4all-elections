-- DL4All Nigeria Elections: schema, row-level security and the vote function.
-- Run once in the Supabase SQL editor (or with the Supabase CLI).

-- ---------- tables ----------
create table public.settings (
  id int primary key default 1 check (id = 1),
  title text not null default 'Executive Council Election',
  voting_open boolean not null default false,
  auto_approve boolean not null default false
);
insert into public.settings default values;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  state text,
  state_code text,
  role text check (role in ('state_president', 'lga_president')),
  lga text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions (id) on delete cascade,
  name text not null,
  tagline text not null default '',
  photo_url text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index candidates_position_idx on public.candidates (position_id);

-- Live tally. Anyone may read it. Only cast_vote() and reset_votes() change it.
create table public.vote_counts (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  votes int not null default 0
);

-- Who has voted (not what they chose). The ballot itself is secret.
create table public.ballots (
  voter_id uuid primary key references public.profiles (id) on delete cascade,
  receipt text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- A new auth user gets a profile. The very first account becomes the admin.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_user boolean;
  auto boolean;
  r text := nullif(meta ->> 'role', '');
begin
  perform pg_advisory_xact_lock(4242);
  select not exists (select 1 from public.profiles) into first_user;
  select auto_approve into auto from public.settings where id = 1;
  if not first_user and (r is null or r not in ('state_president', 'lga_president')) then
    raise exception 'Choose state president or LGA president';
  end if;
  if not first_user and (nullif(meta ->> 'state', '') is null or nullif(meta ->> 'state_code', '') is null) then
    raise exception 'State and state code are required';
  end if;
  if r = 'lga_president' and nullif(meta ->> 'lga', '') is null then
    raise exception 'LGA is required for an LGA president';
  end if;
  insert into public.profiles (id, email, full_name, state, state_code, role, lga, status, is_admin)
  values (
    new.id,
    new.email,
    coalesce(nullif(meta ->> 'full_name', ''), new.email),
    case when first_user then null else meta ->> 'state' end,
    case when first_user then null else upper(meta ->> 'state_code') end,
    case when first_user then null else r end,
    case when r = 'lga_president' and not first_user then meta ->> 'lga' end,
    case when first_user or auto then 'approved' else 'pending' end,
    first_user
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.add_count_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.vote_counts (candidate_id) values (new.id);
  return new;
end $$;

create trigger on_candidate_created
after insert on public.candidates
for each row execute function public.add_count_row();

-- ---------- voting ----------
-- choices: {"<position id>": "<candidate id>", ...}. One ballot per approved president.
create function public.cast_vote(choices jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  rcpt text;
  k text;
  cand uuid;
  n int := 0;
begin
  if uid is null then raise exception 'Sign in first'; end if;
  select * into p from public.profiles where id = uid;
  if p.status is distinct from 'approved' or p.role is null then
    raise exception 'Your account is not approved to vote';
  end if;
  if not (select voting_open from public.settings where id = 1) then
    raise exception 'Voting is closed';
  end if;
  rcpt := 'DL4-' || upper(substr(md5(random()::text || uid::text), 1, 6));
  begin
    insert into public.ballots (voter_id, receipt) values (uid, rcpt);
  exception when unique_violation then
    raise exception 'You have already voted';
  end;
  for k in select jsonb_object_keys(choices) loop
    cand := (choices ->> k)::uuid;
    if not exists (select 1 from public.candidates where id = cand and position_id = k::uuid) then
      raise exception 'Invalid choice';
    end if;
    update public.vote_counts set votes = votes + 1 where candidate_id = cand;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'Choose at least one candidate'; end if;
  return rcpt;
end $$;

create function public.reset_votes() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.ballots where true;
  update public.vote_counts set votes = 0 where true;
end $$;

revoke all on function public.cast_vote(jsonb) from public, anon;
revoke all on function public.reset_votes() from public, anon;
grant execute on function public.cast_vote(jsonb) to authenticated;
grant execute on function public.reset_votes() to authenticated;

-- ---------- row-level security ----------
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.vote_counts enable row level security;
alter table public.ballots enable row level security;

create policy settings_read on public.settings for select using (true);
create policy settings_admin_update on public.settings for update using (public.is_admin()) with check (public.is_admin());

create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create policy positions_read on public.positions for select using (true);
create policy positions_admin_write on public.positions for all using (public.is_admin()) with check (public.is_admin());

create policy candidates_read on public.candidates for select using (true);
create policy candidates_admin_write on public.candidates for all using (public.is_admin()) with check (public.is_admin());

create policy counts_read on public.vote_counts for select using (true);

-- A ballot row says who voted, never what they chose. Admins may see it to show turnout.
create policy ballots_read on public.ballots for select using (voter_id = auth.uid() or public.is_admin());

-- ---------- storage for candidate pictures ----------
insert into storage.buckets (id, name, public) values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do nothing;

create policy photos_read on storage.objects for select using (bucket_id = 'candidate-photos');
create policy photos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-photos' and public.is_admin());
create policy photos_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'candidate-photos' and public.is_admin());
create policy photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'candidate-photos' and public.is_admin());

-- ---------- realtime ----------
alter publication supabase_realtime add table public.vote_counts, public.settings, public.positions, public.candidates;

-- Lets the sign-up page know whether the first (admin) account exists yet,
-- without exposing any profile data to visitors who are not signed in.
create function public.has_accounts() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles)
$$;
grant execute on function public.has_accounts() to anon, authenticated;
