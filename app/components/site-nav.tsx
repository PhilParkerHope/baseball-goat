"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Add a link here as each new page is built.
const NAV = [
  { href: "/", label: "Lineup" },
  { href: "/compare", label: "Compare" },
  { href: "/goats", label: "GOATs" },
  { href: "/lineups", label: "Teams" },
  { href: "/games", label: "Games" },
];

// The nav with the current page highlighted. Kept separate from SiteNav so the
// header can show SiteNav on its own while the address isn't known yet.
export function CurrentPageNav() {
  return <SiteNav pathname={usePathname()} />;
}

// Wide screens: the links in a row. Phones: a menu button that opens them
// as a list under the header.
export function SiteNav({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // "/" only matches the home page; "/compare" also matches a matchup under it.
  const isCurrent = (href: string) =>
    pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    `font-display font-bold underline-offset-8 outline-offset-4 hover:text-signal focus-visible:outline-3 focus-visible:outline-white ${
      isCurrent(href) ? "text-signal underline decoration-2" : "hover:underline"
    }`;

  return (
    <nav
      aria-label="Main"
      className="contents"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      {/* Wide screens */}
      <ul className="hidden gap-6 md:flex">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={`${linkClass(item.href)} text-xl`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Phones: the menu button */}
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Menu"}
        onClick={() => setOpen(!open)}
        className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-[3px] outline-offset-2 hover:text-signal focus-visible:outline-3 focus-visible:outline-white md:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {/* Phones: the open menu, on its own row under the logo */}
      {open && (
        <ul id={menuId} className="basis-full pt-2 pb-1 md:hidden">
          {NAV.map((item) => (
            <li key={item.href} className="border-t border-chalk/25">
              <Link
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`${linkClass(item.href)} block py-3 text-3xl`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}