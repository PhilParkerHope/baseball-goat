// Dates and limits for Player of the Day. Shared by the server and the
// browser, so nothing in this file touches the database.

// Player of the Day No. 1 is October 7, 2026. (Months count from 0 here.)
const FIRST_DAY = Date.UTC(2026, 9, 7);
const ONE_DAY = 86_400_000;

// One guess per clue: six clues, six guesses.
export const MAX_GUESSES = 6;

// Time allowed on each clue. When it runs out the game moves on without a guess.
export const CLUE_SECONDS = 15;

// Today's number on this device's calendar, so a new player arrives at the
// visitor's own midnight, wherever they are.
export function localPuzzleNumber(now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - FIRST_DAY) / ONE_DAY) + 1;
}

// The newest number anyone can be on right now. The calendar runs up to 14
// hours ahead of UTC in the far Pacific, so the server allows for that and
// refuses anything later, which would be a peek at tomorrow.
export function newestPuzzleNumber(nowMs: number): number {
  return Math.floor((nowMs + 14 * 3_600_000 - FIRST_DAY) / ONE_DAY) + 1;
}
