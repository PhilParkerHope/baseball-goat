import type { Position } from "./lineup";

// The GOATs page keeps its filters in the URL, so a filtered list can be
// shared, bookmarked and indexed. Pure function, safe to import anywhere.

export type GoatUrlFilters = {
  team: string | null;
  position: Position | null;
  activeOnly: boolean;
  includeShortStays: boolean;
};

export function goatsUrl(filters: GoatUrlFilters): string {
  const query = new URLSearchParams();
  if (filters.team) query.set("team", filters.team);
  if (filters.position) query.set("position", filters.position);
  if (filters.activeOnly) query.set("active", "1");
  if (filters.team && filters.includeShortStays) query.set("all", "1");
  const text = query.toString();
  return text ? `/goats?${text}` : "/goats";
}
