import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LineupField } from "../../components/lineup-field";
import { POSITIONS } from "@/lib/lineup";
import { pageMetadata } from "@/lib/site";
import { getFranchises, getTeamLineup, type Franchise } from "@/lib/team-lineups";

type Props = PageProps<"/lineups/[team]">;

// All 30 team pages are built ahead of time.
export async function generateStaticParams() {
  return (await getFranchises()).map((franchise) => ({ team: franchise.slug }));
}

async function findFranchise(slug: string): Promise<Franchise | null> {
  return (await getFranchises()).find((franchise) => franchise.slug === slug) ?? null;
}

const years = (from: number, to: number) => (from === to ? `${from}` : `${from}–${to}`);
// "A, B, and C"
const listOf = (items: string[]) => new Intl.ListFormat("en", { type: "conjunction" }).format(items);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { team } = await params;
  const franchise = await findFranchise(team);
  if (!franchise) return { title: "Team not found", robots: { index: false } };

  const lineup = await getTeamLineup(franchise);
  // Name a few starters, so a search result shows what's on the page.
  const names = POSITIONS.map((position) => lineup[position][0]?.name).filter(Boolean).slice(0, 9);
  return pageMetadata({
    title: `The all-time ${franchise.name} lineup`,
    description: `The best ${franchise.name} player ever at each position, ${years(franchise.firstYear, franchise.lastYear)}: ${names.slice(0, 5).join(", ")} and more.`,
    path: `/lineups/${franchise.slug}`,
    image: `/lineups/${franchise.slug}/opengraph-image`,
  });
}

export default function TeamLineupPage({ params }: Props) {
  return (
    <main>
      <Suspense
        fallback={
          <div className="bg-board text-chalk">
            <p className="font-display mx-auto max-w-[1280px] px-4 py-16 text-3xl font-bold sm:px-8">Loading lineup</p>
          </div>
        }
      >
        <TeamLineup params={params} />
      </Suspense>
    </main>
  );
}

async function TeamLineup({ params }: Pick<Props, "params">) {
  const { team } = await params;
  const franchises = await getFranchises();
  const franchise = franchises.find((f) => f.slug === team);

  if (!franchise) {
    return (
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-12 sm:px-8">
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl">
            We couldn&rsquo;t find that team
          </h1>
          <p className="mt-4 text-lg">
            <Link href="/lineups" className="font-bold underline underline-offset-4">
              See all 30 teams
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const lineup = await getTeamLineup(franchise);
  const former = franchise.formerNames;

  return (
    <>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-10 sm:px-8 lg:pt-8 lg:pb-14">
          {/* Same layout as the home page: headline over the field, intro over the card. */}
          <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-y-8">
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold text-balance sm:text-6xl lg:col-start-1 lg:row-start-1 lg:self-end">
              The all-time {franchise.name} lineup
            </h1>

            <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
              <p className="max-w-[50ch] text-lg leading-relaxed text-chalk/90">
                The best player this franchise has had at each position,{" "}
                {years(franchise.firstYear, franchise.lastYear)}, ranked by what he did for the club
                and not by his whole career.
                {former.length > 0 &&
                  ` That history includes the ${listOf(
                    former.map((f) => `${f.name} (${years(f.firstYear, f.lastYear)})`),
                  )}.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/goats?team=${franchise.goatsTeam}`}
                  className="font-display rounded-[3px] bg-signal px-5 py-2 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
                >
                  Full {franchise.name} rankings
                </Link>
              </div>
            </div>

            {/* The key resets the selected player when moving from one team to another. */}
            <LineupField key={franchise.franchId} lineup={lineup} />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold">Other teams</h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-lg">
          {franchises
            .filter((f) => f.franchId !== franchise.franchId)
            .map((f) => (
              <li key={f.franchId}>
                <Link href={`/lineups/${f.slug}`} className="underline underline-offset-4 hover:decoration-2">
                  {f.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
