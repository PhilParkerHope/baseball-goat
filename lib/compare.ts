import type { PlayerProfile } from "./players";
import { isPitcher } from "./positions";

// Pure functions that turn two player profiles into the verdict and the
// side-by-side table. No database access here.

export type Verdict = {
  headline: string;
  summary: string;
  winner: "a" | "b" | null; // null = too close to call
};

export type StatRow = { label: string; a: string; b: string; better: "a" | "b" | null };
export type StatSection = { title: string; rows: StatRow[] };

const one = (n: number) => n.toFixed(1);

// What to call each player on the page. Two players with the same full name
// (there are 750 such names) get their years added: "Ken Griffey (1989–2010)".
export function displayNames(a: PlayerProfile, b: PlayerProfile): [string, string] {
  if (a.name !== b.name) return [a.name, b.name];
  return [a, b].map((p) => `${p.name} (${p.firstYear}–${p.lastYear})`) as [string, string];
}

export function getVerdict(a: PlayerProfile, b: PlayerProfile): Verdict {
  const [nameA, nameB] = displayNames(a, b);
  const full = (p: PlayerProfile) => (p === a ? nameA : nameB);
  // Use last names in the summary unless the two players share one.
  const short = (p: PlayerProfile) => (a.lastName === b.lastName ? full(p) : p.lastName);

  const [winner, loser] = a.score >= b.score ? [a, b] : [b, a];
  const gap = winner.score > 0 ? (winner.score - loser.score) / winner.score : 0;

  let headline: string;
  if (gap < 0.02) headline = `${nameA} and ${nameB} are too close to call`;
  else if (gap < 0.1) headline = `${full(winner)} edges ${full(loser)}`;
  else if (gap < 0.3) headline = `${full(winner)} beats ${full(loser)}`;
  else headline = `${full(winner)} is well ahead of ${full(loser)}`;

  const [peakLeader, peakOther] = a.peak7 >= b.peak7 ? [a, b] : [b, a];
  const [careerLeader, careerOther] = a.career >= b.career ? [a, b] : [b, a];

  const summary =
    peakLeader === careerLeader
      ? `${short(peakLeader)} leads on both counts: ${one(careerLeader.career)} wins added to ${one(careerOther.career)} over a career, and ${one(peakLeader.peak7)} to ${one(peakOther.peak7)} across his seven best seasons.`
      : `${short(peakLeader)} had the higher peak, ${one(peakLeader.peak7)} wins added to ${one(peakOther.peak7)} across his seven best seasons.  ${short(careerLeader)} built more over a full career, ${one(careerLeader.career)} to ${one(careerOther.career)}.`;

  return { headline, summary, winner: gap < 0.02 ? null : winner === a ? "a" : "b" };
}

// Builds one table row and works out which side is better.
function row(
  label: string,
  a: number | null,
  b: number | null,
  format: (n: number) => string,
  prefer: "higher" | "lower" | "neither" = "higher",
): StatRow {
  let better: StatRow["better"] = null;
  if (a !== null && b !== null && a !== b && prefer !== "neither") {
    better = (prefer === "higher") === a > b ? "a" : "b";
  }
  return { label, a: a === null ? "n/a" : format(a), b: b === null ? "n/a" : format(b), better };
}

const whole = (n: number) => n.toLocaleString("en-US");
const average = (n: number) => n.toFixed(3).replace(/^0/, ""); // .342, the way it's written
const ratio = (n: number) => n.toFixed(2);
// Innings the way a box score writes them: 5914.1 means 5914 and a third.
const innings = (outs: number) => `${whole(Math.floor(outs / 3))}.${outs % 3}`;

const div = (top: number, bottom: number) => (bottom > 0 ? top / bottom : null);

export function getStatSections(a: PlayerProfile, b: PlayerProfile): StatSection[] {
  const sections: StatSection[] = [
    {
      title: "Ratings",
      rows: [
        row("Score", a.score, b.score, one),
        row("Wins added, career", a.career, b.career, one),
        row("Wins added, best 7 seasons", a.peak7, b.peak7, one),
        row("All-time rank", a.rank, b.rank, whole, "lower"),
        row("Seasons", a.seasons, b.seasons, whole, "neither"),
      ],
    },
  ];

  const bothPitchers = isPitcher(a.position) && isPitcher(b.position);
  const bothHitters = !isPitcher(a.position) && !isPitcher(b.position);

  if (bothHitters) {
    const x = a.batting;
    const y = b.batting;
    const obp = (t: typeof x) => div(t.h + t.bb + t.hbp, t.ab + t.bb + t.hbp + t.sf);
    const slg = (t: typeof x) => div(t.h + t.doubles + 2 * t.triples + 3 * t.hr, t.ab);
    sections.push({
      title: "Hitting",
      rows: [
        row("Games", x.g, y.g, whole),
        row("Hits", x.h, y.h, whole),
        row("Home runs", x.hr, y.hr, whole),
        row("Runs batted in", x.rbi, y.rbi, whole),
        row("Stolen bases", x.sb, y.sb, whole),
        row("Batting average", div(x.h, x.ab), div(y.h, y.ab), average),
        row("On-base percentage", obp(x), obp(y), average),
        row("Slugging percentage", slg(x), slg(y), average),
      ],
    });
  }

  if (bothPitchers && a.pitching && b.pitching) {
    const x = a.pitching;
    const y = b.pitching;
    // Saves only mean something when a reliever is involved.
    const reliever = a.position === "RP" || b.position === "RP";
    sections.push({
      title: "Pitching",
      rows: [
        row("Wins", x.w, y.w, whole),
        row("Losses", x.l, y.l, whole, "neither"),
        ...(reliever ? [row("Saves", x.sv, y.sv, whole)] : []),
        row("Innings", x.ipouts, y.ipouts, innings),
        row("Strikeouts", x.so, y.so, whole),
        row("Earned run average", div(x.er * 27, x.ipouts), div(y.er * 27, y.ipouts), ratio, "lower"),
        row("Walks and hits per inning", div((x.bb + x.h) * 3, x.ipouts), div((y.bb + y.h) * 3, y.ipouts), ratio, "lower"),
      ],
    });
  }

  return sections;
}
