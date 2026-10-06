"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// Types and plain helpers only: nothing here may import the database client.
import type { Position } from "@/lib/lineup";
import { goatsUrl, type GoatUrlFilters } from "@/lib/goats-url";
import { POSITION_LABELS } from "@/lib/positions";
import { searchTeams, type SearchableTeam } from "@/lib/team-search";
import { teamColors } from "@/lib/team-colors";

// A team as the search box sees it: TeamOption from lib/goats.ts, with the
// label ("Washington Senators (1901–1960)") already built by the server.
export type TeamChoice = SearchableTeam;

export type CurrentFilters = GoatUrlFilters;

const POSITION_ORDER = Object.keys(POSITION_LABELS) as Position[];

export function GoatFilters({
  teams,
  current,
  minSeasons,
}: {
  teams: TeamChoice[];
  current: CurrentFilters;
  minSeasons: number;
}) {
  const router = useRouter();
  const positionId = useId();

  // `current` comes from the URL, so it only changes once the new list has
  // loaded. `filters` shows the user's choice right away while that happens.
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useOptimistic(current);

  // Every control does the same thing: go to the URL for the new filters.
  function apply(change: Partial<CurrentFilters>) {
    const next = { ...filters, ...change };
    startTransition(() => {
      setFilters(next);
      router.push(goatsUrl(next), { scroll: false });
    });
  }

  const control =
    "h-12 w-full rounded-[3px] bg-chalk px-3 text-lg text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 focus-visible:outline-3 focus-visible:outline-signal";

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <TeamSearch
        teams={teams}
        selected={teams.find((t) => t.slug === filters.team) ?? null}
        onSelect={(team) => apply({ team: team?.slug ?? null })}
        className={control}
      />

      <div>
        <label htmlFor={positionId} className="mb-1 block text-sm">
          Position
        </label>
        <select
          id={positionId}
          value={filters.position ?? ""}
          onChange={(event) => apply({ position: (event.target.value || null) as Position | null })}
          className={control}
        >
          <option value="">Any position</option>
          {POSITION_ORDER.map((position) => (
            <option key={position} value={position}>
              {POSITION_LABELS[position].replace(/^./, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 md:col-span-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={filters.activeOnly}
            onChange={(event) => apply({ activeOnly: event.target.checked })}
            className="h-5 w-5 accent-signal"
          />
          Active players only
        </label>
        {filters.team && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={filters.includeShortStays}
              onChange={(event) => apply({ includeShortStays: event.target.checked })}
              className="h-5 w-5 accent-signal"
            />
            Include players with fewer than {minSeasons} seasons there
          </label>
        )}
      </div>
    </div>
  );
}

// Team search box. The full team list is already in the page, so matching
// happens right here with no server round trip. The matching itself, which
// forgives typos, nicknames and initials, is in lib/team-search.ts.
function TeamSearch({
  teams,
  selected,
  onSelect,
  className,
}: {
  teams: TeamChoice[];
  selected: TeamChoice | null;
  onSelect: (team: TeamChoice | null) => void;
  className: string;
}) {
  const id = useId();
  const [text, setText] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // If the selected team changes from outside (Back button, a link), show it.
  const [shownSlug, setShownSlug] = useState(selected?.slug ?? null);
  if ((selected?.slug ?? null) !== shownSlug) {
    setShownSlug(selected?.slug ?? null);
    setText(selected?.label ?? "");
  }

  // An empty box lists today's teams; anything typed is searched. While the
  // box still shows the selected team's own label there is nothing to offer.
  const typed = text.trim();
  const matches = text === selected?.label ? [] : searchTeams(teams, typed);

  function choose(team: TeamChoice) {
    setText(team.label);
    setOpen(false);
    if (team.slug !== selected?.slug) onSelect(team);
  }

  function handleType(value: string) {
    setText(value);
    setActive(0);
    setOpen(true);
    if (value === "" && selected) onSelect(null); // clearing the box clears the filter
  }

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + matches.length) % matches.length;
      setActive(next);
      // The list of today's teams is long enough to scroll; keep up with the arrow keys.
      document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const showList = open && matches.length > 0;
  const noMatch = open && typed !== "" && matches.length === 0 && text !== selected?.label;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm">
        Team
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${id}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Any team. Type a name, city or nickname"
        value={text}
        onChange={(event) => handleType(event.target.value)}
        onKeyDown={handleKey}
        onFocus={(event) => {
          // Select what's there so typing replaces it, and open the list.
          event.target.select();
          setActive(0);
          setOpen(true);
        }}
        // A mouse click undoes the selection made on focus, so make it again.
        onClick={(event) => {
          if (text === selected?.label) event.currentTarget.select();
        }}
        onBlur={() => {
          // Leaving without picking puts back whatever is actually selected.
          setOpen(false);
          setText(selected?.label ?? "");
        }}
        className={`${className} placeholder:text-ink/50`}
        style={selected ? { borderLeft: `10px solid ${teamColors(selected.franchId).primary}` } : undefined}
      />

      <ul
        id={listId}
        role="listbox"
        aria-label="Teams"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-[3px] bg-chalk text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]"
      >
        {matches.map((team, i) => (
          <li
            key={team.slug}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: it fires before the input's blur closes the list.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(team);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-board text-chalk" : ""}`}
          >
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-[2px]"
              style={{
                background: teamColors(team.franchId).primary,
                boxShadow: i === active ? "0 0 0 1.5px var(--color-chalk)" : undefined,
              }}
            />
            {team.label}
          </li>
        ))}
      </ul>

      {noMatch && (
        <p role="status" className="absolute inset-x-0 top-full z-20 mt-1 rounded-[3px] bg-chalk px-3 py-2 text-sm text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]">
          No team like that. Try a city or a nickname.
        </p>
      )}
    </div>
  );
}
