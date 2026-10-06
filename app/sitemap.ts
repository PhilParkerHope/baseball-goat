import type { MetadataRoute } from "next";
import { getTeams } from "@/lib/goats";
import { goatsUrl } from "@/lib/goats-url";
import { getLineup, POSITIONS } from "@/lib/lineup";
import { SITE_URL } from "@/lib/site";
import { getFranchises } from "@/lib/team-lineups";

// The day the rankings were last rebuilt. Every page changes then and only
// then, so this is the honest "last modified" date. Update it when you re-run
// scripts/build-db.mjs.
const DATA_UPDATED = "2026-10-06";

// Tells search engines which pages exist. Every matchup and filter works when
// visited, but only the ones listed here are offered up for indexing: the
// main pages, the top-two matchup at each position, a rankings page for each
// position, and one for each of today's teams.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lineup, teams, franchises] = await Promise.all([getLineup(), getTeams(), getFranchises()]);
  const none = { team: null, position: null, activeOnly: false, includeShortStays: false };

  const matchups = POSITIONS.map((position) => lineup[position])
    .filter((depth) => depth.length >= 2)
    .map(([first, second]) => `/compare/${[first.slug, second.slug].sort().join("-vs-")}`);

  const byPosition = POSITIONS.map((position) => goatsUrl({ ...none, position }));

  const latest = Math.max(...teams.map((team) => team.lastYear));
  const byTeam = teams
    .filter((team) => team.kind === "name" && team.lastYear === latest)
    .map((team) => goatsUrl({ ...none, team: team.slug }));

  const teamLineups = franchises.map((franchise) => `/lineups/${franchise.slug}`);

  return ["/", "/compare", "/goats", "/lineups", ...teamLineups, ...matchups, ...byPosition, ...byTeam].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: DATA_UPDATED,
  }));
}
