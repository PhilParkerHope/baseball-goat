import type { Metadata } from "next";
import Link from "next/link";
import { LineupField } from "./components/lineup-field";
import { RankingsModal } from "./components/rankings-modal";
import { getLineup, POSITIONS } from "@/lib/lineup";
import { POSITION_LABELS } from "@/lib/positions";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `${SITE_NAME}: who was actually better?`,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function Home() {
  const lineup = await getLineup();

  // The six positions where No. 1 and No. 2 are closest, tightest race first.
  const closestRaces = POSITIONS.map((position) => lineup[position])
    .filter((depth) => depth.length >= 2)
    .map(([first, second]) => ({ first, second, gap: first.score - second.score }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 6);

  return (
    <main>
      <div className="bg-board text-chalk">
        {/* Top spacing is padding here, not a margin on the grid: a margin would
            escape the green band and show a light strip under the header. */}
        <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-10 sm:px-8 lg:pt-8 lg:pb-14">
          {/* Phone: headline, welcome, field, card. Desktop: headline over the field on the
              left, welcome over the card on the right. */}
          <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-y-8">
            <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl lg:col-start-1 lg:row-start-1 lg:self-end">
              Who was actually better?
            </h1>

            <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
              <p className="max-w-[46ch] text-lg leading-relaxed text-chalk/90">
                Welcome to {SITE_NAME}. Every major leaguer since 1871, Negro Leagues stars
                included, is rated here on one scale that accounts for the era he played in. Start
                with the all-time lineup: pick a position to see who holds it and who is next in
                line.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/compare"
                  className="font-display rounded-[3px] bg-signal px-5 py-2 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
                >
                  Compare two players
                </Link>
                <Link
                  href="/goats"
                  className="font-display rounded-[3px] border-2 border-chalk px-5 py-2 text-xl font-extrabold outline-offset-2 hover:bg-chalk hover:text-ink focus-visible:outline-3 focus-visible:outline-white"
                >
                  See the top 100
                </Link>
              </div>
            </div>

            <LineupField lineup={lineup} />
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1280px] gap-x-16 gap-y-12 px-4 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-4xl font-extrabold">The closest races</h2>
          <p className="mt-2 max-w-[52ch] text-lg leading-relaxed">
            At some positions the top spot is all but a coin flip. Pick one and see how the two
            stack up.
          </p>
          <ul className="mt-5">
            {closestRaces.map(({ first, second }) => (
              <li key={first.position} className="border-t border-ink/20 last:border-b">
                <Link
                  href={`/compare/${first.slug}-vs-${second.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-3 outline-offset-2 focus-visible:outline-3 focus-visible:outline-ink"
                >
                  <span>
                    <span className="font-display block text-2xl font-bold underline-offset-4 group-hover:underline">
                      {first.name} vs. {second.name}
                    </span>
                    <span className="block text-sm text-ink/75 first-letter:uppercase">
                      {POSITION_LABELS[first.position]}
                    </span>
                  </span>
                  <span className="font-display text-xl font-bold whitespace-nowrap tabular-nums">
                    {first.score.toFixed(1)} to {second.score.toFixed(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-4xl font-extrabold">Bring your own argument</h2>
          <div className="mt-2 max-w-[46ch] space-y-5 text-lg leading-relaxed">
            <p>
              <Link href="/compare" className="font-bold underline underline-offset-4 hover:decoration-2">
                Compare any two players
              </Link>
              , from any era, hitters against pitchers. You get a verdict and the numbers behind
              it.
            </p>
            <p>
              <Link href="/goats" className="font-bold underline underline-offset-4 hover:decoration-2">
                Browse the rankings
              </Link>{" "}
              to find the best ever at a position, on a team, or both. The best shortstops the
              Cubs ever had, say.
            </p>
            <p>
              Each player&rsquo;s score comes from our own numbers, built so a star from 1910 and
              a star from 2010 can be measured side by side.
            </p>
            {/* A div, not a p: the pop-up inside RankingsModal isn't allowed inside a paragraph. */}
            <div>
              <RankingsModal />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
