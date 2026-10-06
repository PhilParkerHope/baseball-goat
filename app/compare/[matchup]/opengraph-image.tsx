import { ImageResponse } from "next/og";
import { displayNames, getVerdict } from "@/lib/compare";
import { OG_COLORS, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { getPlayerProfile, type PlayerProfile } from "@/lib/players";
import { POSITION_LABELS } from "@/lib/positions";
import { teamColors } from "@/lib/team-colors";

// The share image for one matchup: the verdict, and a plate for each player
// with his score. This is what shows up when someone texts a comparison.

export const alt = "Head-to-head comparison of two baseball players";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const fonts = await ogFonts();
  const slugs = matchup.split("-vs-");
  const [a, b] = slugs.length === 2 ? await Promise.all(slugs.map(getPlayerProfile)) : [null, null];

  // Unknown matchup: fall back to a plain title card.
  if (!a || !b) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 148, lineHeight: 0.95, marginTop: 36 }}>
            Who was actually better?
          </div>
        </OgFrame>
      ),
      { ...size, fonts },
    );
  }

  const verdict = getVerdict(a, b);
  const [nameA, nameB] = displayNames(a, b);
  // Shrink the type until the headline fits on one line; past 33 characters
  // it gets two smaller lines.
  const length = verdict.headline.length;
  const headlineSize = length <= 24 ? 100 : length <= 28 ? 88 : length <= 33 ? 76 : 60;

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: headlineSize, lineHeight: 1.05, marginTop: 20 }}
        >
          {verdict.headline}
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: "auto" }}>
          <Plate player={a} name={nameA} leads={verdict.winner === "a"} />
          <Plate player={b} name={nameB} leads={verdict.winner === "b"} />
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}

function Plate({ player, name, leads }: { player: PlayerProfile; name: string; leads: boolean }) {
  const colors = teamColors(player.franchId);
  const position = player.position ? POSITION_LABELS[player.position] : "";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: OG_COLORS.chalk,
        color: OG_COLORS.ink,
        borderRadius: 6,
        overflow: "hidden",
        border: `6px solid ${leads ? OG_COLORS.signal : OG_COLORS.chalk}`,
      }}
    >
      <div style={{ display: "flex", height: 22, background: colors.primary, borderBottom: `7px solid ${colors.secondary}` }} />
      <div style={{ display: "flex", flexDirection: "column", padding: "18px 26px 20px" }}>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: name.length > 18 ? 42 : 54, lineHeight: 1 }}>
          {name}
        </div>
        <div style={{ display: "flex", fontSize: 24, marginTop: 8 }}>
          {[position.replace(/^./, (c) => c.toUpperCase()), player.teamName].filter(Boolean).join(", ")}
        </div>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 104, lineHeight: 1, marginTop: 8 }}>
          {player.score.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
