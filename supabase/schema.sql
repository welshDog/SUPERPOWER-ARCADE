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
  archetype_name text       not null,
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
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  used_count  integer     not null default 0
);

alter table public.quest_codes enable row level security;
-- Zero policies = zero direct client access

-- RPC: validate a quest code
create or replace function public.validate_quest_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_row public.quest_codes%rowtype;
begin
  select * into v_row from public.quest_codes
  where code = upper(trim(p_code)) and active = true;
  if not found then return jsonb_build_object('valid', false); end if;
  update public.quest_codes set used_count = used_count + 1
  where code = upper(trim(p_code));
  return jsonb_build_object('valid', true, 'label', v_row.label);
end;
$$;

revoke execute on function public.validate_quest_code(text) from public;
grant  execute on function public.validate_quest_code(text) to anon;

-- Seed Evan's key
insert into public.quest_codes (code, label, active)
values ('BOLT-RISING', 'Evan - BOLT-RISING VIP Access', true)
on conflict (code) do nothing;

-- Keeper dashboard view (service_role only)
create or replace view public.keeper_runs as
  select id, created_at, archetype, archetype_name,
         evidence, signals, quest_code, energy, broski_coins, shared_at
  from public.shared_runs order by shared_at desc;

revoke all on public.keeper_runs from anon, authenticated;
grant  select on public.keeper_runs to service_role;
