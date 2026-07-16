-- ============================================================
-- SUPERPOWER ARCADE - Supabase Schema
-- insert-only shared_runs, RPC-only quest_codes
-- SECURITY DEFINER + REVOKE FROM PUBLIC on all RPCs
-- Run this in your Supabase SQL editor
-- ============================================================

create extension if not exists "pgcrypto";

-- shared_runs: one row per player who tapped Share
create table if not exists public.shared_runs (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  archetype     text        not null,
  archetype_name text       not null default '',
  player_name   text        not null default '',
  contact       text        not null default '',
  evidence      jsonb       not null,
  signals       jsonb       not null,
  quest_code    text,
  energy        text,
  broski_coins  integer     not null default 0,
  shared_at     timestamptz not null    default now()
);

alter table public.shared_runs enable row level security;

create policy "insert_only"
  on public.shared_runs for insert with check (true);

-- quest_codes: VIP access codes
create table if not exists public.quest_codes (
  code        text        primary key,
  label       text        not null,
  invitee_name text        not null default '',
  message      text        not null default 'The Keeper is expecting you.',
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  used_count  integer     not null default 0
);

alter table public.quest_codes enable row level security;
-- Zero policies = zero direct client access

-- RPC: redeem a quest code (the name js/core/api.js calls)
create or replace function public.redeem_quest_code(p_code text)
returns table (invitee_name text, message text)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    update public.quest_codes qc
       set used_count = qc.used_count + 1
     where qc.code = upper(trim(p_code)) and qc.active = true
    returning qc.invitee_name, qc.message;
end;
$$;

revoke execute on function public.redeem_quest_code(text) from public;
grant  execute on function public.redeem_quest_code(text) to anon;

-- Seed Evan's key
insert into public.quest_codes (code, label, invitee_name, message, active)
values ('BOLT-RISING', 'Evan - BOLT-RISING VIP Access', 'Evan', 'The Keeper has been waiting for you. Show us what you''ve got.', true)
on conflict (code) do nothing;

-- Keeper dashboard view (service_role only)
create or replace view public.keeper_runs as
  select id, created_at, archetype, archetype_name, player_name, contact,
         evidence, signals, quest_code, energy, broski_coins, shared_at
  from public.shared_runs order by shared_at desc;

revoke all on public.keeper_runs from anon, authenticated;
grant  select on public.keeper_runs to service_role;
