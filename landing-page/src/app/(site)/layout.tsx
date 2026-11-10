import { WebinarCampaign } from "@/components/webinars/WebinarCampaign";
import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/navigation/AnnouncementBar";
import { Footer } from "@/components/navigation/Footer";
import { NavBar } from "@/components/navigation/NavBar";
import { ANNOUNCEMENTS, FOOTER_COLUMNS, FOOTER_COPY, NAV_LINKS, STUDENT_PORTAL_URL } from "@/content/site";

/** Chrome shared by every marketing page: announcement bar, nav, footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AnnouncementBar items={ANNOUNCEMENTS} ctaLabel="Explore tracks" ctaHref="/courses" />
      <NavBar links={NAV_LINKS} guidanceHref="#guidance" loginHref={`${STUDENT_PORTAL_URL}/welcome`} />
      <main className="flex flex-1 flex-col">{children}</main>
      <WebinarCampaign />
      <Footer columns={FOOTER_COLUMNS} {...FOOTER_COPY} />
    </>
  );
}
