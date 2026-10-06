-- The two tables the app reads most: one row per player-season with hitting
-- and pitching combined, and one row per player with career numbers and a URL slug.
-- Run after 04 and 05. Safe to re-run.
--
--   adj_wins = wins, with the unplayed part of a short season credited at HALF rate
--              (and pitcher seasons over 350 innings scaled down, from 05)
--   score    = (career adj_wins + best seven seasons of adj_wins) / 2

create table if not exists public.player_seasons (
  player_id     text not null,
  year_id       int  not null,
  team_id       text not null,
  hitting_wins  numeric not null,
  pitching_wins numeric not null,
  wins          numeric not null,   -- actual: hitting + pitching
  adj_wins      numeric not null,   -- era-fair: what the score is built from
  primary key (player_id, year_id)
);

create table if not exists public.players (
  player_id          text primary key,
  slug               text not null unique,   -- for URLs, e.g. babe-ruth
  name               text not null,
  first_year         int  not null,
  last_year          int  not null,
  is_active          boolean not null,       -- played in the latest season in the data
  primary_position   text,                   -- SP RP C 1B 2B 3B SS LF CF RF DH
  primary_franch_id  text,                   -- franchise he spent the most seasons with
  primary_team_name  text,                   -- that franchise's name while he was there
  seasons            int  not null,
  career_wins        numeric not null,       -- actual
  hitting_adj_wins   numeric not null,
  pitching_adj_wins  numeric not null,
  career_adj_wins    numeric not null,
  peak7_adj_wins     numeric not null,
  score              numeric not null,
  rank               int  not null           -- 1 = highest score
);

create index if not exists players_rank_idx on public.players (rank);

alter table public.player_seasons enable row level security;
alter table public.players        enable row level security;
drop policy if exists "read only" on public.player_seasons;
drop policy if exists "read only" on public.players;
create policy "read only" on public.player_seasons for select using (true);
create policy "read only" on public.players        for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.player_seasons, public.players to anon, authenticated;
  end if;
end $$;

begin;

truncate public.player_seasons, public.players;

-- 1. Seasons: hitting + pitching, with the short-season rule applied.
insert into public.player_seasons
with combined as (
  select
    h.player_id, h.year_id,
    case when h.is_pitcher then coalesce(p.team_id, b.team_id) else b.team_id end as team_id,
    h.wins                  as hitting_wins,
    coalesce(p.wins, 0)     as pitching_wins,
    -- Scale above 1 means a short season: credit the missing games at half rate.
    -- Scale below 1 is the workload cap (or a 163-game schedule): apply it in full.
    h.wins * case when h.season_scale > 1 then 1 + (h.season_scale - 1) * 0.5 else h.season_scale end
      as hitting_adj,
    coalesce(p.wins * case when p.season_scale > 1 then 1 + (p.season_scale - 1) * 0.5 else p.season_scale end, 0)
      as pitching_adj
  from public.hitter_value_seasons h
  join public.player_batting_seasons b using (player_id, year_id)
  left join public.pitcher_value_seasons p using (player_id, year_id)
)
select player_id, year_id, team_id,
       hitting_wins, pitching_wins, hitting_wins + pitching_wins,
       round(hitting_adj + pitching_adj, 2)
from combined;

