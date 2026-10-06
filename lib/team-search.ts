// Forgiving team search for the GOATs page. Pure functions, safe to import
// from the browser.
//
// Each typed word is matched against the words in a team's label and scored:
//   1.00  the exact word                  "yankees"
//   0.95  initials or the franchise code  "ny", "la", "stl", "bos"
//   0.90  the start of a word             "yank"
//   0.75  inside a word, or run together  "whitesox"
//   0.60  the letters in order            "yanks", "cards", "sentors"
//   0.50  one typo away (two if long)     "dodgars", "tigres"
// Every word has to match something. Teams are ranked by their average score,
// with a small bonus for teams that still exist.

export type SearchableTeam = {
  slug: string;
  kind: "name" | "franchise";
  franchId: string;
  label: string; // "Washington Senators (1901–1960)"
  lastYear: number;
  seasons: number;
};

// Lowercase, no accents, apostrophes dropped ("A's" -> "as"), other punctuation to spaces.
const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f'’]/g, "").replace(/[^a-z0-9 ]/g, " ");

// Nicknames the matching rules can't work out on their own.
const NICKNAMES: Record<string, string> = {
  as: "athletics",
  os: "orioles",
  bucs: "pirates",
  halos: "angels",
  stros: "astros",
  bosox: "red sox",
  chisox: "white sox",
  tribe: "indians",
  friars: "padres",
  fish: "marlins",
  rox: "rockies",
};

function isSubsequence(word: string, token: string): boolean {
  let i = 0;
  for (const letter of token) if (letter === word[i]) i++;
  return i === word.length;
}

// Standard edit distance: how many single-letter changes turn a into b.
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function wordScore(word: string, tokens: string[], joined: string, shortcuts: string[]): number {
  let best = 0;
  if (shortcuts.includes(word)) best = 0.95;
  // "whitesox" typed as one word
  else if (word.length >= 4 && joined.includes(word)) best = 0.75;

  for (const token of tokens) {
    if (token === word) return 1;
    if (token.startsWith(word)) best = Math.max(best, 0.9);
    else if (word.length >= 3 && token.includes(word)) best = Math.max(best, 0.75);
    else if (word.length >= 4 && token[0] === word[0]) {
      const typos = word.length >= 6 ? 2 : 1;
      if (isSubsequence(word, token)) best = Math.max(best, 0.6);
      else if (Math.min(editDistance(word, token), editDistance(word, token.slice(0, word.length))) <= typos)
        best = Math.max(best, 0.5);
    }
  }
  return best;
}

export function searchTeams<T extends SearchableTeam>(teams: T[], text: string, limit = 10): T[] {
  const words = normalize(text)
    .split(" ")
    .flatMap((word) => (NICKNAMES[word] ?? word).split(" "))
    .filter(Boolean);

  // Nothing typed yet: offer today's teams, A to Z.
  if (words.length === 0) {
    const latest = Math.max(...teams.map((team) => team.lastYear));
    return teams
      .filter((team) => team.kind === "name" && team.lastYear === latest)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const latest = Math.max(...teams.map((team) => team.lastYear));
  const scored: { team: T; score: number }[] = [];
  for (const team of teams) {
    // "franchise" is part of some labels but isn't a team word: left in, "chi"
    // would match every franchise.
    const nameWords = normalize(team.label.replace(/\(.*\)/, "")).split(" ").filter((w) => w && w !== "franchise");
    const tokens = normalize(team.label).split(" ").filter((w) => w && w !== "franchise");
    const initials = nameWords.map((w) => w[0]).join("");
    // "ny" for New York Yankees, "la" for Los Angeles Dodgers
    const shortcuts = [team.franchId.toLowerCase(), initials, initials.slice(0, -1)].filter((s) => s.length > 1);

    let total = 0;
    let matchedAll = true;
    for (const word of words) {
      const score =
        team.kind === "franchise" && word.length >= 4 && "franchise".startsWith(word)
          ? 0.9
          : wordScore(word, tokens, nameWords.join(""), shortcuts);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (matchedAll) scored.push({ team, score: total / words.length + (team.lastYear === latest ? 0.1 : 0) });
  }

  return scored
    // Ties: most recent first, a plain team name ahead of its whole franchise.
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.team.lastYear - a.team.lastYear ||
        Number(a.team.kind === "franchise") - Number(b.team.kind === "franchise") ||
        b.team.seasons - a.team.seasons,
    )
    .slice(0, limit)
    .map((entry) => entry.team);
}
