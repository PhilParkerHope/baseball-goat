-- Raw Lahman tables, 1871 to last completed season.
-- Lives in its own schema so Supabase's API never exposes it; the app reads
-- the derived tables in `public` instead.
-- Source: SABR Lahman Baseball Database (CC BY-SA 3.0) - attribution required.

create schema if not exists lahman;

create table if not exists lahman.people (
  player_id     text primary key,
  name_first    text,
  name_last     text,
  name_given    text,
  birth_year    int,
  birth_month   int,
  birth_day     int,
  birth_country text,
  death_year    int,
  bats          text,
  throws        text,
  debut         date,
  final_game    date,
  bbref_id      text,
  retro_id      text
);

create table if not exists lahman.batting (
  player_id text not null,
  year_id   int  not null,
  stint     int  not null,
  team_id   text not null,
  lg_id     text,            -- null = National Association (1871-75)
  g int, ab int, r int, h int,
  doubles int, triples int, hr int, rbi int,
  sb int, cs int, bb int, so int,
  ibb int, hbp int, sh int, sf int, gidp int,   -- often null before the 1950s
  primary key (player_id, year_id, stint)
);

create table if not exists lahman.pitching (
  player_id text not null,
  year_id   int  not null,
  stint     int  not null,
  team_id   text not null,
  lg_id     text,
  w int, l int, g int, gs int, cg int, sho int, sv int,
  ipouts int, h int, er int, hr int, bb int, so int,
  ibb int, wp int, hbp int, bk int, bfp int, gf int, r int,
  primary key (player_id, year_id, stint)
);

create table if not exists lahman.teams (
  year_id   int  not null,
  team_id   text not null,
  lg_id     text,
  franch_id text,
  name      text,
  park      text,
  g int, w int, l int,
  r int, ra int, er int, ipouts int,
  bpf int,                   -- batting park factor, 100 = neutral; null for Negro Leagues
  ppf int,                   -- pitching park factor
  primary key (year_id, team_id)
);

create table if not exists lahman.appearances (
  player_id text not null,
  year_id   int  not null,
  team_id   text not null,
  lg_id     text,
  g_all int, g_batting int, g_defense int,
  g_p int, g_c int, g_1b int, g_2b int, g_3b int, g_ss int,
  g_lf int, g_cf int, g_rf int, g_of int, g_dh int, g_ph int, g_pr int,
  primary key (player_id, year_id, team_id)
);

-- Awards, All-Star Games and Hall of Fame voting. Not part of the value
-- numbers; they pick the player pool and the clues for the games.
create table if not exists lahman.awards_players (
  player_id text not null,
  award_id  text not null,   -- 'Most Valuable Player', 'Cy Young Award', 'Gold Glove', ...
  year_id   int  not null,
  lg_id     text,
  tie       text,            -- 'Y' when the award was shared
  notes     text             -- position, for Gold Gloves and Silver Sluggers
);
create index if not exists awards_players_player_idx on lahman.awards_players (player_id);

-- One row per player per game. 1959-62 had two games a year, and the Negro
-- Leagues' East-West games are in here too. Only the columns we use: the
-- file's other columns are messy (a starting position of "9;9", for one).
create table if not exists lahman.allstar_full (
  player_id text not null,
  year_id   int  not null,
  team_id   text,
  lg_id     text
);
create index if not exists allstar_full_player_idx on lahman.allstar_full (player_id);

-- One row per player per ballot, so most rows are years he fell short.
create table if not exists lahman.hall_of_fame (
  player_id text not null,
  year_id   int  not null,
  voted_by  text,
  inducted  text,            -- 'Y' or 'N'
  category  text             -- 'Player', 'Manager', 'Executive', ...
);
create index if not exists hall_of_fame_player_idx on lahman.hall_of_fame (player_id);

-- Which league-year a player is measured against.
-- AL/NL and the other historical majors stand alone. Negro Leagues and
-- independent Black clubs are pooled per year: several of those league-years
-- have under 100 plate appearances, far too few to be their own baseline.
create or replace function lahman.lg_group(lg_id text) returns text
language sql immutable as $$
  select case
    when lg_id is null then 'NA'
    when lg_id in ('AL', 'NL', 'AA', 'UA', 'PL', 'FL') then lg_id
    else 'NLB'
  end
$$;
