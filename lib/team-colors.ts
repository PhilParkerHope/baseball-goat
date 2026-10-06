// Team colors by Lahman franchise ID. These stand in for logos and headshots.
// A franchise keeps one entry across its whole history, so the Philadelphia
// Athletics get the A's green and the New York Giants get San Francisco orange.

export type TeamColors = { primary: string; secondary: string };

const TEAM_COLORS: Record<string, TeamColors> = {
  ANA: { primary: "#BA0021", secondary: "#003263" }, // Angels
  ARI: { primary: "#A71930", secondary: "#E3D4AD" }, // Diamondbacks
  ATL: { primary: "#13274F", secondary: "#CE1141" }, // Braves
  BAL: { primary: "#DF4601", secondary: "#000000" }, // Orioles
  BOS: { primary: "#BD3039", secondary: "#0C2340" }, // Red Sox
  CHC: { primary: "#0E3386", secondary: "#CC3433" }, // Cubs
  CHW: { primary: "#27251F", secondary: "#C4CED4" }, // White Sox
  CIN: { primary: "#C6011F", secondary: "#000000" }, // Reds
  CLE: { primary: "#00385D", secondary: "#E50022" }, // Guardians
  COL: { primary: "#33006F", secondary: "#C4CED4" }, // Rockies
  DET: { primary: "#0C2340", secondary: "#FA4616" }, // Tigers
  FLA: { primary: "#00A3E0", secondary: "#EF3340" }, // Marlins
  HOU: { primary: "#002D62", secondary: "#EB6E1F" }, // Astros
  KCR: { primary: "#004687", secondary: "#BD9B60" }, // Royals
  LAD: { primary: "#005A9C", secondary: "#EF3E42" }, // Dodgers
  MIL: { primary: "#12284B", secondary: "#FFC52F" }, // Brewers
  MIN: { primary: "#002B5C", secondary: "#D31145" }, // Twins
  NYM: { primary: "#002D72", secondary: "#FF5910" }, // Mets
  NYY: { primary: "#0C2340", secondary: "#C4CED3" }, // Yankees
  OAK: { primary: "#003831", secondary: "#EFB21E" }, // Athletics
  PHI: { primary: "#E81828", secondary: "#002D72" }, // Phillies
  PIT: { primary: "#27251F", secondary: "#FDB827" }, // Pirates
  SDP: { primary: "#2F241D", secondary: "#FFC425" }, // Padres
  SEA: { primary: "#0C2C56", secondary: "#005C5C" }, // Mariners
  SFG: { primary: "#FD5A1E", secondary: "#27251F" }, // Giants
  STL: { primary: "#C41E3A", secondary: "#0C2340" }, // Cardinals
  TBD: { primary: "#092C5C", secondary: "#8FBCE6" }, // Rays
  TEX: { primary: "#003278", secondary: "#C0111F" }, // Rangers
  TOR: { primary: "#134A8E", secondary: "#1D2D5C" }, // Blue Jays
  WSN: { primary: "#AB0003", secondary: "#14225A" }, // Nationals
};

// Defunct franchises and Negro Leagues clubs fall back to a neutral gray.
const FALLBACK: TeamColors = { primary: "#55615B", secondary: "#C9D1CC" };

export function teamColors(franchId: string | null): TeamColors {
  return (franchId && TEAM_COLORS[franchId]) || FALLBACK;
}

// White or dark text, whichever reads better on the given background color.
export function textOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#10261D" : "#FFFFFF";
}
