"use client";

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { PlayerSearch } from "./player-picker";
import { CLUE_SECONDS, localPuzzleNumber, MAX_GUESSES } from "@/lib/daily";
// Types only, so the database client stays out of the browser bundle.
import type { Clue, DailyPuzzle } from "@/lib/games";
import type { PlayerSummary } from "@/lib/players";
import { POSITION_LABELS } from "@/lib/positions";
import { teamColors } from "@/lib/team-colors";

// One turn: a guess, or null for a skip or a clue that timed out.
type Turn = { slug: string; name: string } | null;
type Stats = { played: number; won: number; streak: number; lastWon: number };
// clueStart is when the current clue appeared (null until Start is pressed).
// Saving it means a refresh can't buy more time.
type Saved = { day: number; turns: Turn[]; stats: Stats; clueStart: number | null };

const CLUE_MS = CLUE_SECONDS * 1000;

// Progress is kept in this browser only, so a refresh doesn't lose today's game.
const STORAGE_KEY = "goat-player-of-the-day";
const NO_STATS: Stats = { played: 0, won: 0, streak: 0, lastWon: 0 };

function readSaved(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null; // private window or storage turned off: play without saving
  }
}

function writeSaved(saved: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Same as above. The game still works, it just won't remember.
  }
}

// One turn played: the new list of turns, and the stats if it ended the game.
function playTurn(turns: Turn[], turn: Turn, stats: Stats, day: number, answerSlug: string) {
  const next = [...turns, turn];
  const won = turn?.slug === answerSlug;
  const lost = !won && next.length >= MAX_GUESSES;

  let nextStats = stats;
  if (won) {
    // A streak continues only if yesterday was a win too.
    const streak = stats.lastWon === day - 1 ? stats.streak + 1 : 1;
    nextStats = { played: stats.played + 1, won: stats.won + 1, streak, lastWon: day };
  } else if (lost) {
    nextStats = { ...stats, played: stats.played + 1, streak: 0 };
  }
  return { turns: next, stats: nextStats, won, lost };
}

