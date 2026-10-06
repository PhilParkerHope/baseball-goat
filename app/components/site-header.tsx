import Link from "next/link";

// Shown on every page (added in app/layout.tsx). Add a link here as each new
// page is built.
const NAV = [
  { href: "/", label: "Lineup" },
  { href: "/compare", label: "Compare" },
  { href: "/goats", label: "GOATs" },
];

export function SiteHeader() {
  return (
    <header className="bg-board text-chalk">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-baseline justify-between gap-x-8 gap-y-1 px-4 pt-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-extrabold text-signal outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
        >
          Baseball GOAT
        </Link>
        <nav aria-label="Main">
          <ul className="flex gap-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-display text-xl font-bold underline-offset-4 outline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
