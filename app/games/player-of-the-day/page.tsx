import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "../../components/ad-slot";
import { PlayerOfTheDay } from "../../components/player-of-the-day";
import { CLUE_SECONDS } from "@/lib/daily";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Player of the Day: guess the mystery ballplayer",
  description:
    "A new mystery baseball player every day. Six clues, ten seconds each: position, teams, career numbers and awards. How few do you need?",
  path: "/games/player-of-the-day",
});

export default function PlayerOfTheDayPage() {
  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-14 sm:px-8 lg:pt-10">
          <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">Player of the Day</h1>
          <p className="mt-5 mb-8 max-w-[56ch] text-lg leading-relaxed text-chalk/90">
            One mystery ballplayer a day. You get a clue and {CLUE_SECONDS} seconds to guess. Miss,
            skip or run out of time, and the next clue is easier.
          </p>
          <PlayerOfTheDay />
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <h2 className="font-display text-4xl font-extrabold">How it works</h2>
        <div className="mt-3 max-w-[62ch] space-y-4 text-lg leading-relaxed">
          <p>
            Every answer is a player you have a fair shot at: an MVP or Cy Young winner, a Hall
            of Famer, or someone who made at least five All-Star teams. All of them played after
            1920.
          </p>
          <p>
            There are six clues, in this order: the basics, his teams, his career numbers, his
            awards, where we rank him, and his initials. Each clue gets {CLUE_SECONDS} seconds, and
            when the clock runs out you move on to the next one. Everyone gets the same player on
            the same day, and a new one arrives at midnight where you are.
          </p>
          <p>
            Looking for more? There&rsquo;s a new set of ten matchups every day in{" "}
            <Link href="/games/who-was-better" className="font-bold underline underline-offset-4 hover:decoration-2">
              Who Was Better?
            </Link>
          </p>
        </div>
        <AdSlot size="rectangle" className="mt-16" />
      </section>
    </main>
  );
}
