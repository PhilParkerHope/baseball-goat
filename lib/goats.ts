import { cacheLife } from "next/cache";
import { sql } from "./db";
import type { Position } from "./lineup";
import type { PlayerSummary } from "./players";

// One choice in the team filter. See db/07_compute_player_teams.sql.
export type TeamOption = {
  slug: string;
  kind: "name" | "franchise";
  franchId: string;
  name: string;
  firstYear: number;
  lastYear: number;
  seasons: number;
};

// One row on the GOATs page. The team* fields are only filled in when the
// list is filtered to a team: they describe his time with that team.
export type GoatRow = PlayerSummary & {
  lastName: string;
  teamSeasons: number | null;
  teamGames: number | null;
  teamFirstYear: number | null;
  teamLastYear: number | null;
};

export type GoatFilters = {
  team: string | null; // a teams.slug
  position: Position | null;
  activeOnly: boolean;
  includeShortStays: boolean; // only matters with a team
};

// With a team filter on, a player needs this many seasons there to show up
// (unless short stays are included). Without it, the best Boston Brave of all
// time is Babe Ruth, who played 28 games for them.
export const MIN_SEASONS = 3;
const LIMIT = 100;

// "Washington Senators (1901–1960)" / "Los Angeles Dodgers franchise (1884–2025)"
export function teamLabel(team: TeamOption): string {
  const years = team.firstYear === team.lastYear ? `${team.firstYear}` : `${team.firstYear}–${team.lastYear}`;
  return `${team.name}${team.kind === "franchise" ? " franchise" : ""} (${years})`;
}

// Every team choice, most recent and longest-lived first.
export async function getTeams(): Promise<TeamOption[]> {
  "use cache";
  cacheLife("days");

  const rows = await sql<TeamOption[]>`
    select slug, kind, franch_id as "franchId", name,
           first_year as "firstYear", last_year as "lastYear", seasons
    from public.teams
    order by last_year desc, seasons desc, name
  `;
  return rows.map((row) => ({ ...row }));
}

// The top players matching the filters, by career score.
export async function getGoats(filters: GoatFilters): Promise<GoatRow[]> {
  "use cache";
  cacheLife("days");

  const { team, position, activeOnly, includeShortStays } = filters;
  const minSeasons = includeShortStays ? 1 : MIN_SEASONS;

  const rows = await sql<GoatRow[]>`
    select
      p.slug,
      p.name,
      pe.name_last         as "lastName",
      p.primary_position   as position,
      p.primary_franch_id  as "franchId",
      p.primary_team_name  as "teamName",
      p.first_year         as "firstYear",
      p.last_year          as "lastYear",
      p.score::float8      as score,
      p.rank,
      pt.seasons           as "teamSeasons",
      pt.games             as "teamGames",
      pt.first_year        as "teamFirstYear",
      pt.last_year         as "teamLastYear"
    from public.players p
    join lahman.people pe using (player_id)
    left join public.player_teams pt
      on pt.player_id = p.player_id and pt.team_slug = ${team}
    where (${team}::text is null or pt.seasons >= ${minSeasons})
      and (${position}::text is null or p.primary_position = ${position})
      and (not ${activeOnly} or p.is_active)
    order by p.score desc, p.player_id
    limit ${LIMIT}
  `;
  return rows.map((row) => ({ ...row }));
}
