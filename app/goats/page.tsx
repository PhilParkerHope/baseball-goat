import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { GoatFilters, type CurrentFilters } from "../components/goat-filters";
import { getGoats, getTeams, MIN_SEASONS, teamLabel, type GoatRow, type TeamOption } from "@/lib/goats";
import { goatsUrl } from "@/lib/goats-url";
import { POSITIONS, type Position } from "@/lib/lineup";
import { POSITION_LABELS, POSITION_PLURALS } from "@/lib/positions";
import { pageMetadata } from "@/lib/site";
import { teamColors } from "@/lib/team-colors";

type Props = PageProps<"/goats">;

// Reads ?team=...&position=...&active=1&all=1, ignoring anything it doesn't recognize.
async function readFilters(searchParams: Props["searchParams"]) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const teams = await getTeams();
  const team = teams.find((t) => t.slug === first(params.team)) ?? null;
  const position = POSITIONS.find((p) => p === first(params.position)) ?? null;

  const current: CurrentFilters = {
    team: team?.slug ?? null,
    position,
    activeOnly: first(params.active) === "1",
    includeShortStays: first(params.all) === "1",
  };
  return { teams, team, current };
}

// "The best second basemen for the Washington Senators (1901–1960)"
function heading(team: TeamOption | null, position: Position | null, activeOnly: boolean, count: number) {
  const who = `${activeOnly ? "active " : ""}${position ? POSITION_PLURALS[position] : "players"}`;
  if (team) return `The best ${who} for the ${teamLabel(team)}`;
  if (activeOnly) return `The best ${who}`;
  return `The ${!position && count === 100 ? "100 " : ""}best ${who} of all time`;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { team, current } = await readFilters(searchParams);
  const rows = await getGoats(current);
  // Name the top of the list, so a search result shows what's on the page.
  const leaders = rows.slice(0, 3).map((row) => row.name);
  const lead =
    leaders.length === 3 ? `${leaders[0]}, ${leaders[1]} and ${leaders[2]} lead the list. ` : "";
  return pageMetadata({
    title: heading(team, current.position, current.activeOnly, rows.length),
    description: `${lead}Ranked by career value, adjusted for era. Filter by team and position.`,
    path: goatsUrl(current),
  });
}

export default function GoatsPage({ searchParams }: Props) {
  return (
    <main>
      <Suspense
        fallback={
          <div className="bg-board text-chalk">
            <p className="font-display mx-auto max-w-[1280px] px-4 py-16 text-3xl font-bold sm:px-8">Loading rankings</p>
          </div>
        }
      >
        <Goats searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Goats({ searchParams }: Pick<Props, "searchParams">) {
  const { teams, team, current } = await readFilters(searchParams);
  const rows = await getGoats(current);
  const unfiltered = !current.team && !current.position && !current.activeOnly;

  return (
    <>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-10 sm:px-8 lg:pt-10">
          <h1 className="font-display max-w-[26ch] text-5xl leading-[0.95] font-extrabold text-balance sm:text-6xl">
            {heading(team, current.position, current.activeOnly, rows.length)}
          </h1>
          <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-chalk/90">
            Ranked by career score.
            {team &&
              (current.includeShortStays
                ? " That covers a player’s whole career, not only his time with this team, and anyone who played a game for them is included."
                : ` That covers a player’s whole career, not only his time with this team. Players need at least ${MIN_SEASONS} seasons there to make the list.`)}
          </p>
          <div className="mt-8 max-w-[900px]">
            <GoatFilters
              teams={teams.map((t) => ({
                slug: t.slug, kind: t.kind, franchId: t.franchId, label: teamLabel(t), lastYear: t.lastYear, seasons: t.seasons,
              }))}
              current={current}
              minSeasons={MIN_SEASONS}
            />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-8">
        {rows.length === 0 ? (
          <p className="max-w-[52ch] text-lg">
            No one fits those filters.
            {team && !current.includeShortStays
              ? ` Try including players with fewer than ${MIN_SEASONS} seasons there, or pick a different position.`
              : " Try a different team or position."}
          </p>
        ) : (
          <ol className="max-w-[900px]">
            {rows.map((row, i) => (
              <GoatListItem
                key={row.slug}
                row={row}
                place={i + 1}
                // Everyone is compared with the top of the list; the top with No. 2.
                rival={i === 0 ? rows[1] : rows[0]}
                team={team}
                showAllTimeRank={!unfiltered}
              />
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function GoatListItem({
  row,
  place,
  rival,
  team,
  showAllTimeRank,
}: {
  row: GoatRow;
  place: number;
  rival: GoatRow | undefined;
  team: TeamOption | null; // the team the list is filtered to, if any
  showAllTimeRank: boolean;
}) {
  const years = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);

  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-ink/15 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-4">
      <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{place}</span>

      <div className="min-w-0">
        <p className="font-display flex items-baseline gap-2 text-2xl font-bold sm:text-3xl">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 self-center rounded-[2px]"
            style={{ background: teamColors(row.franchId).primary }}
          />
          {row.name}
        </p>
        {/* Position and career years. His main team is only shown when the list
            isn't about one team; otherwise it reads as a second, confusing team. */}
        <p className="text-sm text-ink/75 first-letter:uppercase sm:text-base">
          {[row.position && POSITION_LABELS[row.position], !team && row.teamName, years(row.firstYear, row.lastYear)]
            .filter(Boolean)
            .join(", ")}
        </p>
        {team && row.teamSeasons !== null && row.teamFirstYear !== null && row.teamLastYear !== null && (
          <p className="text-sm text-ink/75 sm:text-base">
            {row.teamSeasons} {row.teamSeasons === 1 ? "season" : "seasons"} on the {team.name}
            {team.kind === "franchise" && " franchise"}, {years(row.teamFirstYear, row.teamLastYear)},{" "}
            {row.teamGames?.toLocaleString("en-US")} {row.teamGames === 1 ? "game" : "games"}
          </p>
        )}
        {rival && (
          <Link
            href={`/compare/${row.slug}-vs-${rival.slug}`}
            className="text-sm underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-ink sm:text-base"
          >
            Compare with {rival.lastName === row.lastName ? rival.name : rival.lastName}
          </Link>
        )}
      </div>

      <div className="text-right">
        <p className="font-display text-3xl leading-none font-extrabold tabular-nums sm:text-4xl">
          {row.score.toFixed(1)}
        </p>
        {showAllTimeRank && <p className="mt-1 text-sm text-ink/75">No. {row.rank.toLocaleString("en-US")} all-time</p>}
      </div>
    </li>
  );
}
