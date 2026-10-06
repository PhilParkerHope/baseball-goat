-- Team filters for the GOATs page: which teams exist, and who played for each.
-- Run after 06. Safe to re-run.
--
-- A "team" here is one of two things:
--   name       one name a club played under, e.g. Washington Senators (1901-1960).
--              The same name used by different franchises gets separate rows.
--   franchise  every year of a franchise under any name, e.g. the Dodgers from
--              Brooklyn in 1884 to Los Angeles today. Only made for franchises
--              that have had more than one name.

create table if not exists public.teams (
  slug        text primary key,   -- for URLs, e.g. washington-senators-1901
  kind        text not null,      -- 'name' or 'franchise'
  franch_id   text not null,
  name        text not null,      -- "Washington Senators"; for a franchise, its latest name
  first_year  int  not null,
  last_year   int  not null,
  seasons     int  not null
);

create table if not exists public.player_teams (
  player_id   text not null,
  team_slug   text not null,
  seasons     int  not null,      -- seasons he appeared for them
  games       int  not null,
  first_year  int  not null,
  last_year   int  not null,
  primary key (player_id, team_slug)
);

create index if not exists player_teams_team_idx on public.player_teams (team_slug);

alter table public.teams        enable row level security;
alter table public.player_teams enable row level security;
drop policy if exists "read only" on public.teams;
drop policy if exists "read only" on public.player_teams;
create policy "read only" on public.teams        for select using (true);
create policy "read only" on public.player_teams for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.teams, public.player_teams to anon, authenticated;
  end if;
end $$;

begin;

truncate public.teams, public.player_teams;

-- 1. Team names: one row per franchise + name.
insert into public.teams
with names as (
  select franch_id, name,
         min(year_id) as first_year, max(year_id) as last_year, count(*) as seasons,
         trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
           || '-' || min(year_id) as base_slug
  from lahman.teams
  group by franch_id, name
)
select
  -- Two clubs called the Washington Nationals both started in 1884; the
  -- franchise ID breaks the tie.
  case when count(*) over (partition by base_slug) > 1
       then base_slug || '-' || lower(franch_id) else base_slug end,
  'name', franch_id, name, first_year, last_year, seasons
from names;

-- 2. Whole franchises, for those with more than one name.
insert into public.teams
with franchises as (
  select franch_id,
         (array_agg(name order by year_id desc))[1] as latest_name,
         min(year_id) as first_year, max(year_id) as last_year, count(*) as seasons
  from lahman.teams
  group by franch_id
  having count(distinct name) > 1
)
select
  trim(both '-' from regexp_replace(lower(latest_name), '[^a-z0-9]+', '-', 'g')) || '-franchise',
  'franchise', franch_id, latest_name, first_year, last_year, seasons
from franchises;

-- 3. Who played for whom. Appearances has a row for every player, team and
--    season, including both halves of a mid-season trade.
insert into public.player_teams
select a.player_id, tm.slug,
       count(distinct a.year_id), sum(a.g_all), min(a.year_id), max(a.year_id)
from lahman.appearances a
join lahman.teams t using (year_id, team_id)
join public.teams tm
  on tm.franch_id = t.franch_id
 and (tm.kind = 'franchise' or tm.name = t.name)
group by a.player_id, tm.slug;

commit;
