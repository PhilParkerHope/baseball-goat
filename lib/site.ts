import type { Metadata } from "next";

// The site's name, address and default description, in one place.

export const SITE_NAME = "Baseball GOAT";

export const SITE_DESCRIPTION =
  "Every major league player since 1871, Negro Leagues included, rated on one era-adjusted scale. See the all-time lineup, compare any two players, and browse the best by team and position.";

// The public address, used for canonical links, share images and the sitemap.
//   1. NEXT_PUBLIC_SITE_URL, if you set it (do this once you have a custom domain)
//   2. the production URL Vercel assigns the project
//   3. localhost, in development
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

// Builds the full set of tags for one page: browser title, search description,
// canonical link, and the title and description used when the page is shared.
// `path` is the page's canonical address, e.g. "/compare".
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  image = "/opengraph-image",
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean; // true = don't add "| Baseball GOAT" after the title
  image?: string; // share image; defaults to the site-wide one
}): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  // Setting openGraph on a page replaces the site-wide one, share image
  // included, so the image has to be named again here. It defaults to the
  // site-wide one (app/opengraph-image.tsx); a matchup passes its own.
  const images = [{ url: image, width: 1200, height: 630, alt: shareTitle }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: shareTitle,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title: shareTitle, description, images },
  };
}