export function PlayerOfTheDay() {
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [failed, setFailed] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [stats, setStats] = useState<Stats>(NO_STATS);
  const [clueStart, setClueStart] = useState<number | null>(null);
  const [pick, setPick] = useState<PlayerSummary | null>(null);
  const [round, setRound] = useState(0); // bumping this empties the search box
  const [notice, setNotice] = useState("");
  const [shared, setShared] = useState("");

  // Load today's player, plus any progress already made today.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const day = localPuzzleNumber();
      try {
        const response = await fetch(`/api/games/daily?day=${day}`);
        if (!response.ok) throw new Error("No puzzle");
        const loaded: DailyPuzzle = await response.json();
        if (cancelled) return;
        const saved = readSaved();
        const sameDay = saved?.day === day;
        let loadedTurns: Turn[] = sameDay ? saved.turns : [];
        let loadedStats = saved?.stats ?? NO_STATS;
        // A game from before the clock existed starts its clock now.
        let start = sameDay ? (saved.clueStart ?? (loadedTurns.length > 0 ? Date.now() : null)) : null;

        // The clock kept running while the page was closed: every full ten
        // seconds that passed counts as a clue that timed out.
        const finished = loadedTurns.some((turn) => turn?.slug === loaded.answer.slug) || loadedTurns.length >= MAX_GUESSES;
        if (start !== null && !finished) {
          let missed = Math.floor((Date.now() - start) / CLUE_MS);
          while (missed > 0 && loadedTurns.length < MAX_GUESSES) {
            const result = playTurn(loadedTurns, null, loadedStats, day, loaded.answer.slug);
            loadedTurns = result.turns;
            loadedStats = result.stats;
            start += CLUE_MS;
            missed--;
          }
          writeSaved({ day, turns: loadedTurns, stats: loadedStats, clueStart: start });
        }

        setPuzzle(loaded);
        setStats(loadedStats);
        setTurns(loadedTurns);
        setClueStart(start);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <p role="alert" className="max-w-[52ch] text-lg">
        Today&rsquo;s player didn&rsquo;t load. Check your connection and refresh the page.
      </p>
    );
  }
  if (!puzzle) return <p className="font-display text-3xl font-bold">Loading today&rsquo;s player</p>;

  const { answer, clues, day } = puzzle;
  const won = turns.some((turn) => turn?.slug === answer.slug);
  const lost = !won && turns.length >= MAX_GUESSES;
  const over = won || lost;
  const started = clueStart !== null;
  // Nothing until Start is pressed, then one clue and one more after each
  // turn, and all of them once the game is over.
  const shown = over ? clues.length : started ? Math.min(turns.length + 1, clues.length) : 0;
  const lastTurn = turns.length === MAX_GUESSES - 1;

  function take(turn: Turn, timedOut = false) {
    const result = playTurn(turns, turn, stats, day, answer.slug);
    const start = Date.now(); // the next clue's ten seconds begin now

    setTurns(result.turns);
    setStats(result.stats);
    setClueStart(start);
    setPick(null);
    setRound(round + 1);
    setNotice(
      result.won || result.lost
        ? ""
        : timedOut
          ? "Time’s up. Here’s another clue."
          : turn
            ? `Not ${turn.name}. Here’s another clue.`
            : "",
    );
    writeSaved({ day, turns: result.turns, stats: result.stats, clueStart: start });
  }

  function begin() {
    const start = Date.now();
    setClueStart(start);
    writeSaved({ day, turns, stats, clueStart: start });
  }

  function guess() {
    if (!pick) return;
    if (turns.some((turn) => turn?.slug === pick.slug)) {
      setNotice(`You already guessed ${pick.name}.`);
      return;
    }
    take({ slug: pick.slug, name: pick.name });
  }

  async function share() {
    const squares = turns
      .map((turn) => (turn === null ? "⬜" : turn.slug === answer.slug ? "🟩" : "🟥"))
      .join("");
    const text = `Baseball GOAT Player of the Day No. ${day}\n${squares} ${won ? turns.length : "X"}/${MAX_GUESSES}`;
    const url = `${window.location.origin}/games/player-of-the-day`;
    try {
      // Phones get their share sheet; everything else gets the clipboard.
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared("Copied. Paste it anywhere.");
      }
    } catch {
      // They closed the share sheet, or the browser blocked the clipboard.
    }
  }

  const guesses = turns.filter((turn) => turn !== null);

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Left on wide screens, first on phones: where you guess, then the result. */}
      <div>
        <p className="font-display text-2xl font-bold">
          No. {day}
          {!over && started && (
            <span className="font-sans text-base font-normal text-chalk/85">
              {" "}
              &middot; Guess {turns.length + 1} of {MAX_GUESSES}
            </span>
          )}
        </p>

        {!over && !started && (
          <div className="mt-4">
            <p className="max-w-[44ch] text-lg leading-relaxed text-chalk/90">
              You get {CLUE_SECONDS} seconds on each clue. If time runs out, you move on to the
              next one, so no looking it up.
            </p>
            <button
              type="button"
              onClick={begin}
              className="font-display mt-4 h-14 cursor-pointer rounded-[3px] bg-signal px-8 text-2xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
            >
              Start today&rsquo;s player
            </button>
          </div>
        )}

        {!over && started && (
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              guess();
            }}
          >
            <Countdown key={clueStart} startedAt={clueStart} onExpire={() => take(null, true)} />
            <PlayerSearch key={round} label="Who is he?" selected={pick} onSelect={setPick} />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!pick}
                className="font-display h-12 cursor-pointer rounded-[3px] bg-signal px-6 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guess
              </button>
              <button
                type="button"
                onClick={() => take(null)}
                className="font-display h-12 cursor-pointer rounded-[3px] border-2 border-chalk px-5 text-xl font-extrabold outline-offset-2 hover:bg-chalk hover:text-ink focus-visible:outline-3 focus-visible:outline-white"
              >
                {lastTurn ? "Give up" : "Skip to the next clue"}
              </button>
            </div>
          </form>
        )}

        <p role="status" className="mt-3 min-h-6 text-chalk/90">
          {notice}
        </p>

        {over && (
          <div>
            <h2 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl">
              {won ? (turns.length === 1 ? "Got him on the first clue" : `Got him in ${turns.length}`) : "Out of guesses"}
            </h2>
            <AnswerPlate player={answer} />
            <p className="mt-4 text-chalk/90">
              {stats.streak > 1 && `That’s ${stats.streak} days in a row. `}
              You&rsquo;ve solved {stats.won} of {stats.played}. A new player arrives at midnight.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={share}
                className="font-display h-12 cursor-pointer rounded-[3px] bg-signal px-6 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
              >
                Share your result
              </button>
              <Link
                href="/games/who-was-better"
                className="font-display flex h-12 items-center rounded-[3px] border-2 border-chalk px-5 text-xl font-extrabold outline-offset-2 hover:bg-chalk hover:text-ink focus-visible:outline-3 focus-visible:outline-white"
              >
                Play Who Was Better?
              </Link>
            </div>
            <p role="status" className="mt-2 min-h-6 text-chalk/90">
              {shared}
            </p>
          </div>
        )}

        {guesses.length > 0 && (
          <div className="mt-4">
            <h3 className="font-display text-xl font-bold">Your guesses</h3>
            <ul className="mt-1">
              {guesses.map((turn) => (
                <li key={turn.slug} className="flex items-baseline gap-2 border-t border-chalk/25 py-2">
                  <span className="font-semibold">{turn.name}</span>
                  <span className="text-sm text-chalk/80">{turn.slug === answer.slug ? "Correct" : "Not him"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The clues, newest on top so the fresh one sits next to the search box. */}
      <ol aria-label="Clues" aria-live="polite" className="flex flex-col-reverse gap-3 self-start">
        {clues.slice(0, shown).map((clue, i) => (
          <ClueCard key={clue.title} clue={clue} number={i + 1} total={clues.length} />
        ))}
      </ol>
    </div>
  );
}

// The ten-second clock for the current clue. It counts from a saved start time
// rather than adding up ticks, so a slow or background tab can't stretch it.
function Countdown({ startedAt, onExpire }: { startedAt: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= startedAt + CLUE_MS) {
        clearInterval(timer);
        expire();
      }
    };
    const timer = setInterval(tick, 100);
    // Browsers slow timers in a hidden tab; check the moment he comes back.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startedAt]);

  const left = Math.max(0, startedAt + CLUE_MS - now);
  const low = left <= 3000;
  return (
    <div role="timer" aria-label="Time left on this clue" className="mb-3 flex items-center gap-3">
      <div aria-hidden className="h-3 flex-1 overflow-hidden rounded-[2px] bg-chalk/20">
        <div
          className="h-full"
          style={{ width: `${(left / CLUE_MS) * 100}%`, background: low ? "#f08a5d" : "var(--color-signal)" }}
        />
      </div>
      <span className={`font-display w-12 text-right text-2xl font-bold tabular-nums ${low ? "text-[#f08a5d]" : ""}`}>
        {Math.ceil(left / 1000)}s
      </span>
    </div>
  );
}

function ClueCard({ clue, number, total }: { clue: Clue; number: number; total: number }) {
  const isTeams = clue.facts.some((fact) => fact.franchId !== undefined);
  return (
    <li className="lineup-marker rounded-[4px] bg-chalk p-4 text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)] sm:p-5">
      <h3 className="font-display flex items-baseline justify-between gap-3 text-2xl font-extrabold">
        {clue.title}
        <span className="font-sans text-sm font-normal text-ink/70">
          Clue {number} of {total}
        </span>
      </h3>

      {isTeams ? (
        <ul className="mt-2">
          {clue.facts.map((fact, i) => (
            <li key={i} className="flex items-baseline gap-3 border-t border-ink/15 py-1.5">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 self-center rounded-[2px]"
                style={{ background: teamColors(fact.franchId ?? null).primary }}
              />
              <span className="font-semibold">{fact.label}</span>
              <span className="ml-auto whitespace-nowrap tabular-nums">{fact.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {clue.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[13px] text-ink/75">{fact.label}</dt>
              <dd className="font-display text-2xl leading-tight font-bold tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function AnswerPlate({ player }: { player: PlayerSummary }) {
  const colors = teamColors(player.franchId);
  return (
    <article className="mt-5 max-w-[460px] overflow-hidden rounded-[4px] bg-chalk text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]">
      <div className="h-4" style={{ background: colors.primary, borderBottom: `4px solid ${colors.secondary}` }} />
      <div className="p-5">
        <p className="text-sm first-letter:uppercase">{player.position && POSITION_LABELS[player.position]}</p>
        <h3 className="font-display mt-1 text-5xl leading-[0.95] font-extrabold">{player.name}</h3>
        <p className="mt-2">
          {player.teamName}, {player.firstYear}–{player.lastYear}
        </p>
        <p className="mt-3 text-sm">
          Score {player.score.toFixed(1)}, No. {player.rank} all-time
        </p>
      </div>
    </article>
  );
}
