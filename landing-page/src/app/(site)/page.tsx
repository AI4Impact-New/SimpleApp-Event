import { CertificationSection } from "@/components/home/CertificationSection";
import { FinderSection } from "@/components/home/FinderSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HowSection } from "@/components/home/HowSection";
import { ProgrammeSection } from "@/components/home/ProgrammeSection";
import { ProjectsSection } from "@/components/home/ProjectsSection";
import { TracksSection } from "@/components/home/TracksSection";
import { TrainersSection } from "@/components/home/TrainersSection";
import { CompareSection } from "@/components/sections/CompareSection";
import { GuidanceSection } from "@/components/sections/GuidanceSection";

export default function Home() {
  return (
    <>
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
    </>
  );
}
