import { newestPuzzleNumber } from "@/lib/daily";
import { getDailyPuzzle } from "@/lib/games";

// GET /api/games/daily?day=12  ->  that day's Player of the Day and his clues.
// The browser works out the day from its own calendar (lib/daily.ts).
export async function GET(request: Request) {
  const day = Number(new URL(request.url).searchParams.get("day"));
  // Whole days only, from the first puzzle up to today. No peeking at tomorrow.
  if (!Number.isInteger(day) || day < 1 || day > newestPuzzleNumber(Date.now())) {
    return Response.json({ error: "No puzzle for that day" }, { status: 404 });
  }

  const puzzle = await getDailyPuzzle(day);
  if (!puzzle) return Response.json({ error: "No puzzle for that day" }, { status: 404 });
  return Response.json(puzzle);
}
