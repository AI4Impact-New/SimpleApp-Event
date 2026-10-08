import type { Metadata } from "next";
import { TrackFamilySection } from "@/components/courses/TrackFamilySection";
import { PageHero } from "@/components/layout/PageHero";
import { CompareSection } from "@/components/sections/CompareSection";
import { GuidanceSection } from "@/components/sections/GuidanceSection";
import { TRACK_FAMILIES } from "@/content/site";

export const metadata: Metadata = {
  title: "Career tracks · AI4Impact",
  description: "Six role-led tracks across build, data and product — each designed backwards from a real job.",
};

export default function CoursesPage() {
  return (
    <>
      <PageHero
        title={
          <>
            Pick the role
            <br />
            you want to do.
          </>
        }
        lead="Each track is designed backwards from a job: what it ships, what it is measured on and what a hiring manager checks."
      />
      {TRACK_FAMILIES.map((f, i) => (
        <TrackFamilySection key={f.family} {...f} tone={i % 2 ? "alt" : "page"} />
      ))}
      <CompareSection pad="sm" />
      <GuidanceSection />
    </>
  );
}
