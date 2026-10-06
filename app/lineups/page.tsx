import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/site";
import { teamColors } from "@/lib/team-colors";
import { getFranchises } from "@/lib/team-lineups";

export const metadata: Metadata = pageMetadata({
  title: "All-time lineups for every team",
  description:
    "The best player at each position in the history of all 30 franchises, ranked by what he did for that club.",
  path: "/lineups",
});

export default async function LineupsPage() {
  const franchises = await getFranchises();

  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-12 sm:px-8 lg:pt-10">
          <h1 className="font-display max-w-[20ch] text-6xl leading-[0.92] font-extrabold text-balance sm:text-7xl">
            Every team&rsquo;s all-time lineup
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-chalk/90">
            Pick a team to see the best player it ever had at each position. A team&rsquo;s
            history includes every city and name it has played under, and players are ranked by
            what they did for that club, not by their whole careers.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <ul className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {franchises.map((franchise) => (
            <li key={franchise.franchId} className="border-b border-ink/20">
              <Link
                href={`/lineups/${franchise.slug}`}
                className="group flex items-center gap-3 py-3 outline-offset-2 focus-visible:outline-3 focus-visible:outline-ink"
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-[2px]"
                  style={{
                    background: teamColors(franchise.franchId).primary,
                    boxShadow: `inset 0 -4px 0 ${teamColors(franchise.franchId).secondary}`,
                  }}
                />
                <span className="font-display text-2xl font-bold underline-offset-4 group-hover:underline">
                  {franchise.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
