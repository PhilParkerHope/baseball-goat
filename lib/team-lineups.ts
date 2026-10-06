import { cacheLife } from "next/cache";
import { sql } from "./db";
import { POSITIONS, type Lineup, type LineupPlayer, type Position } from "./lineup";

// One of today's 30 franchises, with its whole history.
export type Franchise = {
  franchId: string;
  slug: string; // for URLs, e.g. new-york-yankees
  name: string; // what it's called today
  firstYear: number;
  lastYear: number;
  formerNames: { name: string; firstYear: number; lastYear: number }[]; // oldest first
  goatsTeam: string; // the matching choice in the GOATs page team filter
};

// Where the data's name for a team is out of date.
const NAME_FIXES: Record<string, string> = {
  ANA: "Los Angeles Angels",
};

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Today's franchises, A to Z.
export async function getFranchises(): Promise<Franchise[]> {
  "use cache";
  cacheLife("days");

  // Every name (and whole-franchise entry) for franchises still playing.
  const rows = await sql<
    { slug: string; kind: "name" | "franchise"; franchId: string; name: string; firstYear: number; lastYear: number }[]
  >`
    select slug, kind, franch_id as "franchId", name, first_year as "firstYear", last_year as "lastYear"
    from public.teams
    where franch_id in (
      select franch_id from public.teams where last_year = (select max(last_year) from public.teams)
    )
    order by franch_id, first_year, last_year
  `;

  const latest = Math.max(...rows.map((row) => row.lastYear));
  const byFranchise = Map.groupBy(rows, (row) => row.franchId);

  return [...byFranchise.entries()]
    .map(([franchId, entries]) => {
      const names = entries.filter((entry) => entry.kind === "name");
      const current = names.findLast((entry) => entry.lastYear === latest)!;
      const whole = entries.find((entry) => entry.kind === "franchise");
      const name = NAME_FIXES[franchId] ?? current.name;
      return {
        franchId,
        slug: slugify(name),
        name,
        firstYear: Math.min(...names.map((entry) => entry.firstYear)),
        lastYear: latest,
        formerNames: names
          .filter((entry) => entry !== current)
          .map(({ name, firstYear, lastYear }) => ({ name, firstYear, lastYear })),
        // A franchise that has only ever had one name has no separate
        // "whole franchise" choice in the GOATs filter.
        goatsTeam: (whole ?? current).slug,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

type Row = Omit<LineupPlayer, "position" | "depth"> & { position: Position; depth: number; hitterRank: number };

const DEPTH = 4;
const FIELD: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];

// A franchise's all-time lineup: the top players at each position, ranked by
// wins added while playing for that franchise, at the position they played there.
export async function getTeamLineup(franchise: Franchise): Promise<Lineup> {
  "use cache";
  cacheLife("days");

  const rows = await sql<Row[]>`
    select *
    from (
      select
        p.player_id                as "playerId",
        p.slug,
        p.name,
        pe.name_last               as "lastName",
        fp.position,
        row_number() over (partition by fp.position order by fp.wins desc, p.player_id)::int as depth,
        -- his place among all of this franchise's non-pitchers, for the DH spot
        row_number() over (
          partition by (fp.position in ('SP', 'RP')) order by fp.wins desc, p.player_id
        )::int                     as "hitterRank",
        fp.first_year              as "firstYear",   -- his years with this franchise
        fp.last_year               as "lastYear",
        ${franchise.franchId}      as "franchId",    -- everyone wears this team's colors here
        ${franchise.name}          as "teamName",
        p.score::float8            as score,
        p.rank,
        p.career_adj_wins::float8  as career,
        p.peak7_adj_wins::float8   as peak7,
        fp.wins::float8            as "teamWins",
        fp.seasons                 as "teamSeasons"
      from public.franchise_players fp
      join public.players p using (player_id)
      join lahman.people pe using (player_id)
      where fp.franch_id = ${franchise.franchId} and fp.position is not null
    ) ranked
    where depth <= ${DEPTH}
       or (position not in ('SP', 'RP') and "hitterRank" <= ${FIELD.length + DEPTH + 4})
    order by "teamWins" desc
  `;

  const lineup = Object.fromEntries(POSITIONS.map((pos) => [pos, []])) as unknown as Lineup;
  // Drop the helper column before the row goes to the page.
  const toPlayer = (row: Row): LineupPlayer => {
    const player: LineupPlayer & { hitterRank?: number } = { ...row };
    delete player.hitterRank;
    return player;
  };

  for (const row of rows) {
    if (row.position !== "DH" && row.depth <= DEPTH) lineup[row.position].push(toPlayer(row));
  }
  for (const position of POSITIONS) lineup[position].sort((a, b) => a.depth - b.depth);

  // The DH is the best hitter who isn't already starting in the field, whatever
  // position he played. Many clubs barely used a DH, so picking only from men
  // who mostly DH'd would leave the spot nearly empty.
  const starters = new Set(FIELD.map((position) => lineup[position][0]?.playerId));
  lineup.DH = rows
    .filter((row) => row.position !== "SP" && row.position !== "RP" && !starters.has(row.playerId))
    .slice(0, DEPTH)
    .map((row, i) => ({ ...toPlayer(row), position: "DH", depth: i + 1 }));

  return lineup;
}
