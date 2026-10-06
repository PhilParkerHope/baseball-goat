import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayerPicker } from "../../components/player-picker";
import { displayNames, getStatSections, getVerdict, type StatRow } from "@/lib/compare";
import { getLineup, POSITIONS } from "@/lib/lineup";
import { getPlayerProfile, type PlayerProfile, type PlayerSummary } from "@/lib/players";
import { isPitcher, POSITION_LABELS } from "@/lib/positions";
import { pageMetadata } from "@/lib/site";
import { teamColors } from "@/lib/team-colors";

type Props = PageProps<"/compare/[matchup]">;

// Build the top-two-at-each-position matchups ahead of time. Every other
// matchup is built the first time someone asks for it, then cached.
export async function generateStaticParams() {
  const lineup = await getLineup();
  return POSITIONS.map((position) => lineup[position])
    .filter((depth) => depth.length >= 2)
    .map(([first, second]) => ({ matchup: `${first.slug}-vs-${second.slug}` }));
}

// "willie-mays-vs-hank-aaron" -> both players, or null if either is unknown.
async function loadMatchup(matchup: string): Promise<[PlayerProfile, PlayerProfile] | null> {
  const slugs = matchup.split("-vs-");
  if (slugs.length !== 2) return null;
  const [a, b] = await Promise.all(slugs.map(getPlayerProfile));
  return a && b ? [a, b] : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchup } = await params;
  const players = await loadMatchup(matchup);
  // Unknown or same-player matchups shouldn't show up in search results.
  if (!players || players[0].slug === players[1].slug) {
    return { title: "Matchup not found", robots: { index: false } };
  }

  const [a, b] = players;
  const verdict = getVerdict(a, b);
  const [nameA, nameB] = displayNames(a, b);
  // Both orders of a matchup work; this tells search engines they're one page.
  const canonical = `/compare/${[a.slug, b.slug].sort().join("-vs-")}`;
  return pageMetadata({
    title: `${nameA} vs. ${nameB}: who was better?`,
    description: `${verdict.headline}. ${verdict.summary}`,
    path: canonical,
    // The picture shown when the link is shared: see opengraph-image.tsx in this folder.
    image: `/compare/${matchup}/opengraph-image`,
  });
}

export default function MatchupPage({ params }: Props) {
  return (
    <main>
      <Suspense fallback={<Band><p className="font-display py-10 text-3xl font-bold">Loading matchup</p></Band>}>
        <Matchup params={params} />
      </Suspense>
    </main>
  );
}

