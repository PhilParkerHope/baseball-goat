-- Pitcher value in wins, for every player-season. Run after 03.
-- Safe to re-run: it rebuilds the table from raw Lahman + league_batting_constants.
--
--   wins = (runs saved vs. an average pitcher + replacement) / runs per win
--
-- Based on runs allowed, so a pitcher gets credit (or blame) for his defense.
-- Relievers are not adjusted for pitching in high-leverage innings.

create table if not exists public.pitcher_value_seasons (
  player_id         text not null,
  year_id           int  not null,
  team_id           text not null,    -- team with the most innings that season
  lg_group          text not null,    -- league of that team
  w int, l int, g int, gs int, sv int,
  ipouts int,                         -- outs recorded; innings = ipouts / 3
  h int, r int, er int, hr int, bb int, so int,
  runs_saved        numeric,          -- vs. a league-average pitcher in the same park
  replacement_runs  numeric,          -- gap between an average pitcher and a call-up
  runs_per_win      numeric,
  wins              numeric,          -- actual value that season
  season_scale      numeric,          -- multiplier to a 162-game, 350-inning season
  wins_162          numeric,          -- wins * season_scale
  primary key (player_id, year_id)
);

alter table public.pitcher_value_seasons enable row level security;
drop policy if exists "read only" on public.pitcher_value_seasons;
create policy "read only" on public.pitcher_value_seasons for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.pitcher_value_seasons to anon, authenticated;
  end if;
end $$;

begin;

truncate public.pitcher_value_seasons;

insert into public.pitcher_value_seasons
with league as (
  -- Runs allowed per out by the whole league that year.
  select year_id, lahman.lg_group(lg_id) as lg_group,
         sum(r)::numeric / nullif(sum(ipouts), 0) as runs_per_out
  from lahman.pitching
  group by 1, 2
),
stints as (
  select
    p.*,
    lahman.lg_group(p.lg_id) as lg_group,
    -- What an average pitcher would allow in these innings in this park, minus what he allowed.
    lg.runs_per_out * p.ipouts * coalesce(t.ppf, 100) / 100.0 - p.r as runs_saved
  from lahman.pitching p
  join league lg on lg.year_id = p.year_id and lg.lg_group = lahman.lg_group(p.lg_id)
  left join lahman.teams t on t.year_id = p.year_id and t.team_id = p.team_id
),
seasons as (
  select
    player_id, year_id,
    (array_agg(team_id  order by ipouts desc, stint))[1] as team_id,
    (array_agg(lg_group order by ipouts desc, stint))[1] as lg_group,
    sum(w) as w, sum(l) as l, sum(g) as g, sum(gs) as gs, sum(sv) as sv,
    sum(ipouts) as ipouts, sum(h) as h, sum(r) as r, sum(er) as er,
    sum(hr) as hr, sum(bb) as bb, sum(so) as so,
    sum(runs_saved) as runs_saved
  from stints
  group by player_id, year_id
),
-- Schedule length = the longest team schedule in that league-year (same as 04).
schedule as (
  select year_id, lahman.lg_group(lg_id) as lg_group, max(g) as games
  from lahman.teams
  group by 1, 2
),
parts as (
  select
    s.*,
    40.5 * c.rpo + 3 as runs_per_win,

    -- Replacement level: 1 win per 100 innings, in every era.
    (s.ipouts / 3.0) / 100 * (40.5 * c.rpo + 3) as replacement_runs,

    -- Scale to 162 games (schedules under 60 count as 60, same as hitters), but
    -- never past 350 innings. Seasons over 350 innings are scaled DOWN to 350,
    -- so an 1880s arm throwing 600 innings is judged on a workload a modern
    -- ace could carry.
    least(162.0 / greatest(sch.games, 60), 350.0 / nullif(s.ipouts / 3.0, 0)) as season_scale
  from seasons s
  join public.league_batting_constants c using (year_id, lg_group)
  left join schedule sch using (year_id, lg_group)
)
select
  player_id, year_id, team_id, lg_group,
  w, l, g, gs, sv, ipouts, h, r, er, hr, bb, so,
  round(runs_saved, 2), round(replacement_runs, 2), round(runs_per_win, 3),
  round((runs_saved + replacement_runs) / runs_per_win, 2),
  round(season_scale, 4),
  round((runs_saved + replacement_runs) / runs_per_win * season_scale, 2)
from parts;

commit;