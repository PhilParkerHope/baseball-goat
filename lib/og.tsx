import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "./site";

// Shared pieces for the share images (the picture a link shows when it's
// pasted into a text, Slack, X and so on). Used by the opengraph-image files.
//
// These images are drawn by next/og, which only understands inline styles and
// flexbox, so there are no Tailwind classes here.

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  board: "#123a2d",
  chalk: "#f3f6f1",
  ink: "#10261d",
  signal: "#f5c84b",
};

// The site's two typefaces, as files next/og can read (it can't use woff2).
export async function ogFonts() {
  const [display, body] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BigShoulders-ExtraBold.woff")),
    readFile(join(process.cwd(), "assets/fonts/LibreFranklin-Medium.woff")),
  ]);
  return [
    { name: "Big Shoulders", data: display, style: "normal" as const, weight: 800 as const },
    { name: "Libre Franklin", data: body, style: "normal" as const, weight: 500 as const },
  ];
}

// The green frame with the site name in the corner that every image shares.
export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.board,
        color: OG_COLORS.chalk,
        padding: "48px 64px 56px",
        fontFamily: "Libre Franklin",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 40, color: OG_COLORS.signal }}>
        {SITE_NAME}
      </div>
      {children}
    </div>
  );
}

// A row of position plates, "CF | Cobb", used on lineup images.
export function OgLineupPlates({
  starters,
}: {
  starters: { position: string; lastName: string; primary: string; secondary: string; text: string }[];
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "auto" }}>
      {starters.map((player) => (
        <div
          key={player.position}
          style={{ display: "flex", fontFamily: "Big Shoulders", fontSize: 28, borderRadius: 4, overflow: "hidden" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              background: player.primary,
              color: player.text,
              borderBottom: `5px solid ${player.secondary}`,
            }}
          >
            {player.position}
          </div>
          <div style={{ display: "flex", padding: "5px 13px", background: OG_COLORS.chalk, color: OG_COLORS.ink }}>
            {player.lastName}
          </div>
        </div>
      ))}
    </div>
  );
}
