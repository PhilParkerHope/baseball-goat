-- Hitter value in wins, for every player-season. Run after 03.
-- Safe to re-run: it rebuilds the table from player_batting_seasons + raw Lahman.
--
--   wins = (batting + baserunning + position + replacement) / runs per win
--
-- Fielding quality is NOT in here yet - only which position was played.

create table if not exists public.hitter_value_seasons (
  player_id         text not null,
  year_id           int  not null,
  is_pitcher        boolean not null,  -- mostly pitched that year; see below
  pa                int,
  batting_runs      numeric,           -- vs. average hitter (vs. average pitcher if is_pitcher)
  baserunning_runs  numeric,           -- steals and caught stealing vs. league rate
  position_runs     numeric,           -- credit for playing a harder position
  replacement_runs  numeric,           -- gap between an average player and a bench player
  runs_per_win      numeric,
  wins              numeric,           -- actual value that season
  season_scale      numeric,           -- multiplier to a 162-game schedule
  wins_162          numeric,           -- wins * season_scale
  primary key (player_id, year_id)
);

alter table public.hitter_value_seasons enable row level security;
drop policy if exists "read only" on public.hitter_value_seasons;
create policy "read only" on public.hitter_value_seasons for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.hitter_value_seasons to anon, authenticated;
  end if;
end $$;

begin;

truncate public.hitter_value_seasons;

insert into public.hitter_value_seasons
with primary_pitchers as (
  -- Same rule as 03: more than half of the player's games were on the mound.
  select player_id, year_id
  from lahman.appearances
  group by player_id, year_id
  having sum(g_p) * 2 > sum(g_all)
),
seasons as (
  select s.*, (pp.player_id is not null) as is_pitcher,
         c.rpo, c.r_per_pa,
         40.5 * c.rpo + 3 as runs_per_win   -- = 9 * (runs per inning) * 1.5 + 3
  from public.player_batting_seasons s
  join public.league_batting_constants c using (year_id, lg_group)
  left join primary_pitchers pp using (player_id, year_id)
),

-- Pitchers at the plate are compared to other pitchers, not to hitters.
-- Otherwise every pre-DH pitcher loses a win or two a year just for batting.
pitcher_baseline as (
  select year_id, lg_group, sum(batting_runs) / nullif(sum(pa), 0) as runs_per_pa
  from seasons
  where is_pitcher
  group by 1, 2
),

-- Caught stealing wasn't recorded consistently until 1920 (AL) and 1951 (NL),
-- and never for the Negro Leagues. Only score baserunning where it was.
cs_tracked as (
  select year_id, lahman.lg_group(lg_id) as lg_group
  from lahman.batting
  group by 1, 2
  having count(cs) >= 0.95 * count(*) and sum(cs) > 0
),
steal_rate as (
  -- League-average steal runs per time on first base.
  select s.year_id, s.lg_group,
         sum(s.sb * 0.2 - coalesce(s.cs, 0) * (2 * s.rpo + 0.075))
           / nullif(sum(s.h - s.doubles - s.triples - s.hr + s.bb - coalesce(s.ibb, 0) + coalesce(s.hbp, 0)), 0)
           as runs_per_chance
  from seasons s
  join cs_tracked using (year_id, lg_group)
  where not s.is_pitcher
  group by 1, 2
),

-- Position credit in runs per 162 games (the standard modern values).
positions as (
  select player_id, year_id,
         sum(g_all) as g_all,
         sum(g_c + g_1b + g_2b + g_3b + g_ss + g_lf + g_cf + g_rf + coalesce(g_dh, 0)) as pos_games,
         sum( g_c  *  12.5 + g_1b * -12.5 + g_2b *  2.5 + g_3b * 2.5 + g_ss * 7.5
            + g_lf *  -7.5 + g_cf *   2.5 + g_rf * -7.5 + coalesce(g_dh, 0) * -17.5) as pos_points
  from lahman.appearances
  group by player_id, year_id
),

-- Schedule length = the longest team schedule in that league-year.
schedule as (
  select year_id, lahman.lg_group(lg_id) as lg_group, max(g) as games
  from lahman.teams
  group by 1, 2
),

parts as (
  select
    s.player_id, s.year_id, s.is_pitcher, s.pa, s.g, s.runs_per_win,

    case when s.is_pitcher
      then s.batting_runs - coalesce(pb.runs_per_pa, 0) * s.pa
      else s.batting_runs
    end as batting_runs,

    case when s.is_pitcher or sr.runs_per_chance is null then 0
      else s.sb * 0.2 - coalesce(s.cs, 0) * (2 * s.rpo + 0.075)
         - sr.runs_per_chance
           * (s.h - s.doubles - s.triples - s.hr + s.bb - coalesce(s.ibb, 0) + coalesce(s.hbp, 0))
    end as baserunning_runs,

    -- Average credit across the positions played, times games in the field.
    -- (Position games can exceed games played when a player moved mid-game.)
    case when s.is_pitcher or coalesce(p.pos_games, 0) = 0 then 0
      else p.pos_points / p.pos_games * least(p.pos_games, p.g_all) / 162.0
    end as position_runs,

    -- Replacement level: 2 wins per 600 PA, in every era.
    case when s.is_pitcher then 0
      else s.pa * (2.0 / 600) * s.runs_per_win
    end as replacement_runs,

    -- Scale to 162 games. Schedules under 60 games are scaled as if they
    -- were 60, so a 20-game season can't turn into a 162-game monster.
    162.0 / greatest(sch.games, s.g, 60) as season_scale
  from seasons s
  left join pitcher_baseline pb using (year_id, lg_group)
  left join steal_rate sr using (year_id, lg_group)
  left join positions p using (player_id, year_id)
  left join schedule sch using (year_id, lg_group)
)
select
  player_id, year_id, is_pitcher, pa,
  round(batting_runs, 2), round(baserunning_runs, 2),
  round(position_runs, 2), round(replacement_runs, 2),
  round(runs_per_win, 3),
  round((batting_runs + baserunning_runs + position_runs + replacement_runs) / runs_per_win, 2),
  round(season_scale, 4),
  round((batting_runs + baserunning_runs + position_runs + replacement_runs) / runs_per_win * season_scale, 2)
from parts;

commit;