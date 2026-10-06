import { searchPlayers } from "@/lib/players";

// GET /api/players?q=ruth  ->  up to 8 matching players, best first.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await searchPlayers(query.slice(0, 60)));
}
