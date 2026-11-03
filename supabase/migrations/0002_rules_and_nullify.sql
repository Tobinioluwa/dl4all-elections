-- Run this in the Supabase SQL editor AFTER 0001_init.sql (it is safe on a live database).
-- Adds: voters must accept the election rules; admins can nullify one person's vote.

alter table public.profiles add column rules_accepted_at timestamptz;
alter table public.ballots add column nullified_at timestamptz;
alter table public.ballots add column nullified_reason text;

-- Needed so a single vote can be taken back. Voters can read only their own rows,
-- and the admin screen never lists anyone's choices; only nullify_vote() touches them.
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references public.profiles (id) on delete cascade,
  position_id uuid not null references public.positions (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voter_id, position_id)
);
alter table public.votes enable row level security;
create policy votes_read_own on public.votes for select using (voter_id = auth.uid());

-- The signed-in person accepts the rules (profiles cannot be edited directly by voters).
create function public.accept_rules() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  update public.profiles set rules_accepted_at = now() where id = auth.uid() and rules_accepted_at is null;
end $$;
revoke all on function public.accept_rules() from public, anon;
grant execute on function public.accept_rules() to authenticated;

-- Same as before, plus: rules must be accepted, and each choice is recorded so it can be nullified.
create or replace function public.cast_vote(choices jsonb) returns text
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
  if p.state is null or p.state_code is null or (p.role = 'lga_president' and p.lga is null) then
    raise exception 'Your state or LGA is missing, so you cannot vote';
  end if;
  if p.rules_accepted_at is null then raise exception 'Accept the election rules first'; end if;
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
    insert into public.votes (voter_id, position_id, candidate_id) values (uid, k::uuid, cand);
    update public.vote_counts set votes = votes + 1 where candidate_id = cand;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'Choose at least one candidate'; end if;
  return rcpt;
end $$;

-- Admin only: take one person's vote out of the tally. They cannot vote again.
create function public.nullify_vote(voter uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v record;
  n int := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.ballots where voter_id = voter) then
    raise exception 'That person has not voted';
  end if;
  if exists (select 1 from public.ballots where voter_id = voter and nullified_at is not null) then
    raise exception 'That vote is already nullified';
  end if;
  for v in select * from public.votes where voter_id = voter loop
    update public.vote_counts set votes = greatest(votes - 1, 0) where candidate_id = v.candidate_id;
    n := n + 1;
  end loop;
  if n = 0 then
    raise exception 'This vote was cast before nullifying was added and cannot be taken out one by one. Use Reset all votes instead.';
  end if;
  delete from public.votes where voter_id = voter;
  update public.ballots set nullified_at = now(), nullified_reason = nullif(trim(coalesce(reason, '')), '') where voter_id = voter;
end $$;
revoke all on function public.nullify_vote(uuid, text) from public, anon;
grant execute on function public.nullify_vote(uuid, text) to authenticated;

-- Reset also clears the stored choices.
create or replace function public.reset_votes() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.votes where true;
  delete from public.ballots where true;
  update public.vote_counts set votes = 0 where true;
end $$;
