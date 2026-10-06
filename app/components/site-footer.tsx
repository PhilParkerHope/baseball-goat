import Link from "next/link";

export function SiteFooter(){
    return(
        <footer className="border-t-2 border-ink">
        <p className="mx-auto max-w-[1280px] px-4 py-6 text-sm leading-relaxed sm:px-8 text-center">
          Statistics from the SABR Lahman Baseball Database, used under CC BY-SA 3.0. Negro
          Leagues statistics from Seamheads.com. Not affiliated with Major League Baseball.
        </p>
        <p className="mx-auto max-w-[1280px] px-4 pb-6 text-sm leading-relaxed sm:px-8 text-center">
            This site is created and designed by <Link className="font-bold underline" href={"https://p2-development.vercel.app/"}>P² Development </Link>
        </p>
      </footer>
    )
}