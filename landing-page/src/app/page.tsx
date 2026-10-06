import { CertificationSection } from "@/components/home/CertificationSection";
import { CompareSection } from "@/components/home/CompareSection";
import { ANNOUNCEMENTS, FOOTER_COLUMNS, NAV_LINKS } from "@/components/home/content";
import { FinderSection } from "@/components/home/FinderSection";
import { GuidanceSection } from "@/components/home/GuidanceSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HowSection } from "@/components/home/HowSection";
import { ProgrammeSection } from "@/components/home/ProgrammeSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { TracksSection } from "@/components/home/TracksSection";
import { TrainersSection } from "@/components/home/TrainersSection";
import { AnnouncementBar } from "@/components/navigation/AnnouncementBar";
import { Footer } from "@/components/navigation/Footer";
import { NavBar } from "@/components/navigation/NavBar";

export default function Home() {
  return (
    <>
      <AnnouncementBar items={ANNOUNCEMENTS} ctaLabel="Register free" ctaHref="#guidance" />
      <NavBar links={NAV_LINKS} guidanceHref="#guidance" loginHref="#" />
      <main className="flex flex-1 flex-col">
        <HomeHero />
        <TracksSection />
        <FinderSection />
        <HowSection />
        <ProjectsSection />
        <CertificationSection />
        <ProgrammeSection />
        <TrainersSection />
        <CompareSection />
        <GuidanceSection />
      </main>
      <Footer
        columns={FOOTER_COLUMNS}
        tagline="Learn AI. Build real systems. Create impact."
        note="Issued by the AI4Impact Institute of Applied AI (IIAA) in academic collaboration with XYZ University. Final wording is subject to the approved collaboration language."
        legal="© 2026 AI4Impact. Professional certificates are not academic degrees. Career support does not guarantee employment."
        legalRight="Learner data is handled in line with the DPDP Act 2023."
      />
    </>
  );
}
