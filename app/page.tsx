import { LineupField } from "./components/lineup-field";
import { getLineup } from "@/lib/lineup";

export default async function Home() {
  const lineup = await getLineup();

  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-10 sm:px-8 lg:pb-14">
          <header>
            <p className="font-display text-2xl font-extrabold text-signal">Baseball GOAT</p>
          </header>

          {/* Phone: headline, intro, field, card. Desktop: headline over the field on the
              left, intro over the card on the right. */}
          <div className="mt-6 grid gap-x-12 gap-y-6 lg:mt-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-y-8">
            <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl lg:col-start-1 lg:row-start-1 lg:self-end">
              Who was actually better?
            </h1>
            <p className="max-w-[46ch] text-lg leading-relaxed text-chalk/90 lg:col-start-2 lg:row-start-1 lg:self-end">
              Every major league player since 1871, rated against his own league and season, so
              Honus Wagner and Shohei Ohtani can share a field. This is the all-time lineup: the
              top-rated player at each position. Select a player to see his numbers and who is
              next in line.
            </p>

            <LineupField lineup={lineup} />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold">How the ratings work</h2>
        <div className="mt-5 max-w-[66ch] space-y-4 text-lg leading-relaxed">
          <p>
            Every player is measured against his own league in his own season. Hitting .350 in
            1930, when the whole league hit .300, counts for less than hitting .350 in 1968.
          </p>
          <p>
            Hitting, baserunning, position and pitching are each turned into wins above what a
            replacement-level player would have provided. Short seasons, from the 1870s to the
            Negro Leagues to 2020, are scaled part of the way up to a full schedule, and
            600-inning pitching seasons are scaled down.
          </p>
          <p>
            A player&rsquo;s score is the average of his career total and his seven best seasons,
            so a long career and a great peak both count.
          </p>
          <p>
            The ratings don&rsquo;t yet measure fielding skill, and closers get no extra credit for
            high-pressure innings.
          </p>
        </div>
      </section>

      <footer className="border-t-2 border-ink">
        <p className="mx-auto max-w-[1280px] px-4 py-6 text-sm leading-relaxed sm:px-8">
          Statistics from the SABR Lahman Baseball Database, used under CC BY-SA 3.0. Negro
          Leagues statistics from Seamheads.com. Not affiliated with Major League Baseball.
        </p>
      </footer>
    </main>
  );
}
