import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { CurrentPageNav, SiteNav } from "./site-nav";
import { SITE_NAME } from "@/lib/site";

// Shown on every page (added in app/layout.tsx). The links themselves, and
// the phone menu, are in site-nav.tsx.
export function SiteHeader() {
  return (
    <header className="bg-board text-chalk">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-8 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="font-display flex items-center gap-3 text-2xl font-extrabold text-signal outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
        >
          {/* Empty alt: the site name beside it already says what this is. */}
          <Image src="/icon.png" width={44} height={44} alt="" priority />
          {SITE_NAME}
        </Link>

        {/* Highlighting the current page means reading the address, which isn't
            known while a not-yet-visited matchup page is being prepared. Until
            it is, the same nav shows with nothing highlighted. */}
        <Suspense fallback={<SiteNav pathname={null} />}>
          <CurrentPageNav />
        </Suspense>
      </div>
    </header>
  );
}