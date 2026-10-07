"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// Types only, so the database client stays out of the browser bundle.
import type { PlayerSummary } from "@/lib/players";
import { teamColors } from "@/lib/team-colors";

// Two search boxes and a Compare button. Used on /compare (empty) and on a
// matchup page (pre-filled with the two players being compared).
export function PlayerPicker({ first, second }: { first?: PlayerSummary; second?: PlayerSummary }) {
  const router = useRouter();
  const [a, setA] = useState<PlayerSummary | null>(first ?? null);
  const [b, setB] = useState<PlayerSummary | null>(second ?? null);

  const ready = a !== null && b !== null && a.slug !== b.slug;
  const samePlayer = a !== null && b !== null && a.slug === b.slug;

  return (
    <form
      className="grid items-end gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) router.push(`/compare/${a.slug}-vs-${b.slug}`);
      }}
    >
      <PlayerSearch label="First player" selected={a} onSelect={setA} />
      <PlayerSearch label="Second player" selected={b} onSelect={setB} />
      <button
        type="submit"
        disabled={!ready}
        className="font-display h-12 cursor-pointer rounded-[3px] bg-signal px-6 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Compare
      </button>
      {samePlayer && (
        <p role="status" className="text-sm md:col-span-3">
          That&rsquo;s the same player twice. Pick someone else for one side.
        </p>
      )}
    </form>
  );
}

// One search box with a dropdown of matching players.
export function PlayerSearch({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: PlayerSummary | null;
  onSelect: (player: PlayerSummary | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(selected?.name ?? "");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  function handleType(value: string) {
    setText(value);
    onSelect(null); // typing again un-picks the current player
    clearTimeout(timer.current);
    request.current?.abort();

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setSearched(false);
      return;
    }

    // Wait until typing pauses, then ask the server.
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const response = await fetch(`/api/players?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        setResults(await response.json());
        setActive(0);
        setSearched(true);
        setOpen(true);
      } catch {
        // Aborted because the user kept typing, or the network dropped. Either
        // way the next keystroke tries again.
      }
    }, 150);
  }

  function choose(player: PlayerSummary) {
    onSelect(player);
    setText(player.name);
    setOpen(false);
  }

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const empty = open && searched && results.length === 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Type a name"
        value={text}
        onChange={(event) => handleType(event.target.value)}
        onKeyDown={handleKey}
        onFocus={() => results.length > 0 && !selected && setOpen(true)}
        onBlur={() => setOpen(false)}
        className="h-12 w-full rounded-[3px] bg-chalk px-3 text-lg text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 placeholder:text-ink/50 focus-visible:outline-3 focus-visible:outline-signal"
        style={selected ? { borderLeft: `10px solid ${teamColors(selected.franchId).primary}` } : undefined}
      />

      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open || results.length === 0}
        className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-[3px] bg-chalk text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]"
      >
        {results.map((player, i) => (
          <li
            key={player.slug}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: it fires before the input's blur closes the list.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(player);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-baseline gap-3 px-3 py-2 ${i === active ? "bg-board text-chalk" : ""}`}
          >
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 self-center rounded-[2px]"
              style={{
                background: teamColors(player.franchId).primary,
                boxShadow: i === active ? "0 0 0 1.5px var(--color-chalk)" : undefined,
              }}
            />
            <span className="min-w-0">
              <span className="block font-semibold">{player.name}</span>
              <span className={`block truncate text-sm ${i === active ? "text-chalk/80" : "text-ink/70"}`}>
                {[player.position, player.teamName, `${player.firstYear}–${player.lastYear}`]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </span>
            <span className="ml-auto text-sm whitespace-nowrap tabular-nums">No. {player.rank}</span>
          </li>
        ))}
      </ul>

      {empty && (
        <p role="status" className="absolute inset-x-0 top-full z-20 mt-1 rounded-[3px] bg-chalk px-3 py-2 text-sm text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]">
          No player by that name. Try a last name.
        </p>
      )}
    </div>
  );
}