async function Matchup({ params }: Pick<Props, "params">) {
  const { matchup } = await params;
  const players = await loadMatchup(matchup);

  if (!players || players[0].slug === players[1].slug) {
    return (
      <Band>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl">
          {players ? "That’s the same player twice" : "We couldn’t find that matchup"}
        </h1>
        <p className="mt-4 mb-8 max-w-[52ch] text-lg text-chalk/90">
          Search for two different players to compare.
        </p>
        <div className="max-w-[900px]">
          <PlayerPicker />
        </div>
      </Band>
    );
  }

  const [a, b] = players;
  const [nameA, nameB] = displayNames(a, b);
  const verdict = getVerdict(a, b);
  const sections = getStatSections(a, b);
  const mixed = isPitcher(a.position) !== isPitcher(b.position);
  const active = players.filter((p) => p.isActive);

  return (
    <>
      <Band>
        <div className="max-w-[900px]">
          {/* The key resets the search boxes whenever the matchup changes. */}
          <PlayerPicker key={matchup} first={toSummary(a)} second={toSummary(b)} />
        </div>

        <h1 className="font-display mt-10 max-w-[24ch] text-5xl leading-[0.95] font-extrabold text-balance sm:text-7xl sm:leading-[0.92]">
          {verdict.headline}
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-chalk/90">{verdict.summary}</p>
        {active.length > 0 && (
          <p className="mt-2 max-w-[62ch] text-lg leading-relaxed text-chalk/90">
            {active.map((p) => p.name).join(" and ")} {active.length > 1 ? "are" : "is"} still
            playing, so {active.length > 1 ? "their numbers" : "his numbers"} will keep moving.
          </p>
        )}

        <div className="mt-8 grid max-w-[1000px] grid-cols-2 gap-3 sm:gap-6">
          <PlayerPlate player={a} leads={verdict.winner === "a"} />
          <PlayerPlate player={b} leads={verdict.winner === "b"} />
        </div>
      </Band>

      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold md:text-center">Tale of the tape</h2>
        <p className="mx-auto mt-3 max-w-[62ch] leading-relaxed md:text-center">
          Wins added is how many extra games a player&rsquo;s teams won because they had him and
          not a replacement-level player, the kind of fill-in any team can find. In one season,
          2 is a solid regular, 5 is an All-Star and 8 or more is an MVP-level year. Score is the
          average of the career total and the best seven seasons.
        </p>

        <table className="mx-auto mt-4 w-full max-w-[820px] border-collapse">
          <thead>
            <tr className="font-display text-xl font-bold sm:text-2xl">
              <th scope="col" className="w-[36%] pb-1 text-right align-bottom">{nameA}</th>
              <td className="w-[28%]" />
              <th scope="col" className="w-[36%] pb-1 text-left align-bottom">{nameB}</th>
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.title}>
              <tr>
                <th colSpan={3} scope="rowgroup" className="font-display border-b-2 border-ink pt-7 pb-1 text-center text-xl font-bold">
                  {section.title}
                </th>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.label} className="border-b border-ink/15">
                  <td className="py-2 text-right"><Value row={row} side="a" /></td>
                  <th scope="row" className="px-2 py-2 text-center text-sm font-normal sm:text-base">{row.label}</th>
                  <td className="py-2 text-left"><Value row={row} side="b" /></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>

        <p className="mx-auto mt-4 max-w-[62ch] text-sm leading-relaxed text-ink/75 md:text-center">
          The dot marks the better number in each row.
          {mixed && " A hitter and a pitcher don’t share traditional stats, so this comparison uses the ratings only."}
        </p>
      </section>
    </>
  );
}

// The green band at the top of the page.
function Band({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-board text-chalk">
      <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-12 sm:px-8">{children}</div>
    </div>
  );
}

function PlayerPlate({ player, leads }: { player: PlayerProfile; leads: boolean }) {
  const colors = teamColors(player.franchId);
  return (
    <article
      className={`overflow-hidden rounded-[4px] bg-chalk text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)] ${
        leads ? "outline-3 outline-offset-2 outline-signal" : ""
      }`}
    >
      <div className="h-4" style={{ background: colors.primary, borderBottom: `4px solid ${colors.secondary}` }} />
      <div className="p-4 sm:p-6">
        <p className="text-sm first-letter:uppercase">
          {player.position ? POSITION_LABELS[player.position] : "Position unknown"}
        </p>
        <h2 className="font-display mt-1 text-3xl leading-[0.95] font-extrabold sm:text-5xl">{player.name}</h2>
        <p className="mt-2 text-sm sm:text-base">
          {player.teamName}, {player.firstYear}–{player.lastYear}
        </p>
        <p className="font-display mt-4 text-5xl leading-none font-extrabold tabular-nums sm:text-7xl">
          {player.score.toFixed(1)}
        </p>
        <p className="mt-1 text-sm">Score, No. {player.rank} all-time</p>
      </div>
    </article>
  );
}

// One number in the table, with a dot beside it if it's the better of the two.
function Value({ row, side }: { row: StatRow; side: "a" | "b" }) {
  const better = row.better === side;
  const dot = (
    <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${better ? "bg-signal ring-2 ring-ink" : ""}`} />
  );
  return (
    <span className={`font-display inline-flex items-center gap-2 text-2xl tabular-nums sm:text-3xl ${better ? "font-extrabold" : "font-medium text-ink/70"}`}>
      {side === "a" && dot}
      {row[side]}
      {better && <span className="sr-only">(better)</span>}
      {side === "b" && dot}
    </span>
  );
}

// Only the fields the search boxes need go to the browser.
function toSummary(p: PlayerProfile): PlayerSummary {
  return {
    slug: p.slug, name: p.name, position: p.position, franchId: p.franchId, teamName: p.teamName,
    firstYear: p.firstYear, lastYear: p.lastYear, score: p.score, rank: p.rank,
  };
}