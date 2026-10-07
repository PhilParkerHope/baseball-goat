import { cacheLife } from "next/cache";
import { sql } from "./db";
import type { Position } from "./lineup";
import type { PlayerSummary } from "./players";
import { isPitcher, POSITION_LABELS, POSITION_PLURALS } from "./positions";

// ---------------------------------------------------------------------------
// Who Was Better?
// ---------------------------------------------------------------------------

// Everyone who can come up in Who Was Better?: the 300 highest-ranked players
// whose careers ran past 1920. (Taking the top 300 overall and then dropping
// the old-timers would leave only about 235.) The page hands this list to the
// browser, which deals the day's matchups from it.
export async function getDuelPool(): Promise<PlayerSummary[]> {
  "use cache";
  cacheLife("days");

  const rows = await sql<PlayerSummary[]>`
    select
      p.slug,
      p.name,
      p.primary_position   as position,
      p.primary_franch_id  as "franchId",
      p.primary_team_name  as "teamName",
      p.first_year         as "firstYear",
      p.last_year          as "lastYear",
      p.score::float8      as score,
      p.rank
    from public.players p
    where p.last_year > 1920
      and p.primary_position is not null
    order by p.rank, p.slug
    limit 300
  `;
  return rows.map((row) => ({ ...row }));
}

// ---------------------------------------------------------------------------
// Player of the Day
// ---------------------------------------------------------------------------

// One line of a clue. franchId is only set on team lines, for the color chip.
export type Fact = { label: string; value: string; franchId?: string | null };
export type Clue = { title: string; facts: Fact[] };

export type DailyPuzzle = {
  day: number;
  answer: PlayerSummary;
  clues: Clue[]; // six, hardest first
};

// Changing this reshuffles which player lands on which day.
const SHUFFLE = "goat4";

type AnswerRow = PlayerSummary & {
  playerId: string;
  position: Position;
  firstName: string | null;
  lastName: string;
  bats: string | null;
  throws: string | null;
  birthYear: number | null;
  birthCountry: string | null;
  positionRank: number;
  mvp: number;
  cyYoung: number;
  rookieOfYear: number;
  allStar: number;
  goldGlove: number;
  silverSlugger: number;
  wsMvp: number;
  tripleCrown: number;
  hofYear: number | null;
};

