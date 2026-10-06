"use client";

import { useRef, useState } from "react";
import Link from "next/link";
// Types only: importing anything else from lib/lineup would pull the database
// client into the browser bundle.
import type { Lineup, LineupPlayer, Position } from "@/lib/lineup";
import { teamColors, textOn } from "@/lib/team-colors";

// Where each position stands, as a percentage of the field drawing.
const SPOTS: { position: Position; label: string; x: number; y: number }[] = [
  { position: "C", label: "catcher", x: 50, y: 93 },
  { position: "1B", label: "first base", x: 73, y: 64 },
  { position: "2B", label: "second base", x: 64, y: 48 },
  { position: "3B", label: "third base", x: 27, y: 64 },
  { position: "SS", label: "shortstop", x: 36, y: 48 },
  { position: "LF", label: "left field", x: 18.5, y: 27.5 },
  { position: "CF", label: "center field", x: 50, y: 11 },
  { position: "RF", label: "right field", x: 81.5, y: 27.5 },
  { position: "DH", label: "designated hitter", x: 11, y: 91 },
  { position: "SP", label: "starting pitcher", x: 50, y: 70.5 },
  { position: "RP", label: "relief pitcher", x: 89, y: 91 },
];

type Selection = { position: Position; depth: number };

export function LineupField({ lineup }: { lineup: Lineup }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  // Open on the highest-ranked starter, whoever that is.
  const [selection, setSelection] = useState<Selection>(() => {
    const starters = SPOTS.map((s) => lineup[s.position][0]).filter(Boolean);
    const best = starters.reduce((a, b) => (b.rank < a.rank ? b : a), starters[0]);
    return { position: best?.position ?? "RF", depth: 1 };
  });

  const depthChart = lineup[selection.position];
  const player = depthChart.find((p) => p.depth === selection.depth) ?? depthChart[0];
  const spot = SPOTS.find((s) => s.position === selection.position)!;

  function selectFromField(position: Position) {
    setSelection({ position, depth: 1 });

    // On a phone the card sits below the field. If it's off screen, bring the
    // field to the top so the field and the card are both in view.
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top > window.innerHeight - 140) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      fieldRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
  }

  return (
    <>
      <div ref={fieldRef} className="scroll-mt-4 lg:col-start-1 lg:row-start-2">
        <div className="relative mx-auto aspect-[92/71] w-full max-w-[780px]">
          <FieldArt />
          {SPOTS.map((s, i) => {
            const starter = lineup[s.position][0];
            if (!starter) return null;
            const colors = teamColors(starter.franchId);
            const selected = s.position === selection.position;
            return (
              <button
                key={s.position}
                type="button"
                onClick={() => selectFromField(s.position)}
                aria-pressed={selected}
                aria-label={`${s.label}: ${starter.name}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${i * 45}ms` }}
                className={`lineup-marker absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-stretch overflow-hidden rounded-[3px] bg-chalk text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:bg-white focus-visible:outline-3 focus-visible:outline-white sm:flex-row ${
                  selected ? "outline-3 outline-signal" : ""
                }`}
              >
                <span
                  className="font-display px-1.5 text-center text-[11px] leading-[15px] font-bold sm:flex sm:items-center sm:px-2 sm:text-sm"
                  style={{
                    background: colors.primary,
                    color: textOn(colors.primary),
                    boxShadow: `inset 0 -3px 0 ${colors.secondary}`,
                  }}
                >
                  {s.position}
                </span>
                <span className="font-display max-w-[4.6rem] truncate px-1.5 text-[13px] leading-[19px] font-semibold sm:max-w-[8rem] sm:px-2.5 sm:py-1 sm:text-lg sm:leading-6">
                  {starter.lastName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section
        ref={cardRef}
        aria-live="polite"
        aria-label="Selected player"
        className="lg:col-start-2 lg:row-start-2"
      >
        <PlayerCard
          player={player}
          positionLabel={spot.label}
          depthChart={depthChart}
          onSelect={(depth) => setSelection({ position: selection.position, depth })}
        />
      </section>
    </>
  );
}

function PlayerCard({
  player,
  positionLabel,
  depthChart,
  onSelect,
}: {
  player: LineupPlayer;
  positionLabel: string;
  depthChart: LineupPlayer[];
  onSelect: (depth: number) => void;
}) {
  const colors = teamColors(player.franchId);
  // The starter is compared with his runner-up; anyone else with the starter.
  const rival = player.depth === 1 ? depthChart[1] : depthChart[0];

  // On a team lineup page the card shows what he did for that team; on the
  // home page, his whole career.
  const forTeam = player.teamWins !== undefined;
  const stats = forTeam
    ? [
        { label: "Wins added here", value: player.teamWins!.toFixed(1) },
        { label: "Seasons here", value: String(player.teamSeasons) },
        { label: "Career score", value: player.score.toFixed(1) },
        { label: "All-time rank", value: String(player.rank) },
      ]
    : [
        { label: "Score", value: player.score.toFixed(1) },
        { label: "All-time rank", value: String(player.rank) },
        { label: "Career", value: player.career.toFixed(1) },
        { label: "Best 7 seasons", value: player.peak7.toFixed(1) },
      ];

  return (
    <article className="overflow-hidden rounded-[4px] bg-chalk text-ink shadow-[0_3px_0_rgba(0,0,0,0.4)]">
      <div
        className="h-4"
        style={{ background: colors.primary, borderBottom: `4px solid ${colors.secondary}` }}
      />
      <div className="p-5 sm:p-6">
        <p className="text-sm">
          No. {player.depth} at {positionLabel}
        </p>
        <h2 className="font-display mt-1 text-5xl leading-[0.95] font-extrabold">{player.name}</h2>
        <p className="mt-2">
          {player.teamName}, {player.firstYear}–{player.lastYear}
        </p>

        <table className="mt-5 w-full border-y-2 border-ink text-left">
          <caption className="sr-only">Ratings for {player.name}</caption>
          <thead>
            <tr className="align-bottom text-[13px]">
              {stats.map((stat) => (
                <th key={stat.label} scope="col" className="pt-2 pr-3 font-normal last:pr-0">{stat.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="font-display text-3xl font-bold tabular-nums">
              {stats.map((stat) => (
                <td key={stat.label} className="pr-3 pb-2 last:pr-0">{stat.value}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[13px] leading-snug text-ink/75">
          {forTeam
            ? "Ranked by wins added while playing for this franchise, adjusted for era, at the position he played here."
            : "Career and best seven seasons are in wins, adjusted for era. Score is the average of the two."}
        </p>

        <h3 className="font-display mt-6 text-xl font-bold first-letter:uppercase">
          {positionLabel} depth chart
        </h3>
        <ol className="mt-2">
          {depthChart.map((p) => {
            const current = p.depth === player.depth;
            return (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => onSelect(p.depth)}
                  aria-current={current ? "true" : undefined}
                  className={`flex w-full cursor-pointer items-baseline gap-3 rounded-[3px] px-2 py-2 text-left outline-offset-2 focus-visible:outline-3 focus-visible:outline-ink ${
                    current ? "bg-board text-chalk" : "hover:bg-ink/10"
                  }`}
                >
                  <span className="font-display w-4 text-lg font-bold tabular-nums">{p.depth}</span>
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 self-center rounded-[2px]"
                    style={{
                      background: teamColors(p.franchId).primary,
                      boxShadow: current ? "0 0 0 1.5px var(--color-chalk)" : undefined,
                    }}
                  />
                  <span className="font-semibold">{p.name}</span>
                  <span className={`hidden truncate text-sm sm:inline ${current ? "text-chalk/80" : "text-ink/70"}`}>
                    {/* Everyone on a team page has the same team, so show his years there. */}
                    {p.teamWins !== undefined ? `${p.firstYear}–${p.lastYear}` : p.teamName}
                  </span>
                  <span className="font-display ml-auto text-lg font-bold tabular-nums">
                    {(p.teamWins ?? p.score).toFixed(1)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {rival && (
          <Link
            href={`/compare/${player.slug}-vs-${rival.slug}`}
            className="font-display mt-4 inline-block rounded-[3px] bg-signal px-4 py-2 text-lg font-extrabold text-ink shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-105 focus-visible:outline-3 focus-visible:outline-ink"
          >
            Compare {player.lastName} and {rival.lastName}
          </Link>
        )}
      </div>
    </article>
  );
}

// The field itself. Purely decorative: the buttons on top carry the meaning.
// Drawn with home plate at (500, 810); the viewBox is cropped to the artwork.
function FieldArt() {
  const fair = "M500 810 L60 370 A622 622 0 0 1 940 370 Z";
  return (
    <svg viewBox="40 165 920 710" aria-hidden className="absolute inset-0 h-full w-full">
      <defs>
        <pattern id="mow" width="130" height="130" patternUnits="userSpaceOnUse" patternTransform="rotate(45 500 810)">
          <rect width="130" height="130" fill="var(--color-grass)" />
          <rect width="65" height="130" fill="var(--color-grass-stripe)" />
        </pattern>
        <clipPath id="fair">
          <path d={fair} />
        </clipPath>
      </defs>

      {/* Outfield grass with a warning track around the wall */}
      <path d={fair} fill="url(#mow)" />
      <path d="M60 370 A622 622 0 0 1 940 370" fill="none" stroke="var(--color-dirt)" strokeWidth="22" clipPath="url(#fair)" />

      {/* Infield dirt, the grass inside the bases, and the mound */}
      <circle cx="500" cy="658" r="238" fill="var(--color-dirt)" clipPath="url(#fair)" />
      <circle cx="500" cy="810" r="46" fill="var(--color-dirt)" />
      <polygon points="500,768 618,650 500,532 382,650" fill="var(--color-grass)" />
      <circle cx="500" cy="658" r="24" fill="var(--color-dirt)" />

      {/* Foul lines and bases */}
      <path d="M500 810 L60 370 M500 810 L940 370" stroke="var(--color-chalk)" strokeWidth="4" />
      <g fill="var(--color-chalk)">
        <rect x="651" y="641" width="18" height="18" transform="rotate(45 660 650)" />
        <rect x="491" y="481" width="18" height="18" transform="rotate(45 500 490)" />
        <rect x="331" y="641" width="18" height="18" transform="rotate(45 340 650)" />
        <rect x="486" y="652" width="28" height="6" />
      </g>

      {/* On-deck circle for the DH, bullpen mound for the reliever */}
      <circle cx="140" cy="810" r="52" fill="none" stroke="var(--color-chalk)" strokeOpacity="0.45" strokeWidth="4" />
      <ellipse cx="860" cy="810" rx="70" ry="44" fill="var(--color-dirt)" fillOpacity="0.55" />
    </svg>
  );
}
