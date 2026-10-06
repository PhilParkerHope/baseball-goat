import type { Metadata } from "next";
import "@fontsource-variable/big-shoulders";
import "@fontsource-variable/libre-franklin";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baseball GOAT",
  description:
    "Every major league player since 1871, rated against his own era. See the all-time lineup and compare any two players.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
