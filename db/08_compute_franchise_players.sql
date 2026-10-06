-- What each player did for each franchise, for the team lineup pages.
-- Run after 06. Safe to re-run.
--
-- A franchise is a club across its whole history under every name: the
-- Yankees row includes the 1903-12 Highlanders, the Dodgers row includes
-- Brooklyn. Unlike the GOATs page, which ranks by whole careers, these
-- numbers cover only a player's time with that franchise.

create table if not exists public.franchise_players (
  franch_id   text not null,
  player_id   text not null,
  position    text,              -- the position he played most FOR THIS FRANCHISE: SP RP C 1B ...
  seasons     int  not null,     -- seasons he appeared for them
  games       int  not null,
  first_year  int  not null,
  last_year   int  not null,
  wins        numeric not null,  -- wins added (era-adjusted) in the seasons this was his main team
  primary key (franch_id, player_id)
);

create index if not exists franchise_players_lineup_idx
  on public.franchise_players (franch_id, position, wins desc);

alter table public.franchise_players enable row level security;
drop policy if exists "read only" on public.franchise_players;
create policy "read only" on public.franchise_players for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.franchise_players to anon, authenticated;
  end if;
end $$;

begin;

truncate public.franchise_players;

insert into public.franchise_players
with time_there as (
  select t.franch_id, a.player_id,
         count(distinct a.year_id) as seasons, sum(a.g_all) as games,
         min(a.year_id) as first_year, max(a.year_id) as last_year
  from lahman.appearances a
  join lahman.teams t using (year_id, team_id)
  group by t.franch_id, a.player_id
),
position_games as (
  select t.franch_id, a.player_id, v.pos, sum(v.g) as g
  from lahman.appearances a
  join lahman.teams t using (year_id, team_id)
  cross join lateral (values
    ('P', a.g_p), ('C', a.g_c), ('1B', a.g_1b), ('2B', a.g_2b), ('3B', a.g_3b), ('SS', a.g_ss),
    ('LF', a.g_lf), ('CF', a.g_cf), ('RF', a.g_rf), ('DH', coalesce(a.g_dh, 0))
  ) as v(pos, g)
  group by t.franch_id, a.player_id, v.pos
),
main_position as (
  select distinct on (franch_id, player_id) franch_id, player_id, pos
  from position_games
  where g > 0
  order by franch_id, player_id, g desc, pos
),
-- Starter or reliever, by the same one-in-five rule as 06, but only counting
-- his games for this franchise. Babe Ruth is a starting pitcher for Boston.
pitcher_role as (
  select t.franch_id, p.player_id,
         case when sum(p.gs) * 5 < sum(p.g) then 'RP' else 'SP' end as role
  from lahman.pitching p
  join lahman.teams t on t.year_id = p.year_id and t.team_id = p.team_id
  group by t.franch_id, p.player_id
),
-- Each season's value goes to the team he played most for that year, so a
-- mid-season trade counts entirely for one side.
value as (
  select t.franch_id, s.player_id, sum(s.adj_wins) as wins
  from public.player_seasons s
  join lahman.teams t using (year_id, team_id)
  group by t.franch_id, s.player_id
)
select
  tt.franch_id, tt.player_id,
  case when mp.pos = 'P' then coalesce(pr.role, 'SP') else mp.pos end,
  tt.seasons, tt.games, tt.first_year, tt.last_year,
  round(coalesce(v.wins, 0), 1)
from time_there tt
left join main_position mp using (franch_id, player_id)
left join pitcher_role pr using (franch_id, player_id)
left join value v using (franch_id, player_id);

commit;
