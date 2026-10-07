import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "../../components/ad-slot";
import { WhoWasBetter } from "../../components/who-was-better";
import { getDuelPool } from "@/lib/games";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Who Was Better? Pick the better hitter or pitcher",
  description:
    "Two hitters or two pitchers from the 300 best since 1920. You pick who rates higher. Ten rounds a day, and they get closer as you go.",
  path: "/games/who-was-better",
});

export default async function WhoWasBetterPage() {
  const pool = await getDuelPool();

  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-14 sm:px-8 lg:pt-10">
          <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">Who Was Better?</h1>
          <p className="mt-5 mb-8 max-w-[56ch] text-lg leading-relaxed text-chalk/90">
            Two hitters, or two pitchers. Pick the one who rates higher on our all-time list. Ten
            rounds a day: the first few are easy calls and the last few are close.
          </p>
          <WhoWasBetter pool={pool} />
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold">How it works</h2>
        <div className="mt-3 max-w-[62ch] space-y-4 text-lg leading-relaxed">
          <p>
            Every matchup comes from the 300 highest-rated players whose careers ran past 1920.
            Hitters only face hitters, and pitchers only face pitchers. Each day has six hitter
            rounds and four pitcher rounds, and everyone gets the same ten. A new set arrives
            at midnight where you are.
          </p>
          <p>
            The answer is each man&rsquo;s score: the average of his career value and his best
            seven seasons, adjusted for the era he played in. Hitters are rated on what they did
            at the plate and on the bases. Fielding isn&rsquo;t part of it.
          </p>
          <p>
            Also once a day:{" "}
            <Link href="/games/player-of-the-day" className="font-bold underline underline-offset-4 hover:decoration-2">
              Player of the Day
            </Link>
            , one mystery ballplayer and six clues.
          </p>
        </div>
        <AdSlot size="rectangle" className="mt-16" />
      </section>
    </main>
  );
}
