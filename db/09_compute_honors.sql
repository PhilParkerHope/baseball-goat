-- Awards, All-Star seasons and Hall of Fame status for each player.
-- Run after 06. Safe to re-run.
--
-- None of this feeds the rankings. The games use it two ways: to decide who
-- is well known enough to be a fair question, and as clues.

create table if not exists public.player_honors (
  player_id       text primary key,
  mvp             int not null default 0,   -- includes the 1911-14 and 1922-29 league awards
  cy_young        int not null default 0,   -- first given in 1956
  rookie_of_year  int not null default 0,   -- first given in 1947
  all_star        int not null default 0,   -- seasons picked, not games: 1959-62 had two a year
  gold_glove      int not null default 0,
  silver_slugger  int not null default 0,
  ws_mvp          int not null default 0,
  triple_crown    int not null default 0,   -- batting or pitching
  hof_year        int                       -- year inducted as a player; null if not in
);

alter table public.player_honors enable row level security;
drop policy if exists "read only" on public.player_honors;
create policy "read only" on public.player_honors for select using (true);

do $$
begin
  if exists (select from pg_roles where rolname = 'anon') then
    grant select on public.player_honors to anon, authenticated;
  end if;
end $$;

begin;

truncate public.player_honors;

insert into public.player_honors
with awards as (
  select player_id,
    count(*) filter (where award_id = 'Most Valuable Player')                 as mvp,
    count(*) filter (where award_id = 'Cy Young Award')                       as cy_young,
    count(*) filter (where award_id = 'Rookie of the Year')                   as rookie_of_year,
    count(*) filter (where award_id = 'Gold Glove')                           as gold_glove,
    count(*) filter (where award_id = 'Silver Slugger')                       as silver_slugger,
    count(*) filter (where award_id = 'World Series MVP')                     as ws_mvp,
    count(*) filter (where award_id in ('Triple Crown', 'Pitching Triple Crown')) as triple_crown
  from lahman.awards_players
  group by player_id
),
all_stars as (
  select player_id, count(distinct year_id) as all_star
  from lahman.allstar_full
  group by player_id
),
-- Inducted as a player. Joe Torre is in as a manager, so he doesn't count here.
hall as (
  select player_id, min(year_id) as hof_year
  from lahman.hall_of_fame
  where inducted = 'Y' and category = 'Player'
  group by player_id
)
select
  p.player_id,
  coalesce(a.mvp, 0), coalesce(a.cy_young, 0), coalesce(a.rookie_of_year, 0),
  coalesce(s.all_star, 0),
  coalesce(a.gold_glove, 0), coalesce(a.silver_slugger, 0),
  coalesce(a.ws_mvp, 0), coalesce(a.triple_crown, 0),
  h.hof_year
from public.players p
left join awards a using (player_id)
left join all_stars s using (player_id)
left join hall h using (player_id)
where coalesce(a.mvp, a.cy_young, a.rookie_of_year, a.gold_glove, a.silver_slugger, a.ws_mvp, a.triple_crown) is not null
   or s.all_star is not null
   or h.hof_year is not null;

commit;
