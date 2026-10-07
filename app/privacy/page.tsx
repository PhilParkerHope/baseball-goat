import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "What Baseball GOAT collects, what stays in your browser, and how Google AdSense and analytics use cookies.",
  path: "/privacy",
});

// Fill these in before you publish. The page works without the email, but a
// way to reach you is part of what Google AdSense looks for.
const CONTACT_EMAIL = ""; // e.g. "hello@yourdomain.com"
const UPDATED = "October 7, 2026";

const linkClass = "font-bold underline underline-offset-4 hover:decoration-2";

export default function PrivacyPage() {
  return (
    <main>
      <div className="bg-board text-chalk">
        <div className="mx-auto max-w-[1280px] px-4 pt-8 pb-12 sm:px-8 lg:pt-10">
          <h1 className="font-display text-6xl leading-[0.92] font-extrabold sm:text-7xl">Privacy policy</h1>
          <p className="mt-5 text-lg text-chalk/90">Last updated {UPDATED}</p>
        </div>
      </div>

      <article className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
        <div className="max-w-[68ch] space-y-5 text-lg leading-relaxed">
          <p>
            {SITE_NAME} (baseballgoat.app) is run by P² Development in Iowa. This page explains
            what the site collects, what stays on your device, and how advertising and analytics
            work here. The short version: there are no accounts, nothing to sign up for, and we
            don&rsquo;t ask for your name or email. The things below happen in the background.
          </p>

          <Section title="What stays in your browser">
            <p>
              The games remember your progress on your own device, using your browser&rsquo;s local
              storage: today&rsquo;s picks, whether you finished, and your Player of the Day streak.
              That information is never sent to us. Clearing your browser&rsquo;s site data erases
              it.
            </p>
          </Section>

          <Section title="What we receive">
            <p>
              Like any website, our hosting provider (Vercel) receives your IP address and basic
              details of each request, such as the page you asked for and your browser type, and
              keeps them in server logs for a limited time. When you type in a player search box,
              what you type is sent to our server so it can return matching names. We don&rsquo;t
              build profiles from it, and we don&rsquo;t store searches in our database.
            </p>
            <p>
              Our database holds baseball statistics only. It holds nothing about visitors.
            </p>
          </Section>

          <Section title="Analytics">
            <p>
              We use two tools to learn which pages are used. Vercel Web Analytics reports
              anonymous, combined page-view numbers and does not use cookies. Google Analytics
              uses cookies and similar identifiers to count visitors and see how they move around
              the site; it receives information such as your approximate location, device, and
              the pages you visit. You can opt out of Google Analytics with the{" "}
              <a className={linkClass} href="https://tools.google.com/dlpage/gaoptout">
                Google Analytics opt-out browser add-on
              </a>
              .
            </p>
          </Section>

          <Section title="Advertising">
            <p>
              We use Google AdSense to show ads on this site. Third-party vendors, including
              Google, use cookies to serve ads based on a visitor&rsquo;s prior visits to this
              website or other websites. Google&rsquo;s use of advertising cookies enables it and
              its partners to serve ads to you based on your visit to our site and other sites on
              the internet.
            </p>
            <p>
              You can opt out of personalized advertising by visiting{" "}
              <a className={linkClass} href="https://adssettings.google.com">
                Google Ads Settings
              </a>
              . You can also opt out of some third-party vendors&rsquo; use of cookies for
              personalized advertising at{" "}
              <a className={linkClass} href="https://www.aboutads.info/choices/">
                aboutads.info
              </a>
              . To learn how Google uses information from sites that use its services, see{" "}
              <a className={linkClass} href="https://policies.google.com/technologies/partner-sites">
                How Google uses information from sites or apps that use our services
              </a>
              .
            </p>
            <p>
              If you&rsquo;re in the European Economic Area, the United Kingdom or Switzerland, you
              will be asked for your choice about cookies and personalized ads, and you can change
              it at any time.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Cookies are small files a website saves on your device. The ones on this site come
              from Google (analytics and advertising). Most browsers let you block or delete
              cookies in their settings. The games and rankings keep working without them.
            </p>
          </Section>

          <Section title="Children">
            <p>
              This site is not directed at children under 13, and we don&rsquo;t knowingly collect
              personal information from them.
            </p>
          </Section>

          <Section title="Your choices and rights">
            <p>
              We don&rsquo;t sell personal information in exchange for money. Advertising partners
              may use cookie data as described above, which some state privacy laws treat as
              &ldquo;sharing&rdquo; or &ldquo;targeted advertising.&rdquo; Depending on where you
              live, you may have rights to ask what information a business holds about you, to
              have it deleted, or to opt out of targeted advertising. The opt-out links in the
              Advertising section are the quickest way to do the last one. For anything else,
              contact us below.
            </p>
          </Section>

          <Section title="Links to other sites">
            <p>
              Some pages link to other websites, such as our data sources. We don&rsquo;t control
              their privacy practices and aren&rsquo;t responsible for them.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we change how the site works in a way that affects this policy, we&rsquo;ll update
              this page and the date at the top.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              {CONTACT_EMAIL ? (
                <>
                  Questions about this policy? Email{" "}
                  <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>
                    {CONTACT_EMAIL}
                  </a>
                  .
                </>
              ) : (
                <>
                  Questions about this policy? Reach us through{" "}
                  <Link className={linkClass} href="https://p2-development.vercel.app/">
                    P² Development
                  </Link>
                  .
                </>
              )}
            </p>
          </Section>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-4">
      <h2 className="font-display text-3xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
