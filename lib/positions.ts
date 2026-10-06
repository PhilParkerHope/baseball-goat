import type { Position } from "./lineup";

// Plain-language names for the position codes stored in the players table.
export const POSITION_LABELS: Record<Position, string> = {
  C: "catcher",
  "1B": "first base",
  "2B": "second base",
  "3B": "third base",
  SS: "shortstop",
  LF: "left field",
  CF: "center field",
  RF: "right field",
  DH: "designated hitter",
  SP: "starting pitcher",
  RP: "relief pitcher",
};

// For headings: "The best second basemen of all time".
export const POSITION_PLURALS: Record<Position, string> = {
  C: "catchers",
  "1B": "first basemen",
  "2B": "second basemen",
  "3B": "third basemen",
  SS: "shortstops",
  LF: "left fielders",
  CF: "center fielders",
  RF: "right fielders",
  DH: "designated hitters",
  SP: "starting pitchers",
  RP: "relief pitchers",
};

export function isPitcher(position: Position | null): boolean {
  return position === "SP" || position === "RP";
}
