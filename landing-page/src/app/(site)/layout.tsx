import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/navigation/AnnouncementBar";
import { Footer } from "@/components/navigation/Footer";
import { NavBar } from "@/components/navigation/NavBar";
import { ANNOUNCEMENTS, FOOTER_COLUMNS, FOOTER_COPY, NAV_LINKS } from "@/content/site";

/** Chrome shared by every marketing page: announcement bar, nav, footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AnnouncementBar items={ANNOUNCEMENTS} ctaLabel="Register free" ctaHref="#guidance" />
      <NavBar links={NAV_LINKS} guidanceHref="#guidance" loginHref="#" />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer columns={FOOTER_COLUMNS} {...FOOTER_COPY} />
    </>
  );
}
