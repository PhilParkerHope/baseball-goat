-- Derived tables the app reads. Rebuilt from scratch by 03_compute_batting_runs.sql.

-- Run value of each batting event, per league-year.
create table if not exists public.league_batting_constants (
  year_id  int  not null,
  lg_group text not null,     -- see lahman.lg_group()
  rpo      numeric not null,  -- league runs per out
  run_bb   numeric not null,
  run_hbp  numeric not null,
  run_1b   numeric not null,
  run_2b   numeric not null,
  run_3b   numeric not null,
  run_hr   numeric not null,
  run_out  numeric not null,  -- cost of an out; set so non-pitchers sum to zero
  r_per_pa numeric not null,  -- used for the park adjustment
  primary key (year_id, lg_group)
);

-- One row per player per season (stints summed).
create table if not exists public.player_batting_seasons (
  player_id text not null,
  year_id   int  not null,
  team_id   text not null,    -- team with the most PA that season
  lg_group  text not null,    -- league of that team
  g int, pa int, ab int, r int, h int,
  doubles int, triples int, hr int, rbi int,
  sb int, cs int, bb int, so int, ibb int, hbp int, sh int, sf int,
  batting_runs_raw numeric,   -- runs above league average, no park adjustment
  park_runs        numeric,   -- park adjustment (negative in hitter's parks)
  batting_runs     numeric,   -- raw + park: the number to use
  primary key (player_id, year_id)
);

create index if not exists player_batting_seasons_year_idx
  on public.player_batting_seasons (year_id);

-- Supabase exposes `public` through its API, so lock these down to read-only.
alter table public.league_batting_constants enable row level security;
alter table public.player_batting_seasons   enable row level security;

drop policy if exists "read only" on public.league_batting_constants;
drop policy if exists "read only" on public.player_batting_seasons;
create policy "read only" on public.league_batting_constants for select using (true);
create policy "read only" on public.player_batting_seasons   for select using (true);

-- Let supabase-js read them. Skipped on a plain Postgres that has no Supabase roles.
do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.league_batting_constants, public.player_batting_seasons
      to anon, authenticated;
  end if;
end $$;
