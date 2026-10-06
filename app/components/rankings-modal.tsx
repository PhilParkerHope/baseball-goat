"use client";

import { useId, useRef } from "react";

// A footer link that opens a short, plain-language explanation of the rankings.
// It deliberately leaves out the formulas and constants; those live in
// docs/methodology-notes.md.
//
// Uses the browser's own <dialog>, which handles the Escape key, keeps keyboard
// focus inside while open, and returns focus to the link on close.
export function RankingsModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="cursor-pointer font-bold underline underline-offset-4 outline-offset-2 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-ink"
      >
        How the rankings work
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        // A click that lands on the dialog itself, not its contents, is a click
        // on the dimmed area around it.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[85dvh] w-[min(92vw,40rem)] overflow-y-auto rounded-[4px] bg-chalk p-0 text-left text-base leading-relaxed text-ink shadow-[0_4px_0_rgba(0,0,0,0.5)] backdrop:bg-board/85"
      >
        <div className="h-4 border-b-4 border-signal bg-board" />
        <div className="p-6 sm:p-8">
          {/* Close sits at the top so it's the first thing focused. If it were at
              the bottom, a phone would open the pop-up scrolled down to it. */}
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-4xl leading-none font-extrabold">
              How the rankings work
            </h2>
            <form method="dialog">
              <button
                type="submit"
                className="font-display cursor-pointer rounded-[3px] bg-board px-4 py-1.5 text-lg font-extrabold text-chalk shadow-[0_2px_0_rgba(0,0,0,0.4)] outline-offset-2 hover:brightness-125 focus-visible:outline-3 focus-visible:outline-signal"
              >
                Close
              </button>
            </form>
          </div>

          <p className="mt-4">
            Every player gets one number, wins added: the extra games his teams won because they
            had him and not a replacement-level fill-in.
          </p>

          <ul className="mt-4 space-y-3">
            <li>
              <strong>His own era.</strong> Each season is measured against that league in that
              year. That is how a dead-ball hitter and a modern slugger end up on the same scale.
            </li>
            <li>
              <strong>Everything he did.</strong> Hitting, baserunning, the position he played and
              pitching all count, so two-way players get credit for both.
            </li>
            <li>
              <strong>Peak and longevity.</strong> A score blends a full career with a
              player&rsquo;s best seasons. A long, steady career and a short, brilliant one can
              both rank high.
            </li>
            <li>
              <strong>Fair seasons.</strong> Short schedules, from the 1870s to the Negro Leagues
              to 2020, get credit toward a full season. The iron-arm pitchers of the 1880s are
              judged on a workload a modern ace could carry.
            </li>
          </ul>

          <p className="mt-4">
            The numbers are our own, built from public records, not borrowed from another site.
            They don&rsquo;t measure fielding skill or the postseason, so expect a few rankings
            you&rsquo;ll want to argue with.
          </p>
        </div>
      </dialog>
    </>
  );
}