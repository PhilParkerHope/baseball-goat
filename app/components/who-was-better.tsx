"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { localPuzzleNumber } from "@/lib/daily";
import type { PlayerSummary } from "@/lib/players";
import { isPitcher, POSITION_LABELS } from "@/lib/positions";
import { teamColors } from "@/lib/team-colors";

const ROUNDS = 10;

type Kind = "hitter" | "pitcher";
type Pick = 0 | 1;
type Round = { kind: Kind; players: [PlayerSummary, PlayerSummary]; pick: Pick | null };

// Progress is kept in this browser only, so a refresh doesn't lose today's game.
const STORAGE_KEY = "goat-who-was-better";
type Saved = { day: number; picks: Pick[] };

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

// How far apart the two scores must be, as a share of the higher one. The day
// starts with easy calls and ends with close ones. Nothing is ever closer than
// 3%, which would be a coin flip.
const GAPS: [min: number, max: number][] = [
  [0.25, 1], [0.25, 1], [0.25, 1],
  [0.1, 0.25], [0.1, 0.25], [0.1, 0.25], [0.1, 0.25],
  [0.03, 0.1], [0.03, 0.1], [0.03, 0.1],
];

// A small seeded random-number generator. The same seed always gives the same
// sequence, which is what makes every visitor's day identical.
function seededRandom(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deal one day's ten matchups. Everyone gets the same ten on the same day:
// six hitter rounds and four pitcher rounds in a shuffled order, hitters only
// against hitters and pitchers against pitchers, and nobody twice in one day.
function dealDay(pool: PlayerSummary[], day: number): Round[] {
  const random = seededRandom(day * 7919 + 101);
  const byKind: Record<Kind, PlayerSummary[]> = {
    hitter: pool.filter((player) => !isPitcher(player.position)),
    pitcher: pool.filter((player) => isPitcher(player.position)),
  };

  const kinds: Kind[] = [...Array(6).fill("hitter"), ...Array(4).fill("pitcher")];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const used = new Set<string>();
  return GAPS.map(([min, max], round) => {
    const kind = kinds[round];
    const open = byKind[kind].filter((player) => !used.has(player.slug));

    const pairs: [PlayerSummary, PlayerSummary][] = [];
    for (let i = 0; i < open.length; i++) {
      for (let j = i + 1; j < open.length; j++) {
        const high = Math.max(open[i].score, open[j].score);
        const gap = Math.abs(open[i].score - open[j].score) / high;
        if (gap >= min && gap < max) pairs.push([open[i], open[j]]);
      }
    }

    // If nothing fits the gap (it always should), take the two best left.
    const [a, b] = pairs.length > 0 ? pairs[Math.floor(random() * pairs.length)] : [open[0], open[1]];
    used.add(a.slug).add(b.slug);
    // The pool is in rank order, so flip a coin for who goes on the left.
    return { kind, players: random() < 0.5 ? [a, b] : [b, a], pick: null };
  });
}

const better = (round: Round): Pick => (round.players[0].score > round.players[1].score ? 0 : 1);
const isRight = (round: Round) => round.pick === better(round);

// Nothing is dealt while the page is built on the server: the day comes from
// the visitor's own calendar, so the browser has to do it. This reports
// "false" on the server and "true" once the page is running in the browser.
const noSubscription = () => () => {};
function useInBrowser(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

export function WhoWasBetter({ pool }: { pool: PlayerSummary[] }) {
  const inBrowser = useInBrowser();
  if (!inBrowser) return <p className="font-display text-3xl font-bold">Loading today&rsquo;s matchups</p>;
  return <Today pool={pool} />;
}

function Today({ pool }: { pool: PlayerSummary[] }) {
  // Worked out once: today's ten matchups, with any picks already made today.
  const [start] = useState(() => {
    const day = localPuzzleNumber();
    const dealt = dealDay(pool, day);
    const saved = readSaved();
    const picks = saved?.day === day ? saved.picks.slice(0, ROUNDS) : [];
    picks.forEach((pick, i) => (dealt[i].pick = pick));
    return { day, dealt, answered: picks.length };
  });

  const [rounds, setRounds] = useState(start.dealt);
  const [current, setCurrent] = useState(start.answered);
  // Straight into the round if today's game is under way; otherwise a Start button.
  const [started, setStarted] = useState(start.answered > 0);
  const [shared, setShared] = useState("");
  const board = useRef<HTMLDivElement>(null);
  const { day } = start;

  if (!started) {
    return (
      <div>
        <p className="font-display text-2xl font-bold">No. {day}</p>
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            // On a phone the two cards and the Next button don't fit under the
            // page heading, so slide the round up to the top of the screen.
            requestAnimationFrame(() => {
              const box = board.current;
              if (!box || box.getBoundingClientRect().bottom <= window.innerHeight) return;
              const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              box.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
            });
          }}
          className="font-display mt-3 h-14 cursor-pointer rounded-[3px] bg-signal px-8 text-2xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
        >
          Start today&rsquo;s ten
        </button>
      </div>
    );
  }

  const score = rounds.filter(isRight).length;

  // Today's game is over: the score, a recap, and a share button.
  if (current >= ROUNDS) {
    async function share() {
      const squares = rounds.map((round) => (isRight(round) ? "🟩" : "🟥")).join("");
      const text = `Baseball GOAT: Who Was Better? No. ${day}\n${squares} ${score}/${ROUNDS}`;
      const url = `${window.location.origin}/games/who-was-better`;
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

    return (
      <div className="max-w-[760px]">
        <p className="font-display text-2xl font-bold">No. {day}</p>
        <h2 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">
          {score} of {ROUNDS}
        </h2>
        <p className="mt-3 text-lg text-chalk/90">
          {score === ROUNDS
            ? "A perfect card."
            : score >= 8
              ? "That’s a strong card."
              : score >= 5
                ? "Better than a coin flip."
                : "The close ones got you."}{" "}
          A new set of ten arrives at midnight.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={share}
            className="font-display h-12 cursor-pointer rounded-[3px] bg-signal px-6 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
          >
            Share your score
          </button>
          <Link
            href="/games/player-of-the-day"
            className="font-display flex h-12 items-center rounded-[3px] border-2 border-chalk px-5 text-xl font-extrabold outline-offset-2 hover:bg-chalk hover:text-ink focus-visible:outline-3 focus-visible:outline-white"
          >
            Play Player of the Day
          </Link>
        </div>
        <p role="status" className="mt-2 min-h-6 text-chalk/90">
          {shared}
        </p>

        <h3 className="font-display mt-6 text-2xl font-bold">How each one went</h3>
        <ol className="mt-2">
          {rounds.map((round, i) => {
            const winner = round.players[better(round)];
            const other = round.players[1 - better(round)];
            return (
              <li key={i} className="border-t border-chalk/25 last:border-b">
                <Link
                  href={`/compare/${winner.slug}-vs-${other.slug}`}
                  className="group flex items-baseline gap-3 py-2.5 outline-offset-2 focus-visible:outline-3 focus-visible:outline-white"
                >
                  <span className={`font-display w-14 shrink-0 text-lg font-bold ${isRight(round) ? "text-signal" : "text-chalk/70"}`}>
                    {isRight(round) ? "Right" : "Wrong"}
                  </span>
                  <span className="underline-offset-4 group-hover:underline">
                    <span className="font-semibold">{winner.name}</span> over {other.name}
                  </span>
                  <span className="font-display ml-auto text-lg font-bold whitespace-nowrap tabular-nums">
                    {winner.score.toFixed(1)} to {other.score.toFixed(1)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const round = rounds[current];
  const answered = round.pick !== null;
  const last = current === ROUNDS - 1;

  function choose(side: Pick) {
    if (answered) return;
    const next = rounds.map((r, i) => (i === current ? { ...r, pick: side } : r));
    setRounds(next);
    // Saved the moment he picks, so a refresh can't be used to take it back.
    writeSaved({ day, picks: next.filter((r) => r.pick !== null).map((r) => r.pick as Pick) });
  }

  return (
    <div ref={board} className="max-w-[1000px] scroll-mt-4">
      <p className="text-chalk/90">
        No. {day} &middot; Round {current + 1} of {ROUNDS} &middot; {score} right so far
      </p>
      <h2 className="font-display mt-1 text-5xl leading-[0.95] font-extrabold sm:text-6xl">
        Who was the better {round.kind}?
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6">
        {round.players.map((player, side) => (
          <Choice
            key={player.slug}
            player={player}
            answered={answered}
            isBetter={better(round) === side}
            picked={round.pick === side}
            onChoose={() => choose(side as Pick)}
          />
        ))}
      </div>

      {/* Fixed height, so the cards don't move when the answer appears. */}
      <div className="mt-5 min-h-24" aria-live="polite">
        {answered && (
          <>
            <p className="font-display text-3xl font-bold">
              {isRight(round) ? "Right." : "Wrong."}{" "}
              <span className="font-sans text-lg font-normal text-chalk/90">
                {round.players[better(round)].name} rates higher,{" "}
                {round.players[better(round)].score.toFixed(1)} to{" "}
                {round.players[1 - better(round)].score.toFixed(1)}.
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={() => setCurrent(current + 1)}
                autoFocus
                className="font-display h-12 cursor-pointer rounded-[3px] bg-signal px-6 text-xl font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-white"
              >
                {last ? "See your score" : "Next"}
              </button>
              <a
                href={`/compare/${round.players[0].slug}-vs-${round.players[1].slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-white"
              >
                See the full comparison (opens a new tab)
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// One of the two cards. A button until the round is answered, then it shows
// his score and rank.
function Choice({
  player,
  answered,
  isBetter,
  picked,
  onChoose,
}: {
  player: PlayerSummary;
  answered: boolean;
  isBetter: boolean;
  picked: boolean;
  onChoose: () => void;
}) {
  const colors = teamColors(player.franchId);
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={answered}
      className={`flex flex-col overflow-hidden rounded-[4px] bg-chalk text-left text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)] outline-offset-2 focus-visible:outline-3 focus-visible:outline-white ${
        answered ? (isBetter ? "outline-3 outline-signal" : "opacity-80") : "cursor-pointer hover:-translate-y-0.5"
      }`}
    >
      <span className="block h-4 w-full shrink-0" style={{ background: colors.primary, borderBottom: `4px solid ${colors.secondary}` }} />
      <span className="block p-4 sm:p-6">
        <span className="block text-sm first-letter:uppercase">
          {player.position && POSITION_LABELS[player.position]}
        </span>
        <span className="font-display mt-1 block text-3xl leading-[0.95] font-extrabold sm:text-5xl">
          {player.name}
        </span>
        <span className="mt-2 block text-sm sm:text-base">
          {player.teamName}, <span className="whitespace-nowrap">{player.firstYear}–{player.lastYear}</span>
        </span>

        {/* Space is held for the score from the start, so nothing jumps. */}
        <span className={`mt-4 block ${answered ? "" : "invisible"}`} aria-hidden={!answered}>
          <span className="font-display block text-5xl leading-none font-extrabold tabular-nums sm:text-7xl">
            {player.score.toFixed(1)}
          </span>
          <span className="mt-1 block text-sm">
            No. {player.rank} all-time{picked && " · Your pick"}
          </span>
        </span>
      </span>
    </button>
  );
}
