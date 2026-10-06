import { ImageResponse } from "next/og";
import { getLineup, POSITIONS } from "@/lib/lineup";
import { OG_COLORS, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";
import { teamColors, textOn } from "@/lib/team-colors";

// The default share image for the site: the headline over the current
// all-time lineup. Pages without their own image use this one.

export const alt = "Who was actually better? The all-time baseball lineup, by position.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const lineup = await getLineup();
  const starters = POSITIONS.map((position) => lineup[position][0]).filter(Boolean);

  return new ImageResponse(
    (
      <OgFrame>
        {/* Two fixed lines: next/og mis-measures a headline it has to wrap itself. */}
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Big Shoulders", fontSize: 128, lineHeight: 1, marginTop: 20 }}>
          <div style={{ display: "flex" }}>Who was actually</div>
          <div style={{ display: "flex", marginTop: -14 }}>better?</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 14, opacity: 0.9 }}>
          Every major leaguer since 1871, on one scale.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "auto" }}>
          {starters.map((player) => {
            const colors = teamColors(player.franchId);
            return (
              <div
                key={player.position}
                style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 28, borderRadius: 4, overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    background: colors.primary,
                    color: textOn(colors.primary),
                    borderBottom: `5px solid ${colors.secondary}`,
                  }}
                >
                  {player.position}
                </div>
                <div style={{ display: "flex", padding: "5px 13px", background: OG_COLORS.chalk, color: OG_COLORS.ink }}>
                  {player.lastName}
                </div>
              </div>
            );
          })}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
