import { cacheLife } from "next/cache";
import { sql } from "./db";
import type { Position } from "./lineup";

// What the search box and the matchup links need to know about a player.
export type PlayerSummary = {
  slug: string;
  name: string;
  position: Position | null;
  franchId: string | null;
  teamName: string | null;
  firstYear: number;
  lastYear: number;
  score: number;
  rank: number;
};

export type BattingTotals = {
  g: number; pa: number; ab: number; r: number; h: number;
  doubles: number; triples: number; hr: number; rbi: number | null;
  sb: number | null; bb: number; hbp: number; sf: number;
};

export type PitchingTotals = {
  w: number; l: number; g: number; gs: number; sv: number;
  ipouts: number; h: number; er: number; bb: number; so: number;
};

// Everything the comparison page shows for one player.
export type PlayerProfile = PlayerSummary & {
  playerId: string;
  lastName: string;
  isActive: boolean;
  seasons: number;
  career: number;
  peak7: number;
  batting: BattingTotals;
  pitching: PitchingTotals | null;
};

const summaryColumns = sql`
  p.slug,
  p.name,
  p.primary_position   as position,
  p.primary_franch_id  as "franchId",
  p.primary_team_name  as "teamName",
  p.first_year         as "firstYear",
  p.last_year          as "lastYear",
  p.score::float8      as score,
  p.rank
`;

// "Ronald Acuña Jr." -> "ronald-acuna-jr", the same shape as players.slug.
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Name search for the pickers. Matches anywhere in the name, best players first.
export async function searchPlayers(query: string): Promise<PlayerSummary[]> {
  "use cache";
  cacheLife("days");

  const term = toSlug(query);
  if (term.length < 2) return [];

  const rows = await sql<PlayerSummary[]>`
    select ${summaryColumns}
    from public.players p
    where p.slug like ${"%" + term + "%"}
    order by p.score desc
    limit 8
  `;
  return rows.map((row) => ({ ...row }));
}

export async function getPlayerProfile(slug: string): Promise<PlayerProfile | null> {
  "use cache";
  cacheLife("days");

  const [player] = await sql<Omit<PlayerProfile, "batting" | "pitching">[]>`
    select
      ${summaryColumns},
      p.player_id               as "playerId",
      pe.name_last              as "lastName",
      p.is_active               as "isActive",
      p.seasons,
      p.career_adj_wins::float8 as career,
      p.peak7_adj_wins::float8  as peak7
    from public.players p
    join lahman.people pe using (player_id)
    where p.slug = ${slug}
  `;
  if (!player) return null;

  const [[batting], [pitching]] = await Promise.all([
    sql<BattingTotals[]>`
      select
        sum(g)::int as g, sum(pa)::int as pa, sum(ab)::int as ab, sum(r)::int as r, sum(h)::int as h,
        sum(doubles)::int as doubles, sum(triples)::int as triples, sum(hr)::int as hr,
        sum(rbi)::int as rbi, sum(sb)::int as sb, sum(bb)::int as bb,
        coalesce(sum(hbp), 0)::int as hbp, coalesce(sum(sf), 0)::int as sf
      from public.player_batting_seasons
      where player_id = ${player.playerId}
    `,
    sql<PitchingTotals[]>`
      select
        sum(w)::int as w, sum(l)::int as l, sum(g)::int as g, sum(gs)::int as gs, sum(sv)::int as sv,
        sum(ipouts)::int as ipouts, sum(h)::int as h, sum(er)::int as er,
        sum(bb)::int as bb, sum(so)::int as so
      from public.pitcher_value_seasons
      where player_id = ${player.playerId}
      having count(*) > 0
    `,
  ]);

  return { ...player, batting: { ...batting }, pitching: pitching ? { ...pitching } : null };
}
