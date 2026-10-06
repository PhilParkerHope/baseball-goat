import { ImageResponse } from "next/og";
import { POSITIONS } from "@/lib/lineup";
import { OG_COLORS, OG_SIZE, OgFrame, OgLineupPlates, ogFonts } from "@/lib/og";
import { teamColors, textOn } from "@/lib/team-colors";
import { getFranchises, getTeamLineup } from "@/lib/team-lineups";

// The share image for a team page: the team name over its all-time lineup.

export const alt = "A team's all-time baseball lineup, by position";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ team: string }> }) {
  const { team } = await params;
  const fonts = await ogFonts();
  const franchise = (await getFranchises()).find((f) => f.slug === team);

  if (!franchise) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 128, lineHeight: 1, marginTop: 20 }}>
            All-time lineups
          </div>
        </OgFrame>
      ),
      { ...size, fonts },
    );
  }

  const lineup = await getTeamLineup(franchise);
  const colors = teamColors(franchise.franchId);
  const starters = POSITIONS.map((position) => lineup[position][0])
    .filter(Boolean)
    .map((player) => ({
      position: player.position,
      lastName: player.lastName,
      primary: colors.primary,
      secondary: colors.secondary,
      text: textOn(colors.primary),
    }));

  // Shrink the type so the longest team names still fit on one line.
  const length = franchise.name.length;
  const nameSize = length <= 16 ? 128 : length <= 20 ? 104 : length <= 24 ? 88 : 72;

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", fontSize: 40, marginTop: 28, color: OG_COLORS.chalk, opacity: 0.9 }}>
          The all-time lineup
        </div>
        <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: nameSize, lineHeight: 1.05 }}>
          {franchise.name}
        </div>
        <OgLineupPlates starters={starters} />
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