-- 2. Players.
insert into public.players
with adj_split as (
  -- Career hitting vs. pitching share of adj_wins (same rule as above).
  select h.player_id,
    sum(h.wins * case when h.season_scale > 1 then 1 + (h.season_scale - 1) * 0.5 else h.season_scale end) as hitting_adj,
    sum(coalesce(p.wins * case when p.season_scale > 1 then 1 + (p.season_scale - 1) * 0.5 else p.season_scale end, 0)) as pitching_adj
  from public.hitter_value_seasons h
  left join public.pitcher_value_seasons p using (player_id, year_id)
  group by h.player_id
),
ranked_seasons as (
  select *, row_number() over (partition by player_id order by adj_wins desc) as n
  from public.player_seasons
),
careers as (
  select player_id,
         min(year_id) as first_year, max(year_id) as last_year, count(*) as seasons,
         sum(wins) as career_wins,
         sum(adj_wins) as career_adj_wins,
         sum(adj_wins) filter (where n <= 7) as peak7_adj_wins
  from ranked_seasons
  group by player_id
),
position_games as (
  select player_id, pos, sum(g) as g
  from lahman.appearances a
  cross join lateral (values
    ('P', a.g_p), ('C', a.g_c), ('1B', a.g_1b), ('2B', a.g_2b), ('3B', a.g_3b), ('SS', a.g_ss),
    ('LF', a.g_lf), ('CF', a.g_cf), ('RF', a.g_rf), ('DH', coalesce(a.g_dh, 0))
  ) as v(pos, g)
  group by player_id, pos
),
primary_position as (
  select distinct on (player_id) player_id, pos
  from position_games
  where g > 0
  order by player_id, g desc, pos
),
-- Pitchers are split into starters and relievers. A reliever started fewer than
-- one in five of his games; a start is ~6 innings and a relief outing ~1, so
-- anyone above that line threw most of his innings as a starter.
pitcher_role as (
  select player_id, case when sum(gs) * 5 < sum(g) then 'RP' else 'SP' end as role
  from public.pitcher_value_seasons
  group by player_id
),
-- Primary team = the franchise he spent the most seasons with (ties: most value),
-- shown under the name it most often had while he was there.
team_seasons as (
  select s.player_id, t.franch_id, t.name, count(*) as n,
         sum(count(*))        over (partition by s.player_id, t.franch_id) as franch_n,
         sum(sum(s.adj_wins)) over (partition by s.player_id, t.franch_id) as franch_wins
  from public.player_seasons s
  join lahman.teams t using (year_id, team_id)
  group by s.player_id, t.franch_id, t.name
),
primary_team as (
  select distinct on (player_id) player_id, franch_id, name
  from team_seasons
  order by player_id, franch_n desc, franch_wins desc, franch_id, n desc, name
),
named as (
  select
    c.*, a.hitting_adj, a.pitching_adj,
    (c.career_adj_wins + c.peak7_adj_wins) / 2 as score,
    trim(coalesce(pe.name_first, '') || ' ' || pe.name_last) as name
  from careers c
  join adj_split a using (player_id)
  join lahman.people pe using (player_id)
),
slugged as (
  select *,
    -- "Ken Griffey Jr." -> ken-griffey-jr ; "Ronald Acuña" -> ronald-acuna
    trim(both '-' from regexp_replace(
      translate(lower(name), 'áéíñóú', 'aeinou'), '[^a-z0-9]+', '-', 'g')) as base_slug
  from named
),
numbered as (
  select *,
    -- Among players who share a name, the best one gets the plain slug.
    row_number() over (partition by base_slug order by score desc, player_id) as name_rank
  from slugged
)
select
  n.player_id,
  -- Everyone else gets the name plus their player ID, which is always unique.
  case when n.name_rank = 1 then n.base_slug else n.base_slug || '-' || n.player_id end,
  n.name, n.first_year, n.last_year,
  n.last_year = (select max(year_id) from public.player_seasons),
  case when pp.pos = 'P' then coalesce(pr.role, 'SP') else pp.pos end,
  pt.franch_id, pt.name,
  n.seasons,
  round(n.career_wins, 1),
  round(n.hitting_adj, 1), round(n.pitching_adj, 1),
  round(n.career_adj_wins, 1), round(n.peak7_adj_wins, 1),
  round(n.score, 1),
  rank() over (order by n.score desc)
from numbered n
left join primary_position pp using (player_id)
left join pitcher_role pr using (player_id)
left join primary_team pt using (player_id);

commit;
