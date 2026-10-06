-- Hitter batting runs above average, park-adjusted, for every player-season.
-- Safe to re-run: it rebuilds both derived tables from the raw Lahman tables.
--
-- Method (Tom Tango's linear weights from run environment):
--   1. Runs per out for the league-year sets the value of each event.
--   2. The cost of an out is set so the league's non-pitchers total exactly 0.
--   3. Player runs = sum(event * value) - outs * cost of an out.
--   4. Park adjustment moves that toward a neutral park.

begin;

truncate public.league_batting_constants, public.player_batting_seasons;

-- One row per stint, with the pieces the formula needs.
create temp table stint_events on commit drop as
with primary_pitchers as (
  -- Player-years spent mostly on the mound. Kept out of the league baseline
  -- so pre-DH hitters aren't graded on a curve against pitchers batting.
  select player_id, year_id
  from lahman.appearances
  group by player_id, year_id
  having sum(g_p) * 2 > sum(g_all)
)
select
  b.player_id, b.year_id, b.stint, b.team_id,
  lahman.lg_group(b.lg_id)                                as lg_group,
  (pp.player_id is not null)                              as is_pitcher,
  b.bb - coalesce(b.ibb, 0)                               as ubb,   -- unintentional walks
  coalesce(b.hbp, 0)                                      as hbp,
  b.h - b.doubles - b.triples - b.hr                      as singles,
  b.doubles, b.triples, b.hr,
  b.ab - b.h + coalesce(b.sf, 0)                          as outs,
  b.ab + b.bb + coalesce(b.hbp, 0)
       + coalesce(b.sh, 0) + coalesce(b.sf, 0)            as pa,
  b.r
from lahman.batting b
left join primary_pitchers pp using (player_id, year_id);

-- Step 1 + 2: event values per league-year.
insert into public.league_batting_constants
with env as (
  select year_id, lahman.lg_group(lg_id) as lg_group,
         sum(r)::numeric / nullif(sum(ipouts), 0) as rpo
  from lahman.teams
  group by 1, 2
),
weights as (
  select year_id, lg_group, rpo,
         rpo + 0.14                          as run_bb,
         rpo + 0.14 + 0.025                  as run_hbp,
         rpo + 0.14 + 0.155                  as run_1b,
         rpo + 0.14 + 0.155 + 0.30           as run_2b,
         rpo + 0.14 + 0.155 + 0.30 + 0.27    as run_3b,
         1.40                                as run_hr
  from env
  where rpo is not null
),
totals as (
  select year_id, lg_group,
         sum(ubb)     filter (where not is_pitcher) as ubb,
         sum(hbp)     filter (where not is_pitcher) as hbp,
         sum(singles) filter (where not is_pitcher) as singles,
         sum(doubles) filter (where not is_pitcher) as doubles,
         sum(triples) filter (where not is_pitcher) as triples,
         sum(hr)      filter (where not is_pitcher) as hr,
         sum(outs)    filter (where not is_pitcher) as outs,
         sum(r)::numeric / nullif(sum(pa), 0)       as r_per_pa
  from stint_events
  group by 1, 2
)
select w.year_id, w.lg_group, w.rpo,
       w.run_bb, w.run_hbp, w.run_1b, w.run_2b, w.run_3b, w.run_hr,
       ( t.ubb * w.run_bb + t.hbp * w.run_hbp + t.singles * w.run_1b
       + t.doubles * w.run_2b + t.triples * w.run_3b + t.hr * w.run_hr
       ) / t.outs                            as run_out,
       t.r_per_pa
from weights w
join totals t using (year_id, lg_group)
where t.outs > 0;

-- Step 3 + 4: player seasons.
insert into public.player_batting_seasons
with stint_value as (
  select
    e.*,
    ( e.ubb * c.run_bb + e.hbp * c.run_hbp + e.singles * c.run_1b
    + e.doubles * c.run_2b + e.triples * c.run_3b + e.hr * c.run_hr
    - e.outs * c.run_out )                                   as batting_runs_raw,
    (1 - coalesce(t.bpf, 100) / 100.0) * c.r_per_pa * e.pa   as park_runs
  from stint_events e
  join public.league_batting_constants c using (year_id, lg_group)
  left join lahman.teams t using (year_id, team_id)
)
select
  v.player_id, v.year_id,
  (array_agg(v.team_id  order by v.pa desc, v.stint))[1] as team_id,
  (array_agg(v.lg_group order by v.pa desc, v.stint))[1] as lg_group,
  sum(b.g), sum(v.pa), sum(b.ab), sum(b.r), sum(b.h),
  sum(b.doubles), sum(b.triples), sum(b.hr), sum(b.rbi),
  sum(b.sb), sum(b.cs), sum(b.bb), sum(b.so), sum(b.ibb), sum(b.hbp), sum(b.sh), sum(b.sf),
  round(sum(v.batting_runs_raw), 2),
  round(sum(v.park_runs), 2),
  round(sum(v.batting_runs_raw + v.park_runs), 2)
from stint_value v
join lahman.batting b using (player_id, year_id, stint)
group by v.player_id, v.year_id;

commit;
