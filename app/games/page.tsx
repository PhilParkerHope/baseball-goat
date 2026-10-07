import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Baseball trivia games",
  description:
    "Two free baseball games built on the all-time rankings: guess the Player of the Day from six clues, or pick the better hitter or pitcher in Who Was Better?",
  path: "/games",
});

const GAMES = [
  {
    href: "/games/player-of-the-day",
    name: "Player of the Day",
    tag: "One a day",
    summary:
      "One mystery ballplayer, six clues, ten seconds on each. The clues start vague and get easier: his position and years, his teams, his numbers, his awards. The fewer you need, the better.",
    action: "Guess today’s player",
  },
  {
    href: "/games/who-was-better",
    name: "Who Was Better?",
    tag: "One a day",
    summary:
      "Two hitters or two pitchers from the 300 best since 1920. You say who rates higher. Ten rounds, and they get closer as you go. Everyone gets the same ten each day.",
    action: "Play today’s ten",
  },
];

export default function GamesPage() {
  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-14 sm:px-8 lg:pt-10">
          <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">Games</h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-chalk/90">
            You&rsquo;ve seen the rankings. Now find out how well you know them.
          </p>

          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {GAMES.map((game) => (
              <li key={game.href} className="flex">
                <Link
                  href={game.href}
                  className="group flex flex-col rounded-[4px] bg-chalk p-6 text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-white sm:p-8"
                >
                  <span className="text-sm">{game.tag}</span>
                  <span className="font-display mt-1 text-5xl leading-[0.95] font-extrabold">{game.name}</span>
                  <span className="mt-4 max-w-[48ch] leading-relaxed">{game.summary}</span>
                  <span className="font-display mt-6 inline-block self-start rounded-[3px] bg-board px-5 py-2 text-xl font-extrabold text-chalk group-hover:bg-ink">
                    {game.action}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
