import type { Metadata } from "next";
import Link from "next/link";
import { PlayerPicker } from "../components/player-picker";
import { getLineup, POSITIONS } from "@/lib/lineup";
import { POSITION_LABELS } from "@/lib/positions";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Compare any two baseball players",
  description:
    "Pick any two players since 1871, from any era, hitters or pitchers, and see who rates higher and why.",
  path: "/compare",
});

export default async function ComparePage() {
  // Ready-made matchups: the top two at each position, straight from the lineup.
  const lineup = await getLineup();
  const topTwo = POSITIONS.map((position) => lineup[position]).filter((depth) => depth.length >= 2);

  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-12 sm:px-8 lg:pt-10">
          <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">
            Compare any two players
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-chalk/90">
            Any era, any position, hitters against pitchers. Search for two names and see who
            rates higher.
          </p>
          <div className="mt-8 max-w-[900px]">
            <PlayerPicker />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold">The top two at every position</h2>
        <ul className="mt-6 grid max-w-[1000px] gap-x-12 sm:grid-cols-2">
          {topTwo.map(([first, second]) => (
            <li key={first.position} className="border-t border-ink/20">
              <Link
                href={`/compare/${first.slug}-vs-${second.slug}`}
                className="group block py-3 outline-offset-2 focus-visible:outline-3 focus-visible:outline-ink"
              >
                <span className="font-display block text-2xl font-bold underline-offset-4 group-hover:underline">
                  {first.name} vs. {second.name}
                </span>
                <span className="block text-sm text-ink/75 first-letter:uppercase">
                  {POSITION_LABELS[first.position]}, {first.score.toFixed(1)} to {second.score.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
