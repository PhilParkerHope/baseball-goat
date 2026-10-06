import { cacheLife } from "next/cache";
import { sql } from "./db";

// The positions on the field, in the order they're read out.
export const POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP"] as const;
export type Position = (typeof POSITIONS)[number];

export type LineupPlayer = {
  playerId: string;
  slug: string;
  name: string;
  lastName: string;
  position: Position;
  depth: number; // 1 = the starter, 2-4 = runners-up
  firstYear: number;
  lastYear: number;
  franchId: string | null;
  teamName: string | null;
  score: number;
  rank: number; // all-time, across every position
  career: number;
  peak7: number;
};

export type Lineup = Record<Position, LineupPlayer[]>;

const DEPTH = 4;

// The top players at every position, best first. Nothing here is hand-picked:
// rebuild the database and the lineup changes with it.
export async function getLineup(): Promise<Lineup> {
  "use cache";
  cacheLife("days");

  const rows = await sql<LineupPlayer[]>`
    select *
    from (
      select
        p.player_id                as "playerId",
        p.slug,
        p.name,
        pe.name_last               as "lastName",
        p.primary_position         as position,
        row_number() over (
          partition by p.primary_position order by p.score desc, p.player_id
        )::int                     as depth,
        p.first_year               as "firstYear",
        p.last_year                as "lastYear",
        p.primary_franch_id        as "franchId",
        p.primary_team_name        as "teamName",
        p.score::float8            as score,
        p.rank,
        p.career_adj_wins::float8  as career,
        p.peak7_adj_wins::float8   as peak7
      from public.players p
      join lahman.people pe using (player_id)
      where p.primary_position = any(${POSITIONS as unknown as string[]})
    ) ranked
    where depth <= ${DEPTH}
    order by position, depth
  `;

  const lineup = Object.fromEntries(POSITIONS.map((pos) => [pos, []])) as unknown as Lineup;
  for (const row of rows) lineup[row.position].push({ ...row });
  return lineup;
}