// The player and clues for one day. Day 1 is the first puzzle (lib/daily.ts).
//
// Who can be the answer: anyone who played after 1920 and
//   - won an MVP or a Cy Young, or
//   - is a Hall of Famer who made an All-Star team, or
//   - made five or more All-Star teams and ranks in our top 1,000.
// About 450 players. They're shuffled, and each gets one day before anyone
// repeats; then the order is reshuffled.
export async function getDailyPuzzle(day: number): Promise<DailyPuzzle | null> {
  "use cache";
  cacheLife("days");

  const [picked] = await sql<{ playerId: string }[]>`
    with pool as (
      select p.player_id
      from public.players p
      join public.player_honors h using (player_id)
      where p.last_year > 1920
        and p.primary_position is not null
        and (
          h.mvp > 0
          or h.cy_young > 0
          or (h.all_star > 0 and h.hof_year is not null)
          or (h.all_star >= 5 and p.rank <= 1000)
        )
    ),
    size as (select count(*)::int as n from pool)
    select pool.player_id as "playerId"
    from pool, size
    order by md5(pool.player_id || ':' || ((${day}::int - 1) / size.n) || ':' || ${SHUFFLE})
    offset (${day}::int - 1) % (select n from size)
    limit 1
  `;
  if (!picked) return null;
  const { playerId } = picked;

  const [player] = await sql<AnswerRow[]>`
    select
      p.player_id          as "playerId",
      p.slug,
      p.name,
      p.primary_position   as position,
      p.primary_franch_id  as "franchId",
      p.primary_team_name  as "teamName",
      p.first_year         as "firstYear",
      p.last_year          as "lastYear",
      p.score::float8      as score,
      p.rank,
      pe.name_first        as "firstName",
      pe.name_last         as "lastName",
      pe.bats,
      pe.throws,
      pe.birth_year        as "birthYear",
      pe.birth_country     as "birthCountry",
      (
        select count(*)::int + 1 from public.players o
        where o.primary_position = p.primary_position and o.score > p.score
      )                    as "positionRank",
      h.mvp, h.cy_young as "cyYoung", h.rookie_of_year as "rookieOfYear",
      h.all_star as "allStar", h.gold_glove as "goldGlove",
      h.silver_slugger as "silverSlugger", h.ws_mvp as "wsMvp",
      h.triple_crown as "tripleCrown", h.hof_year as "hofYear"
    from public.players p
    join lahman.people pe using (player_id)
    join public.player_honors h using (player_id)
    where p.player_id = ${playerId}
  `;

  // Every team he played for, in order. A mid-season trade is two rows that year.
  const seasons = await sql<{ year: number; name: string; franchId: string }[]>`
    select s.year_id as year, t.name, t.franch_id as "franchId"
    from (
      select player_id, year_id, stint, team_id from lahman.batting
      union
      select player_id, year_id, stint, team_id from lahman.pitching
    ) s
    join lahman.teams t using (year_id, team_id)
    where s.player_id = ${playerId}
    order by s.year_id, s.stint
  `;

  const [batting] = await sql<{ g: number; ab: number; h: number; hr: number; rbi: number | null; sb: number | null }[]>`
    select sum(g)::int as g, sum(ab)::int as ab, sum(h)::int as h, sum(hr)::int as hr,
           sum(rbi)::int as rbi, sum(sb)::int as sb
    from lahman.batting where player_id = ${playerId}
  `;
  const [pitching] = await sql<{ w: number; l: number; g: number; gs: number; sv: number; ipouts: number; er: number; so: number }[]>`
    select sum(w)::int as w, sum(l)::int as l, sum(g)::int as g, sum(gs)::int as gs,
           sum(sv)::int as sv, sum(ipouts)::int as ipouts, sum(er)::int as er, sum(so)::int as so
    from lahman.pitching where player_id = ${playerId}
    having count(*) > 0
  `;

  const count = (n: number) => n.toLocaleString("en-US");
  const hand = (code: string | null) => (code === "R" ? "right" : code === "L" ? "left" : null);

  // 1. The basics.
  const basics: Fact[] = [
    { label: "Position", value: capitalize(POSITION_LABELS[player.position]) },
    { label: "Played", value: `${player.firstYear}–${player.lastYear}` },
  ];
  const bats = player.bats === "B" ? "Both" : hand(player.bats);
  const throws = hand(player.throws);
  if (bats) basics.push({ label: "Bats", value: capitalize(bats) });
  if (throws) basics.push({ label: "Throws", value: capitalize(throws) });

  // 2. Teams, with back-to-back seasons for the same club joined into one stay.
  const stays: { name: string; franchId: string; from: number; to: number }[] = [];
  for (const season of seasons) {
    const last = stays.at(-1);
    if (last && last.name === season.name && season.year - last.to <= 1) last.to = season.year;
    else stays.push({ name: season.name, franchId: season.franchId, from: season.year, to: season.year });
  }
  const teams: Fact[] = stays.map((stay) => ({
    label: stay.name,
    value: stay.from === stay.to ? String(stay.from) : `${stay.from}–${stay.to}`,
    franchId: stay.franchId,
  }));

  // 3. Career numbers: a pitcher's line for pitchers, a hitter's for everyone else.
  let numbers: Fact[];
  if (isPitcher(player.position) && pitching) {
    const innings = `${count(Math.floor(pitching.ipouts / 3))}${[".0", ".1", ".2"][pitching.ipouts % 3]}`;
    numbers = [
      { label: "Record", value: `${pitching.w}–${pitching.l}` },
      { label: "ERA", value: ((pitching.er * 27) / pitching.ipouts).toFixed(2) },
      { label: "Strikeouts", value: count(pitching.so) },
      { label: "Innings", value: innings },
      player.position === "RP"
        ? { label: "Saves", value: count(pitching.sv) }
        : { label: "Starts", value: count(pitching.gs) },
    ];
  } else {
    numbers = [
      { label: "Games", value: count(batting.g) },
      { label: "Hits", value: count(batting.h) },
      { label: "Home runs", value: count(batting.hr) },
      { label: "Runs batted in", value: batting.rbi === null ? "Not recorded" : count(batting.rbi) },
      { label: "Stolen bases", value: batting.sb === null ? "Not recorded" : count(batting.sb) },
      { label: "Batting average", value: (batting.h / batting.ab).toFixed(3).replace(/^0/, "") },
    ];
  }

  // 4. Awards. Only the ones he has.
  const honors: Fact[] = [
    { label: "MVP awards", n: player.mvp },
    { label: "Cy Young Awards", n: player.cyYoung },
    { label: "All-Star seasons", n: player.allStar },
    { label: "Gold Gloves", n: player.goldGlove },
    { label: "Silver Sluggers", n: player.silverSlugger },
    { label: "Rookie of the Year", n: player.rookieOfYear },
    { label: "World Series MVP", n: player.wsMvp },
    { label: "Triple Crowns", n: player.tripleCrown },
  ]
    .filter((honor) => honor.n > 0)
    .map((honor) => ({ label: honor.label, value: String(honor.n) }));
  honors.push({ label: "Hall of Fame", value: player.hofYear ? `Inducted ${player.hofYear}` : "Not in" });

  // 5. Where we rank him.
  const standing: Fact[] = [
    { label: "All-time rank", value: `No. ${player.rank}` },
    { label: `Among ${POSITION_PLURALS[player.position]}`, value: `No. ${player.positionRank}` },
  ];
  if (player.birthYear && player.birthCountry) {
    standing.push({ label: "Born", value: `${player.birthYear}, ${player.birthCountry}` });
  }

  // 6. The giveaway.
  const initials = [player.firstName, player.lastName]
    .filter((name): name is string => Boolean(name))
    .map((name) => `${name[0]}.`)
    .join(" ");

  return {
    day,
    answer: {
      slug: player.slug, name: player.name, position: player.position, franchId: player.franchId,
      teamName: player.teamName, firstYear: player.firstYear, lastYear: player.lastYear,
      score: player.score, rank: player.rank,
    },
    clues: [
      { title: "The basics", facts: basics },
      { title: "Teams", facts: teams },
      { title: "Career numbers", facts: numbers },
      { title: "Awards", facts: honors },
      { title: "Where we rank him", facts: standing },
      { title: "Initials", facts: [{ label: "First and last name", value: initials }] },
    ],
  };
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}
