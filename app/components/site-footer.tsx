import Link from "next/link";
import { RankingsModal } from "./rankings-modal";

export function SiteFooter(){
    return(
        <footer className="border-t-2 border-ink">
               {/* A div, not a p: the pop-up inside RankingsModal isn't allowed inside a paragraph. */}
                <div className="mx-auto max-w-[1280px] px-4 pt-6 text-sm leading-relaxed sm:px-8 text-center">
                    <RankingsModal />
                </div>
        <p className="mx-auto max-w-[1280px] px-4 py-6 text-sm leading-relaxed sm:px-8 text-center">
          Statistics from the SABR Lahman Baseball Database, used under CC BY-SA 3.0. Negro
          Leagues statistics from Seamheads.com. Not affiliated with Major League Baseball. Statistics are from the end of the 2025 season.
        </p>
        <p className="mx-auto max-w-[1280px] px-4 pb-6 text-sm leading-relaxed sm:px-8 text-center">
            This site is created and designed by <Link className="font-bold underline" href={"https://p2-development.vercel.app/"}>P² Development </Link>
        </p>
      </footer>
    )
}